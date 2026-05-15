"""Add credit balance to user subscriptions

Revision ID: 202605150005
Revises: 202605150004
Create Date: 2026-05-15 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202605150005"
down_revision: Union[str, None] = "202605150004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_subscriptions",
        sa.Column("request_credits_balance", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute(
        """
        UPDATE user_subscriptions
        SET request_credits_balance = CASE plan_key
            WHEN 'trial' THEN 5
            WHEN 'starter' THEN 1099
            WHEN 'growth' THEN 3099
            WHEN 'scale' THEN 14000
            ELSE 0
        END
        WHERE request_credits_balance = 0
        """
    )


def downgrade() -> None:
    op.drop_column("user_subscriptions", "request_credits_balance")
