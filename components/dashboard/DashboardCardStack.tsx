'use client'

import { motion, useTransform } from 'framer-motion'
import { useElasticPullDown } from '@/lib/hooks/useElasticPullDown'

/**
 * Wraps the dashboard card list and expands the gap between cards
 * by up to 16 px when the user pulls down at the top of the page.
 * Base gap is 8 px → max gap is 24 px.
 */
export default function DashboardCardStack({ children }: { children: React.ReactNode }) {
  const elasticY = useElasticPullDown()
  // useTransform with a mapper fn outputs a string so Framer Motion passes
  // it directly to CSS without trying to add px (rowGap needs "Npx").
  const rowGap = useTransform(elasticY, v => `${8 + (v / 65) * 16}px`)

  return (
    <motion.div
      className="relative z-[1] mt-2 bg-[#F7F8FA] dark:bg-[#111111]"
      style={{ display: 'flex', flexDirection: 'column', rowGap }}
    >
      {children}
    </motion.div>
  )
}
