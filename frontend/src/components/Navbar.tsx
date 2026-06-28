import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signInWithGoogle, signOut, loading } = useAuth()
  const navigate = useNavigate()

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
