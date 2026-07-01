"""add south_asian category

Revision ID: 002
Revises: 001
Create Date: 2026-06-28 00:00:00.000000
"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoryenum') THEN
                ALTER TYPE categoryenum ADD VALUE IF NOT EXISTS 'south_asian';
            ELSE
                CREATE TYPE categoryenum AS ENUM (
                    'tops','bottoms','dresses','outerwear','accessories','shoes','formalwear','south_asian'
                );
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; a full type recreation is required
    op.execute("""
        ALTER TABLE listings
            ALTER COLUMN category TYPE text;
        UPDATE listings SET category = 'formalwear' WHERE category = 'south_asian';
        DROP TYPE categoryenum;
        CREATE TYPE categoryenum AS ENUM (
            'tops','bottoms','dresses','outerwear','accessories','shoes','formalwear'
        );
        ALTER TABLE listings
            ALTER COLUMN category TYPE categoryenum
            USING category::categoryenum;
    """)
