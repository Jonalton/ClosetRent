import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import ListingCard from '../components/ListingCard'
import type { Listing } from '../types'

const baseListing: Listing = {
  id: '1',
  owner_id: 'u1',
  title: 'Black Blazer',
  description: 'Great blazer',
  category: 'tops',
  size: 'M',
  brand: 'Zara',
  retail_price_cad: '150',
  rental_price_per_day_cad: '20',
  deposit_cad: '50',
  condition: 'excellent',
  is_available: true,
  images: ['https://example.com/img.jpg'],
  tags: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function renderCard(listing: Listing) {
  return render(
    <MemoryRouter>
      <ListingCard listing={listing} />
    </MemoryRouter>
  )
}

describe('ListingCard', () => {
  it('renders title, brand, size, and price', () => {
    renderCard(baseListing)
    expect(screen.getByText('Black Blazer')).toBeInTheDocument()
    expect(screen.getByText('Zara')).toBeInTheDocument()
    expect(screen.getByText('Size M')).toBeInTheDocument()
    expect(screen.getByText('$20')).toBeInTheDocument()
  })

  it('links to the listing detail page', () => {
    renderCard(baseListing)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/listings/1')
  })

  it('shows condition badge with correct label', () => {
    renderCard(baseListing)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  it('shows unavailable overlay when listing is not available', () => {
    renderCard({ ...baseListing, is_available: false })
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  it('does not show unavailable overlay for available listings', () => {
    renderCard(baseListing)
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
  })

  it('uses placeholder image when no images provided', () => {
    renderCard({ ...baseListing, images: [] })
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toContain('placehold.co')
  })
})
