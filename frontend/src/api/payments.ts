import apiClient from './client'

export interface BookingRequest {
  listing_id: string
  start_date: string
  end_date: string
  message: string
  payment_method_id: string
}

export interface BookingResponse {
  rental_id: string
  client_secret: string
}

export const paymentsApi = {
  requestBooking: (data: BookingRequest): Promise<BookingResponse> =>
    apiClient.post('/api/payments/request-booking', data).then(r => r.data),
}
