'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n/LocaleProvider'
import { resolveSubscriptionLogoUrl } from '@/lib/constants/platforms'
import { formatCurrency } from '@/lib/utils/currency'
import { getAvatarPastel, getInitials } from '@/lib/utils/logos'
import type { SubscriptionWithCosts } from '@/types'
import CalendarDaySheet from './CalendarDaySheet'

// ─── Billing projection helpers ──────────────────────────────────────────────

function billingPeriodDays(period: string, intervalCount: number): number {
  const base: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 91, yearly: 365 }
  return (base[period] ?? 30) * Math.max(1, intervalCount)
}

/**
 * Returns the day-of-month for a subscription's billing occurrence
 * in the given (year, month). Projects forward/backward from next_billing_date.
 * Returns null if the subscription has no billing date.
 */
function getBillingDayInMonth(
  sub: SubscriptionWithCosts,
  year: number,
  month: number,
): number | null {
  if (!sub.next_billing_date) return null
  if (sub.status === 'cancelled' || sub.status === 'paused') return null

  const [ny, nm, nd] = sub.next_billing_date.split('-').map(Number)
  let date = new Date(ny, nm - 1, nd)
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  const periodDays = billingPeriodDays(sub.billing_period, sub.billing_interval_count)

  // Project backward until we reach or pass monthEnd
  while (date > monthEnd && periodDays > 0) {
    date = new Date(date.getTime() - periodDays * 86_400_000)
  }
  // Project forward until we reach or pass monthStart
  while (date < monthStart && periodDays > 0) {
    date = new Date(date.getTime() + periodDays * 86_400_000)
  }

  if (date >= monthStart && date <= monthEnd) return date.getDate()
  return null
}

