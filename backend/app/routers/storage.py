import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.services.storage import storage_service

router = APIRouter(prefix="/api/storage", tags=["storage"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif"
}


class SignedUrlRequest(BaseModel):
    filename: str
    content_type: str


@router.post("/signed-url")
async def get_signed_url(
    body: SignedUrlRequest,
    current_user=Depends(get_current_user),
):
    if body.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Content type {body.content_type} not allowed")

    ext = body.filename.rsplit(".", 1)[-1] if "." in body.filename else "jpg"
    object_name = f"listings/{current_user.id}/{uuid.uuid4()}.{ext}"

    result = storage_service.generate_signed_upload_url(object_name, body.content_type)
    return result
