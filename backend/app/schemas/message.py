import uuid
from datetime import datetime
from pydantic import BaseModel


class MessageOut(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_avatar: str | None
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InboxItem(BaseModel):
    rental_id: uuid.UUID
    listing_title: str
    other_party_name: str
    other_party_avatar: str | None
    last_message: str | None
    last_message_at: datetime | None
    message_count: int
