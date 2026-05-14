from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.billing import PlanLimitsResponse


class UsageWindowResponse(BaseModel):
    started_at: datetime
    ends_at: datetime


class UsageTotalsResponse(BaseModel):
    total_calls: int
    requests_used: int
    success_calls: int
    failed_calls: int
    blocked_calls: int
    average_duration_ms: int


class UsageSummaryResponse(BaseModel):
    plan_key: str
    billing_status: str
    groups_used: int
    groups_remaining: int | None = None
    requests_remaining: int | None = None
    limits: PlanLimitsResponse
    window: UsageWindowResponse
    totals: UsageTotalsResponse


class UsageHistoryItemResponse(BaseModel):
    id: UUID
    group_id: UUID | None = None
    group_name: str | None = None
    endpoint_path: str
    http_method: str
    auth_mode: str
    request_status: str
    status_code: int
    duration_ms: int
    ai_model: str | None = None
    used_ai_call: bool
    file_name: str | None = None
    file_size_bytes: int | None = None
    error_message: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
