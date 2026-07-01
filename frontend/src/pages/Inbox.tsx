import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { messagesApi } from '../api/messages'
import { formatDistanceToNow } from 'date-fns'
import type { InboxItem } from '../types'

export default function Inbox() {
  const { data: items, isLoading } = useQuery<InboxItem[]>({
    queryKey: ['inbox'],
    queryFn: messagesApi.getInbox,
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inbox</h1>

      {!items || items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No messages yet.</p>
          <p className="text-sm mt-1">Request a rental to start a conversation.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.rental_id}
              to={`/inbox/${item.rental_id}`}
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <img
                src={item.other_party_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.other_party_name)}&background=c026d3&color=fff`}
                alt={item.other_party_name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-semibold text-gray-900 truncate">{item.other_party_name}</p>
                  {item.last_message_at && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{item.listing_title}</p>
                {item.last_message && (
                  <p className="text-sm text-gray-400 truncate mt-0.5">{item.last_message}</p>
                )}
              </div>
              {item.message_count > 0 && (
                <span className="bg-brand-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                  {item.message_count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
