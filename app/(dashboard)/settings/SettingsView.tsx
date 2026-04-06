'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, ChevronRight, Plus, X, Bell, Star, Share2, Mail, Sun, Moon, Monitor, Coins, Tag, Check } from 'lucide-react'
import { CURRENCIES } from '@/lib/constants/currencies'
import { useTheme } from '@/components/ui/ThemeProvider'
import {
  setPreferredCurrency,
  setNotificationsEnabled,
  addCustomCategory,
  removeCustomCategory,
  type UserPreferences,
} from './actions'

interface Props {
  preferences: UserPreferences
}

// lucide-react dropped the Twitter glyph, so we inline the X/Twitter mark.
function TwitterIcon({ size = 17, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// iOS-style coloured icon tile
function IconTile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 text-white"
      style={{ backgroundColor: bg }}
    >
      {children}
    </div>
  )
}

// Single row inside a grouped card. Separator drawn automatically unless `last`.
function Row({
  icon,
  label,
  value,
  right,
  onClick,
  last = false,
  href,
}: {
  icon?: React.ReactNode
  label: React.ReactNode
  value?: React.ReactNode
  right?: React.ReactNode
  onClick?: () => void
  last?: boolean
  href?: string
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 min-h-[44px] py-2 ${last ? '' : 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]'}`}>
      {icon}
      <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">{label}</span>
      {value && <span className="text-[15px] text-[#737373] dark:text-[#8E8E93]">{value}</span>}
      {right}
    </div>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors">
        {inner}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors">
        {inner}
      </button>
    )
  }
  return inner
}

