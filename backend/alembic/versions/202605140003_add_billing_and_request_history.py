"""Add billing fields and request history

Revision ID: 202605140003
Revises: 202605140002
Create Date: 2026-05-14 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "202605140003"
down_revision: Union[str, None] = "202605140002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("plan_key", sa.String(length=50), nullable=False, server_default="trial"),
    )
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
    op.create_index(
        "ix_users_dodo_subscription_id",
        "users",
        ["dodo_subscription_id"],
        unique=False,
    )

    op.create_table(
        "api_request_logs",
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
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("api_groups.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("group_name", sa.String(length=255), nullable=True),
        sa.Column("endpoint_path", sa.String(length=255), nullable=False),
        sa.Column("http_method", sa.String(length=10), nullable=False),
        sa.Column("auth_mode", sa.String(length=20), nullable=False),
        sa.Column("request_status", sa.String(length=50), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ai_model", sa.String(length=100), nullable=True),
        sa.Column("used_ai_call", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("response_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_api_request_logs_user_id", "api_request_logs", ["user_id"], unique=False)
    op.create_index("ix_api_request_logs_group_id", "api_request_logs", ["group_id"], unique=False)
    op.create_index(
        "ix_api_request_logs_user_created_at",
        "api_request_logs",
        ["user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "billing_webhook_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("webhook_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index(
        "ix_billing_webhook_events_webhook_id",
        "billing_webhook_events",
        ["webhook_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_billing_webhook_events_webhook_id", table_name="billing_webhook_events")
    op.drop_table("billing_webhook_events")

    op.drop_index("ix_api_request_logs_user_created_at", table_name="api_request_logs")
    op.drop_index("ix_api_request_logs_group_id", table_name="api_request_logs")
    op.drop_index("ix_api_request_logs_user_id", table_name="api_request_logs")
    op.drop_table("api_request_logs")

    op.drop_index("ix_users_dodo_subscription_id", table_name="users")
    op.drop_index("ix_users_dodo_customer_id", table_name="users")
    op.drop_column("users", "billing_period_end")
    op.drop_column("users", "billing_period_start")
    op.drop_column("users", "dodo_product_id")
    op.drop_column("users", "dodo_subscription_id")
    op.drop_column("users", "dodo_customer_id")
    op.drop_column("users", "billing_status")
    op.drop_column("users", "plan_key")
