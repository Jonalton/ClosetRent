from decimal import Decimal
import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

PLATFORM_FEE_RATE = Decimal("0.05")


class StripeService:
    def calculate_fees(self, rental_price_per_day: Decimal, num_days: int) -> dict:
        total = rental_price_per_day * num_days
        platform_fee = (total * PLATFORM_FEE_RATE).quantize(Decimal("0.01"))
        owner_payout = total - platform_fee
        return {
            "total": total,
            "platform_fee": platform_fee,
            "owner_payout": owner_payout,
        }

    def create_payment_intent(
        self,
        amount_cad: Decimal,
        platform_fee_cad: Decimal,
        owner_stripe_account_id: str,
        rental_id: str,
    ) -> stripe.PaymentIntent:
        return stripe.PaymentIntent.create(
            amount=int(amount_cad * 100),
            currency="cad",
            application_fee_amount=int(platform_fee_cad * 100),
            transfer_data={"destination": owner_stripe_account_id},
            metadata={"rental_id": rental_id},
        )

    def create_deposit_intent(
        self,
        deposit_cad: Decimal,
        rental_id: str,
        customer_id: str | None = None,
        payment_method_id: str | None = None,
    ) -> stripe.PaymentIntent:
        params: dict = {
            "amount": int(deposit_cad * 100),
            "currency": "cad",
            "capture_method": "manual",
            "metadata": {"rental_id": rental_id, "type": "deposit"},
        }
        if customer_id:
            params["customer"] = customer_id
        if payment_method_id:
            # Attach the payment method but do NOT confirm server-side.
            # The client must call stripe.confirmCardPayment(clientSecret)
            # so that Stripe.js can handle any 3DS authentication flows.
            params["payment_method"] = payment_method_id
        return stripe.PaymentIntent.create(**params)

    def get_or_create_customer(self, user) -> str:
        if user.stripe_customer_id:
            return user.stripe_customer_id
        customer = stripe.Customer.create(
            email=user.email,
            name=user.display_name,
            metadata={"user_id": str(user.id)},
        )
        return customer.id

    def capture_deposit(self, rental) -> None:
        if rental.stripe_deposit_intent_id:
            stripe.PaymentIntent.capture(rental.stripe_deposit_intent_id)

    def cancel_deposit(self, rental) -> None:
        if rental.stripe_deposit_intent_id:
            intent = stripe.PaymentIntent.retrieve(rental.stripe_deposit_intent_id)
            if intent.status in ("requires_capture", "requires_confirmation", "requires_payment_method"):
                stripe.PaymentIntent.cancel(rental.stripe_deposit_intent_id)

    def charge_rental(self, rental, owner_stripe_account_id: str, renter_stripe_customer_id: str) -> stripe.PaymentIntent:
        customer = stripe.Customer.retrieve(renter_stripe_customer_id)
        payment_methods = stripe.PaymentMethod.list(customer=renter_stripe_customer_id, type="card")
        if not payment_methods.data:
            raise ValueError("No payment method on file for renter")
        payment_method_id = payment_methods.data[0].id

        platform_fee = (rental.total_price_cad * PLATFORM_FEE_RATE).quantize(Decimal("0.01"))
        return stripe.PaymentIntent.create(
            amount=int(rental.total_price_cad * 100),
            currency="cad",
            customer=renter_stripe_customer_id,
            payment_method=payment_method_id,
            capture_method="automatic",
            confirm=True,
            application_fee_amount=int(platform_fee * 100),
            transfer_data={"destination": owner_stripe_account_id},
            metadata={"rental_id": str(rental.id), "type": "rental"},
        )

    def refund_deposit(self, rental) -> stripe.Refund | None:
        if not rental.stripe_deposit_intent_id:
            return None
        intent = stripe.PaymentIntent.retrieve(rental.stripe_deposit_intent_id)
        if intent.status == "requires_capture":
            stripe.PaymentIntent.cancel(rental.stripe_deposit_intent_id)
            return None
        return stripe.Refund.create(payment_intent=rental.stripe_deposit_intent_id)

    def create_connect_account(self, email: str) -> stripe.Account:
        return stripe.Account.create(
            type="express",
            country="CA",
            email=email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )

    def create_account_link(self, account_id: str, refresh_url: str, return_url: str) -> stripe.AccountLink:
        return stripe.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )

    def construct_webhook_event(self, payload: bytes, sig_header: str) -> stripe.Event:
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )

    def transfer_to_owner(
        self,
        amount_cad: Decimal,
        owner_stripe_account_id: str,
        rental_id: str,
    ) -> stripe.Transfer:
        return stripe.Transfer.create(
            amount=int(amount_cad * 100),
            currency="cad",
            destination=owner_stripe_account_id,
            metadata={"rental_id": rental_id},
        )


stripe_service = StripeService()
