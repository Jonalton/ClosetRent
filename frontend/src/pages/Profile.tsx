import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users'
import { useAuth } from '../context/AuthContext'
import StripeConnect from '../components/StripeConnect'
import apiClient from '../api/client'
import type { Review } from '../types'

export default function Profile() {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ display_name: '', bio: '' })

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const res = await apiClient.get(`/api/reviews/user/${user?.id}`)
      return res.data
    },
    enabled: !!user?.id,
  })

  const { data: rating } = useQuery({
    queryKey: ['my-rating'],
    queryFn: () => usersApi.getUserRating(user!.id),
    enabled: !!user?.id,
  })

  const updateMutation = useMutation({
    mutationFn: () => usersApi.updateMe(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      setEditing(false)
    },
  })

  if (!user) {
    return <div className="text-center py-20 text-gray-500">Please sign in.</div>
  }

  const startEditing = () => {
    setForm({ display_name: user.display_name, bio: user.bio || '' })
    setEditing(true)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=c026d3&color=fff&size=80`}
            alt={user.display_name}
            className="w-20 h-20 rounded-full"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.display_name}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
            {rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-sm font-medium">
                  {rating.average_rating ? rating.average_rating.toFixed(1) : 'No ratings yet'}
                </span>
                {rating.review_count > 0 && (
                  <span className="text-gray-400 text-sm">({rating.review_count} reviews)</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={startEditing}
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            Edit profile
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
              <input
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                placeholder="Tell renters a bit about yourself and your style..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={() => setEditing(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : user.bio ? (
          <p className="text-gray-600 text-sm">{user.bio}</p>
        ) : null}
      </div>

      {/* Stripe Connect */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Payout settings</h2>
        <StripeConnect />
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={signOut}
        className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl font-medium hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
