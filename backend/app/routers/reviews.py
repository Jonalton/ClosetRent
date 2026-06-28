import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.rental import Rental, RentalStatusEnum
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewRead

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("/", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rental_result = await db.execute(select(Rental).where(Rental.id == data.rental_id))
    rental = rental_result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.status not in [RentalStatusEnum.completed]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental must be completed to review")
    if rental.renter_id != current_user.id and rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not part of this rental")

    existing = await db.execute(
        select(Review).where(Review.rental_id == data.rental_id).where(Review.type == data.type)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review already submitted")

    review = Review(
        rental_id=data.rental_id,
        reviewer_id=current_user.id,
        reviewee_id=data.reviewee_id,
        rating=data.rating,
        comment=data.comment,
        type=data.type,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


@router.get("/user/{user_id}", response_model=list[ReviewRead])
async def get_user_reviews(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review).where(Review.reviewee_id == user_id).order_by(Review.created_at.desc())
    )
    return result.scalars().all()
