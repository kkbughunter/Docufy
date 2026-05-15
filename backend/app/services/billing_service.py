from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session
from standardwebhooks.webhooks import Webhook

from app.config import settings
from app.models.analytics import BillingWebhookEvent
from app.models.subscription import UserSubscription
from app.models.user import User
from app.services.plan_service import PlanDefinition, get_plan, resolve_plan_from_product_id
from app.services.subscription_service import get_or_create_user_subscription


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
    subscription = user.subscription
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
    if subscription is not None and subscription.dodo_customer_id:
        customer = {"customer_id": subscription.dodo_customer_id}
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
    subscription = user.subscription
    if subscription is None or not subscription.dodo_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Dodo customer record is linked to this account yet.",
        )

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"{settings.dodo_api_base_url}/customers/{subscription.dodo_customer_id}/customer-portal/session",
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
        subscription = db.scalar(
            select(UserSubscription).where(UserSubscription.dodo_customer_id == str(customer_id))
        )
        user = subscription.user if subscription is not None else None
        if user is not None:
            return user

    email = customer.get("email")
    if email:
        user = db.scalar(select(User).where(User.email == str(email).strip().lower()))
        if user is not None:
            return user

    subscription_id = event_data.get("subscription_id")
    if subscription_id:
        subscription = db.scalar(
            select(UserSubscription).where(UserSubscription.dodo_subscription_id == str(subscription_id))
        )
        return subscription.user if subscription is not None else None

    return None


def _extract_product_id(event_data: dict[str, Any]) -> str | None:
    direct = event_data.get("product_id")
    if direct:
        return str(direct)

    product_cart = event_data.get("product_cart")
    if isinstance(product_cart, list) and product_cart:
        first_item = product_cart[0]
        if isinstance(first_item, dict):
            product_id = first_item.get("product_id")
            if product_id:
                return str(product_id)

    return None


def _extract_event_datetime(event_data: dict[str, Any]) -> datetime:
    for key in ("paid_at", "created_at", "updated_at", "timestamp"):
        parsed = _parse_datetime(event_data.get(key))
        if parsed is not None:
            return parsed
    return datetime.now(UTC)


def _normalize_billing_status(event_type: str, event_data: dict[str, Any]) -> str:
    normalized_map = {
        "payment.succeeded": "active",
        "payment.processing": "processing",
        "payment.failed": "payment_failed",
        "payment.cancelled": "payment_cancelled",
        "subscription.active": "active",
        "subscription.renewed": "active",
        "subscription.plan_changed": "active",
        "subscription.on_hold": "on_hold",
        "subscription.failed": "failed",
        "subscription.cancelled": "cancelled",
        "subscription.expired": "expired",
    }
    if event_type in normalized_map:
        return normalized_map[event_type]
    return str(event_data.get("status") or event_type.removeprefix("subscription.") or "updated")


def _extract_failure_reason(event_data: dict[str, Any]) -> str | None:
    for key in ("error_message", "failure_reason", "reason"):
        value = event_data.get(key)
        if value:
            return str(value)
    return None


def _resolve_plan_from_metadata(plan_key: Any) -> PlanDefinition | None:
    if not plan_key:
        return None
    candidate = get_plan(str(plan_key))
    if candidate.key == str(plan_key):
        return candidate
    return None


def sync_billing_event(
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
    if isinstance(event_data, dict):
        user = _resolve_user_for_webhook(db, event_data)
        if user is not None:
            subscription = get_or_create_user_subscription(db, user)
            customer = event_data.get("customer") or {}
            product_id = _extract_product_id(event_data)
            resolved_plan = resolve_plan_from_product_id(product_id)
            metadata_plan_key = (event_data.get("metadata") or {}).get("plan_key")
            plan = resolved_plan or _resolve_plan_from_metadata(metadata_plan_key)
            event_time = _extract_event_datetime(event_data)

            subscription.dodo_customer_id = customer.get("customer_id") or subscription.dodo_customer_id
            subscription.dodo_subscription_id = (
                event_data.get("subscription_id") or subscription.dodo_subscription_id
            )
            subscription.dodo_product_id = product_id or subscription.dodo_product_id
            subscription.billing_status = _normalize_billing_status(event_type, event_data)

            success_events = {"payment.succeeded", "subscription.active", "subscription.renewed"}
            if event_type in success_events and plan is not None and plan.key != "contact":
                subscription.plan_key = plan.key
                subscription.billing_period_start = event_time
                subscription.billing_period_end = None

            if event_type == "subscription.plan_changed" and plan is not None and plan.key != "contact":
                subscription.plan_key = plan.key

    event_record.processed_at = datetime.now(UTC)
    db.commit()


@dataclass(frozen=True)
class BillingEventSummary:
    event_type: str
    status: str
    plan_key: str | None
    plan_name: str | None
    product_id: str | None
    payment_id: str | None
    subscription_id: str | None
    failure_reason: str | None
    created_at: datetime


def _event_matches_user(user: User, event_data: dict[str, Any]) -> bool:
    metadata = event_data.get("metadata") or {}
    metadata_user_id = metadata.get("user_id")
    if metadata_user_id and str(metadata_user_id) == str(user.id):
        return True

    customer = event_data.get("customer") or {}
    customer_id = customer.get("customer_id")
    subscription = user.subscription
    if (
        customer_id
        and subscription is not None
        and subscription.dodo_customer_id
        and str(customer_id) == subscription.dodo_customer_id
    ):
        return True

    email = customer.get("email")
    if email and str(email).strip().lower() == user.email:
        return True

    subscription_id = event_data.get("subscription_id")
    if (
        subscription_id
        and subscription is not None
        and subscription.dodo_subscription_id
        and str(subscription_id) == subscription.dodo_subscription_id
    ):
        return True

    return False


def list_recent_billing_events(db: Session, user: User, limit: int = 10) -> list[BillingEventSummary]:
    raw_events = list(
        db.scalars(
            select(BillingWebhookEvent)
            .order_by(desc(BillingWebhookEvent.created_at))
            .limit(max(limit * 6, 60))
        )
    )

    events: list[BillingEventSummary] = []
    for event in raw_events:
        event_data = event.payload.get("data") if isinstance(event.payload, dict) else None
        if not isinstance(event_data, dict):
            continue
        if not _event_matches_user(user, event_data):
            continue

        product_id = _extract_product_id(event_data)
        resolved_plan = resolve_plan_from_product_id(product_id)
        metadata_plan_key = (event_data.get("metadata") or {}).get("plan_key")
        plan = resolved_plan or _resolve_plan_from_metadata(metadata_plan_key)

        events.append(
            BillingEventSummary(
                event_type=event.event_type,
                status=_normalize_billing_status(event.event_type, event_data),
                plan_key=plan.key if plan is not None else None,
                plan_name=plan.name if plan is not None else None,
                product_id=product_id,
                payment_id=str(event_data.get("payment_id")) if event_data.get("payment_id") else None,
                subscription_id=(
                    str(event_data.get("subscription_id")) if event_data.get("subscription_id") else None
                ),
                failure_reason=_extract_failure_reason(event_data),
                created_at=event.created_at,
            )
        )

        if len(events) >= limit:
            break

    return events
