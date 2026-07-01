"""add messages, stripe_customer_id, returned_at

Revision ID: 003
Revises: 002
Create Date: 2026-06-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(64), nullable=True))
    op.add_column("rentals", sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("rental_id", UUID(as_uuid=True), sa.ForeignKey("rentals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_messages_rental_id", "messages", ["rental_id"])


def downgrade() -> None:
    op.drop_index("ix_messages_rental_id", table_name="messages")
    op.drop_table("messages")
    op.drop_column("rentals", "returned_at")
    op.drop_column("users", "stripe_customer_id")
