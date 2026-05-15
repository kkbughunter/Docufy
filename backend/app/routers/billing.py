from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.billing import (
    BillingEventResponse,
    BillingSummaryResponse,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    PlanLimitsResponse,
    PlanResponse,
    PortalSessionResponse,
)
from app.services.billing_service import (
    create_checkout_session,
    create_customer_portal_session,
    list_recent_billing_events,
    sync_billing_event,
    verify_webhook_signature,
)
from app.services.plan_service import PlanDefinition, get_effective_plan, get_public_plans
from app.services.subscription_service import get_or_create_user_subscription

router = APIRouter(prefix="/billing", tags=["billing"])


def _to_plan_response(plan: PlanDefinition) -> PlanResponse:
    return PlanResponse(
        key=plan.key,
        name=plan.name,
        description=plan.description,
        price_usd=plan.price_usd,
        interval_label=plan.interval_label,
        cta_label=plan.cta_label,
        cta_href=plan.cta_href,
        highlighted=plan.highlighted,
        contact_only=plan.contact_only,
        internal=plan.internal,
        features=list(plan.features),
        limits=PlanLimitsResponse(
            max_groups=plan.limits.max_groups,
            max_requests=plan.limits.max_requests,
            max_file_size_mb=plan.limits.max_file_size_mb,
        ),
    )


@router.get("/plans", response_model=list[PlanResponse])
def list_public_plans() -> list[PlanResponse]:
    return [_to_plan_response(plan) for plan in get_public_plans()]


@router.get("/summary", response_model=BillingSummaryResponse)
def get_billing_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BillingSummaryResponse:
    subscription = get_or_create_user_subscription(db, current_user)
    current_plan = get_effective_plan(current_user)
    public_plans = [_to_plan_response(plan) for plan in get_public_plans()]
    recent_events = list_recent_billing_events(db, current_user, limit=12)
    last_successful_purchase_at = next(
        (event.created_at for event in recent_events if event.status == "active"),
        None,
    )
    last_failed_purchase_at = next(
        (
            event.created_at
            for event in recent_events
            if event.status in {"failed", "payment_failed", "payment_cancelled"}
        ),
        None,
    )

    return BillingSummaryResponse(
        plan_key=current_plan.key,
        billing_status=subscription.billing_status,
        dodo_customer_id=subscription.dodo_customer_id,
        dodo_subscription_id=subscription.dodo_subscription_id,
        billing_period_start=subscription.billing_period_start,
        billing_period_end=subscription.billing_period_end,
        last_successful_purchase_at=last_successful_purchase_at,
        last_failed_purchase_at=last_failed_purchase_at,
        current_plan=_to_plan_response(current_plan),
        public_plans=public_plans,
        recent_events=[
            BillingEventResponse(
                event_type=event.event_type,
                status=event.status,
                plan_key=event.plan_key,
                plan_name=event.plan_name,
                product_id=event.product_id,
                payment_id=event.payment_id,
                subscription_id=event.subscription_id,
                failure_reason=event.failure_reason,
                created_at=event.created_at,
            )
            for event in recent_events
        ],
    )


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def start_checkout(
    payload: CheckoutSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> CheckoutSessionResponse:
    result = await create_checkout_session(current_user, payload.plan_key)
    return CheckoutSessionResponse(**result)


@router.post("/portal", response_model=PortalSessionResponse)
async def start_customer_portal(
    current_user: Annotated[User, Depends(get_current_user)],
) -> PortalSessionResponse:
    portal_url = await create_customer_portal_session(current_user)
    return PortalSessionResponse(portal_url=portal_url)


@router.post("/webhooks/dodo", status_code=status.HTTP_202_ACCEPTED)
async def dodo_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    webhook_id: Annotated[str | None, Header()] = None,
    webhook_signature: Annotated[str | None, Header()] = None,
    webhook_timestamp: Annotated[str | None, Header()] = None,
) -> dict[str, bool]:
    raw_body = await request.body()
    payload = verify_webhook_signature(
        raw_body,
        {
            "webhook-id": webhook_id or "",
            "webhook-signature": webhook_signature or "",
            "webhook-timestamp": webhook_timestamp or "",
        },
    )
    sync_billing_event(
        db,
        webhook_id=str(webhook_id or ""),
        event_type=str(payload.get("type") or "unknown"),
        payload=payload,
    )
    return {"received": True}
