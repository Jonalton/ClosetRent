import uuid
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import stripe
from app.database import get_db
from app.dependencies import get_current_user
from app.models.listing import Listing
from app.models.rental import Rental, RentalStatusEnum, VALID_TRANSITIONS
from app.models.user import User
from app.schemas.rental import RentalCreate, RentalRead, RentalStatusUpdate
from app.services.stripe_service import stripe_service

router = APIRouter(prefix="/api/rentals", tags=["rentals"])


def _check_overlap(
    listing_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> bool:
    return False


@router.post("/", response_model=RentalRead, status_code=status.HTTP_201_CREATED)
async def create_rental(
    data: RentalCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    listing_result = await db.execute(select(Listing).where(Listing.id == data.listing_id))
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if not listing.is_available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Listing not available")
    if listing.owner_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot rent own listing")

    # Check date overlap
    blocked = [RentalStatusEnum.confirmed, RentalStatusEnum.shipped, RentalStatusEnum.active]
    overlap_result = await db.execute(
        select(Rental).where(
            and_(
                Rental.listing_id == data.listing_id,
                Rental.status.in_(blocked),
                Rental.start_date < data.end_date,
                Rental.end_date > data.start_date,
            )
        )
    )
    if overlap_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dates not available")

    num_days = (data.end_date - data.start_date).days
    fees = stripe_service.calculate_fees(listing.rental_price_per_day_cad, num_days)

    rental = Rental(
        listing_id=data.listing_id,
        renter_id=current_user.id,
        owner_id=listing.owner_id,
        start_date=data.start_date,
        end_date=data.end_date,
        total_price_cad=fees["total"],
        deposit_cad=listing.deposit_cad,
        status=RentalStatusEnum.pending,
    )
    db.add(rental)
    await db.flush()
    await db.refresh(rental)
    return rental


@router.post("/{rental_id}/approve", response_model=RentalRead)
async def approve_rental(
    rental_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only lister can approve")
    if rental.status != RentalStatusEnum.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental is not pending")

    renter_result = await db.execute(select(User).where(User.id == rental.renter_id))
    renter = renter_result.scalar_one_or_none()
    if not renter or not renter.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Renter has no payment method on file")
    if not current_user.stripe_account_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lister has not connected Stripe account")

    try:
        stripe_service.capture_deposit(rental)
        stripe_service.charge_rental(rental, current_user.stripe_account_id, renter.stripe_customer_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.user_message or e))

    rental.status = RentalStatusEnum.confirmed
    db.add(rental)
    await db.flush()
    await db.refresh(rental)
    return rental


@router.post("/{rental_id}/decline", response_model=RentalRead)
async def decline_rental(
    rental_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only lister can decline")
    if rental.status != RentalStatusEnum.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental is not pending")

    try:
        stripe_service.cancel_deposit(rental)
    except stripe.StripeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.user_message or e))

    rental.status = RentalStatusEnum.cancelled
    db.add(rental)
    await db.flush()
    await db.refresh(rental)
    return rental


@router.post("/{rental_id}/mark_returned", response_model=RentalRead)
async def mark_returned(
    rental_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.renter_id != current_user.id and rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if rental.status != RentalStatusEnum.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental is not active")

    rental.status = RentalStatusEnum.returned
    rental.returned_at = datetime.now(timezone.utc)
    db.add(rental)
    await db.flush()
    await db.refresh(rental)
    return rental


@router.post("/{rental_id}/release_deposit", response_model=RentalRead)
async def release_deposit(
    rental_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.status != RentalStatusEnum.returned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental is not in returned state")
    if not rental.returned_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="returned_at not set")

    now = datetime.now(timezone.utc)
    returned_at = rental.returned_at if rental.returned_at.tzinfo else rental.returned_at.replace(tzinfo=timezone.utc)
    hours_elapsed = (now - returned_at).total_seconds() / 3600
    if hours_elapsed < 48:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Deposit can only be released after 48h. {48 - hours_elapsed:.1f}h remaining.",
        )

    stripe_service.refund_deposit(rental)
    rental.status = RentalStatusEnum.completed
    db.add(rental)
    await db.flush()
    await db.refresh(rental)
    return rental


@router.get("/my", response_model=list[RentalRead])
async def get_my_rentals(
    role: str = "renter",
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if role == "owner":
        stmt = select(Rental).where(Rental.owner_id == current_user.id)
    else:
        stmt = select(Rental).where(Rental.renter_id == current_user.id)
    result = await db.execute(stmt.order_by(Rental.created_at.desc()))
    return result.scalars().all()


@router.get("/{rental_id}", response_model=RentalRead)
async def get_rental(
    rental_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.renter_id != current_user.id and rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return rental


@router.patch("/{rental_id}/status", response_model=RentalRead)
async def update_rental_status(
    rental_id: uuid.UUID,
    body: RentalStatusUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.renter_id != current_user.id and rental.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    new_status = body.status
    if new_status not in VALID_TRANSITIONS.get(rental.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {rental.status} to {new_status}",
        )

    rental.status = new_status

    # On completion, trigger owner payout
    if new_status == RentalStatusEnum.completed and rental.stripe_payment_intent_id:
        listing_result = await db.execute(select(Listing).where(Listing.id == rental.listing_id))
        listing = listing_result.scalar_one_or_none()
        if listing:
            from app.models.user import User
            owner_result = await db.execute(select(User).where(User.id == rental.owner_id))
            owner = owner_result.scalar_one_or_none()
            if owner and owner.stripe_account_id:
                num_days = (rental.end_date - rental.start_date).days
                fees = stripe_service.calculate_fees(listing.rental_price_per_day_cad, num_days)
                stripe_service.transfer_to_owner(
                    fees["owner_payout"], owner.stripe_account_id, str(rental.id)
                )

    db.add(rental)
    await db.flush()
    await db.refresh(rental)
    return rental
