export type Category = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories' | 'shoes' | 'formalwear' | 'south_asian'
export type Condition = 'excellent' | 'good' | 'fair'
export type RentalStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'active'
  | 'returned'
  | 'completed'
  | 'cancelled'
  | 'disputed'
export type ReviewType = 'renter_to_owner' | 'owner_to_renter'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface User {
  id: string
  firebase_uid: string
  email: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  stripe_account_id: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Listing {
  id: string
  owner_id: string
  title: string
  description: string
  category: Category
  size: string
  brand: string
  retail_price_cad: string
  rental_price_per_day_cad: string
  deposit_cad: string
  condition: Condition
  is_available: boolean
  images: string[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Rental {
  id: string
  listing_id: string
  renter_id: string
  owner_id: string
  start_date: string
  end_date: string
  total_price_cad: string
  deposit_cad: string
  status: RentalStatus
  stripe_payment_intent_id: string | null
  stripe_deposit_intent_id: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  rental_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string
  type: ReviewType
  created_at: string
}

export interface AvailabilityRange {
  start_date: string
  end_date: string
}

export interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_avatar: string | null
  body: string
  created_at: string
}

export interface InboxItem {
  rental_id: string
  listing_title: string
  other_party_name: string
  other_party_avatar: string | null
  last_message: string | null
  last_message_at: string | null
  message_count: number
}

export interface CheckoutResponse {
  client_secret: string
  deposit_client_secret: string
  amount_cad: string
  deposit_cad: string
}
