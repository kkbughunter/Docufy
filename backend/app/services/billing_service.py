from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from standardwebhooks.webhooks import Webhook

from app.config import settings
from app.models.analytics import BillingWebhookEvent
from app.models.user import User
from app.services.plan_service import get_plan, resolve_plan_from_product_id


class DodoPaymentsError(Exception):
    pass


def _ensure_billing_configured() -> None:
    if not settings.dodo_payments_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dodo Payments is not configured yet.",
        )


def _auth_headers() -> dict[str, str]:
    _ensure_billing_configured()
    return {
        "Authorization": f"Bearer {settings.dodo_payments_api_key}",
        "Content-Type": "application/json",
    }


async def create_checkout_session(user: User, plan_key: str) -> dict[str, str]:
    plan = get_plan(plan_key)
    if plan.internal or plan.contact_only:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This plan cannot be purchased through checkout.",
        )

    if not plan.dodo_product_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Dodo product id is missing for the {plan.name} plan.",
        )

    customer: dict[str, Any]
    if user.dodo_customer_id:
        customer = {"customer_id": user.dodo_customer_id}
    else:
        customer = {"email": user.email, "name": user.full_name or user.email}

    payload = {
        "product_cart": [{"product_id": plan.dodo_product_id, "quantity": 1}],
        "billing_currency": "USD",
        "customer": customer,
        "return_url": settings.frontend_billing_return_url,
        "cancel_url": f"{settings.frontend_billing_return_url}?status=cancelled",
        "show_saved_payment_methods": True,
        "metadata": {
            "user_id": str(user.id),
            "plan_key": plan.key,
            "source": "docufy",
        },
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"{settings.dodo_api_base_url}/checkouts",
            headers=_auth_headers(),
            json=payload,
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create a Dodo checkout session.",
        )

    data = response.json()
    checkout_url = data.get("checkout_url")
    session_id = data.get("session_id")

    if not checkout_url or not session_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dodo checkout session response was incomplete.",
        )

    return {"checkout_url": str(checkout_url), "session_id": str(session_id)}


async def create_customer_portal_session(user: User) -> str:
    if not user.dodo_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Dodo customer record is linked to this account yet.",
        )

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"{settings.dodo_api_base_url}/customers/{user.dodo_customer_id}/customer-portal/session",
            headers=_auth_headers(),
            params={"return_url": settings.frontend_app_url},
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create a Dodo customer portal session.",
        )

    data = response.json()
    link = data.get("link")
    if not link:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Dodo customer portal response was incomplete.",
        )

    return str(link)


def verify_webhook_signature(raw_body: bytes, headers: dict[str, str]) -> dict[str, Any]:
    if not settings.dodo_payments_webhook_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dodo webhook signing key is not configured.",
        )

    normalized_headers = {
        "webhook-id": headers.get("webhook-id", ""),
        "webhook-signature": headers.get("webhook-signature", ""),
        "webhook-timestamp": headers.get("webhook-timestamp", ""),
    }

    try:
        payload = raw_body.decode("utf-8")
        verified = Webhook(settings.dodo_payments_webhook_key).verify(
            payload,
            normalized_headers,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Dodo webhook signature.",
        ) from exc

    if verified is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Dodo webhook signature.",
        )

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook payload was not valid JSON.",
        ) from exc


def _parse_datetime(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _resolve_user_for_webhook(db: Session, event_data: dict[str, Any]) -> User | None:
    metadata = event_data.get("metadata") or {}
    user_id = metadata.get("user_id")
    if user_id:
        try:
            user = db.get(User, UUID(str(user_id)))
            if user is not None:
                return user
        except ValueError:
            pass

    customer = event_data.get("customer") or {}
    customer_id = customer.get("customer_id")
    if customer_id:
        user = db.scalar(select(User).where(User.dodo_customer_id == str(customer_id)))
        if user is not None:
            return user

    email = customer.get("email")
    if email:
        user = db.scalar(select(User).where(User.email == str(email).strip().lower()))
        if user is not None:
            return user

    subscription_id = event_data.get("subscription_id")
    if subscription_id:
        return db.scalar(select(User).where(User.dodo_subscription_id == str(subscription_id)))

    return None


def sync_subscription_event(
    db: Session,
    webhook_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    existing_event = db.scalar(
        select(BillingWebhookEvent).where(BillingWebhookEvent.webhook_id == webhook_id)
    )
    if existing_event is not None:
        return

    event_record = BillingWebhookEvent(
        webhook_id=webhook_id,
        event_type=event_type,
        payload=payload,
    )
    db.add(event_record)

    event_data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(event_data, dict) and event_type.startswith("subscription."):
        user = _resolve_user_for_webhook(db, event_data)
        if user is not None:
            customer = event_data.get("customer") or {}
            resolved_plan = resolve_plan_from_product_id(event_data.get("product_id"))
            metadata_plan_key = (event_data.get("metadata") or {}).get("plan_key")
            plan = resolved_plan or (get_plan(metadata_plan_key) if metadata_plan_key else None)

            user.dodo_customer_id = customer.get("customer_id") or user.dodo_customer_id
            user.dodo_subscription_id = event_data.get("subscription_id") or user.dodo_subscription_id
            user.dodo_product_id = event_data.get("product_id") or user.dodo_product_id
            user.billing_status = str(event_data.get("status") or event_type.removeprefix("subscription."))
            user.billing_period_start = _parse_datetime(event_data.get("previous_billing_date"))
            user.billing_period_end = _parse_datetime(event_data.get("next_billing_date"))

            if plan is not None and plan.key != "contact":
                user.plan_key = plan.key

            if event_type in {"subscription.expired", "subscription.failed"}:
                user.billing_status = event_type.removeprefix("subscription.")

    event_record.processed_at = datetime.now(UTC)
    db.commit()
