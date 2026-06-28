import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_listing(client: AsyncClient):
    payload = {
        "title": "Silk Midi Dress",
        "description": "Beautiful silk midi dress, perfect for evening events.",
        "category": "dresses",
        "size": "M",
        "brand": "Reformation",
        "retail_price_cad": "450.00",
        "rental_price_per_day_cad": "35.00",
        "deposit_cad": "100.00",
        "condition": "excellent",
        "images": ["https://storage.googleapis.com/closetrent-listing-images/test.jpg"],
        "tags": ["silk", "midi", "evening"],
    }
    response = await client.post("/api/listings/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Silk Midi Dress"
    assert data["category"] == "dresses"
    assert data["is_available"] is True


@pytest.mark.asyncio
async def test_list_listings(client: AsyncClient):
    response = await client.get("/api/listings/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_listing(client: AsyncClient):
    payload = {
        "title": "Black Blazer",
        "description": "Sharp black blazer for professional settings.",
        "category": "outerwear",
        "size": "S",
        "brand": "Zara",
        "retail_price_cad": "180.00",
        "rental_price_per_day_cad": "20.00",
        "deposit_cad": "50.00",
        "condition": "good",
        "images": [],
        "tags": ["blazer", "professional"],
    }
    create_resp = await client.post("/api/listings/", json=payload)
    listing_id = create_resp.json()["id"]

    response = await client.get(f"/api/listings/{listing_id}")
    assert response.status_code == 200
    assert response.json()["id"] == listing_id


@pytest.mark.asyncio
async def test_get_listing_not_found(client: AsyncClient):
    import uuid
    response = await client.get(f"/api/listings/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_listing(client: AsyncClient):
    payload = {
        "title": "Red Dress",
        "description": "Vibrant red dress.",
        "category": "dresses",
        "size": "L",
        "brand": "H&M",
        "retail_price_cad": "80.00",
        "rental_price_per_day_cad": "15.00",
        "deposit_cad": "30.00",
        "condition": "fair",
        "images": [],
        "tags": [],
    }
    create_resp = await client.post("/api/listings/", json=payload)
    listing_id = create_resp.json()["id"]

    update_resp = await client.patch(f"/api/listings/{listing_id}", json={"title": "Updated Red Dress"})
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Updated Red Dress"


@pytest.mark.asyncio
async def test_listing_availability(client: AsyncClient):
    payload = {
        "title": "Test Availability Dress",
        "description": "For testing availability endpoint.",
        "category": "dresses",
        "size": "XS",
        "brand": "TestBrand",
        "retail_price_cad": "100.00",
        "rental_price_per_day_cad": "10.00",
        "deposit_cad": "25.00",
        "condition": "excellent",
        "images": [],
        "tags": [],
    }
    create_resp = await client.post("/api/listings/", json=payload)
    listing_id = create_resp.json()["id"]

    avail_resp = await client.get(f"/api/listings/{listing_id}/availability")
    assert avail_resp.status_code == 200
    assert isinstance(avail_resp.json(), list)
