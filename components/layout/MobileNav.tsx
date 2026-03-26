'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/subscriptions', icon: CreditCard,      label: 'Subscriptions' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="
      lg:hidden fixed bottom-0 left-0 right-0
      bg-white border-t border-[#E5E5E5]
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
            className={`
              flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl
              transition-all duration-150 text-center min-w-0
              ${isActive ? 'text-[#121212]' : 'text-[#757575] hover:text-[#424242]'}
            `}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
