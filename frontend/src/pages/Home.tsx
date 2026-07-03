
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listingsApi } from '../api/listings'
import ListingCard from '../components/ListingCard'

const CATEGORIES = [
  { id: 'dresses', label: 'Dresses', emoji: '👗' },
  { id: 'tops', label: 'Tops', emoji: '👚' },
  { id: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { id: 'formalwear', label: 'Formalwear', emoji: '🎩' },
  { id: 'shoes', label: 'Shoes', emoji: '👠' },
  { id: 'accessories', label: 'Accessories', emoji: '👜' },
]

export default function Home() {
  const navigate = useNavigate()
  const { data: featuredListings = [] } = useQuery({
    queryKey: ['listings', 'featured'],
    queryFn: () => listingsApi.list({ limit: 8 }),
  })

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-purple-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Rent fashion.<br />
            <span className="text-brand-600">Wear more.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Borrow designer clothes from real people near you. List your own wardrobe and earn money while your clothes hang idle.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/browse"
              className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
            >
              Browse Closets
            </Link>
            <Link
              to="/create-listing"
              className="bg-white text-brand-700 px-8 py-3.5 rounded-xl font-semibold text-lg border-2 border-brand-200 hover:border-brand-400 transition-colors"
            >
              List an Item
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/browse?category=${cat.id}`)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-brand-50 hover:text-brand-700 transition-colors border border-transparent hover:border-brand-200"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured items</h2>
            <Link to="/browse" className="text-brand-600 font-medium hover:underline text-sm">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {featuredListings.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No listings yet. Be the first to list!</p>
              <Link to="/create-listing" className="mt-4 inline-block text-brand-600 font-medium hover:underline">
                Create a listing →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Browse & book', desc: 'Find an item you love, pick your dates, and pay securely via Stripe.' },
              { step: '2', title: 'Wear it', desc: 'The owner ships or delivers the item. Rock it for your event.' },
              { step: '3', title: 'Return & review', desc: 'Send it back and leave a review. Owners earn 85% of the rental price.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
