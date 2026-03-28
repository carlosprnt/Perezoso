'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: 'auto' | 'tall' | 'full'
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'tall',
}: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Reset scroll to top every time the sheet opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [isOpen])

  if (!isOpen) return null

  const maxH = {
    auto: 'max-h-[80dvh]',
    tall: 'max-h-[82dvh]',
    full: 'max-h-[92dvh]',
  }[height]

  return (
    <>
      {/* Backdrop — above nav (z-50) */}
      <div
        className="fixed inset-0 bg-black/50 z-[58] animate-backdrop-in"
        onClick={onClose}
      />

      {/* Sheet — above nav (z-50) and backdrop */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-[60]
          bg-white rounded-t-[28px]
          flex flex-col
          ${maxH}
          animate-slide-up
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        // Prevent touch events from reaching the backdrop
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#D4D4D4] rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
            <h2 className="text-[17px] font-semibold text-[#111111]">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-2xl bg-[#F5F5F5] flex items-center justify-center text-[#666666] transition-colors active:bg-[#EBEBEB]"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Scrollable content — always starts at top */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
