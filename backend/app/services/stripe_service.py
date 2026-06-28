from decimal import Decimal
import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

PLATFORM_FEE_RATE = Decimal("0.15")


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
    ) -> stripe.PaymentIntent:
        return stripe.PaymentIntent.create(
            amount=int(deposit_cad * 100),
            currency="cad",
            capture_method="manual",
            metadata={"rental_id": rental_id, "type": "deposit"},
        )

    def refund_deposit(self, payment_intent_id: str) -> stripe.Refund:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == "requires_capture":
            stripe.PaymentIntent.cancel(payment_intent_id)
            return None
        return stripe.Refund.create(payment_intent=payment_intent_id)

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
