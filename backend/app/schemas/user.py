import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None


class UserCreate(UserBase):
    firebase_uid: str


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


class UserRead(UserBase):
    id: uuid.UUID
    firebase_uid: str
    stripe_account_id: str | None = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
