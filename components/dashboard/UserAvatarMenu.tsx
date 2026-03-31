'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { LogOut, Share2, Moon, Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { getInitials, getAvatarPastel } from '@/lib/utils/logos'
import { useTheme } from '@/components/ui/ThemeProvider'

interface UserAvatarMenuProps {
  shareText?: string
}

export default function UserAvatarMenu({ shareText }: UserAvatarMenuProps) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [user, setUser] = useState<{ name: string; avatarUrl: string | null } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          name: data.user.user_metadata?.full_name ?? data.user.email ?? 'Account',
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        })
      }
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const insideButton = buttonRef.current?.contains(e.target as Node)
      const insideDropdown = dropdownRef.current?.contains(e.target as Node)
      if (!insideButton && !insideDropdown) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onMouseDown)
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen(o => !o)
  }

  async function handleShare() {
    setOpen(false)
    if (navigator.share) {
      await navigator.share({
        title: 'Perezoso — My Subscriptions',
        text: shareText ?? 'Check my subscription overview tracked with Perezoso 🦥',
      }).catch(() => {})
    }
  }

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const name = user?.name ?? ''
  const { bg, fg } = getAvatarPastel(name || 'User')
  const initials = getInitials(name || 'U')

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
      className="w-56 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5E5] dark:border-[#2C2C2E] shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden animate-fade-in-scale"
    >
      <div className="px-4 py-3 border-b border-[#F0F0F0] dark:border-[#2C2C2E]">
        <p className="text-sm font-semibold text-[#121212] dark:text-[#F2F2F7] truncate">{name}</p>
      </div>
      <div className="py-1.5">
        <button
          onClick={() => { toggle(); setOpen(false) }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
        >
          {theme === 'dark' ? <Sun size={15} className="text-[#616161] dark:text-[#636366]" /> : <Moon size={15} className="text-[#616161]" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#424242] dark:text-[#AEAEB2] hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors text-left"
        >
          <Share2 size={15} className="text-[#616161] dark:text-[#636366]" />
          Share data
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 focus:outline-none ring-2 ring-transparent focus:ring-[#D4D4D4] transition-all"
        aria-label="Account menu"
      >
        {user?.avatarUrl && !imgError ? (
          <Image
            src={user.avatarUrl}
            alt={name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: bg, color: fg }}
          >
            {initials}
          </div>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}
