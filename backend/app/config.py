from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    GCP_PROJECT_ID: str
    GCP_REGION: str = "northamerica-northeast2"
    GCS_BUCKET_NAME: str

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"

    FIREBASE_PROJECT_ID: str
    FIREBASE_SERVICE_ACCOUNT_JSON: str

    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_CONNECT_CLIENT_ID: str

    ALGOLIA_APP_ID: str = ""
    ALGOLIA_API_KEY: str = ""
    ALGOLIA_INDEX_NAME: str = "closetrent_listings"

    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
