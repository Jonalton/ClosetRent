import apiClient from './client'
import type { User } from '../types'

export const usersApi = {
  sync: async (): Promise<User> => {
    const res = await apiClient.post('/api/auth/sync')
    return res.data
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/api/users/me')
    return res.data
  },

  updateMe: async (data: { display_name?: string; avatar_url?: string; bio?: string }): Promise<User> => {
    const res = await apiClient.patch('/api/users/me', data)
    return res.data
  },

  getUser: async (id: string): Promise<User> => {
    const res = await apiClient.get(`/api/users/${id}`)
    return res.data
  },

  getUserRating: async (id: string): Promise<{ average_rating: number | null; review_count: number }> => {
    const res = await apiClient.get(`/api/users/${id}/rating`)
    return res.data
  },

  connectStripe: async (refreshUrl: string, returnUrl: string): Promise<{ onboarding_url: string }> => {
    const res = await apiClient.post('/api/payments/connect/onboard', {
      refresh_url: refreshUrl,
      return_url: returnUrl,
    })
    return res.data
  },
}
