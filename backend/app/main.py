from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.middleware.cors import setup_cors
from app.middleware.logging import setup_logging
from app.routers import auth, users, listings, rentals, payments, reviews, search, storage, messages

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title="ClosetRent API",
    version="1.0.0",
    description="Peer-to-peer fashion rental marketplace",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

setup_cors(app)
setup_logging(app)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(listings.router)
app.include_router(rentals.router)
app.include_router(payments.router)
app.include_router(reviews.router)
app.include_router(search.router)
app.include_router(storage.router)
app.include_router(messages.router)


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
