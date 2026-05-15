from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.subscription import UserSubscription
from app.models.user import User
from app.services.plan_service import get_plan


def get_or_create_user_subscription(db: Session, user: User) -> UserSubscription:
    subscription = user.subscription
    if subscription is not None:
        return subscription

    trial_plan = get_plan("trial")
    subscription = UserSubscription(user_id=user.id)
    if trial_plan.limits.max_requests is not None:
        subscription.request_credits_balance = trial_plan.limits.max_requests
    db.add(subscription)
    db.flush()
    user.subscription = subscription
    return subscription
