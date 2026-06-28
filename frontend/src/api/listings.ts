import apiClient from './client'
import type { Listing, AvailabilityRange } from '../types'

export interface ListingCreate {
  title: string
  description: string
  category: string
  size: string
  brand: string
  retail_price_cad: string
  rental_price_per_day_cad: string
  deposit_cad: string
  condition: string
  images: string[]
  tags: string[]
}

export const listingsApi = {
  list: async (params?: { category?: string; size?: string; limit?: number; offset?: number }): Promise<Listing[]> => {
    const res = await apiClient.get('/api/listings/', { params })
    return res.data
  },

  get: async (id: string): Promise<Listing> => {
    const res = await apiClient.get(`/api/listings/${id}`)
    return res.data
  },

  create: async (data: ListingCreate): Promise<Listing> => {
    const res = await apiClient.post('/api/listings/', data)
    return res.data
  },

  update: async (id: string, data: Partial<ListingCreate> & { is_available?: boolean }): Promise<Listing> => {
    const res = await apiClient.patch(`/api/listings/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/listings/${id}`)
  },

  getAvailability: async (id: string): Promise<AvailabilityRange[]> => {
    const res = await apiClient.get(`/api/listings/${id}/availability`)
    return res.data
  },

  getSignedUploadUrl: async (filename: string, contentType: string): Promise<{ signed_url: string; public_url: string }> => {
    const res = await apiClient.post('/api/storage/signed-url', { filename, content_type: contentType })
    return res.data
  },
}
