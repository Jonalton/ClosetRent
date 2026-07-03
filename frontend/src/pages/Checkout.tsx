import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { rentalsApi } from '../api/rentals'
import type { CheckoutResponse, Rental } from '../types'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

function CheckoutForm({ rental, checkoutData }: { rental: Rental; checkoutData: CheckoutResponse }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const card = elements.getElement(CardElement)
    if (!card) return

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      checkoutData.client_secret,
      { payment_method: { card } }
    )

    if (stripeError) {
      setError(stripeError.message || 'Payment failed')
      setProcessing(false)
    } else if (paymentIntent?.status === 'succeeded') {
      setSucceeded(true)
      setTimeout(() => navigate('/renter-dashboard'), 2000)
    }
  }

  if (succeeded) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
        <p className="text-gray-500">Redirecting to your rentals...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Rental period</span>
          <span className="font-medium">{rental.start_date} – {rental.end_date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Rental fee</span>
          <span className="font-medium">${checkoutData.amount_cad} CAD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Security deposit</span>
          <span className="font-medium">${checkoutData.deposit_cad} CAD</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total charged today</span>
          <span>${(parseFloat(checkoutData.amount_cad) + parseFloat(checkoutData.deposit_cad)).toFixed(2)} CAD</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
        <div className="border border-gray-300 rounded-lg p-3 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent">
          <CardElement
            options={{
              style: {
                base: { fontSize: '16px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
              },
            }}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? 'Processing...' : `Pay $${(parseFloat(checkoutData.amount_cad) + parseFloat(checkoutData.deposit_cad)).toFixed(2)} CAD`}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Your deposit of ${checkoutData.deposit_cad} CAD is held and refunded when the item is returned.
        Secured by Stripe.
      </p>
    </form>
  )
}

export default function Checkout() {
  const { rentalId } = useParams<{ rentalId: string }>()
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const { data: rental, isLoading } = useQuery<Rental>({
    queryKey: ['rental', rentalId],
    queryFn: () => rentalsApi.get(rentalId!),
    enabled: !!rentalId,
  })

  useEffect(() => {
    if (rental && !checkoutData) {
      rentalsApi.checkout(rental.id).then(setCheckoutData).catch(() => {
        setCheckoutError('Failed to initialize payment. Please try again.')
      })
    }
  }, [rental])

  if (isLoading || (!checkoutData && !checkoutError)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4">Setting up payment...</p>
      </div>
    )
  }

  if (checkoutError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-red-500">
        <p>{checkoutError}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Complete your booking</h1>
      {checkoutData && rental && (
        <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.client_secret }}>
          <CheckoutForm rental={rental} checkoutData={checkoutData} />
        </Elements>
      )}
    </div>
  )
}
