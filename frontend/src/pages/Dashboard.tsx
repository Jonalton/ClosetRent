
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listingsApi } from '../api/listings'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'
import type { Listing } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const res = await apiClient.get('/api/listings/', { params: { limit: 50 } })
      return res.data.filter((l: Listing) => l.owner_id === user?.id)
    },
    enabled: !!user,
  })

  const toggleAvailable = useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) =>
      listingsApi.update(id, { is_available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
  })

  const deleteListing = useMutation({
    mutationFn: (id: string) => listingsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
  })

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-gray-500">
        Please sign in to view your dashboard.
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
        <Link
          to="/create-listing"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          + New listing
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <p className="text-gray-500 text-lg mb-4">You haven't listed any items yet.</p>
          <Link to="/create-listing" className="text-brand-600 font-medium hover:underline">
            Create your first listing →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div key={listing.id} className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4">
              <img
                src={listing.images[0] || 'https://placehold.co/80x80/f5d0fe/701a75?text=?'}
                alt={listing.title}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Link to={`/listings/${listing.id}`} className="font-semibold text-gray-900 hover:text-brand-600 truncate block">
                  {listing.title}
                </Link>
                <p className="text-sm text-gray-500">{listing.brand} · Size {listing.size} · ${listing.rental_price_per_day_cad}/day</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${listing.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {listing.is_available ? 'Available' : 'Hidden'}
                </span>
                <button
                  onClick={() => toggleAvailable.mutate({ id: listing.id, is_available: !listing.is_available })}
                  className="text-sm text-gray-500 hover:text-brand-600 font-medium"
                >
                  {listing.is_available ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this listing?')) deleteListing.mutate(listing.id)
                  }}
                  className="text-sm text-red-400 hover:text-red-600 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
