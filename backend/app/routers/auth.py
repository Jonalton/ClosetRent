from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserCreate

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/sync", response_model=UserRead)
@limiter.limit("10/minute")
async def sync_user(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Sync Firebase user to backend — creates user on first call."""
    return current_user
