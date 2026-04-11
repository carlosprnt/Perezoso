'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Plus, X, Bell, Star, Share2, Mail, Moon, Coins, Tag, Trash2, ShieldCheck, Sparkles } from '@/lib/icons'
import { CURRENCIES } from '@/lib/constants/currencies'
import { useTheme } from '@/components/ui/ThemeProvider'
import {
  setPreferredCurrency,
  setNotificationsEnabled,
  addCustomCategory,
  removeCustomCategory,
  deleteAccount,
  type UserPreferences,
} from './actions'
import { setDemoMode, restoreProductionState } from '@/app/(dashboard)/subscriptions/demo-action'
import haptics from '@/lib/haptics'
import { useSubscription } from '@/lib/revenuecat/SubscriptionProvider'
import { useFeatureGate } from '@/lib/revenuecat/useFeatureGate'

interface Props {
  preferences: UserPreferences
  userEmail: string | null
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
    <div className={`flex items-center gap-3 px-4 min-h-[44px] py-2.5 ${last ? '' : 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]'}`}>
      {icon}
      <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">{label}</span>
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
    <div className="mb-3 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
      {children}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function SettingsView({ preferences, userEmail }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [isDemoPending, startDemoTransition] = useTransition()
  const { preference, setPreference } = useTheme()
  const { isPro, openPaywall } = useSubscription()
  const gate = useFeatureGate()

  const [currency, setCurrency] = useState(preferences.preferred_currency)
  const [notifications, setNotifications] = useState(preferences.notifications_enabled)
  const [categories, setCategories] = useState<string[]>(preferences.custom_categories)
  const [newCategory, setNewCategory] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)

  const isAdmin = userEmail === 'carlosprnt@gmail.com'

  function handleDemoMode(count: number) {
    startDemoTransition(async () => {
      await setDemoMode(count)
      setDemoOpen(false)
    })
  }

  function handleRestoreProduction() {
    startDemoTransition(async () => {
      await restoreProductionState()
      setDemoOpen(false)
    })
  }

  const DEMO_MODES = [
    { label: 'Sin suscripciones', count: 0 },
    { label: '1 suscripción',     count: 1 },
    { label: '2 suscripciones',   count: 2 },
    { label: '3 suscripciones',   count: 3 },
    { label: '20 suscripciones',  count: 20 },
  ] as const

  async function handleDeleteAccount() {
    setIsDeleting(true)
    setDeleteError(null)
    haptics.warning()
    const result = await deleteAccount()
    if (result?.error) {
      setDeleteError(result.error)
      setIsDeleting(false)
      haptics.error()
      return
    }
    router.push('/login')
    router.refresh()
  }

  function handleCurrency(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value
    setCurrency(code)
    haptics.selection()
    startTransition(() => { setPreferredCurrency(code) })
  }

  function handleNotifications() {
    const next = !notifications
    setNotifications(next)
    haptics.selection()
    startTransition(() => { setNotificationsEnabled(next) })
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim()
    if (!trimmed || categories.includes(trimmed)) return
    // Pro gate: custom categories are a Pro-only feature.
    if (!gate.requirePro('custom_categories')) return
    setCategories([...categories, trimmed])
    setNewCategory('')
    haptics.success()
    startTransition(async () => {
      const result = await addCustomCategory(trimmed)
      // Defensive: if the server rejects (e.g. stale Pro state), roll
      // back the optimistic update and open the paywall.
      if (result?.error === 'custom_categories_pro_required') {
        setCategories(prev => prev.filter(c => c !== trimmed))
        openPaywall('custom_categories')
      }
    })
  }

  function handleRemoveCategory(name: string) {
    setCategories(categories.filter(c => c !== name))
    haptics.tap()
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
    { key: 'light', label: 'Claro' },
    { key: 'dark', label: 'Oscuro' },
    { key: 'system', label: 'Sistema' },
  ] as const

