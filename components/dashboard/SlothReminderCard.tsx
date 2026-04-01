'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function SlothReminderCard() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{
        background: 'linear-gradient(135deg, #2D2B8F 0%, #4A3FA8 45%, #6B5FD4 100%)',
      }}
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.15)' }}
        aria-label="Cerrar"
      >
        <X size={13} color="white" strokeWidth={2.5} />
      </button>

      {/* Soft glow blob */}
      <div
        className="absolute -top-8 -left-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.07)', filter: 'blur(24px)' }}
      />

      {/* Top: tag + title */}
      <div className="px-5 pt-5 pr-14">
        <span
          className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
        >
          Para ti
        </span>
        <h3 className="text-[17px] font-bold text-white leading-snug">
          Tienes 2 renovaciones anuales sin aviso
        </h3>
      </div>

      {/* Bottom: description + CTA stacked */}
      <div className="px-5 pb-5 pt-3">
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Activa un recordatorio y te avisaremos antes del cobro para que no se te pase.
        </p>
        <button
          className="h-10 px-5 rounded-full text-[13px] font-semibold transition-opacity active:opacity-70"
          style={{ background: 'white', color: '#2D2B8F' }}
        >
          Avisarme 7 días antes
        </button>
      </div>
    </div>
  )
}
