from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.subscription import UserSubscription
from app.models.user import User


def get_or_create_user_subscription(db: Session, user: User) -> UserSubscription:
    subscription = user.subscription
    if subscription is not None:
        return subscription

    subscription = UserSubscription(user_id=user.id)
    db.add(subscription)
    db.flush()
    user.subscription = subscription
    return subscription
