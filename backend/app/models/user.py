import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    stripe_account_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    listings: Mapped[list["Listing"]] = relationship(
        "Listing", back_populates="owner", cascade="all, delete-orphan"
    )
    rentals_as_renter: Mapped[list["Rental"]] = relationship(
        "Rental", foreign_keys="Rental.renter_id", back_populates="renter"
    )
    rentals_as_owner: Mapped[list["Rental"]] = relationship(
        "Rental", foreign_keys="Rental.owner_id", back_populates="owner"
    )
    reviews_given: Mapped[list["Review"]] = relationship(
        "Review", foreign_keys="Review.reviewer_id", back_populates="reviewer"
    )
    reviews_received: Mapped[list["Review"]] = relationship(
        "Review", foreign_keys="Review.reviewee_id", back_populates="reviewee"
    )
