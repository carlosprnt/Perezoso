import type { SubscriptionStatus } from '@/types'
import type { LucideIcon } from '@/lib/icons'

interface StatusBadgeProps {
  status: SubscriptionStatus
  className?: string
}

/* All color pairs pass WCAG AA (≥4.5:1) on their background */
const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; classes: string }> = {
  active:    { label: 'Active',    classes: 'bg-green-100  text-green-800  border-green-300'  },
  trial:     { label: 'Trial',     classes: 'bg-stone-200  text-stone-800  border-stone-300'  },
  paused:    { label: 'Paused',    classes: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  cancelled: { label: 'Cancelled', classes: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { label, classes } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes} ${className}`}>
      {label}
    </span>
  )
}

interface CategoryBadgeProps {
  label: string
  color: string
  textColor: string
  Icon?: LucideIcon
  className?: string
}

export function CategoryBadge({ label, color, textColor, Icon, className = '' }: CategoryBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${textColor} ${className}`}>
      {Icon && <Icon size={10} strokeWidth={2.5} />}
      {label}
    </span>
  )
}
