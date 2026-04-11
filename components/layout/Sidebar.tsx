'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, CalendarDays, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/subscriptions', icon: CreditCard,      label: 'Subscriptions' },
  { href: '/calendar',      icon: CalendarDays,    label: 'Calendar' },
]

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="
      hidden lg:flex flex-col
      w-56 min-h-dvh
      bg-white dark:bg-[#1C1C1E] border-r border-[#E8E8E8] dark:border-[#2C2C2E]
      px-3 py-6
      fixed left-0 top-0 bottom-0
    ">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <Image
          src="/logo.png"
          alt="Perezoso"
          width={32}
          height={32}
          className="rounded-xl flex-shrink-0"
        />
        <span className="font-bold text-[#424242] dark:text-[#F2F2F7] text-base tracking-tight">Perezoso</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-[#121212] text-white dark:bg-[#F2F2F7] dark:text-[#424242]'
                  : 'text-[#424242] hover:bg-[#F5F5F5] hover:text-[#424242] dark:text-[#AEAEB2] dark:hover:bg-[#2C2C2E] dark:hover:text-[#F2F2F7]'
                }
              `}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User / logout */}
      <div className="border-t border-[#E8E8E8] dark:border-[#2C2C2E] pt-4 mt-4">
        {profile?.full_name && (
          <div className="px-3 mb-3">
            <p className="text-xs font-medium text-[#424242] dark:text-[#F2F2F7] truncate">{profile.full_name}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
            text-sm text-[#616161] hover:text-red-700 hover:bg-red-50
            dark:text-[#8E8E93] dark:hover:text-red-400 dark:hover:bg-red-900/20
            transition-all duration-150
          "
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
