import datetime
from google.cloud import storage
from app.config import settings


class StorageService:
    def __init__(self):
        self.client = storage.Client(project=settings.GCP_PROJECT_ID)
        self.bucket_name = settings.GCS_BUCKET_NAME

    def generate_signed_upload_url(self, object_name: str, content_type: str) -> dict:
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(object_name)

        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=15),
            method="PUT",
            content_type=content_type,
        )

        public_url = f"https://storage.googleapis.com/{self.bucket_name}/{object_name}"
        return {"signed_url": url, "public_url": public_url}

    def delete_object(self, object_name: str) -> None:
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(object_name)
        blob.delete()


storage_service = StorageService()
