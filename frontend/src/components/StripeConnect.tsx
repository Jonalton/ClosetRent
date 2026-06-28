import React, { useState } from 'react'
import { usersApi } from '../api/users'
import { useAuth } from '../context/AuthContext'

export default function StripeConnect() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const { onboarding_url } = await usersApi.connectStripe(
        `${window.location.origin}/stripe/refresh`,
        `${window.location.origin}/profile?stripe=connected`
      )
      window.location.href = onboarding_url
    } catch {
      setError('Failed to start Stripe onboarding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (user?.stripe_account_id) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">Stripe account connected</span>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        Connect a Stripe account to receive payouts when your items are rented.
      </p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 bg-[#635BFF] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#5145e5] transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
          </svg>
        )}
        Connect with Stripe
      </button>
    </div>
  )
}
