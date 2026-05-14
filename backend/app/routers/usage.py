from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.analytics import ApiRequestLog
from app.models.user import User
from app.schemas.billing import PlanLimitsResponse
from app.schemas.usage import (
    UsageHistoryItemResponse,
    UsageSummaryResponse,
    UsageTotalsResponse,
    UsageWindowResponse,
)
from app.services.usage_service import get_usage_snapshot

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/summary", response_model=UsageSummaryResponse)
def get_usage_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UsageSummaryResponse:
    snapshot = get_usage_snapshot(db, current_user)
    group_limit = snapshot.plan.limits.max_groups
    request_limit = snapshot.plan.limits.max_monthly_requests

    groups_remaining = None if group_limit is None else max(group_limit - snapshot.groups_used, 0)
    requests_remaining = (
        None if request_limit is None else max(request_limit - snapshot.requests_used, 0)
    )

    return UsageSummaryResponse(
        plan_key=snapshot.plan.key,
        billing_status=current_user.billing_status,
        groups_used=snapshot.groups_used,
        groups_remaining=groups_remaining,
        requests_remaining=requests_remaining,
        limits=PlanLimitsResponse(
            max_groups=snapshot.plan.limits.max_groups,
            max_monthly_requests=snapshot.plan.limits.max_monthly_requests,
            max_file_size_mb=snapshot.plan.limits.max_file_size_mb,
        ),
        window=UsageWindowResponse(
            started_at=snapshot.window.started_at,
            ends_at=snapshot.window.ends_at,
        ),
        totals=UsageTotalsResponse(
            total_calls=snapshot.total_calls,
            requests_used=snapshot.requests_used,
            success_calls=snapshot.success_calls,
            failed_calls=snapshot.failed_calls,
            blocked_calls=snapshot.blocked_calls,
            average_duration_ms=snapshot.average_duration_ms,
        ),
    )


@router.get("/history", response_model=list[UsageHistoryItemResponse])
def list_usage_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    group_id: UUID | None = None,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ApiRequestLog]:
    query = select(ApiRequestLog).where(ApiRequestLog.user_id == current_user.id)
    if group_id is not None:
        query = query.where(ApiRequestLog.group_id == group_id)

    return list(db.scalars(query.order_by(desc(ApiRequestLog.created_at)).limit(limit)))
