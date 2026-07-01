import uuid
from datetime import datetime
from sqlalchemy import Text, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rental_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rentals.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rental: Mapped["Rental"] = relationship("Rental", back_populates="messages")
    sender: Mapped["User"] = relationship("User")

    __table_args__ = (Index("ix_messages_rental_id", "rental_id"),)
