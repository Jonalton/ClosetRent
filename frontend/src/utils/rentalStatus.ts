export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending approval', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  disputed: { label: 'Disputed', color: 'bg-orange-100 text-orange-800' },
}
