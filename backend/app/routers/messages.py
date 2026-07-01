import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user
from app.models.message import Message
from app.models.rental import Rental
from app.models.listing import Listing
from app.models.user import User
from app.schemas.message import MessageOut, InboxItem

router = APIRouter(tags=["messages"])


class MessageCreate(BaseModel):
    body: str


async def _get_rental_or_403(rental_id: uuid.UUID, current_user, db: AsyncSession) -> Rental:
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.renter_id != current_user.id and rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return rental


@router.get("/api/rentals/{rental_id}/messages", response_model=list[MessageOut])
async def get_messages(
    rental_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_rental_or_403(rental_id, current_user, db)

    result = await db.execute(
        select(Message, User)
        .join(User, Message.sender_id == User.id)
        .where(Message.rental_id == rental_id)
        .order_by(Message.created_at.asc())
    )
    rows = result.all()
    return [
        MessageOut(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=sender.display_name,
            sender_avatar=sender.avatar_url,
            body=msg.body,
            created_at=msg.created_at,
        )
        for msg, sender in rows
    ]


@router.post("/api/rentals/{rental_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    rental_id: uuid.UUID,
    body: MessageCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_rental_or_403(rental_id, current_user, db)

    msg = Message(rental_id=rental_id, sender_id=current_user.id, body=body.body)
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_name=current_user.display_name,
        sender_avatar=current_user.avatar_url,
        body=msg.body,
        created_at=msg.created_at,
    )


@router.get("/api/inbox", response_model=list[InboxItem])
async def get_inbox(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all rentals where user is renter or owner, with listing and message info
    rentals_result = await db.execute(
        select(Rental, Listing)
        .join(Listing, Rental.listing_id == Listing.id)
        .where(
            (Rental.renter_id == current_user.id) | (Rental.owner_id == current_user.id)
        )
        .order_by(Rental.updated_at.desc())
    )
    rental_rows = rentals_result.all()

    if not rental_rows:
        return []

    rental_ids = [r.id for r, _ in rental_rows]

    # Get last message and count per rental
    last_msg_result = await db.execute(
        select(
            Message.rental_id,
            func.max(Message.created_at).label("last_message_at"),
            func.count(Message.id).label("message_count"),
        )
        .where(Message.rental_id.in_(rental_ids))
        .group_by(Message.rental_id)
    )
    stats_by_rental = {row.rental_id: row for row in last_msg_result.all()}

    # Get last message body per rental
    last_body_result = await db.execute(
        select(Message)
        .where(Message.rental_id.in_(rental_ids))
        .order_by(Message.rental_id, Message.created_at.desc())
    )
    all_msgs = last_body_result.scalars().all()
    last_body_by_rental: dict[uuid.UUID, str] = {}
    for m in all_msgs:
        if m.rental_id not in last_body_by_rental:
            last_body_by_rental[m.rental_id] = m.body

    # Gather unique other-party user IDs
    other_party_ids = set()
    for rental, _ in rental_rows:
        other_id = rental.owner_id if rental.renter_id == current_user.id else rental.renter_id
        other_party_ids.add(other_id)

    users_result = await db.execute(select(User).where(User.id.in_(other_party_ids)))
    users_by_id = {u.id: u for u in users_result.scalars().all()}

    items = []
    for rental, listing in rental_rows:
        other_id = rental.owner_id if rental.renter_id == current_user.id else rental.renter_id
        other_user = users_by_id.get(other_id)
        stats = stats_by_rental.get(rental.id)
        items.append(InboxItem(
            rental_id=rental.id,
            listing_title=listing.title,
            other_party_name=other_user.display_name if other_user else "Unknown",
            other_party_avatar=other_user.avatar_url if other_user else None,
            last_message=last_body_by_rental.get(rental.id),
            last_message_at=stats.last_message_at if stats else None,
            message_count=stats.message_count if stats else 0,
        ))

    # Sort by last_message_at desc (threads with messages first)
    items.sort(key=lambda x: x.last_message_at or rental_rows[0][0].created_at, reverse=True)
    return items
