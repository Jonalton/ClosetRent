import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { listingsApi } from '../api/listings'
import { usersApi } from '../api/users'
import { paymentsApi } from '../api/payments'
import BookingCalendar from '../components/BookingCalendar'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

const CONDITION_LABELS: Record<string, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair' }

interface BookingState {
  startDate: Date
  endDate: Date
  totalDays: number
  totalPrice: number
}

function SignInModal({ onClose, onSignIn }: { onClose: () => void; onSignIn: () => Promise<void> }) {
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setSigningIn(true)
    setSignInError(null)
    try {
      await onSignIn()
      // Modal will be closed by the parent once user state updates
    } catch {
      setSignInError('Sign in failed. Please try again.')
      setSigningIn(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="text-center space-y-1">
          <p className="text-xl font-bold text-gray-900">Sign in to continue</p>
          <p className="text-sm text-gray-500">
            Create an account or sign in to request this item.
          </p>
        </div>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {signingIn ? (
            <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>

        {signInError && (
          <p className="text-red-500 text-sm text-center">{signInError}</p>
        )}

        <p className="text-xs text-gray-400 text-center">
          Your selected dates will be saved and you'll be taken straight to the booking form.
        </p>
      </div>
    </div>
  )
}

function BookingPanel({ listing }: { listing: any }) {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()

  const [bookingState, setBookingState] = useState<BookingState | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const pendingBooking = useRef<BookingState | null>(null)

  // When the user signs in while the modal is open, apply the pending booking
  useEffect(() => {
    if (user && pendingBooking.current) {
      setBookingState(pendingBooking.current)
      pendingBooking.current = null
      setShowSignInModal(false)
      setError(null)
    }
  }, [user])

  const isOwner = user?.id === listing.owner_id
  const showCard = bookingState && message.trim().length > 0

  const handleBook = (result: BookingState | null) => {
    if (!user) {
      pendingBooking.current = result
      setShowSignInModal(true)
      return
    }
    setBookingState(result)
    setError(null)
  }

  const handleRequestBooking = async () => {
    if (!bookingState || !stripe || !elements || !user) return
    const card = elements.getElement(CardElement)
    if (!card) return

    setSubmitting(true)
    setError(null)

    try {
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card,
      })
      if (pmError || !paymentMethod) {
        setError(pmError?.message || 'Failed to process card')
        setSubmitting(false)
        return
      }

      const response = await paymentsApi.requestBooking({
        listing_id: listing.id,
        start_date: format(bookingState.startDate, 'yyyy-MM-dd'),
        end_date: format(bookingState.endDate, 'yyyy-MM-dd'),
        message: message.trim(),
        payment_method_id: paymentMethod.id,
      })

      const { error: confirmError } = await stripe.confirmCardPayment(response.client_secret)
      if (confirmError) {
        setError(confirmError.message || 'Failed to authorize deposit')
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isOwner) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center text-yellow-700">
        This is your listing.
      </div>
    )
  }

  if (!listing.is_available) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500">
        This item is currently unavailable.
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
        <p className="text-2xl">✓</p>
        <p className="font-semibold text-green-800">Booking requested!</p>
        <p className="text-green-700 text-sm">The lister will respond within 24 hours.</p>
        <button
          onClick={() => navigate('/inbox')}
          className="mt-2 text-brand-600 text-sm font-medium underline"
        >
          View in Inbox
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showSignInModal && (
        <SignInModal
          onClose={() => {
            setShowSignInModal(false)
            pendingBooking.current = null
          }}
          onSignIn={signInWithGoogle}
        />
      )}

      <BookingCalendar
        listingId={listing.id}
        pricePerDay={parseFloat(listing.rental_price_per_day_cad)}
        onBook={handleBook}
      />

      {bookingState && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>{format(bookingState.startDate, 'MMM d')} – {format(bookingState.endDate, 'MMM d, yyyy')}</span>
              <span className="text-gray-400">{bookingState.totalDays} days</span>
            </div>
            <div className="flex justify-between">
              <span>{bookingState.totalDays} × ${listing.rental_price_per_day_cad}/day</span>
              <span>${bookingState.totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Deposit (authorized now)</span>
              <span>${listing.deposit_cad}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
              <span>Total due now</span>
              <span>${parseFloat(listing.deposit_cad).toFixed(2)} CAD</span>
            </div>
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Due on lister approval</span>
              <span>${bookingState.totalPrice.toFixed(2)} CAD</span>
            </div>
          </div>
        </div>
      )}

      {bookingState && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message to lister <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write a message to the lister..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {showCard && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Card details</p>
          <div className="border border-gray-300 rounded-lg px-3 py-3">
            <CardElement options={{ style: { base: { fontSize: '14px' } } }} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleRequestBooking}
            disabled={submitting || !stripe}
            className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Processing...' : 'Request Booking'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Your card is only charged on lister approval. Deposit is held now.
          </p>
        </div>
      )}
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const [selectedImage, setSelectedImage] = useState(0)

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.get(id!),
    enabled: !!id,
  })

  const { data: owner } = useQuery({
    queryKey: ['user', listing?.owner_id],
    queryFn: () => usersApi.getUser(listing!.owner_id),
    enabled: !!listing?.owner_id,
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return <div className="text-center py-20 text-gray-500">Listing not found.</div>
  }

  const image = listing.images[selectedImage] || 'https://placehold.co/600x600/f5d0fe/701a75?text=No+Image'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square mb-3">
            <img src={image} alt={listing.title} className="w-full h-full object-cover" />
          </div>
          {listing.images.length > 1 && (
            <div className="flex gap-2">
              {listing.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${selectedImage === i ? 'border-brand-600' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details + Booking */}
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">{listing.brand}</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1 mb-3">{listing.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-brand-700">
              ${listing.rental_price_per_day_cad}
              <span className="text-sm font-normal text-gray-500">/day</span>
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">Deposit: ${listing.deposit_cad}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">Size {listing.size}</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm capitalize">{listing.category}</span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">{CONDITION_LABELS[listing.condition]}</span>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">{listing.description}</p>

          {owner && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-6">
              <img
                src={owner.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.display_name)}&background=c026d3&color=fff`}
                alt={owner.display_name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-sm text-gray-500">Listed by</p>
                <p className="font-medium text-gray-900">{owner.display_name}</p>
              </div>
            </div>
          )}

          <Elements stripe={stripePromise}>
            <BookingPanel listing={listing} />
          </Elements>
        </div>
      </div>
    </div>
  )
}
