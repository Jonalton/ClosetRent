
import { Link } from 'react-router-dom'
import type { Listing } from '../types'

interface Props {
  listing: Listing
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-700',
}

export default function ListingCard({ listing }: Props) {
  const image = listing.images[0] || 'https://placehold.co/400x500/f5d0fe/701a75?text=No+Image'

  return (
    <Link to={`/listings/${listing.id}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
          <img
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {!listing.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">Unavailable</span>
            </div>
          )}
          <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full ${CONDITION_COLORS[listing.condition]}`}>
            {CONDITION_LABELS[listing.condition]}
          </span>
        </div>
        <div className="p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{listing.brand}</p>
          <h3 className="font-semibold text-gray-900 mt-0.5 truncate">{listing.title}</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-500">Size {listing.size}</span>
            <div className="text-right">
              <span className="font-bold text-brand-700">${listing.rental_price_per_day_cad}</span>
              <span className="text-xs text-gray-400">/day</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
