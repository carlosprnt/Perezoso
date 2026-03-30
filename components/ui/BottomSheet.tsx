'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: 'auto' | 'tall' | 'full'
  /** Override z-index (default: backdrop=58, sheet=60). Use higher values inside overlays. */
  zIndex?: number
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'tall',
  zIndex,
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 animate-backdrop-in"
        style={{ zIndex: zIndex ? zIndex - 1 : 58 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0
          bg-white dark:bg-[#1C1C1E] rounded-t-[28px]
          flex flex-col
          ${maxH}
          animate-slide-up
        `}
        style={{ zIndex: zIndex ?? 60, paddingBottom: 'env(safe-area-inset-bottom)' }}
        // Prevent touch events from reaching the backdrop
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#D4D4D4] dark:bg-[#3A3A3C] rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3">
            <h2 className="text-[17px] font-semibold text-[#111111] dark:text-[#F2F2F7]">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-2xl bg-[#F5F5F5] dark:bg-[#2C2C2E] flex items-center justify-center text-[#666666] dark:text-[#AEAEB2] transition-colors active:bg-[#EBEBEB] dark:active:bg-[#3A3A3C]"
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
