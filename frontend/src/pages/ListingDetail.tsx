import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listingsApi } from '../api/listings'
import { rentalsApi } from '../api/rentals'
import { usersApi } from '../api/users'
import BookingCalendar from '../components/BookingCalendar'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

const CONDITION_LABELS: Record<string, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair' }

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedImage, setSelectedImage] = useState(0)
  const [bookingResult, setBookingResult] = useState<{ startDate: Date; endDate: Date; totalDays: number; totalPrice: number } | null>(null)

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

  const createRentalMutation = useMutation({
    mutationFn: (data: { listing_id: string; start_date: string; end_date: string }) =>
      rentalsApi.create(data),
    onSuccess: (rental) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      navigate(`/checkout/${rental.id}`)
    },
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
  const isOwner = user?.id === listing.owner_id

  const handleBook = (result: typeof bookingResult) => {
    if (!user) {
      navigate('/login')
      return
    }
    setBookingResult(result)
  }

  const handleConfirmBooking = () => {
    if (!bookingResult || !id) return
    createRentalMutation.mutate({
      listing_id: id,
      start_date: format(bookingResult.startDate, 'yyyy-MM-dd'),
      end_date: format(bookingResult.endDate, 'yyyy-MM-dd'),
    })
  }

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
              {listing.images.map((img, i) => (
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

        {/* Details */}
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">{listing.brand}</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1 mb-3">{listing.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-brand-700">${listing.rental_price_per_day_cad}<span className="text-sm font-normal text-gray-500">/day</span></span>
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

          {isOwner ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center text-yellow-700">
              This is your listing.
            </div>
          ) : !listing.is_available ? (
            <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500">
              This item is currently unavailable.
            </div>
          ) : bookingResult ? (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Confirm your booking</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{format(bookingResult.startDate, 'MMM d')} – {format(bookingResult.endDate, 'MMM d, yyyy')}</p>
                <p>{bookingResult.totalDays} days × ${listing.rental_price_per_day_cad}</p>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${bookingResult.totalPrice.toFixed(2)} CAD</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setBookingResult(null)}
                  className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Change dates
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={createRentalMutation.isPending}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
                >
                  {createRentalMutation.isPending ? 'Booking...' : 'Proceed to Checkout'}
                </button>
              </div>
              {createRentalMutation.isError && (
                <p className="text-red-500 text-sm text-center">Failed to create booking. Please try again.</p>
              )}
            </div>
          ) : (
            <BookingCalendar
              listingId={listing.id}
              pricePerDay={parseFloat(listing.rental_price_per_day_cad)}
              onBook={handleBook}
            />
          )}
        </div>
      </div>
    </div>
  )
}
