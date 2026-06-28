import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from sqlalchemy import Enum as SAEnum
from app.database import Base


class CategoryEnum(str, enum.Enum):
    tops = "tops"
    bottoms = "bottoms"
    dresses = "dresses"
    outerwear = "outerwear"
    accessories = "accessories"
    shoes = "shoes"
    formalwear = "formalwear"


class ConditionEnum(str, enum.Enum):
    excellent = "excellent"
    good = "good"
    fair = "fair"


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(5000), nullable=False)
    category: Mapped[CategoryEnum] = mapped_column(SAEnum(CategoryEnum), nullable=False)
    size: Mapped[str] = mapped_column(String(20), nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    retail_price_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    rental_price_per_day_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    condition: Mapped[ConditionEnum] = mapped_column(SAEnum(ConditionEnum), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    images: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship("User", back_populates="listings")
    rentals: Mapped[list["Rental"]] = relationship("Rental", back_populates="listing")

    __table_args__ = (
        Index("ix_listings_category", "category"),
        Index("ix_listings_is_available", "is_available"),
        Index("ix_listings_owner_id", "owner_id"),
    )
