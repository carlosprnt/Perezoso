'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import GmailSubscriptionResultItem from './GmailSubscriptionResultItem'
import { importSubscriptions } from '@/app/(dashboard)/subscriptions/actions'
import { createClient } from '@/lib/supabase/client'
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
  localStorage.setItem('perezoso_gmail_pending', '1')
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: `${window.location.origin}/auth/gmail-callback`,
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Search in Gmail" height="tall">
      <AnimatePresence mode="wait">

        {/* ── Searching ──────────────────────────────────────────────────────── */}
        {sheetState.type === 'searching' && (
          <motion.div key="searching" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F0F0FF] flex items-center justify-center">
              <Loader2 size={24} className="text-[#3D3BF3] animate-spin" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111111]">Searching Gmail…</p>
              <p className="text-[13px] text-[#999999] mt-1">Looking for subscription-related emails</p>
            </div>
          </motion.div>
        )}

        {/* ── Not connected ──────────────────────────────────────────────────── */}
        {sheetState.type === 'not_connected' && (
          <motion.div key="not_connected" {...fadeSlide}
            className="flex flex-col items-center px-5 py-8 text-center gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5FF] flex items-center justify-center">
              <Mail size={28} className="text-[#3D3BF3]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#111111]">Connect Gmail</p>
              <p className="text-[13px] text-[#666666] mt-1.5 leading-relaxed max-w-xs mx-auto">
                Perezoso will search your inbox for subscription receipts and suggest them to you.
                Nothing is added without your confirmation.
              </p>
            </div>
            <div className="w-full space-y-2.5">
              <button
                onClick={connectGmail}
                className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] active:bg-[#2B29B8] transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Connect Gmail
              </button>
              <p className="text-[11px] text-[#AAAAAA]">
                Read-only access · Perezoso never stores your emails
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Results ────────────────────────────────────────────────────────── */}
        {sheetState.type === 'results' && (
          <motion.div key="results" {...fadeSlide} className="flex flex-col min-h-0">
            <div className="px-5 pt-1 pb-4 flex-shrink-0">
              <p className="text-[13px] font-semibold text-[#111111]">
                {sheetState.candidates.length} possible subscription{sheetState.candidates.length !== 1 ? 's' : ''} found
              </p>
              <p className="text-[12px] text-[#999999] mt-0.5">
                Review and add the ones you want
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
              className="flex-shrink-0 px-5 pt-3 pb-4 border-t border-[#F0F0F0] space-y-2.5"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-[13px] font-medium text-[#3D3BF3] hover:text-[#3230D0]"
                >
                  {selected.size === sheetState.candidates.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-[12px] text-[#AAAAAA]">{selectedCount} selected</span>
              </div>
              <button
                onClick={addSelected}
                disabled={selectedCount === 0}
                className="w-full h-12 rounded-[10px] text-sm font-medium transition-colors"
                style={{
                  background: selectedCount > 0 ? '#3D3BF3' : '#F0F0F0',
                  color: selectedCount > 0 ? '#ffffff' : '#AAAAAA',
                  cursor: selectedCount > 0 ? 'pointer' : 'default',
                }}
              >
                {selectedCount === 0
                  ? 'Select subscriptions to add'
                  : `Add ${selectedCount} subscription${selectedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Adding ─────────────────────────────────────────────────────────── */}
        {sheetState.type === 'adding' && (
          <motion.div key="adding" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#F0F0FF] flex items-center justify-center">
              <Loader2 size={24} className="text-[#3D3BF3] animate-spin" />
            </div>
            <p className="text-[15px] font-semibold text-[#111111]">
              Adding {sheetState.total} subscription{sheetState.total !== 1 ? 's' : ''}…
            </p>
          </motion.div>
        )}

        {/* ── Done ───────────────────────────────────────────────────────────── */}
        {sheetState.type === 'done' && (
          <motion.div key="done" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle2 size={30} className="text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#111111]">
                {sheetState.count} subscription{sheetState.count !== 1 ? 's' : ''} added
              </p>
              <p className="text-[13px] text-[#666666] mt-1">
                You can edit any of them from your subscriptions list.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] transition-colors"
            >
              Done
            </button>
          </motion.div>
        )}

        {/* ── Empty ──────────────────────────────────────────────────────────── */}
        {sheetState.type === 'empty' && (
          <motion.div key="empty" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center">
              <Mail size={28} className="text-[#AAAAAA]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111111]">No subscriptions found</p>
              <p className="text-[13px] text-[#999999] mt-1 leading-relaxed">
                We couldn't find obvious subscription receipts in your Gmail.
                You can still add subscriptions manually.
              </p>
            </div>
            <div className="w-full space-y-2">
              <button
                onClick={onClose}
                className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] transition-colors"
              >
                Add manually
              </button>
              <button
                onClick={() => doSearch(tokenRef.current ?? undefined)}
                className="w-full h-12 rounded-[10px] border border-[#E0E0E0] text-[#444444] text-sm font-medium hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {sheetState.type === 'error' && (
          <motion.div key="error" {...fadeSlide}
            className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] flex items-center justify-center">
              <AlertCircle size={28} className="text-[#DC2626]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111111]">Search failed</p>
              <p className="text-[13px] text-[#999999] mt-1">{sheetState.message}</p>
            </div>
            <button
              onClick={() => doSearch(tokenRef.current ?? undefined)}
              className="w-full h-12 rounded-[10px] bg-[#3D3BF3] text-white text-sm font-medium hover:bg-[#3230D0] transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </BottomSheet>
  )
}
