import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.listing import Listing
from app.models.rental import Rental, RentalStatusEnum
from app.schemas.listing import ListingCreate, ListingRead, ListingUpdate, AvailabilityRange
from app.services.algolia_service import algolia_service

router = APIRouter(prefix="/api/listings", tags=["listings"])


@router.post("/", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: ListingCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    listing = Listing(**data.model_dump(), owner_id=current_user.id)
    db.add(listing)
    await db.flush()
    await db.refresh(listing)
    algolia_service.index_listing({
        **data.model_dump(),
        "id": listing.id,
        "owner_id": listing.owner_id,
        "is_available": listing.is_available,
    })
    return listing


@router.get("/", response_model=list[ListingRead])
async def list_listings(
    category: str | None = Query(None),
    size: str | None = Query(None),
    is_available: bool = Query(True),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Listing).where(Listing.is_available == is_available)
    if category:
        stmt = stmt.where(Listing.category == category)
    if size:
        stmt = stmt.where(Listing.size == size)
    stmt = stmt.limit(limit).offset(offset).order_by(Listing.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{listing_id}", response_model=ListingRead)
async def get_listing(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


@router.patch("/{listing_id}", response_model=ListingRead)
async def update_listing(
    listing_id: uuid.UUID,
    updates: ListingUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not owner")

    update_data = updates.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(listing, field, value)
    db.add(listing)
    await db.flush()
    await db.refresh(listing)
    algolia_service.update_listing(str(listing_id), update_data)
    return listing


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not owner")
    await db.delete(listing)
    algolia_service.delete_listing(str(listing_id))


@router.get("/{listing_id}/availability", response_model=list[AvailabilityRange])
async def get_availability(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    blocked_statuses = [RentalStatusEnum.confirmed, RentalStatusEnum.shipped, RentalStatusEnum.active]
    result = await db.execute(
        select(Rental.start_date, Rental.end_date)
        .where(Rental.listing_id == listing_id)
        .where(Rental.status.in_(blocked_statuses))
    )
    ranges = result.all()
    return [{"start_date": r.start_date, "end_date": r.end_date} for r in ranges]
