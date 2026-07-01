import apiClient from './client'

export const messagesApi = {
  getThread: (rentalId: string) =>
    apiClient.get(`/api/rentals/${rentalId}/messages`).then(r => r.data),
  send: (rentalId: string, body: string) =>
    apiClient.post(`/api/rentals/${rentalId}/messages`, { body }).then(r => r.data),
  getInbox: () => apiClient.get('/api/inbox').then(r => r.data),
}
