import { describe, it, expect } from 'vitest'
import type { RentalStatus, Condition, Category } from '../types'

// Verify runtime-usable string unions match expected values

const RENTAL_STATUSES: RentalStatus[] = [
  'pending', 'confirmed', 'shipped', 'active', 'returned', 'completed', 'cancelled', 'disputed',
]

const CONDITIONS: Condition[] = ['excellent', 'good', 'fair']

const CATEGORIES: Category[] = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'accessories', 'shoes', 'formalwear', 'south_asian',
]

describe('RentalStatus', () => {
  it('contains 8 statuses', () => {
    expect(RENTAL_STATUSES).toHaveLength(8)
  })

  it('includes terminal statuses', () => {
    expect(RENTAL_STATUSES).toContain('completed')
    expect(RENTAL_STATUSES).toContain('cancelled')
  })
})

describe('Condition', () => {
  it('contains exactly 3 conditions', () => {
    expect(CONDITIONS).toHaveLength(3)
  })
})

describe('Category', () => {
  it('contains 8 categories including south_asian', () => {
    expect(CATEGORIES).toHaveLength(8)
    expect(CATEGORIES).toContain('south_asian')
  })
})
