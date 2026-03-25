'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/subscriptions',    icon: CreditCard,      label: 'Subscriptions' },
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
      w-56 min-h-screen
      bg-white border-r border-gray-100
      px-3 py-6
      fixed left-0 top-0 bottom-0
    ">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">P</span>
        </div>
        <span className="font-bold text-gray-900 text-base tracking-tight">Perezoso</span>
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
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
      <div className="border-t border-gray-100 pt-4 mt-4">
        {profile?.full_name && (
          <div className="px-3 mb-3">
            <p className="text-xs font-medium text-gray-900 truncate">{profile.full_name}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
            text-sm text-gray-500 hover:text-red-600 hover:bg-red-50
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
