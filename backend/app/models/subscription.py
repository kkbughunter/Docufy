from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    plan_key: Mapped[str] = mapped_column(String(50), default="trial", nullable=False)
    billing_status: Mapped[str] = mapped_column(String(50), default="trial", nullable=False)
    dodo_customer_id: Mapped[str | None] = mapped_column(String(255), index=True)
    dodo_subscription_id: Mapped[str | None] = mapped_column(String(255), index=True)
    dodo_product_id: Mapped[str | None] = mapped_column(String(255))
    billing_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    billing_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="subscription")
