"""Split user subscription data into dedicated table

Revision ID: 202605150004
Revises: 202605140003
Create Date: 2026-05-15 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202605150004"
down_revision: Union[str, None] = "202605140003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("plan_key", sa.String(length=50), nullable=False, server_default="trial"),
        sa.Column("billing_status", sa.String(length=50), nullable=False, server_default="trial"),
        sa.Column("dodo_customer_id", sa.String(length=255), nullable=True),
        sa.Column("dodo_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("dodo_product_id", sa.String(length=255), nullable=True),
        sa.Column("billing_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("billing_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("user_id", name="uq_user_subscriptions_user_id"),
    )
    op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"], unique=True)
    op.create_index(
        "ix_user_subscriptions_dodo_customer_id",
        "user_subscriptions",
        ["dodo_customer_id"],
        unique=False,
    )
    op.create_index(
        "ix_user_subscriptions_dodo_subscription_id",
        "user_subscriptions",
        ["dodo_subscription_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO user_subscriptions (
            user_id,
            plan_key,
            billing_status,
            dodo_customer_id,
            dodo_subscription_id,
            dodo_product_id,
            billing_period_start,
            billing_period_end
        )
        SELECT
            id,
            plan_key,
            billing_status,
            dodo_customer_id,
            dodo_subscription_id,
            dodo_product_id,
            billing_period_start,
            billing_period_end
        FROM users
        """
    )

    op.drop_index("ix_users_dodo_subscription_id", table_name="users")
    op.drop_index("ix_users_dodo_customer_id", table_name="users")
    op.drop_column("users", "billing_period_end")
    op.drop_column("users", "billing_period_start")
    op.drop_column("users", "dodo_product_id")
    op.drop_column("users", "dodo_subscription_id")
    op.drop_column("users", "dodo_customer_id")
    op.drop_column("users", "billing_status")
    op.drop_column("users", "plan_key")


def downgrade() -> None:
    op.add_column("users", sa.Column("plan_key", sa.String(length=50), nullable=False, server_default="trial"))
    op.add_column(
        "users",
        sa.Column("billing_status", sa.String(length=50), nullable=False, server_default="trial"),
    )
    op.add_column("users", sa.Column("dodo_customer_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("dodo_subscription_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("dodo_product_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("billing_period_start", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("billing_period_end", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_dodo_customer_id", "users", ["dodo_customer_id"], unique=False)
    op.create_index("ix_users_dodo_subscription_id", "users", ["dodo_subscription_id"], unique=False)

    op.execute(
        """
        UPDATE users AS u
        SET
            plan_key = s.plan_key,
            billing_status = s.billing_status,
            dodo_customer_id = s.dodo_customer_id,
            dodo_subscription_id = s.dodo_subscription_id,
            dodo_product_id = s.dodo_product_id,
            billing_period_start = s.billing_period_start,
            billing_period_end = s.billing_period_end
        FROM user_subscriptions AS s
        WHERE s.user_id = u.id
        """
    )

    op.drop_index("ix_user_subscriptions_dodo_subscription_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_dodo_customer_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_user_id", table_name="user_subscriptions")
    op.drop_table("user_subscriptions")
