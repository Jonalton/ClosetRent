import React, { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { useQuery } from '@tanstack/react-query'
import { isBefore, startOfDay, isWithinInterval, parseISO } from 'date-fns'
import { listingsApi } from '../api/listings'
import type { AvailabilityRange } from '../types'
import 'react-day-picker/dist/style.css'

interface BookingResult {
  startDate: Date
  endDate: Date
  totalDays: number
  totalPrice: number
}

interface Props {
  listingId: string
  pricePerDay: number
  onBook: (result: BookingResult) => void
}

export default function BookingCalendar({ listingId, pricePerDay, onBook }: Props) {
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const today = startOfDay(new Date())

  const { data: blockedRanges = [] } = useQuery<AvailabilityRange[]>({
    queryKey: ['availability', listingId],
    queryFn: () => listingsApi.getAvailability(listingId),
  })

  const isDateBlocked = (date: Date): boolean => {
    if (isBefore(date, today)) return true
    return blockedRanges.some((r) => {
      const start = parseISO(r.start_date)
      const end = parseISO(r.end_date)
      return isWithinInterval(date, { start, end })
    })
  }

  const totalDays = range?.from && range?.to
    ? Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const totalPrice = totalDays * pricePerDay

  const handleBook = () => {
    if (!range?.from || !range?.to) return
    onBook({
      startDate: range.from,
      endDate: range.to,
      totalDays,
      totalPrice,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Select dates</h3>
      <DayPicker
        mode="range"
        selected={range}
        onSelect={setRange}
        disabled={isDateBlocked}
        numberOfMonths={1}
        className="!font-sans"
      />
      {totalDays > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">${pricePerDay} × {totalDays} days</span>
            <span className="font-semibold">${totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={handleBook}
            className="w-full mt-3 bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Reserve — ${totalPrice.toFixed(2)} CAD
          </button>
        </div>
      )}
    </div>
  )
}
