from datetime import datetime

from pydantic import BaseModel, Field


class PlanLimitsResponse(BaseModel):
    max_groups: int | None = None
    max_requests: int | None = None
    max_file_size_mb: int | None = None


class PlanResponse(BaseModel):
    key: str
    name: str
    description: str
    price_usd: int | None = None
    interval_label: str | None = None
    cta_label: str
    cta_href: str | None = None
    highlighted: bool = False
    contact_only: bool = False
    internal: bool = False
    features: list[str]
    limits: PlanLimitsResponse


class BillingEventResponse(BaseModel):
    event_type: str
    status: str
    plan_key: str | None = None
    plan_name: str | None = None
    product_id: str | None = None
    payment_id: str | None = None
    subscription_id: str | None = None
    failure_reason: str | None = None
    created_at: datetime


class BillingSummaryResponse(BaseModel):
    plan_key: str
    billing_status: str
    dodo_customer_id: str | None = None
    dodo_subscription_id: str | None = None
    billing_period_start: datetime | None = None
    billing_period_end: datetime | None = None
    last_successful_purchase_at: datetime | None = None
    last_failed_purchase_at: datetime | None = None
    current_plan: PlanResponse
    public_plans: list[PlanResponse]
    recent_events: list[BillingEventResponse] = Field(default_factory=list)


class CheckoutSessionRequest(BaseModel):
    plan_key: str = Field(min_length=1, max_length=50)


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str


class PortalSessionResponse(BaseModel):
    portal_url: str
