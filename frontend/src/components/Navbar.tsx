import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { messagesApi } from '../api/messages'
import type { InboxItem } from '../types'

export default function Navbar() {
  const { user, signInWithGoogle, signOut, loading } = useAuth()
  const navigate = useNavigate()

  const { data: inboxItems } = useQuery<InboxItem[]>({
    queryKey: ['inbox'],
    queryFn: messagesApi.getInbox,
    enabled: !!user,
    refetchInterval: 30_000,
  })

  const hasMessages = (inboxItems?.length ?? 0) > 0

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-600">ClosetRent</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/browse" className="text-gray-600 hover:text-brand-600 font-medium transition-colors">
              Browse
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-brand-600 font-medium transition-colors">
                  My Listings
                </Link>
                <Link to="/renter-dashboard" className="text-gray-600 hover:text-brand-600 font-medium transition-colors">
                  My Rentals
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!loading && user ? (
              <>
                <button
                  onClick={() => navigate('/create-listing')}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  + List Item
                </button>

                {/* Inbox icon */}
                <Link to="/inbox" className="relative p-1.5 text-gray-500 hover:text-brand-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {hasMessages && (
                    <span className="absolute top-0.5 right-0.5 block w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </Link>

                <Link to="/profile">
                  <img
                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=c026d3&color=fff`}
                    alt={user.display_name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-brand-200"
                  />
                </Link>
                <button
                  onClick={signOut}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Sign out
                </button>
              </>
            ) : !loading ? (
              <button
                onClick={signInWithGoogle}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Sign in with Google
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
