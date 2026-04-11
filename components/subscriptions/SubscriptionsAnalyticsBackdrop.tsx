'use client'

import { formatCurrency } from '@/lib/utils/currency'
import type { DashboardStats } from '@/types'

/**
 * Dark analytics panel rendered behind the draggable foreground on the
 * /subscriptions route. Shows headline KPIs derived from the dashboard
 * stats.
 */
export default function SubscriptionsAnalyticsBackdrop({
  stats,
  allCount,
}: {
  stats: DashboardStats
  allCount: number
}) {
  return (
    <div className="h-full overflow-y-auto px-6 pt-8 pb-40">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
        Resumen
      </p>
      <h2 className="mt-2 text-[40px] font-bold tracking-tight leading-[1.05] text-white">
        {formatCurrency(stats.total_monthly_cost, 'EUR')}
        <span className="text-[18px] font-medium text-white/60 ml-2">/mes</span>
      </h2>
      <p className="mt-3 text-[15px] text-white/70 leading-relaxed max-w-[36ch]">
        Estás pagando{' '}
        <span className="text-white font-semibold">
          {formatCurrency(stats.total_annual_cost, 'EUR')}
        </span>{' '}
        al año en{' '}
        <span className="text-white font-semibold">
          {allCount === 1 ? '1 suscripción' : `${allCount} suscripciones`}
        </span>
        .
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3">
        <KpiCard label="Activas" value={String(stats.active_count)} />
        <KpiCard label="Prueba" value={String(stats.trial_count)} />
        <KpiCard label="Pausadas" value={String(stats.paused_count)} />
        <KpiCard
          label="Compartido"
          value={formatCurrency(stats.shared_monthly_cost, 'EUR')}
          sub="/mes"
        />
      </div>

      <p className="mt-10 text-[12px] text-white/40">
        Desliza la tarjeta hacia arriba para volver
      </p>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-[24px] bg-white/[0.06] border border-white/[0.08] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-bold text-white leading-tight">
        {value}
        {sub && <span className="text-[13px] font-medium text-white/50 ml-1">{sub}</span>}
      </p>
    </div>
  )
}
