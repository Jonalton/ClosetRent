import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import Dashboard from './pages/Dashboard'
import RenterDashboard from './pages/RenterDashboard'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/renter-dashboard" element={<RenterDashboard />} />
              <Route path="/checkout/:rentalId" element={<Checkout />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={
                <div className="text-center py-20 text-gray-400">
                  <p className="text-4xl font-bold mb-2">404</p>
                  <p>Page not found.</p>
                </div>
              } />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
