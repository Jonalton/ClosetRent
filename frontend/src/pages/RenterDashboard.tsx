import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rentalsApi } from '../api/rentals'
import { useAuth } from '../context/AuthContext'
import type { Rental, RentalStatus } from '../types'
import ReviewForm from '../components/ReviewForm'

const STATUS_COLORS: Record<RentalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  returned: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  disputed: 'bg-orange-100 text-orange-700',
}

const NEXT_STATUS: Record<RentalStatus, RentalStatus | null> = {
  pending: null,
  confirmed: null,
  shipped: null,
  active: 'returned',
  returned: null,
  completed: null,
  cancelled: null,
  disputed: null,
}

export default function RenterDashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [role, setRole] = useState<'renter' | 'owner'>('renter')
  const [reviewingRental, setReviewingRental] = useState<string | null>(null)

  const { data: rentals = [], isLoading } = useQuery<Rental[]>({
    queryKey: ['rentals', role],
    queryFn: () => rentalsApi.getMy(role),
    enabled: !!user,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RentalStatus }) =>
      rentalsApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rentals'] }),
  })

  if (!user) {
    return <div className="text-center py-20 text-gray-500">Please sign in.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Rentals</h1>

      <div className="flex gap-2 mb-6">
        {(['renter', 'owner'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${role === r ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {r === 'renter' ? 'Items I rented' : 'Items I own'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rentals.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500">
          {role === 'renter' ? (
            <>
              <p className="text-lg mb-3">No rentals yet.</p>
              <Link to="/browse" className="text-brand-600 font-medium hover:underline">Browse items →</Link>
            </>
          ) : (
            <p className="text-lg">No one has rented your items yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => (
            <div key={rental.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[rental.status]}`}>
                      {rental.status}
                    </span>
                    <Link to={`/listings/${rental.listing_id}`} className="text-sm text-brand-600 hover:underline font-medium">
                      View listing →
                    </Link>
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>{rental.start_date} – {rental.end_date}</p>
                    <p>Total: <span className="font-semibold text-gray-900">${rental.total_price_cad} CAD</span></p>
                    <p>Deposit: ${rental.deposit_cad} CAD</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {rental.status === 'pending' && role === 'renter' && (
                    <Link
                      to={`/checkout/${rental.id}`}
                      className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-brand-700"
                    >
                      Pay now
                    </Link>
                  )}
                  {NEXT_STATUS[rental.status] && (
                    <button
                      onClick={() => statusMutation.mutate({ id: rental.id, status: NEXT_STATUS[rental.status]! })}
                      disabled={statusMutation.isPending}
                      className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50 capitalize"
                    >
                      Mark as {NEXT_STATUS[rental.status]}
                    </button>
                  )}
                  {rental.status === 'completed' && role === 'renter' && (
                    <button
                      onClick={() => setReviewingRental(rental.id)}
                      className="text-sm text-brand-600 hover:underline font-medium"
                    >
                      Leave review
                    </button>
                  )}
                </div>
              </div>

              {reviewingRental === rental.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <ReviewForm
                    rentalId={rental.id}
                    revieweeId={rental.owner_id}
                    reviewType="renter_to_owner"
                    onSuccess={() => setReviewingRental(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
