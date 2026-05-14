from datetime import datetime

from pydantic import BaseModel, Field


class PlanLimitsResponse(BaseModel):
    max_groups: int | None = None
    max_monthly_requests: int | None = None
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


class BillingSummaryResponse(BaseModel):
    plan_key: str
    billing_status: str
    dodo_customer_id: str | None = None
    dodo_subscription_id: str | None = None
    billing_period_start: datetime | None = None
    billing_period_end: datetime | None = None
    current_plan: PlanResponse
    public_plans: list[PlanResponse]


class CheckoutSessionRequest(BaseModel):
    plan_key: str = Field(min_length=1, max_length=50)


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str


class PortalSessionResponse(BaseModel):
    portal_url: str
