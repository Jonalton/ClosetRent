import uuid
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
from app.models.listing import CategoryEnum, ConditionEnum


class ListingBase(BaseModel):
    title: str
    description: str
    category: CategoryEnum
    size: str
    brand: str
    retail_price_cad: Decimal
    rental_price_per_day_cad: Decimal
    deposit_cad: Decimal
    condition: ConditionEnum
    images: list[str] = []
    tags: list[str] = []


class ListingCreate(ListingBase):
    pass


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: CategoryEnum | None = None
    size: str | None = None
    brand: str | None = None
    retail_price_cad: Decimal | None = None
    rental_price_per_day_cad: Decimal | None = None
    deposit_cad: Decimal | None = None
    condition: ConditionEnum | None = None
    is_available: bool | None = None
    images: list[str] | None = None
    tags: list[str] | None = None


class ListingRead(ListingBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    is_available: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AvailabilityRange(BaseModel):
    start_date: date
    end_date: date
