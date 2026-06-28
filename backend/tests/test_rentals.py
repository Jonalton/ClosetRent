import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.listing import Listing
from app.models.rental import Rental, RentalStatusEnum


async def create_test_listing(db: AsyncSession, owner_id: uuid.UUID) -> Listing:
    listing = Listing(
        owner_id=owner_id,
        title="Test Listing for Rental",
        description="A listing used in tests.",
        category="dresses",
        size="M",
        brand="TestBrand",
        retail_price_cad="200.00",
        rental_price_per_day_cad="25.00",
        deposit_cad="75.00",
        condition="excellent",
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


@pytest.mark.asyncio
async def test_get_my_rentals_empty(client: AsyncClient):
    response = await client.get("/api/rentals/my")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_rental_status_transitions(db_session: AsyncSession, client: AsyncClient):
    from tests.conftest import TEST_USER_ID
    # Create another user as owner
    owner = User(
        firebase_uid="owner-firebase-uid",
        email="owner@example.com",
        display_name="Listing Owner",
    )
    db_session.add(owner)
    await db_session.flush()

    listing = Listing(
        owner_id=owner.id,
        title="Owner's Dress",
        description="A listing owned by another user.",
        category="dresses",
        size="S",
        brand="Chanel",
        retail_price_cad="500.00",
        rental_price_per_day_cad="50.00",
        deposit_cad="150.00",
        condition="excellent",
    )
    db_session.add(listing)
    await db_session.flush()

    rental = Rental(
        listing_id=listing.id,
        renter_id=TEST_USER_ID,
        owner_id=owner.id,
        start_date="2025-03-01",
        end_date="2025-03-05",
        total_price_cad="200.00",
        deposit_cad="150.00",
        status=RentalStatusEnum.pending,
    )
    db_session.add(rental)
    await db_session.commit()

    # Invalid transition: pending -> active
    response = await client.patch(
        f"/api/rentals/{rental.id}/status", json={"status": "active"}
    )
    assert response.status_code == 400

    # Valid transition: pending -> confirmed
    response = await client.patch(
        f"/api/rentals/{rental.id}/status", json={"status": "confirmed"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
