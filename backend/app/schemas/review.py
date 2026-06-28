import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.review import ReviewTypeEnum


class ReviewCreate(BaseModel):
    rental_id: uuid.UUID
    reviewee_id: uuid.UUID
    rating: int
    comment: str
    type: ReviewTypeEnum

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class ReviewRead(BaseModel):
    id: uuid.UUID
    rental_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID
    rating: int
    comment: str
    type: ReviewTypeEnum
    created_at: datetime

    model_config = {"from_attributes": True}
