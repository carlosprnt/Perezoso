'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

function SlothEmoji() {
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #4A3FA8 0%, #6B5FD4 100%)' }}
    >
      <span className="text-[28px] leading-none">🦥</span>
    </div>
  )
}

export default function SlothReminderCard() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative flex items-center gap-4 bg-white dark:bg-[#1C1C1E] rounded-[20px] px-4 py-4"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
    >
      <SlothEmoji />

      <div className="flex-1 min-w-0 pr-6">
        <p className="text-[15px] font-bold text-[#121212] dark:text-[#F2F2F7] leading-snug">
          Tienes 2 renovaciones anuales sin aviso
        </p>
        <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mt-0.5 leading-snug">
          Activa un recordatorio y te avisaremos antes del cobro.
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.06)' }}
        aria-label="Cerrar"
      >
        <X size={11} strokeWidth={2.5} className="text-[#737373]" />
      </button>
    </div>
  )
}
