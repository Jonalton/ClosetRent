from fastapi import APIRouter, Query
from app.services.algolia_service import algolia_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/")
async def search_listings(
    q: str = Query(""),
    category: str | None = Query(None),
    size: str | None = Query(None),
    page: int = Query(0, ge=0),
    hits_per_page: int = Query(20, le=100),
):
    filters_parts = ["is_available:true"]
    if category:
        filters_parts.append(f"category:{category}")
    if size:
        filters_parts.append(f"size:{size}")
    filters = " AND ".join(filters_parts)

    results = algolia_service.search(q, filters=filters, page=page, hits_per_page=hits_per_page)
    return results
