'use client'

import { motion, useTransform, useMotionTemplate } from 'framer-motion'
import { useEffectiveScrollY } from '@/lib/hooks/useEffectiveScrollY'
import { formatCurrency } from '@/lib/utils/currency'
import UserAvatarMenu from '@/components/dashboard/UserAvatarMenu'
import type { DashboardStats } from '@/types'

interface Props {
  firstName: string
  stats: DashboardStats
  sharedCount: number
  shareText: string
  currency?: string
}

export default function DashboardSummaryHero({
  firstName,
  stats,
  sharedCount,
  shareText,
  currency = 'EUR',
}: Props) {
  const scrollY       = useEffectiveScrollY()
  const opacity       = useTransform(scrollY, [0, 140], [1, 0])
  const blurPx        = useTransform(scrollY, [0, 140], [0, 8])
  const filter        = useMotionTemplate`blur(${blurPx}px)`
  const pointerEvents = useTransform(opacity, v => v < 0.05 ? 'none' : 'auto')

  const monthly = formatCurrency(stats.total_monthly_cost, currency)
  const annual  = formatCurrency(stats.total_annual_cost, currency)
  const savings = formatCurrency(stats.shared_monthly_cost, currency)
  const total   = stats.active_count + stats.trial_count
  const hasSave = stats.shared_monthly_cost > 0.01 && sharedCount > 0
  const name    = firstName || 'de nuevo'

  return (
    <motion.div
      className="sticky top-0 z-[20] pb-5 bg-[#F7F8FA] dark:bg-[#111111]"
      style={{ opacity, filter, pointerEvents }}
    >
      {/* Row: greeting + avatar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[17px] font-bold text-black dark:text-[#F2F2F7]">
          Hola, {name}.
        </p>
        <UserAvatarMenu shareText={shareText} />
      </div>

      {/* Main statement */}
      <p className="text-[33px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-[1.2] tracking-tight mb-4">
        Tu gasto mensual es de{' '}
        <span className="text-[#3D3BF3] dark:text-[#8B89FF]">{monthly}</span>
        {' '}y al año gastas{' '}
        <span className="text-[#3D3BF3] dark:text-[#8B89FF]">{annual}</span>.
      </p>

      {/* Supporting statement */}
      <p className="text-[18px] font-bold text-black dark:text-[#F2F2F7] leading-relaxed">
        Tienes{' '}
        <span className="text-[#3D3BF3] dark:text-[#8B89FF]">
          {total} {total === 1 ? 'suscripción activa' : 'suscripciones activas'}
        </span>
        {hasSave ? (
          <>
            , y ahorras{' '}
            <span className="text-[#3D3BF3] dark:text-[#8B89FF]">
              {savings} al mes
            </span>
            {' '}por compartir{' '}
            <span className="text-[#3D3BF3] dark:text-[#8B89FF]">
              {sharedCount} {sharedCount === 1 ? 'suscripción' : 'suscripciones'}
            </span>.
          </>
        ) : '.'}
      </p>
    </motion.div>
  )
}
