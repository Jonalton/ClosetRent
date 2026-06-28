import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, func, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SAEnum
from app.database import Base


class ReviewTypeEnum(str, enum.Enum):
    renter_to_owner = "renter_to_owner"
    owner_to_renter = "owner_to_renter"


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rental_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rentals.id"), nullable=False
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    reviewee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(String(2000), nullable=False)
    type: Mapped[ReviewTypeEnum] = mapped_column(SAEnum(ReviewTypeEnum), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rental: Mapped["Rental"] = relationship("Rental", back_populates="review")
    reviewer: Mapped["User"] = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee: Mapped["User"] = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating"),
        UniqueConstraint("rental_id", "type", name="uq_reviews_rental_type"),
    )
