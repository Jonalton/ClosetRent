import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listingsApi } from '../api/listings'
import ListingCard from '../components/ListingCard'

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories', 'shoes', 'formalwear', 'south_asian']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '0', '2', '4', '6', '8', '10', '12']

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [size, setSize] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', category, size, page],
    queryFn: () => listingsApi.list({ category: category || undefined, size: size || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  })

  const updateFilter = (key: string, value: string) => {
    setPage(0)
    if (key === 'category') setCategory(value)
    if (key === 'size') setSize(value)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Closets</h1>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Category</h3>
              <div className="space-y-1">
                <button
                  onClick={() => updateFilter('category', '')}
                  className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm capitalize ${!category ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  All
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateFilter('category', c)}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm capitalize ${category === c ? 'bg-brand-100 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Size</h3>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateFilter('size', size === s ? '' : s)}
                    className={`px-2.5 py-1 rounded-md text-sm border ${size === s ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:border-brand-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-[4/5]" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No listings found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{listings.length} items found</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              <div className="flex justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={listings.length < PAGE_SIZE}
                  className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