// Grouped card — wraps rows in a white/dark panel with rounded corners.
function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
      {children}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function SettingsView({ preferences }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { preference, setPreference } = useTheme()

  const [currency, setCurrency] = useState(preferences.preferred_currency)
  const [notifications, setNotifications] = useState(preferences.notifications_enabled)
  const [categories, setCategories] = useState<string[]>(preferences.custom_categories)
  const [newCategory, setNewCategory] = useState('')

  function handleCurrency(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value
    setCurrency(code)
    startTransition(() => { setPreferredCurrency(code) })
  }

  function handleNotifications() {
    const next = !notifications
    setNotifications(next)
    startTransition(() => { setNotificationsEnabled(next) })
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim()
    if (!trimmed || categories.includes(trimmed)) return
    setCategories([...categories, trimmed])
    setNewCategory('')
    startTransition(() => { addCustomCategory(trimmed) })
  }

  function handleRemoveCategory(name: string) {
    setCategories(categories.filter(c => c !== name))
    startTransition(() => { removeCustomCategory(name) })
  }

  async function handleShare() {
    const text = 'Check out Perezoso — the simplest way to track your subscriptions 🦥'
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Perezoso', text, url }).catch(() => {})
    } else {
      try { await navigator.clipboard.writeText(`${text} ${url}`) } catch { /* ignore */ }
    }
  }

  const THEMES = [
    { key: 'light', label: 'Claro', Icon: Sun, bg: '#F59E0B' },
    { key: 'dark', label: 'Oscuro', Icon: Moon, bg: '#374151' },
    { key: 'system', label: 'Sistema', Icon: Monitor, bg: '#6B7280' },
  ] as const

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] -mx-4 sm:-mx-6 -my-6 lg:-my-8 px-5 pb-8">
      {/* Header */}
      <div
        className="flex items-center gap-3 pb-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
          aria-label="Atrás"
        >
          <ArrowLeft size={20} className="text-[#121212] dark:text-[#F2F2F7]" />
        </button>
        <h1 className="text-[22px] font-bold text-[#121212] dark:text-[#F2F2F7]">Ajustes</h1>
      </div>

      {/* ── Perezoso Plus ──────────────────────────────────────────────── */}
      <Group>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-[#3D3BF3] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[#121212] dark:text-[#F2F2F7] leading-tight">Perezoso Plus</p>
            <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5">Próximamente features únicas</p>
          </div>
          <button
            disabled
            className="h-8 px-4 rounded-full bg-[#3D3BF3] text-white text-[13px] font-semibold opacity-40 cursor-not-allowed flex-shrink-0"
          >
            Mejorar
          </button>
        </div>
      </Group>

      {/* ── Currency + Notifications ───────────────────────────────────── */}
      <Group>
        <div className="relative flex items-center gap-3 px-4 min-h-[44px] py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <IconTile bg="#16A34A"><Coins size={15} /></IconTile>
          <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">Moneda</span>
          <span className="text-[15px] text-[#737373] dark:text-[#8E8E93]">
            {CURRENCIES.find(c => c.code === currency)?.symbol} {currency}
          </span>
          <ChevronRight size={15} className="text-[#C7C7CC]" />
          <select
            value={currency}
            onChange={handleCurrency}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
            style={{ fontSize: 16 }}
            aria-label="Moneda preferida"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 px-4 min-h-[44px] py-2">
          <IconTile bg="#EF4444"><Bell size={15} /></IconTile>
          <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">Notificaciones</span>
          <button
            role="switch"
            aria-checked={notifications}
            onClick={handleNotifications}
            className={`relative w-[51px] h-[31px] rounded-full transition-colors ${notifications ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'}`}
          >
            <span
              className="absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow transition-transform"
              style={{ transform: notifications ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </Group>

      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <Group>
        {THEMES.map(({ key, label, Icon, bg }, i) => (
          <button
            key={key}
            onClick={() => setPreference(key)}
            className={`w-full flex items-center gap-3 px-4 min-h-[44px] py-2 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors ${i < THEMES.length - 1 ? 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]' : ''}`}
          >
            <IconTile bg={bg}><Icon size={15} /></IconTile>
            <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">{label}</span>
            {preference === key && <Check size={17} className="text-[#3D3BF3]" />}
          </button>
        ))}
      </Group>

      {/* ── Custom categories ──────────────────────────────────────────── */}
      <Group>
        {categories.map((cat, i) => (
          <div
            key={cat}
            className={`flex items-center gap-3 px-4 min-h-[44px] py-2 ${i < categories.length ? 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]' : ''}`}
          >
            <IconTile bg="#8B5CF6"><Tag size={15} /></IconTile>
            <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">{cat}</span>
            <button
              onClick={() => handleRemoveCategory(cat)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
              aria-label="Eliminar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 min-h-[44px] py-2">
          <IconTile bg="#8B5CF6"><Plus size={15} /></IconTile>
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
            placeholder="Nueva categoría"
            className="flex-1 bg-transparent text-[15px] text-[#121212] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategory.trim()}
            className="text-[15px] font-semibold text-[#3D3BF3] disabled:opacity-30"
          >
            Añadir
          </button>
        </div>
      </Group>

      {/* ── Apóyanos ───────────────────────────────────────────────────── */}
      <Group>
        <Row
          icon={<IconTile bg="#F59E0B"><Star size={15} /></IconTile>}
          label="Dejar una reseña"
          right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
          onClick={() => { if (typeof window !== 'undefined') window.open('https://perezoso.app', '_blank') }}
        />
        <Row
          icon={<IconTile bg="#3D3BF3"><Share2 size={15} /></IconTile>}
          label="Compartir con un amigo"
          right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
          onClick={handleShare}
          last
        />
      </Group>

      {/* ── Contacto ───────────────────────────────────────────────────── */}
      <Group>
        <Row
          icon={<IconTile bg="#000000"><TwitterIcon size={13} /></IconTile>}
          label="@carlosprnt"
          right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
          href="https://twitter.com/carlosprnt"
        />
        <Row
          icon={<IconTile bg="#3D3BF3"><Mail size={15} /></IconTile>}
          label="hello@carlospariente.com"
          right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
          href="mailto:hello@carlospariente.com"
          last
        />
      </Group>

      <div className="h-8" />
    </div>
  )
}
