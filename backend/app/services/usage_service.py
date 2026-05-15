from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import Integer, case, func, select
from sqlalchemy.orm import Session

from app.models.analytics import ApiRequestLog
from app.models.group import ApiGroup
from app.models.user import User
from app.services.plan_service import PlanDefinition, PlanLimits, get_effective_plan


@dataclass(frozen=True)
class UsageWindow:
    started_at: datetime
    ends_at: datetime | None


@dataclass(frozen=True)
class UsageSnapshot:
    plan: PlanDefinition
    window: UsageWindow
    groups_used: int
    total_calls: int
    requests_used: int
    success_calls: int
    failed_calls: int
    blocked_calls: int
    average_duration_ms: int


def get_usage_window(user: User, now: datetime | None = None) -> UsageWindow:
    del now
    period_start = user.subscription.billing_period_start if user.subscription is not None else None
    return UsageWindow(started_at=period_start or user.created_at, ends_at=None)


def count_groups(db: Session, user: User) -> int:
    return int(
        db.scalar(select(func.count(ApiGroup.id)).where(ApiGroup.user_id == user.id)) or 0
    )


def get_usage_snapshot(db: Session, user: User, now: datetime | None = None) -> UsageSnapshot:
    plan = get_effective_plan(user, now=now)
    window = get_usage_window(user, now=now)
    groups_used = count_groups(db, user)

    aggregates = db.execute(
        select(
            func.count(ApiRequestLog.id),
            func.coalesce(
                func.sum(case((ApiRequestLog.used_ai_call.is_(True), 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((ApiRequestLog.request_status == "success", 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((ApiRequestLog.status_code >= 400, 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((ApiRequestLog.used_ai_call.is_(False), 1), else_=0)),
                0,
            ),
            func.coalesce(func.avg(ApiRequestLog.duration_ms.cast(Integer)), 0),
        ).where(ApiRequestLog.user_id == user.id, ApiRequestLog.created_at >= window.started_at)
    ).one()

    total_calls, requests_used, success_calls, failed_calls, blocked_calls, average_duration = (
        aggregates
    )

    return UsageSnapshot(
        plan=plan,
        window=window,
        groups_used=groups_used,
        total_calls=int(total_calls or 0),
        requests_used=int(requests_used or 0),
        success_calls=int(success_calls or 0),
        failed_calls=int(failed_calls or 0),
        blocked_calls=int(blocked_calls or 0),
        average_duration_ms=int(average_duration or 0),
    )


def ensure_group_limit(db: Session, user: User) -> None:
    snapshot = get_usage_snapshot(db, user)
    limit = snapshot.plan.limits.max_groups

    if limit is not None and snapshot.groups_used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f'{snapshot.plan.name} allows up to {limit} API groups. '
                "Upgrade your plan or remove an existing group to continue."
            ),
        )


def ensure_request_limit(db: Session, user: User) -> UsageSnapshot:
    snapshot = get_usage_snapshot(db, user)
    limit = snapshot.plan.limits.max_requests

    if limit is not None and snapshot.requests_used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f'{snapshot.plan.name} includes {limit} document extraction calls per recharge. '
                "Recharge your plan to continue processing documents."
            ),
        )

    return snapshot


def get_file_size_limit_bytes(plan_limits: PlanLimits) -> int | None:
    if plan_limits.max_file_size_mb is None:
        return None
    return plan_limits.max_file_size_mb * 1024 * 1024
