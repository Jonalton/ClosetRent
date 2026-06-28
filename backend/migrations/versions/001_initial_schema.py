"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("firebase_uid", sa.String(128), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("bio", sa.String(2000), nullable=True),
        sa.Column("stripe_account_id", sa.String(64), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"])
    op.create_index("ix_users_email", "users", ["email"])

    op.execute("CREATE TYPE categoryenum AS ENUM ('tops','bottoms','dresses','outerwear','accessories','shoes','formalwear')")
    op.execute("CREATE TYPE conditionenum AS ENUM ('excellent','good','fair')")

    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.String(5000), nullable=False),
        sa.Column("category", sa.Enum("tops","bottoms","dresses","outerwear","accessories","shoes","formalwear", name="categoryenum"), nullable=False),
        sa.Column("size", sa.String(20), nullable=False),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("retail_price_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("rental_price_per_day_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("deposit_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("condition", sa.Enum("excellent","good","fair", name="conditionenum"), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("images", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_listings_owner_id", "listings", ["owner_id"])
    op.create_index("ix_listings_category", "listings", ["category"])
    op.create_index("ix_listings_is_available", "listings", ["is_available"])

    op.execute("CREATE TYPE rentalstatusenum AS ENUM ('pending','confirmed','shipped','active','returned','completed','cancelled','disputed')")

    op.create_table(
        "rentals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("renter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("total_price_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("deposit_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.Enum("pending","confirmed","shipped","active","returned","completed","cancelled","disputed", name="rentalstatusenum"), nullable=False, server_default="pending"),
        sa.Column("stripe_payment_intent_id", sa.String(128), nullable=True),
        sa.Column("stripe_deposit_intent_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_rentals_listing_id", "rentals", ["listing_id"])
    op.create_index("ix_rentals_renter_id", "rentals", ["renter_id"])
    op.create_index("ix_rentals_owner_id", "rentals", ["owner_id"])
    op.create_index("ix_rentals_status", "rentals", ["status"])
    op.create_index("ix_rentals_dates", "rentals", ["start_date", "end_date"])

    op.execute("CREATE TYPE paymentstatusenum AS ENUM ('pending','succeeded','failed','refunded')")

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("rental_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rentals.id"), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(128), nullable=False, unique=True),
        sa.Column("stripe_transfer_id", sa.String(128), nullable=True),
        sa.Column("amount_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("platform_fee_cad", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.Enum("pending","succeeded","failed","refunded", name="paymentstatusenum"), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payments_rental_id", "payments", ["rental_id"])

    op.execute("CREATE TYPE reviewtypeenum AS ENUM ('renter_to_owner','owner_to_renter')")

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("rental_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rentals.id"), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(2000), nullable=False),
        sa.Column("type", sa.Enum("renter_to_owner","owner_to_renter", name="reviewtypeenum"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating"),
        sa.UniqueConstraint("rental_id", "type", name="uq_reviews_rental_type"),
    )
    op.create_index("ix_reviews_reviewer_id", "reviews", ["reviewer_id"])
    op.create_index("ix_reviews_reviewee_id", "reviews", ["reviewee_id"])


def downgrade() -> None:
    op.drop_table("reviews")
    op.execute("DROP TYPE reviewtypeenum")
    op.drop_table("payments")
    op.execute("DROP TYPE paymentstatusenum")
    op.drop_table("rentals")
    op.execute("DROP TYPE rentalstatusenum")
    op.drop_table("listings")
    op.execute("DROP TYPE conditionenum")
    op.execute("DROP TYPE categoryenum")
    op.drop_table("users")
