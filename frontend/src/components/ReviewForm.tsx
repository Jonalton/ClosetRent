import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ReviewType } from '../types'

interface Props {
  rentalId: string
  revieweeId: string
  reviewType: ReviewType
  onSuccess?: () => void
}

export default function ReviewForm({ rentalId, revieweeId, reviewType, onSuccess }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/reviews/', {
        rental_id: rentalId,
        reviewee_id: revieweeId,
        rating,
        comment,
        type: reviewType,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      onSuccess?.()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="text-3xl focus:outline-none"
            >
              <span className={(hovered || rating) >= star ? 'text-yellow-400' : 'text-gray-300'}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          required
          minLength={10}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
          placeholder="Share your experience..."
        />
      </div>

      {mutation.isError && (
        <p className="text-red-500 text-sm">Failed to submit review. Please try again.</p>
      )}

      <button
        type="submit"
        disabled={rating === 0 || comment.length < 10 || mutation.isPending}
        className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