  return (
    <div className="min-h-dvh -mx-4 sm:-mx-6 -my-6 lg:-my-8 pb-4">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-5 pb-3 bg-[#F7F8FA] dark:bg-[#121212]"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors"
          aria-label="Atrás"
        >
          <ArrowLeft size={20} className="text-[#000000] dark:text-[#F2F2F7]" />
        </button>
        <h1 className="text-[22px] font-bold text-[#000000] dark:text-[#F2F2F7]">Ajustes</h1>
      </div>
      <div className="px-5">

      {/* ── Perezoso Plus ──────────────────────────────────────────────── */}
      <Group>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-11 h-11 rounded-[10px] overflow-hidden flex-shrink-0 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-premium.png" alt="Perezoso Pro" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[#000000] dark:text-[#F2F2F7] leading-tight">Perezoso Plus</p>
            <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5">
              {isPro ? 'Suscripción activa' : 'Desbloquea todas las features'}
            </p>
          </div>
          {isPro ? (
            <span className="h-8 px-4 rounded-full bg-[#F0F0F0] text-[#000000] text-[13px] font-semibold flex items-center flex-shrink-0">
              Activo
            </span>
          ) : (
            <button
              onClick={() => {
                haptics.tap()
                openPaywall('general')
              }}
              className="h-8 px-4 rounded-full bg-[#000000] text-white text-[13px] font-semibold flex-shrink-0 active:bg-[#000000] transition-colors"
            >
              Mejorar
            </button>
          )}
        </div>
      </Group>

      {/* ── Currency + Notifications ───────────────────────────────────── */}
      <Group>
        <div className="relative flex items-center gap-3 px-4 min-h-[44px] py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <IconTile bg="#16A34A"><Coins size={15} /></IconTile>
          <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">Moneda</span>
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
        <div className="flex items-center gap-3 px-4 min-h-[44px] py-2.5">
          <IconTile bg="#EF4444"><Bell size={15} /></IconTile>
          <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">Notificaciones</span>
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
        <div className="relative flex items-center gap-3 px-4 min-h-[44px] py-2.5">
          <IconTile bg="#374151"><Moon size={15} /></IconTile>
          <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">Apariencia</span>
          <span className="text-[15px] text-[#737373] dark:text-[#8E8E93]">
            {THEMES.find(t => t.key === preference)?.label ?? 'Sistema'}
          </span>
          <ChevronRight size={15} className="text-[#C7C7CC]" />
          <select
            value={preference}
            onChange={e => { haptics.selection(); setPreference(e.target.value as typeof preference) }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
            style={{ fontSize: 16 }}
            aria-label="Apariencia"
          >
            {THEMES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
      </Group>

      {/* ── Admin & Demo (gated) ───────────────────────────────────────── */}
      {isAdmin && (
        <Group>
          <Row
            icon={<IconTile bg="#000000"><ShieldCheck size={15} /></IconTile>}
            label="Admin"
            right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
            onClick={() => router.push('/admin/style-audit')}
          />
          {demoOpen ? (
            <>
              {DEMO_MODES.map(({ label, count }, i) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleDemoMode(count)}
                  disabled={isDemoPending}
                  className={`w-full flex items-center gap-3 px-4 min-h-[44px] py-2.5 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors disabled:opacity-50 ${
                    i < DEMO_MODES.length - 1 ? 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]' : 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]'
                  }`}
                >
                  <IconTile bg="#6366F1"><Sparkles size={15} /></IconTile>
                  <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">{label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleRestoreProduction}
                disabled={isDemoPending}
                className="w-full flex items-center gap-3 px-4 min-h-[44px] py-2.5 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors disabled:opacity-50"
              >
                <IconTile bg="#737373"><Sparkles size={15} /></IconTile>
                <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">Volver a producción</span>
              </button>
            </>
          ) : (
            <Row
              icon={<IconTile bg="#6366F1"><Sparkles size={15} /></IconTile>}
              label="Demo"
              right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
              onClick={() => setDemoOpen(true)}
              last
            />
          )}
        </Group>
      )}

      {/* ── Custom categories ──────────────────────────────────────────── */}
      <Group>
        {categories.map((cat, i) => (
          <div
            key={cat}
            className={`flex items-center gap-3 px-4 min-h-[44px] py-2.5 ${i < categories.length ? 'border-b border-[#E5E5EA] dark:border-[#2C2C2E]' : ''}`}
          >
            <IconTile bg="#8B5CF6"><Tag size={15} /></IconTile>
            <span className="flex-1 text-[15px] text-[#000000] dark:text-[#F2F2F7]">{cat}</span>
            <button
              onClick={() => handleRemoveCategory(cat)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
              aria-label="Eliminar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 min-h-[44px] py-2.5">
          <IconTile bg="#8B5CF6"><Plus size={15} /></IconTile>
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
            placeholder="Nueva categoría"
            className="flex-1 bg-transparent text-[15px] text-[#000000] dark:text-[#F2F2F7] placeholder:text-[#BBBBBB] dark:placeholder:text-[#636366] outline-none"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategory.trim()}
            className="text-[15px] font-semibold text-[#000000] disabled:opacity-30"
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
          icon={<IconTile bg="#000000"><Share2 size={15} /></IconTile>}
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
          icon={<IconTile bg="#000000"><Mail size={15} /></IconTile>}
          label="hello@carlospariente.com"
          right={<ChevronRight size={15} className="text-[#C7C7CC]" />}
          href="mailto:hello@carlospariente.com"
          last
        />
      </Group>

      {/* ── Danger zone ────────────────────────────────────────────────── */}
      <Group>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center gap-3 px-4 min-h-[44px] py-2.5 text-left active:bg-[#F0F0F0] dark:active:bg-[#2C2C2E] transition-colors"
        >
          <IconTile bg="#DC2626"><Trash2 size={15} /></IconTile>
          <span className="flex-1 text-[15px] font-medium text-[#DC2626]">Eliminar cuenta</span>
        </button>
      </Group>
      </div>

      {/* Delete confirmation half-modal — safe-area bleed pattern
          (see components/ui/BottomSheet.tsx for the canonical
          explanation). Overlay bleeds, inner sheet compensates with
          extra padding-bottom. */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{
            background: 'rgba(0,0,0,0.45)',
            bottom: 'calc(var(--safe-bleed-bottom, 34px) * -1)',
          }}
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-[#1C1C1E] rounded-t-[32px] px-5 pt-5 pb-6"
            style={{ paddingBottom: 'calc(16px + var(--safe-bleed-bottom, 34px))' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-[#000000] dark:text-[#F2F2F7] mb-1">
              ¿Eliminar tu cuenta?
            </h3>
            <p className="text-[14px] text-[#737373] dark:text-[#AEAEB2] mb-5">
              Se borrarán permanentemente tus suscripciones, preferencias y tu cuenta. Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <p className="mb-3 text-[13px] text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full h-12 rounded-full bg-red-500 text-white text-[15px] font-semibold active:opacity-80 transition-opacity disabled:opacity-40"
              >
                {isDeleting ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full h-12 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#000000] dark:text-[#F2F2F7] text-[15px] font-medium active:opacity-80 transition-opacity disabled:opacity-40"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
