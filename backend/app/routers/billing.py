from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.billing import (
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
    sync_subscription_event,
    verify_webhook_signature,
)
from app.services.plan_service import PlanDefinition, get_effective_plan, get_public_plans

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
            max_monthly_requests=plan.limits.max_monthly_requests,
            max_file_size_mb=plan.limits.max_file_size_mb,
        ),
    )


@router.get("/plans", response_model=list[PlanResponse])
def list_public_plans() -> list[PlanResponse]:
    return [_to_plan_response(plan) for plan in get_public_plans()]


@router.get("/summary", response_model=BillingSummaryResponse)
def get_billing_summary(
    current_user: Annotated[User, Depends(get_current_user)],
) -> BillingSummaryResponse:
    current_plan = get_effective_plan(current_user)
    public_plans = [_to_plan_response(plan) for plan in get_public_plans()]
    return BillingSummaryResponse(
        plan_key=current_plan.key,
        billing_status=current_user.billing_status,
        dodo_customer_id=current_user.dodo_customer_id,
        dodo_subscription_id=current_user.dodo_subscription_id,
        billing_period_start=current_user.billing_period_start,
        billing_period_end=current_user.billing_period_end,
        current_plan=_to_plan_response(current_plan),
        public_plans=public_plans,
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
    sync_subscription_event(
        db,
        webhook_id=str(webhook_id or ""),
        event_type=str(payload.get("type") or "unknown"),
        payload=payload,
    )
    return {"received": True}
