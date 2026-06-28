import uuid
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, model_validator
from app.models.rental import RentalStatusEnum


class RentalCreate(BaseModel):
    listing_id: uuid.UUID
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self) -> "RentalCreate":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class RentalStatusUpdate(BaseModel):
    status: RentalStatusEnum


class RentalRead(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID
    renter_id: uuid.UUID
    owner_id: uuid.UUID
    start_date: date
    end_date: date
    total_price_cad: Decimal
    deposit_cad: Decimal
    status: RentalStatusEnum
    stripe_payment_intent_id: str | None = None
    stripe_deposit_intent_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
