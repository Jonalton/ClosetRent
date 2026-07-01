import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Date, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SAEnum
from app.database import Base


class RentalStatusEnum(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    active = "active"
    returned = "returned"
    completed = "completed"
    cancelled = "cancelled"
    disputed = "disputed"


VALID_TRANSITIONS: dict[RentalStatusEnum, set[RentalStatusEnum]] = {
    RentalStatusEnum.pending: {RentalStatusEnum.confirmed, RentalStatusEnum.cancelled},
    RentalStatusEnum.confirmed: {RentalStatusEnum.shipped, RentalStatusEnum.cancelled},
    RentalStatusEnum.shipped: {RentalStatusEnum.active},
    RentalStatusEnum.active: {RentalStatusEnum.returned},
    RentalStatusEnum.returned: {RentalStatusEnum.completed, RentalStatusEnum.disputed},
    RentalStatusEnum.disputed: {RentalStatusEnum.completed, RentalStatusEnum.cancelled},
    RentalStatusEnum.completed: set(),
    RentalStatusEnum.cancelled: set(),
}


class Rental(Base):
    __tablename__ = "rentals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False, index=True
    )
    renter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_price_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[RentalStatusEnum] = mapped_column(
        SAEnum(RentalStatusEnum), default=RentalStatusEnum.pending, nullable=False
    )
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_deposit_intent_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    listing: Mapped["Listing"] = relationship("Listing", back_populates="rentals")
    renter: Mapped["User"] = relationship("User", foreign_keys=[renter_id], back_populates="rentals_as_renter")
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id], back_populates="rentals_as_owner")
    review: Mapped["Review | None"] = relationship("Review", back_populates="rental", uselist=False)
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="rental")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="rental", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_rentals_status", "status"),
        Index("ix_rentals_dates", "start_date", "end_date"),
    )
