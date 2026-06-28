import asyncio
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db

TEST_USER_ID = uuid.uuid4()
TEST_FIREBASE_UID = "test-firebase-uid"


async def override_get_current_user():
    async with TestingSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.firebase_uid == TEST_FIREBASE_UID))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=TEST_USER_ID,
                firebase_uid=TEST_FIREBASE_UID,
                email="test@example.com",
                display_name="Test User",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user


from app.dependencies import get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session
