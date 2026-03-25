import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Format an ISO date string for display (e.g. "15 Jun 2025")
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: es })
  } catch {
    return '—'
  }
}

/**
 * Short relative label: "Today", "Tomorrow", "In 3 days", "15 Jun"
 */
export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'd MMM', { locale: es })
  } catch {
    return '—'
  }
}

/**
 * "in 5 days", "in 1 month", etc.
 */
export function formatTimeUntil(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es })
  } catch {
    return '—'
  }
}

/**
 * Returns true if a date is within N days from today
 */
export function isWithinDays(dateStr: string | null | undefined, days: number): boolean {
  if (!dateStr) return false
  try {
    const date = parseISO(dateStr)
    const now = new Date()
    const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= days
  } catch {
    return false
  }
}

/**
 * Days until a given date (negative means past)
 */
export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity
  try {
    const date = parseISO(dateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  } catch {
    return Infinity
  }
}
