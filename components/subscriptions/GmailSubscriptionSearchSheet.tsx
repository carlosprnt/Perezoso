'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import GmailSubscriptionResultItem from './GmailSubscriptionResultItem'
import { importSubscriptions } from '@/app/(dashboard)/subscriptions/actions'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { DetectedSubscription } from '@/types/detected-subscription'
import type { SubscriptionFormData } from '@/types'

// ─── Google Identity Services types ───────────────────────────────────────────

interface GisTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}
interface GisTokenClient {
  requestAccessToken(opts?: { prompt?: string }): void
}
declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(cfg: {
        client_id: string
        scope: string
        callback: (r: GisTokenResponse) => void
      }): GisTokenClient
    }
  }
}

// ─── Load the GIS script once ──────────────────────────────────────────────────

let gisReady = false
let gisLoading = false
const gisCallbacks: Array<() => void> = []

function loadGis(onReady: () => void) {
  if (gisReady) { onReady(); return }
  gisCallbacks.push(onReady)
  if (gisLoading) return
  gisLoading = true
  const s = document.createElement('script')
  s.src = 'https://accounts.google.com/gsi/client'
  s.async = true
  s.defer = true
  s.onload = () => {
    gisReady = true
    gisCallbacks.forEach(cb => cb())
    gisCallbacks.length = 0
  }
  document.head.appendChild(s)
}

// ─── Request a Gmail access token via GIS popup ────────────────────────────────

function requestGmailToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    loadGis(() => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: (response) => {
          if (response.access_token) {
            resolve(response.access_token)
          } else {
            reject(new Error(response.error_description ?? response.error ?? 'Auth cancelled'))
          }
        },
      })
      client.requestAccessToken({ prompt: 'consent' })
    })
  })
}

// ─── Supabase OAuth redirect fallback (when GIS client ID is not configured) ──
// After redirect, /auth/gmail-callback stores the token in a cookie,
// and the localStorage flag tells AddSubscriptionFlow to re-open this sheet.

async function initiateSupabaseGmailAuth() {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('perezoso_gmail_pending', '1') } catch { /* ignore */ }
  const supabase = createClient()
  const { getOAuthRedirectUrl } = await import('@/lib/platform')
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: getOAuthRedirectUrl('/auth/gmail-callback'),
    },
  })
}

// ─── Convert candidate → form payload ─────────────────────────────────────────

function candidateToFormData(c: DetectedSubscription): SubscriptionFormData {
  return {
    name: c.name,
    logo_url: c.logoUrl ?? null,
    card_color: null,
    category: c.suggested_category,
    price_amount: c.price_amount ?? 0,
    currency: c.currency ?? 'EUR',
    billing_period: c.billing_period ?? 'monthly',
    billing_interval_count: 1,
    start_date: null,
    next_billing_date: null,
    trial_end_date: null,
    status: 'active',
    is_shared: false,
    shared_with_count: 2,
    user_share_mode: 'split_evenly',
    user_share_amount: null,
    notes: 'Detected from Gmail',
  }
}

// ─── Sheet state machine ───────────────────────────────────────────────────────

