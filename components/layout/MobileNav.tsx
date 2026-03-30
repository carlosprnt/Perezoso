'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard } from 'lucide-react'
import { useT } from '@/lib/i18n/LocaleProvider'

export default function MobileNav() {
  const pathname = usePathname()
  const t = useT()

  const NAV_ITEMS = [
    { href: '/dashboard',     icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/subscriptions', icon: CreditCard,      label: t('nav.subscriptions') },
  ]

  return (
    <nav className="
      lg:hidden fixed bottom-0 left-0 right-0
      bg-white dark:bg-[#1C1C1E] border-t border-[#E5E5E5] dark:border-[#2C2C2E]
      flex items-center justify-around
      px-4 py-2 safe-area-pb
      z-50
    ">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 min-w-0 transition-colors duration-150"
          >
            {/* Wide pill indicator around icon */}
            <div
              className={`
                flex items-center justify-center
                px-7 py-1.5 rounded-full
                transition-all duration-200
                ${isActive ? 'bg-[#121212]/[0.08] dark:bg-[#F2F2F7]/[0.1]' : ''}
              `}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-[#121212] dark:text-[#F2F2F7]' : 'text-[#888888] dark:text-[#636366]'}
              />
            </div>
            <span
              className={`text-[10px] font-medium leading-none ${isActive ? 'text-[#121212]' : 'text-[#888888]'}`}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
