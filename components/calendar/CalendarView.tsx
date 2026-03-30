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

  while (date > monthEnd && periodDays > 0) {
    date = new Date(date.getTime() - periodDays * 86_400_000)
  }
  while (date < monthStart && periodDays > 0) {
    date = new Date(date.getTime() + periodDays * 86_400_000)
  }

  if (date >= monthStart && date <= monthEnd) return date.getDate()
  return null
}

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
  return d === 0 ? 6 : d - 1
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// ─── Cell logo — large, fills most of the cell bottom area ──────────────────

function CellLogo({ name, logoUrl, size }: { name: string; logoUrl: string | null; size: number }) {
  const { bg, fg } = getAvatarPastel(name)
  const initial = getInitials(name)[0] ?? '?'
  const isAuto = logoUrl?.includes('cdn.simpleicons.org') ?? false
  const r = Math.round(size * 0.22) // ~22% corner radius

  if (logoUrl) {
    return (
      <div
        className="overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#E4E4E4] dark:border-[#3A3A3C]"
        style={{
          width: size,
          height: size,
          borderRadius: r,
          background: isAuto ? '#F5F5F5' : 'transparent',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className={isAuto ? 'w-[84%] h-[84%] object-contain' : 'w-full h-full object-cover'}
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center border border-[#E4E4E4] dark:border-[#3A3A3C]"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
      }}
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
        flex flex-col items-start p-2 rounded-[12px] min-h-[80px]
        transition-all duration-100 select-none bg-white dark:bg-[#1C1C1E]
        ${hasSubs ? 'active:scale-[0.96] cursor-pointer' : 'cursor-default'}
      `}
      style={isToday ? { border: '1.5px solid #3D3BF3' } : { border: '1.5px solid transparent' }}
    >
      {/* Day number — plain, no circle */}
      <span
        className={`
          text-[13px] font-medium leading-none flex-shrink-0
          ${isToday ? 'text-[#3D3BF3] font-semibold' : hasSubs ? 'text-[#121212] dark:text-[#F2F2F7]' : 'text-[#A0A0A0] dark:text-[#636366]'}
        `}
      >
        {day}
      </span>

      {/* Logo fills the lower portion of the cell */}
      {hasSubs && (
        <div className="flex flex-col items-start gap-[3px] mt-auto w-full">
          <CellLogo
            name={subscriptions[0].name}
            logoUrl={resolveSubscriptionLogoUrl(subscriptions[0].name, subscriptions[0].logo_url)}
            size={32}
          />
          {subscriptions.length > 1 && (
            <span className="text-[9px] font-semibold text-[#888888] dark:text-[#636366] leading-none bg-[#F0F0F0] dark:bg-[#2C2C2E] px-[5px] py-[3px] rounded-full">
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

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const numWeeks = cells.length / 7

  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const monthName = new Date(year, month, 1).toLocaleDateString(dateLocale, { month: 'long' })
  const yearLabel = year !== today.getFullYear() ? ` ${year}` : ''

  const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekdays = locale === 'es' ? WEEKDAYS_ES : WEEKDAYS_EN

  const selectedSubs = selectedDay !== null ? (dayMap[selectedDay] ?? []) : []

  const totalSubsThisMonth = Object.values(dayMap).flat().length

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 160px)' }}>

      {/* ── Page header: month title + right-aligned circular nav ─────────── */}
      <div className="mb-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[#111111] dark:text-[#F2F2F7] tracking-tight capitalize leading-none">
            {monthName}{yearLabel}
          </h1>
          {/* Circular nav buttons — right-aligned, filter-button style */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#2C2C2E] active:bg-[#F0F0F0] dark:active:bg-[#3A3A3C] transition-colors"
              style={{ border: '1.5px solid var(--border-nav-btn)' }}
              aria-label="Previous month"
            >
              <ChevronLeft size={17} strokeWidth={2} className="text-[#333333] dark:text-[#AEAEB2]" />
            </button>
            <button
              onClick={nextMonth}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#2C2C2E] active:bg-[#F0F0F0] dark:active:bg-[#3A3A3C] transition-colors"
              style={{ border: '1.5px solid var(--border-nav-btn)' }}
              aria-label="Next month"
            >
              <ChevronRight size={17} strokeWidth={2} className="text-[#333333] dark:text-[#AEAEB2]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Month summary — unified subtitle style ────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <span className="text-[11px] font-semibold text-[#888888] dark:text-[#636366] uppercase tracking-wider">
          <span className="tabular-nums">
            {formatCurrency(monthTotal.amount, monthTotal.currency)}
          </span>
          {' '}{t('calendar.total')}
        </span>
        <span className="w-px h-3 bg-[#D4D4D4] dark:bg-[#3A3A3C]" />
        <span className="text-[11px] font-semibold text-[#888888] dark:text-[#636366] uppercase tracking-wider">
          {totalSubsThisMonth === 0
            ? t('calendar.noRenewals')
            : `${totalSubsThisMonth} ${totalSubsThisMonth === 1
                ? (locale === 'es' ? 'renovación' : 'renewal')
                : (locale === 'es' ? 'renovaciones' : 'renewals')}`}
        </span>
      </div>

      {/* ── Weekday labels — free-floating, no container ──────────────────── */}
      <div className="grid grid-cols-7 mb-2 flex-shrink-0">
        {weekdays.map(label => (
          <div
            key={label}
            className="text-center text-[11px] font-medium text-[#A0A0A0] dark:text-[#636366] tracking-wide py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Calendar grid — cells float directly on page background ──────── */}
      {/* No card wrapper. Cells are individual rounded tiles with gap spacing. */}
      <div
        className="flex-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${numWeeks}, 1fr)`,
          gap: '5px',
          minHeight: `${numWeeks * 80 + (numWeeks - 1) * 5}px`,
        }}
      >
        {cells.map((day, i) => {
          // Empty cells before day 1 or after last day — invisible spacer
          if (!day) {
            return <div key={i} />
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
