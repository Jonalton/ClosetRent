import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user
from app.models.rental import Rental, RentalStatusEnum
from app.models.payment import Payment, PaymentStatusEnum
from app.models.listing import Listing
from app.models.user import User
from app.models.message import Message
from app.schemas.rental import BookingRequestSchema, BookingResponseSchema
from app.services.stripe_service import stripe_service
import stripe

router = APIRouter(prefix="/api/payments", tags=["payments"])


class CheckoutRequest(BaseModel):
    rental_id: uuid.UUID


class OnboardRequest(BaseModel):
    refresh_url: str
    return_url: str


@router.post("/checkout")
async def checkout(
    body: CheckoutRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == body.rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    if rental.renter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if rental.status != RentalStatusEnum.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rental is not pending")

    listing_result = await db.execute(select(Listing).where(Listing.id == rental.listing_id))
    listing = listing_result.scalar_one_or_none()
    owner_result = await db.execute(select(User).where(User.id == rental.owner_id))
    owner = owner_result.scalar_one_or_none()

    if not owner or not owner.stripe_account_id:
        raise HTTPException(status_code=400, detail="Owner has not connected Stripe account")

    num_days = (rental.end_date - rental.start_date).days
    fees = stripe_service.calculate_fees(listing.rental_price_per_day_cad, num_days)

    intent = stripe_service.create_payment_intent(
        amount_cad=fees["total"],
        platform_fee_cad=fees["platform_fee"],
        owner_stripe_account_id=owner.stripe_account_id,
        rental_id=str(rental.id),
    )

    deposit_intent = stripe_service.create_deposit_intent(
        deposit_cad=rental.deposit_cad,
        rental_id=str(rental.id),
    )

    rental.stripe_payment_intent_id = intent.id
    rental.stripe_deposit_intent_id = deposit_intent.id
    db.add(rental)

    payment = Payment(
        rental_id=rental.id,
        stripe_payment_intent_id=intent.id,
        amount_cad=fees["total"],
        platform_fee_cad=fees["platform_fee"],
        status=PaymentStatusEnum.pending,
    )
    db.add(payment)

    await db.flush()

    return {
        "client_secret": intent.client_secret,
        "deposit_client_secret": deposit_intent.client_secret,
        "amount_cad": str(fees["total"]),
        "deposit_cad": str(rental.deposit_cad),
    }


@router.post("/request-booking", response_model=BookingResponseSchema, status_code=status.HTTP_201_CREATED)
async def request_booking(
    body: BookingRequestSchema,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    listing_result = await db.execute(select(Listing).where(Listing.id == body.listing_id))
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if not listing.is_available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Listing not available")
    if listing.owner_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot rent own listing")

    # Check availability with 2-day buffer.
    # Arithmetic must be on the Python date values (right-hand side), not on the
    # SQLAlchemy Column objects — subtracting timedelta from a Column is invalid.
    buffer = timedelta(days=2)
    buffered_start = body.start_date - buffer  # earliest a blocking rental may end
    buffered_end = body.end_date + buffer       # latest a blocking rental may start
    blocked_statuses = [RentalStatusEnum.confirmed, RentalStatusEnum.shipped, RentalStatusEnum.active, RentalStatusEnum.pending]
    overlap_result = await db.execute(
        select(Rental).where(
            and_(
                Rental.listing_id == body.listing_id,
                Rental.status.in_(blocked_statuses),
                Rental.start_date < buffered_end,
                Rental.end_date > buffered_start,
            )
        )
    )
    if overlap_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dates not available")

    num_days = (body.end_date - body.start_date).days
    total_price_cad = listing.rental_price_per_day_cad * num_days

    try:
        # Get or create Stripe Customer and attach payment method
        customer_id = stripe_service.get_or_create_customer(current_user)
        if not current_user.stripe_customer_id:
            current_user.stripe_customer_id = customer_id
            db.add(current_user)

        stripe.PaymentMethod.attach(body.payment_method_id, customer=customer_id)
        stripe.Customer.modify(customer_id, invoice_settings={"default_payment_method": body.payment_method_id})

        # Create deposit intent — not confirmed server-side; client calls
        # stripe.confirmCardPayment(clientSecret) to handle any 3DS authentication.
        deposit_intent = stripe_service.create_deposit_intent(
            deposit_cad=listing.deposit_cad,
            rental_id="pending",  # updated after rental record is created
            customer_id=customer_id,
            payment_method_id=body.payment_method_id,
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e.user_message or e))

    rental = Rental(
        listing_id=body.listing_id,
        renter_id=current_user.id,
        owner_id=listing.owner_id,
        start_date=body.start_date,
        end_date=body.end_date,
        total_price_cad=total_price_cad,
        deposit_cad=listing.deposit_cad,
        status=RentalStatusEnum.pending,
        stripe_deposit_intent_id=deposit_intent.id,
    )
    db.add(rental)
    await db.flush()
    await db.refresh(rental)

    try:
        stripe.PaymentIntent.modify(deposit_intent.id, metadata={"rental_id": str(rental.id), "type": "deposit"})
    except stripe.StripeError:
        pass  # metadata update is non-critical

    # Save initial message
    msg = Message(rental_id=rental.id, sender_id=current_user.id, body=body.message)
    db.add(msg)
    await db.flush()

    return BookingResponseSchema(rental_id=rental.id, client_secret=deposit_intent.client_secret)


@router.post("/connect/onboard")
async def onboard_connect(
    body: OnboardRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.stripe_account_id:
        account = stripe_service.create_connect_account(current_user.email)
        current_user.stripe_account_id = account.id
        db.add(current_user)
        await db.flush()

    link = stripe_service.create_account_link(
        current_user.stripe_account_id,
        body.refresh_url,
        body.return_url,
    )
    return {"onboarding_url": link.url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    try:
        event = stripe_service.construct_webhook_event(payload, stripe_signature)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    if event.type == "payment_intent.succeeded":
        intent = event.data.object
        rental_id = intent.metadata.get("rental_id")
        if rental_id and intent.metadata.get("type") != "deposit":
            result = await db.execute(
                select(Payment).where(Payment.stripe_payment_intent_id == intent.id)
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = PaymentStatusEnum.succeeded
                db.add(payment)

            rental_result = await db.execute(
                select(Rental).where(Rental.id == uuid.UUID(rental_id))
            )
            rental = rental_result.scalar_one_or_none()
            if rental and rental.status == RentalStatusEnum.pending:
                rental.status = RentalStatusEnum.confirmed
                db.add(rental)

    elif event.type == "transfer.created":
        transfer = event.data.object
        rental_id = transfer.metadata.get("rental_id")
        if rental_id:
            result = await db.execute(
                select(Payment).where(Payment.rental_id == uuid.UUID(rental_id))
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.stripe_transfer_id = transfer.id
                db.add(payment)

    await db.commit()
    return {"received": True}
