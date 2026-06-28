from algoliasearch.search_client import SearchClient
from app.config import settings


class AlgoliaService:
    def __init__(self):
        if settings.ALGOLIA_APP_ID and settings.ALGOLIA_API_KEY:
            self.client = SearchClient.create(settings.ALGOLIA_APP_ID, settings.ALGOLIA_API_KEY)
            self.index = self.client.init_index(settings.ALGOLIA_INDEX_NAME)
        else:
            self.client = None
            self.index = None

    def index_listing(self, listing_data: dict) -> None:
        if self.index is None:
            return
        record = {
            "objectID": str(listing_data["id"]),
            "title": listing_data["title"],
            "description": listing_data["description"],
            "category": listing_data["category"],
            "brand": listing_data["brand"],
            "size": listing_data["size"],
            "condition": listing_data["condition"],
            "rental_price_per_day_cad": float(listing_data["rental_price_per_day_cad"]),
            "tags": listing_data.get("tags", []),
            "images": listing_data.get("images", []),
            "is_available": listing_data.get("is_available", True),
        }
        self.index.save_object(record)

    def update_listing(self, listing_id: str, updates: dict) -> None:
        if self.index is None:
            return
        updates["objectID"] = listing_id
        self.index.partial_update_object(updates)

    def delete_listing(self, listing_id: str) -> None:
        if self.index is None:
            return
        self.index.delete_object(listing_id)

    def search(self, query: str, filters: str = "", page: int = 0, hits_per_page: int = 20) -> dict:
        if self.index is None:
            return {"hits": [], "nbHits": 0, "page": 0, "nbPages": 0}
        results = self.index.search(query, {
            "filters": filters,
            "page": page,
            "hitsPerPage": hits_per_page,
        })
        return results


algolia_service = AlgoliaService()
