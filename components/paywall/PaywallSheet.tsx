'use client'
// ─── PaywallSheet ─────────────────────────────────────────────────────────────
// Bottom sheet paywall. Opened by SubscriptionProvider.openPaywall(trigger).
// Handles: pricing toggle, purchase, restore, loading and error states.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2 } from 'lucide-react'
import { PAYWALL_COPY, PAYWALL_BENEFITS, type PaywallTrigger } from '@/lib/revenuecat/paywallTriggers'
import { RC_CONFIG } from '@/lib/revenuecat/config'
import { purchasePackage, restorePurchases, getCurrentOffering } from '@/lib/revenuecat/client'
import { isCapacitor } from '@/lib/platform'
import Image from 'next/image'

interface Props {
  trigger:           PaywallTrigger
  onClose:           () => void
  onPurchaseSuccess: () => void
}

type PricingPlan = 'annual' | 'monthly'

export default function PaywallSheet({ trigger, onClose, onPurchaseSuccess }: Props) {
  const [plan, setPlan]         = useState<PricingPlan>('annual')
  const [loading, setLoading]   = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const copy = PAYWALL_COPY[trigger]

  async function handlePurchase() {
    if (!isCapacitor()) {
      // Web: redirect to web checkout (future)
      setError('La compra está disponible en la app de iOS o Android')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const packageId = plan === 'annual' ? RC_CONFIG.PACKAGE_ANNUAL : RC_CONFIG.PACKAGE_MONTHLY
      await purchasePackage(packageId)
      onPurchaseSuccess()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al procesar la compra'
      // User cancelled — don't show error
      if (!msg.toLowerCase().includes('cancel')) setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore() {
    if (!isCapacitor()) return
    setRestoring(true)
    setError(null)
    try {
      const info = await restorePurchases()
      if (info && RC_CONFIG.ENTITLEMENT_PRO in (info.customerInfo?.entitlements?.active ?? {})) {
        onPurchaseSuccess()
      } else {
        setError('No encontramos ninguna compra activa para restaurar')
      }
    } catch {
      setError('No se pudo restaurar la compra')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      {/* Backdrop — bleeds into the iOS PWA bottom safe area
          (--safe-bleed-bottom is set in layout.tsx). */}
      <motion.div
        className="fixed inset-0 z-[500] bg-black/50"
        style={{ bottom: 'calc(var(--safe-bleed-bottom, 34px) * -1)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet — safe-area bleed pattern (see BottomSheet.tsx for rationale) */}
      <motion.div
        className="fixed left-0 right-0 z-[501] bg-white rounded-t-[32px] overflow-hidden max-h-[100dvh]"
        style={{
          bottom: 'calc(var(--safe-bleed-bottom, 34px) * -1)',
          paddingBottom: 'calc(32px + var(--safe-bleed-bottom, 34px))',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end px-5 pt-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#616161]"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-6 pb-2">
          {/* Logo + trigger header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-[14px] overflow-hidden shadow-sm flex-shrink-0">
              <Image src="/logo-premium.png" alt="Perezoso Pro" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[13px] text-[#616161] font-medium">Perezoso Pro</p>
              <h2 className="text-[17px] font-bold text-[#121212] leading-tight">{copy.headline}</h2>
              <p className="text-[13px] text-[#616161] leading-snug">{copy.subheadline}</p>
            </div>
          </div>

          {/* Benefits list */}
          <div className="space-y-2.5 mb-6">
            {PAYWALL_BENEFITS.map(b => (
              <div key={b.id} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#3D3BF3] flex items-center justify-center flex-shrink-0">
                  <Check size={11} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-[15px] text-[#121212]">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Plan toggle */}
          <div className="flex gap-3 mb-4">
            <PlanCard
              selected={plan === 'annual'}
              onClick={() => setPlan('annual')}
              label="Anual"
              price="19,99€ / año"
              badge="Más popular"
              perMonth="1,66€/mes"
            />
            <PlanCard
              selected={plan === 'monthly'}
              onClick={() => setPlan('monthly')}
              label="Mensual"
              price="2,99€ / mes"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-red-600 text-center bg-red-50 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full h-[52px] rounded-full bg-[#3D3BF3] text-white text-[16px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:bg-[#3230D0] transition-colors mb-3"
          >
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : 'Continuar con Pro'}
          </button>

          {/* Restore */}
          {isCapacitor() && (
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full h-10 text-[13px] text-[#3D3BF3] font-medium disabled:opacity-50"
            >
              {restoring ? 'Restaurando…' : 'Restaurar compra'}
            </button>
          )}

          <p className="text-[11px] text-[#8E8E93] text-center mt-1">
            Cancela en cualquier momento desde Ajustes
          </p>
        </div>
      </motion.div>
    </>
  )
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────
function PlanCard({
  selected, onClick, label, price, badge, perMonth,
}: {
  selected: boolean
  onClick:  () => void
  label:    string
  price:    string
  badge?:   string
  perMonth?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl border-2 p-3 text-left transition-all ${
        selected ? 'border-[#3D3BF3] bg-[#F0F0FF]' : 'border-[#E8E8E8] bg-white'
      }`}
    >
      {badge && (
        <span className="text-[10px] font-semibold text-[#3D3BF3] bg-[#E8E8FF] rounded-full px-2 py-0.5 mb-1.5 inline-block">
          {badge}
        </span>
      )}
      <p className="text-[13px] font-semibold text-[#121212]">{label}</p>
      <p className="text-[12px] text-[#424242]">{price}</p>
      {perMonth && <p className="text-[11px] text-[#616161] mt-0.5">{perMonth}</p>}
    </button>
  )
}
