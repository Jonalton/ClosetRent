from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.services.firebase_service import firebase_service

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        decoded = firebase_service.verify_id_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    firebase_uid = decoded["uid"]
    email = decoded.get("email", "")

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is not None:
            user.firebase_uid = firebase_uid

    if user is None:
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            display_name=decoded.get("name", email.split("@")[0]),
            avatar_url=decoded.get("picture"),
        )
        db.add(user)

    await db.flush()
    await db.refresh(user)
    return user
