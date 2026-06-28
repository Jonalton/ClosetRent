import uuid
import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SAEnum
from app.database import Base


class PaymentStatusEnum(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rental_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rentals.id"), nullable=False, index=True
    )
    stripe_payment_intent_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    stripe_transfer_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    amount_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    platform_fee_cad: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[PaymentStatusEnum] = mapped_column(
        SAEnum(PaymentStatusEnum), default=PaymentStatusEnum.pending, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rental: Mapped["Rental"] = relationship("Rental", back_populates="payments")
