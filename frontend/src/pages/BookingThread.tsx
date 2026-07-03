import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rentalsApi } from '../api/rentals'
import { messagesApi } from '../api/messages'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import type { Message, Rental } from '../types'
import { STATUS_LABELS } from '../utils/rentalStatus'

// TODO: replace polling with WebSocket for real-time messages

export default function BookingThread() {
  const { rentalId } = useParams<{ rentalId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: rental } = useQuery<Rental>({
    queryKey: ['rental', rentalId],
    queryFn: () => rentalsApi.get(rentalId!),
    enabled: !!rentalId,
  })

  const { data: messages } = useQuery<Message[]>({
    queryKey: ['messages', rentalId],
    queryFn: () => messagesApi.getThread(rentalId!),
    enabled: !!rentalId,
    refetchInterval: 5000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: (text: string) => messagesApi.send(rentalId!, text),
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['messages', rentalId] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => rentalsApi.approve(rentalId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rental', rentalId] }),
  })

  const declineMutation = useMutation({
    mutationFn: () => rentalsApi.decline(rentalId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rental', rentalId] }),
  })

  const handleSend = () => {
    const text = body.trim()
    if (!text) return
    sendMutation.mutate(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isLister = rental && user?.id === rental.owner_id
  const status = rental ? STATUS_LABELS[rental.status] : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Booking Thread</h1>
          {rental && (
            <p className="text-sm text-gray-500">
              {format(new Date(rental.start_date), 'MMM d')} – {format(new Date(rental.end_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        {status && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>

      {/* Lister action panel for pending rentals */}
      {isLister && rental?.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-amber-900">A renter has requested to book this item.</p>
          <div className="flex gap-3">
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || declineMutation.isPending}
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={() => declineMutation.mutate()}
              disabled={approveMutation.isPending || declineMutation.isPending}
              className="flex-1 border border-red-300 text-red-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              {declineMutation.isPending ? 'Declining...' : 'Decline'}
            </button>
          </div>
          {(approveMutation.isError || declineMutation.isError) && (
            <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>
          )}
        </div>
      )}

      {/* Renter status note */}
      {!isLister && rental?.status === 'pending' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
          Awaiting lister approval. You'll be notified once they respond.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages?.map((msg) => {
          const isMine = msg.sender_id === user?.id
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              <img
                src={msg.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name)}&background=c026d3&color=fff`}
                alt={msg.sender_name}
                className="w-7 h-7 rounded-full flex-shrink-0"
              />
              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(msg.created_at), 'h:mm a')}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end border-t pt-4">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={2}
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sendMutation.isPending}
          className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 h-fit"
        >
          Send
        </button>
      </div>
    </div>
  )
}