/** Maps each day-of-month to the subscriptions renewing that day. */
function buildDayMap(
  subs: SubscriptionWithCosts[],
  year: number,
  month: number,
): Record<number, SubscriptionWithCosts[]> {
  const map: Record<number, SubscriptionWithCosts[]> = {}
  for (const sub of subs) {
    const day = getBillingDayInMonth(sub, year, month)
    if (day !== null) {
      if (!map[day]) map[day] = []
      map[day].push(sub)
    }
  }
  return map
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Convert Sun=0 → 6, Mon=1 → 0
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// ─── Tiny avatar for calendar cells ──────────────────────────────────────────

function TinyAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const { bg, fg } = getAvatarPastel(name)
  const initial = getInitials(name)[0] ?? '?'
  const isAuto = logoUrl?.includes('cdn.simpleicons.org') ?? false

  if (logoUrl) {
    return (
      <div
        className="w-[18px] h-[18px] rounded-[4px] overflow-hidden border border-[#E0E0E0] flex-shrink-0 flex items-center justify-center"
        style={{ background: isAuto ? '#F5F5F5' : 'transparent' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          width={18}
          height={18}
          className={isAuto ? 'w-[85%] h-[85%] object-contain' : 'w-full h-full object-cover'}
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      className="w-[18px] h-[18px] rounded-[4px] flex-shrink-0 flex items-center justify-center text-[8px] font-bold border border-[#E0E0E0]"
      style={{ backgroundColor: bg, color: fg }}
    >
      {initial}
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: number
  isToday: boolean
  subscriptions: SubscriptionWithCosts[]
  onClick: () => void
}

function DayCell({ day, isToday, subscriptions, onClick }: DayCellProps) {
  const hasSubs = subscriptions.length > 0

  return (
    <button
      onClick={hasSubs ? onClick : undefined}
      className={`
        flex flex-col items-center pt-2 pb-2 min-h-[56px] bg-white
        transition-colors duration-100
        ${hasSubs ? 'active:bg-[#F7F8FA]' : 'cursor-default'}
      `}
    >
      {/* Day number */}
      <span
        className={`
          w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-medium leading-none
          ${isToday ? 'bg-[#3D3BF3] text-white font-semibold' : hasSubs ? 'text-[#121212]' : 'text-[#888888]'}
        `}
      >
        {day}
      </span>

      {/* Subscription indicators */}
      {hasSubs && (
        <div className="flex items-center gap-[2px] mt-1.5">
          <TinyAvatar
            name={subscriptions[0].name}
            logoUrl={resolveSubscriptionLogoUrl(subscriptions[0].name, subscriptions[0].logo_url)}
          />
          {subscriptions.length > 1 && (
            <span className="text-[9px] font-semibold text-[#888888] leading-none">
              +{subscriptions.length - 1}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  subscriptions: SubscriptionWithCosts[]
}

export default function CalendarView({ subscriptions }: Props) {
  const t = useT()
  const locale = useLocale()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const dayMap = useMemo(
    () => buildDayMap(subscriptions, year, month),
    [subscriptions, year, month],
  )

  // Total charges in this month (sum of price_amount for each billing occurrence)
  const monthTotal = useMemo(() => {
    let total = 0
    const currency = subscriptions[0]?.currency ?? 'EUR'
    for (const subs of Object.values(dayMap)) {
      for (const sub of subs) total += sub.price_amount
    }
    return { amount: total, currency }
  }, [dayMap, subscriptions])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDayOffset = getFirstDayOfWeek(year, month)
  const daysInMonth = getDaysInMonth(year, month)

  // Build flat cell array: nulls for empty cells before day 1
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const monthName = new Date(year, month, 1).toLocaleDateString(dateLocale, { month: 'long' })
  const yearLabel = year !== today.getFullYear() ? ` ${year}` : ''

  const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekdays = locale === 'es' ? WEEKDAYS_ES : WEEKDAYS_EN

  const selectedSubs = selectedDay !== null ? (dayMap[selectedDay] ?? []) : []

  return (
    <div>
      {/* Page title */}
      <div className="mb-1">
        <h1 className="text-[28px] font-bold text-[#121212] tracking-tight capitalize">
          {monthName}{yearLabel}
        </h1>
      </div>

      {/* Month summary */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-[#121212]">
          <span className="font-semibold tabular-nums">
            {formatCurrency(monthTotal.amount, monthTotal.currency)}
          </span>
          {' '}
          <span className="text-[#888888]">{t('calendar.total')}</span>
        </span>
        <span className="w-px h-3.5 bg-[#D4D4D4]" />
        <span className="text-sm text-[#888888]">
          {Object.keys(dayMap).length === 0
            ? t('calendar.noRenewals')
            : `${Object.values(dayMap).flat().length} subs.`}
        </span>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-[20px] border border-[#E8E8E8] overflow-hidden">
        {/* Month navigation header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0F0]">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F5F5F5] active:bg-[#EBEBEB] transition-colors"
          >
            <ChevronLeft size={16} className="text-[#424242]" />
          </button>
          <span className="text-[15px] font-semibold text-[#121212] capitalize">
            {monthName}{yearLabel}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F5F5F5] active:bg-[#EBEBEB] transition-colors"
          >
            <ChevronRight size={16} className="text-[#424242]" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-[#F0F0F0]">
          {weekdays.map(label => (
            <div
              key={label}
              className="text-center text-[11px] font-medium text-[#A0A0A0] py-2.5 tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid — 1px gap to show the bg-[#F0F0F0] as grid lines */}
        <div className="grid grid-cols-7 gap-px bg-[#F0F0F0]">
          {cells.map((day, i) => {
            if (!day) {
              return <div key={i} className="bg-white min-h-[56px]" />
            }
            const isToday =
              year === today.getFullYear() &&
              month === today.getMonth() &&
              day === today.getDate()
            const subsForDay = dayMap[day] ?? []

            return (
              <DayCell
                key={i}
                day={day}
                isToday={isToday}
                subscriptions={subsForDay}
                onClick={() => setSelectedDay(day)}
              />
            )
          })}
        </div>
      </div>

      {/* Day detail sheet */}
      <CalendarDaySheet
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        day={selectedDay}
        month={month}
        year={year}
        subscriptions={selectedSubs}
      />
    </div>
  )
}
