import type { SubscriptionStatus } from '@/types'

interface StatusBadgeProps {
  status: SubscriptionStatus
  className?: string
}

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; classes: string }
> = {
  active:    { label: 'Active',    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial:     { label: 'Trial',     classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  paused:    { label: 'Paused',    classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { label, classes } = STATUS_CONFIG[status]
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full
        text-xs font-medium border ${classes} ${className}
      `}
    >
      {label}
    </span>
  )
}

interface CategoryBadgeProps {
  label: string
  color: string    // bg color class
  textColor: string
  emoji?: string
  className?: string
}

export function CategoryBadge({
  label,
  color,
  textColor,
  emoji,
  className = '',
}: CategoryBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        text-xs font-medium ${color} ${textColor} ${className}
      `}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </span>
  )
}
