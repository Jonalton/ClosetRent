import apiClient from './client'
import type { Rental, RentalStatus, CheckoutResponse } from '../types'

export const rentalsApi = {
  create: async (data: { listing_id: string; start_date: string; end_date: string }): Promise<Rental> => {
    const res = await apiClient.post('/api/rentals/', data)
    return res.data
  },

  getMy: async (role: 'renter' | 'owner' = 'renter'): Promise<Rental[]> => {
    const res = await apiClient.get('/api/rentals/my', { params: { role } })
    return res.data
  },

  get: async (id: string): Promise<Rental> => {
    const res = await apiClient.get(`/api/rentals/${id}`)
    return res.data
  },

  updateStatus: async (id: string, status: RentalStatus): Promise<Rental> => {
    const res = await apiClient.patch(`/api/rentals/${id}/status`, { status })
    return res.data
  },

  checkout: async (rental_id: string): Promise<CheckoutResponse> => {
    const res = await apiClient.post('/api/payments/checkout', { rental_id })
    return res.data
  },
}
