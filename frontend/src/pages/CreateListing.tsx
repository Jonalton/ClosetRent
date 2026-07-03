import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { listingsApi } from '../api/listings'
import ImageUploader, { ImageUploaderHandle } from '../components/ImageUploader'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories', 'shoes', 'formalwear', 'south_asian']
const CONDITIONS = ['excellent', 'good', 'fair']

// Rental rate as % of retail per day; deposit as % of retail
const CONDITION_RATES = {
  excellent: { rental: 0.08, deposit: 0.30 },
  good:      { rental: 0.06, deposit: 0.25 },
  fair:      { rental: 0.04, deposit: 0.20 },
}

function getSuggestions(retailPrice: string, condition: string) {
  const retail = parseFloat(retailPrice)
  if (!retail || retail <= 0) return null
  const rates = CONDITION_RATES[condition as keyof typeof CONDITION_RATES]
  if (!rates) return null
  return {
    rental: (retail * rates.rental).toFixed(2),
    deposit: (retail * rates.deposit).toFixed(2),
  }
}

export default function CreateListing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const uploaderRef = useRef<ImageUploaderHandle>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'dresses',
    size: '',
    brand: '',
    retail_price_cad: '',
    rental_price_per_day_cad: '',
    deposit_cad: '',
    condition: 'excellent',
    tags: '',
  })
  const [fileCount, setFileCount] = useState(0)

  const mutation = useMutation({
    mutationFn: async () => {
      const images = await uploaderRef.current!.uploadAll()
      return listingsApi.create({
        ...form,
        images,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
    },
    onSuccess: (listing) => navigate(`/listings/${listing.id}`),
  })

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-600">Please sign in to list an item.</p>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  const field = (label: string, name: keyof typeof form, type = 'text', extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
        {...extra}
      />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">List an item</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
          <ImageUploader ref={uploaderRef} maxFiles={5} onFileCountChange={setFileCount} />
        </div>

        {field('Title', 'title', 'text', { required: true, placeholder: 'e.g. Silk Midi Dress' })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
            placeholder="Describe the item, how you've worn it, what events it's perfect for..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('Brand', 'brand', 'text', { required: true, placeholder: 'e.g. Reformation' })}
          {field('Size', 'size', 'text', { required: true, placeholder: 'e.g. M, 8, XS' })}
        </div>

        {(() => {
          const suggestions = getSuggestions(form.retail_price_cad, form.condition)
          return (
            <div className="grid grid-cols-3 gap-4">
              {field('Retail Price (CAD)', 'retail_price_cad', 'number', { required: true, min: '0', step: '0.01', placeholder: '450.00' })}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Rental/Day (CAD)</label>
                  {suggestions && !form.rental_price_per_day_cad && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, rental_price_per_day_cad: suggestions.rental }))}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Use ${suggestions.rental}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={form.rental_price_per_day_cad}
                  onChange={(e) => setForm((f) => ({ ...f, rental_price_per_day_cad: e.target.value }))}
                  required min="0" step="0.01"
                  placeholder={suggestions ? suggestions.rental : '35.00'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                />
                {suggestions && (
                  <p className="mt-1 text-xs text-gray-400">Suggested: ${suggestions.rental}/day ({form.condition} condition)</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Deposit (CAD)</label>
                  {suggestions && !form.deposit_cad && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, deposit_cad: suggestions.deposit }))}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Use ${suggestions.deposit}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={form.deposit_cad}
                  onChange={(e) => setForm((f) => ({ ...f, deposit_cad: e.target.value }))}
                  required min="0" step="0.01"
                  placeholder={suggestions ? suggestions.deposit : '100.00'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                />
                {suggestions && (
                  <p className="mt-1 text-xs text-gray-400">Suggested: ${suggestions.deposit} ({form.condition} condition)</p>
                )}
              </div>
            </div>
          )
        })()}

        {field('Tags (comma-separated)', 'tags', 'text', { placeholder: 'silk, evening, midi, Reformation' })}

        {mutation.isError && (
          <p className="text-red-500 text-sm">Failed to create listing. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || fileCount === 0}
          className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? 'Publishing...' : 'Publish listing'}
        </button>
        {fileCount === 0 && (
          <p className="text-center text-sm text-gray-400">Upload at least one photo to publish</p>
        )}
      </form>
    </div>
  )
}