type SheetState =
  | { type: 'searching' }
  | { type: 'not_connected' }
  | { type: 'results'; candidates: DetectedSubscription[] }
  | { type: 'empty' }
  | { type: 'error'; message: string }
  | { type: 'adding'; total: number }
  | { type: 'done'; count: number }

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2 },
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function GmailSubscriptionSearchSheet({ isOpen, onClose }: Props) {
  const t = useT()
  const [sheetState, setSheetState] = useState<SheetState>({ type: 'searching' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Token lives only in component memory — not persisted to storage
  const tokenRef = useRef<string | null>(null)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // ── Search using a token ───────────────────────────────────────────────────
  const doSearch = useCallback(async (token?: string) => {
    setSheetState({ type: 'searching' })
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/gmail/search', { headers })
      const data: {
        status: string
        candidates?: DetectedSubscription[]
        error?: string
      } = await res.json()

      if (data.status === 'not_connected') {
        setSheetState({ type: 'not_connected' })
      } else if (data.status === 'error') {
        setSheetState({ type: 'error', message: data.error ?? 'Something went wrong' })
      } else if (!data.candidates?.length) {
        setSheetState({ type: 'empty' })
      } else {
        setSheetState({ type: 'results', candidates: data.candidates })
        setSelected(new Set(data.candidates.filter(c => c.confidence === 'high').map(c => c.id)))
      }
    } catch {
      setSheetState({ type: 'error', message: 'Network error. Please try again.' })
    }
  }, [])

  // ── Open: start search immediately ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      doSearch(tokenRef.current ?? undefined)
    } else {
      setSheetState({ type: 'searching' })
      setSelected(new Set())
      tokenRef.current = null
    }
  }, [isOpen, doSearch])

  // ── Connect Gmail ──────────────────────────────────────────────────────────
  // • If NEXT_PUBLIC_GOOGLE_CLIENT_ID is set → GIS popup (no page redirect)
  // • Otherwise → Supabase OAuth redirect (token captured in /auth/gmail-callback)
  async function connectGmail() {
    if (clientId) {
      try {
        const token = await requestGmailToken(clientId)
        tokenRef.current = token
        await doSearch(token)
      } catch (err) {
        if (err instanceof Error && err.message !== 'Auth cancelled') {
          setSheetState({ type: 'error', message: err.message })
        }
      }
    } else {
      // Redirect flow — page will reload; AddSubscriptionFlow re-opens this sheet via localStorage
      await initiateSupabaseGmailAuth()
    }
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (sheetState.type !== 'results') return
    setSelected(
      selected.size === sheetState.candidates.length
        ? new Set()
        : new Set(sheetState.candidates.map(c => c.id)),
    )
  }

  // ── Import selected candidates ─────────────────────────────────────────────
  async function addSelected() {
    if (sheetState.type !== 'results') return
    const toAdd = sheetState.candidates.filter(c => selected.has(c.id))
    if (!toAdd.length) return

    setSheetState({ type: 'adding', total: toAdd.length })
    const { imported } = await importSubscriptions(toAdd.map(candidateToFormData))
    setSheetState({ type: 'done', count: imported })
  }

  const selectedCount = selected.size

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('sheets.searchInGmail')} height="tall">
      <AnimatePresence mode="wait">

        {/* ── Searching ──────────────────────────────────────────────────────── */}
        {sheetState.type === 'searching' && (
          <motion.div key="searching" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] dark:bg-[#2C2C2E] flex items-center justify-center">
              <Loader2 size={24} className="text-[#000000] animate-spin" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#000000] dark:text-[#F2F2F7]">{t('gmail.searching')}</p>
              <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-1">{t('gmail.searchingDesc')}</p>
            </div>
          </motion.div>
        )}

        {/* ── Not connected ──────────────────────────────────────────────────── */}
        {sheetState.type === 'not_connected' && (
          <motion.div key="not_connected" {...fadeSlide}
            className="flex flex-col items-center px-5 pt-2 pb-6 text-center gap-4"
          >
            <img
              src="/1C67E800-A121-400E-BC6B-8AE7BE1BD9FE.jpeg"
              alt="Perezoso mailman"
              className="w-44 h-44 object-contain"
              onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }}
            />
            <div>
              <p className="text-[16px] font-bold text-[#000000] dark:text-[#F2F2F7]">{t('gmail.connectTitle')}</p>
              <p className="text-[13px] text-[#616161] dark:text-[#AEAEB2] mt-1.5 leading-relaxed max-w-xs mx-auto">
                {t('gmail.connectDesc')}
              </p>
            </div>
            <div className="w-full space-y-2.5">
              <button
                onClick={connectGmail}
                className="w-full h-12 rounded-2xl bg-[#000000] text-white text-sm font-medium hover:bg-[#000000] active:bg-[#000000] transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                {t('gmail.connectButton')}
              </button>
              <p className="text-[11px] text-[#AAAAAA] dark:text-[#8E8E93]">
                {t('gmail.connectDisclaimer')}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Results ────────────────────────────────────────────────────────── */}
        {sheetState.type === 'results' && (
          <motion.div key="results" {...fadeSlide} className="flex flex-col min-h-0">
            <div className="px-5 pt-1 pb-4 flex-shrink-0">
              <p className="text-[13px] font-semibold text-[#000000] dark:text-[#F2F2F7]">
                {sheetState.candidates.length === 1
                  ? t('gmail.found', { count: sheetState.candidates.length })
                  : t('gmail.foundPlural', { count: sheetState.candidates.length })}
              </p>
              <p className="text-[12px] text-[#737373] dark:text-[#8E8E93] mt-0.5">
                {t('gmail.foundHint')}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
              {sheetState.candidates.map(candidate => (
                <GmailSubscriptionResultItem
                  key={candidate.id}
                  candidate={candidate}
                  selected={selected.has(candidate.id)}
                  onToggle={() => toggleSelect(candidate.id)}
                />
              ))}
            </div>
            <div
              className="flex-shrink-0 px-5 pt-3 pb-4 border-t border-[#F0F0F0] dark:border-[#2C2C2E] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-[13px] font-medium text-[#000000] hover:text-[#000000]"
                >
                  {selected.size === sheetState.candidates.length ? t('gmail.deselectAll') : t('gmail.selectAll')}
                </button>
                <span className="text-[12px] text-[#AAAAAA] dark:text-[#8E8E93]">{t('gmail.selected', { count: selectedCount })}</span>
              </div>
              <button
                onClick={addSelected}
                disabled={selectedCount === 0}
                className="w-full h-12 rounded-2xl text-sm font-medium transition-colors"
                style={{
                  background: selectedCount > 0 ? '#000000' : '#F0F0F0',
                  color: selectedCount > 0 ? '#ffffff' : '#AAAAAA',
                  cursor: selectedCount > 0 ? 'pointer' : 'default',
                }}
              >
                {selectedCount === 0
                  ? t('gmail.noSelection')
                  : selectedCount === 1
                    ? t('gmail.addSelected', { count: selectedCount })
                    : t('gmail.addSelectedPlural', { count: selectedCount })}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Adding ─────────────────────────────────────────────────────────── */}
        {sheetState.type === 'adding' && (
          <motion.div key="adding" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] dark:bg-[#2C2C2E] flex items-center justify-center">
              <Loader2 size={24} className="text-[#000000] animate-spin" />
            </div>
            <p className="text-[15px] font-semibold text-[#000000] dark:text-[#F2F2F7]">
              {sheetState.total === 1
                ? t('gmail.adding', { count: sheetState.total })
                : t('gmail.addingPlural', { count: sheetState.total })}
            </p>
          </motion.div>
        )}

        {/* ── Done ───────────────────────────────────────────────────────────── */}
        {sheetState.type === 'done' && (
          <motion.div key="done" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F0FDF4] dark:bg-[#1A2E1A] flex items-center justify-center">
              <CheckCircle2 size={30} className="text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#000000] dark:text-[#F2F2F7]">
                {sheetState.count === 1
                  ? t('gmail.done', { count: sheetState.count })
                  : t('gmail.donePlural', { count: sheetState.count })}
              </p>
              <p className="text-[13px] text-[#616161] dark:text-[#AEAEB2] mt-1">
                {t('gmail.doneHint')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-[#000000] text-white text-sm font-medium hover:bg-[#000000] transition-colors"
            >
              {t('gmail.doneButton')}
            </button>
          </motion.div>
        )}

        {/* ── Empty ──────────────────────────────────────────────────────────── */}
        {sheetState.type === 'empty' && (
          <motion.div key="empty" {...fadeSlide}
            className="flex flex-col items-center justify-center pt-4 pb-8 px-6 text-center gap-4"
          >
            <img
              src="/1C67E800-A121-400E-BC6B-8AE7BE1BD9FE.jpeg"
              alt="Perezoso mailman"
              className="w-40 h-40 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div>
              <p className="text-[15px] font-semibold text-[#000000] dark:text-[#F2F2F7]">{t('gmail.empty')}</p>
              <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-1 leading-relaxed">
                {t('gmail.emptyDesc')}
              </p>
            </div>
            <div className="w-full space-y-2">
              <button
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-[#000000] text-white text-sm font-medium hover:bg-[#000000] transition-colors"
              >
                {t('gmail.addManually')}
              </button>
              <button
                onClick={() => doSearch(tokenRef.current ?? undefined)}
                className="w-full h-12 rounded-2xl border border-[#E8E8E8] dark:border-[#3A3A3C] text-[#444444] dark:text-[#AEAEB2] text-sm font-medium hover:bg-[#F5F5F5] dark:hover:bg-[#2C2C2E] transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                {t('gmail.tryAgain')}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {sheetState.type === 'error' && (
          <motion.div key="error" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] dark:bg-[#2E1A1A] flex items-center justify-center">
              <AlertCircle size={28} className="text-[#DC2626]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#000000] dark:text-[#F2F2F7]">{t('gmail.error')}</p>
              <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-1">{sheetState.message}</p>
            </div>
            <button
              onClick={() => doSearch(tokenRef.current ?? undefined)}
              className="w-full h-12 rounded-2xl bg-[#000000] text-white text-sm font-medium hover:bg-[#000000] transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              {t('gmail.tryAgain')}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </BottomSheet>
  )
}
