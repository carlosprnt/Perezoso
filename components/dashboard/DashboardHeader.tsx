'use client'

import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion'
import UserAvatarMenu from './UserAvatarMenu'

interface Props {
  title: string
  subtitle: string
  shareText: string
}

export default function DashboardHeader({ title, subtitle, shareText }: Props) {
  const { scrollY } = useScroll()
  const opacity  = useTransform(scrollY, [0, 130], [1, 0])
  const blurPx   = useTransform(scrollY, [0, 130], [0, 8])
  const filter   = useMotionTemplate`blur(${blurPx}px)`

  return (
    <motion.div
      className="sticky top-0 z-[0] pb-3 pt-1"
      style={{ opacity, filter }}
    >
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] dark:text-[#F2F2F7] tracking-tight">{title}</h1>
          <p className="text-sm text-[#737373] dark:text-[#AEAEB2] mt-0.5">{subtitle}</p>
        </div>
        <UserAvatarMenu shareText={shareText} />
      </div>
    </motion.div>
  )
}
