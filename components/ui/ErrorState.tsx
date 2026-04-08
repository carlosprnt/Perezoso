'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo ha ido mal',
  message = 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <Image
        src="/image-error.png"
        alt=""
        width={180}
        height={180}
        className="mb-6 select-none"
        draggable={false}
      />
      <h2 className="text-base font-semibold text-[#121212] dark:text-[#F2F2F7] mb-1">{title}</h2>
      <p className="text-sm text-[#737373] dark:text-[#8E8E93] max-w-xs mb-5">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} />}
          onClick={onRetry}
        >
          Reintentar
        </Button>
      )}
    </div>
  )
}

// Next.js error.tsx boundary component
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#000000] flex items-center justify-center px-4">
      <ErrorState
        title="Error de página"
        message={error.message || 'No se ha podido cargar esta página.'}
        onRetry={reset}
      />
    </div>
  )
}
