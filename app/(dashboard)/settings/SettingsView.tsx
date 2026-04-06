'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, ChevronsUpDown, Plus, X, Bell, Star, Share2, Mail, Sun, Moon, Monitor } from 'lucide-react'

// lucide-react dropped the Twitter glyph, so we inline the X/Twitter mark.
function TwitterIcon({ size = 17, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
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

// ── Shared building blocks ──────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="px-1 mb-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">{title}</h2>
        {subtitle && <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function Row({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${last ? '' : 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]'}`}>
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

  return (
    <div className="max-w-2xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4 pb-6" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#E8E8E8] dark:border-[#2C2C2E] flex items-center justify-center active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
          aria-label="Atrás"
        >
          <ArrowLeft size={18} className="text-[#121212] dark:text-[#F2F2F7]" />
        </button>
        <h1 className="text-[22px] font-bold text-[#121212] dark:text-[#F2F2F7]">Ajustes</h1>
      </div>

      {/* ── Perezoso Plus ──────────────────────────────────────────────── */}
      <Section title="Perezoso Plus" subtitle="Próximamente features únicas">
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3D3BF3] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[#121212] dark:text-[#F2F2F7]">Perezoso Plus</p>
            <p className="text-[13px] text-[#737373] dark:text-[#8E8E93]">Accede a analíticas avanzadas y automatizaciones</p>
          </div>
          <button
            disabled
            className="h-9 px-4 rounded-full bg-[#3D3BF3] text-white text-[13px] font-semibold opacity-40 cursor-not-allowed flex-shrink-0"
          >
            Mejorar
          </button>
        </div>
      </Section>

      {/* ── Currency ───────────────────────────────────────────────────── */}
      <Section title="Moneda preferida" subtitle="Se usará por defecto al añadir nuevas suscripciones">
        <Row last>
          <span className="text-[15px] text-[#121212] dark:text-[#F2F2F7]">Moneda</span>
          <div className="relative flex items-center gap-1">
            <span className="text-[15px] text-[#737373] dark:text-[#AEAEB2]">
              {CURRENCIES.find(c => c.code === currency)?.symbol} {currency}
            </span>
            <ChevronsUpDown size={14} className="text-[#8E8E93]" />
            <select
              value={currency}
              onChange={handleCurrency}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
              style={{ fontSize: 16 }}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
              ))}
            </select>
          </div>
        </Row>
      </Section>

      {/* ── Custom categories ──────────────────────────────────────────── */}
      <Section title="Categorías personalizadas" subtitle="Crea categorías adicionales para organizar tus suscripciones">
        {categories.length > 0 && categories.map((cat, i) => (
          <Row key={cat} last={i === categories.length - 1 && false}>
            <span className="text-[15px] text-[#121212] dark:text-[#F2F2F7]">{cat}</span>
            <button
              onClick={() => handleRemoveCategory(cat)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
              aria-label="Eliminar"
            >
              <X size={15} />
            </button>
          </Row>
        ))}
        <div className="flex items-center gap-2 px-4 py-3">
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
            className="w-9 h-9 rounded-full bg-[#3D3BF3] text-white flex items-center justify-center disabled:opacity-30 transition-opacity flex-shrink-0"
            aria-label="Añadir categoría"
          >
            <Plus size={16} />
          </button>
        </div>
      </Section>

      {/* ── Notifications ──────────────────────────────────────────────── */}
      <Section title="Notificaciones">
        <Row last>
          <div className="flex items-center gap-3">
            <Bell size={17} className="text-[#737373] dark:text-[#8E8E93]" />
            <span className="text-[15px] text-[#121212] dark:text-[#F2F2F7]">Recordatorios de renovación</span>
          </div>
          <button
            role="switch"
            aria-checked={notifications}
            onClick={handleNotifications}
            className={`relative w-11 h-6 rounded-full transition-colors ${notifications ? 'bg-[#3D3BF3]' : 'bg-[#D4D4D4] dark:bg-[#3A3A3C]'}`}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: notifications ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </Row>
      </Section>

      {/* ── Theme ──────────────────────────────────────────────────────── */}
      <Section title="Apariencia">
        {([
          { key: 'light', label: 'Claro', Icon: Sun },
          { key: 'dark', label: 'Oscuro', Icon: Moon },
          { key: 'system', label: 'Sistema', Icon: Monitor },
        ] as const).map(({ key, label, Icon }, i, arr) => (
          <button
            key={key}
            onClick={() => setPreference(key)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors ${i < arr.length - 1 ? 'border-b border-[#F0F0F0] dark:border-[#2C2C2E]' : ''}`}
          >
            <Icon size={17} className="text-[#737373] dark:text-[#8E8E93]" />
            <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">{label}</span>
            {preference === key && (
              <span className="w-2 h-2 rounded-full bg-[#3D3BF3]" />
            )}
          </button>
        ))}
      </Section>

      {/* ── Review / Share / Contact ───────────────────────────────────── */}
      <Section title="Apóyanos">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.open('https://perezoso.app', '_blank')
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors border-b border-[#F0F0F0] dark:border-[#2C2C2E]"
        >
          <Star size={17} className="text-[#737373] dark:text-[#8E8E93]" />
          <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">Dejar una reseña</span>
        </button>
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
        >
          <Share2 size={17} className="text-[#737373] dark:text-[#8E8E93]" />
          <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">Compartir con un amigo</span>
        </button>
      </Section>

      <Section title="Contacto">
        <a
          href="https://twitter.com/carlosprnt"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors border-b border-[#F0F0F0] dark:border-[#2C2C2E]"
        >
          <TwitterIcon size={15} className="text-[#737373] dark:text-[#8E8E93]" />
          <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">@carlosprnt</span>
          <span className="text-[13px] text-[#8E8E93]">Twitter</span>
        </a>
        <a
          href="mailto:hello@carlospariente.com"
          className="flex items-center gap-3 px-4 py-3 active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
        >
          <Mail size={17} className="text-[#737373] dark:text-[#8E8E93]" />
          <span className="flex-1 text-[15px] text-[#121212] dark:text-[#F2F2F7]">hello@carlospariente.com</span>
          <span className="text-[13px] text-[#8E8E93]">Email</span>
        </a>
      </Section>
    </div>
  )
}
