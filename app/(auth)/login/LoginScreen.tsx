'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getOAuthRedirectUrl } from '@/lib/platform'
import { createClient } from '@/lib/supabase/client'

// ─── Content ─────────────────────────────────────────────────────────────────
interface Slide {
  title: string
  body: string
  /** Background image path. Drop your own screenshots under /public/onboarding/. */
  bg: string
}

const SLIDES: Slide[] = [
  {
    title: 'Todas tus suscripciones en un solo sitio',
    body: 'Perezoso te muestra cuánto pagas al mes, qué se renueva esta semana y dónde puedes ahorrar.',
    bg: '/onboarding/01.png',
  },
  {
    title: 'Calendario con próximas renovaciones',
    body: 'Visualiza de un vistazo todo lo que se va a cobrar en los próximos días y meses.',
    bg: '/onboarding/02.png',
  },
  {
    title: 'Detección automática desde tu Gmail',
    body: 'Conecta tu correo y Perezoso encontrará por ti las suscripciones que ya estás pagando.',
    bg: '/onboarding/03.png',
  },
  {
    title: 'Insights de gasto y sugerencias de ahorro',
    body: 'Descubre patrones y recomendaciones para reducir lo que pagas cada mes sin renunciar a lo que importa.',
    bg: '/onboarding/04.png',
  },
]

// ─── Google button + SVG ─────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

function AuthButtons({
  isLoading,
  error,
  onGoogle,
}: {
  isLoading: boolean
  error: string | null
  onGoogle: () => void
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onGoogle}
        disabled={isLoading}
        className="w-full h-12 flex items-center justify-center gap-3 rounded-full border border-[#E8E8E8] bg-white text-[15px] font-medium text-[#121212] active:bg-[#F2F2F7] transition-colors disabled:opacity-60"
      >
        {isLoading
          ? <span className="w-5 h-5 border-2 border-[#E8E8E8] border-t-[#3D3BF3] rounded-full animate-spin" />
          : <GoogleIcon />}
        {isLoading ? 'Iniciando sesión…' : 'Continuar con Google'}
      </button>

      <button
        disabled
        className="w-full h-12 flex items-center justify-center gap-3 rounded-full border border-[#E8E8E8] bg-white text-[15px] font-medium text-[#121212] opacity-40 cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.05 12.536c-.024-2.422 1.977-3.586 2.068-3.643-1.127-1.65-2.881-1.875-3.505-1.9-1.495-.15-2.917.879-3.676.879-.757 0-1.933-.857-3.176-.833-1.635.025-3.142.948-3.984 2.411-1.697 2.94-.434 7.29 1.222 9.685.81 1.172 1.77 2.489 3.034 2.443 1.218-.05 1.679-.79 3.153-.79 1.474 0 1.888.79 3.178.764 1.311-.024 2.14-1.196 2.945-2.372.927-1.36 1.308-2.68 1.333-2.748-.03-.013-2.561-.983-2.592-3.896zm-2.39-7.168c.677-.821 1.135-1.956 1.009-3.091-.978.04-2.162.651-2.862 1.472-.627.728-1.176 1.891-1.028 3.007 1.091.085 2.203-.567 2.881-1.388z" />
        </svg>
        Continuar con Apple
      </button>

      {error && (
        <p className="text-[12px] text-red-600 text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <p className="text-[11px] text-[#8E8E93] text-center leading-relaxed pt-1">
        Al continuar aceptas nuestros{' '}
        <a href="/terms" className="underline">Términos</a>{' '}y la{' '}
        <a href="/privacy" className="underline">Política de privacidad</a>.
      </p>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [slide, setSlide] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const last = SLIDES.length - 1

  async function handleGoogleLogin() {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    const redirectTo = getOAuthRedirectUrl('/auth/callback')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    })
    if (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  function openSignIn() {
    setError(null)
    setSheetOpen(true)
  }

  function next() {
    if (slide < last) setSlide(slide + 1)
    else openSignIn()
  }

  function prev() {
    if (slide > 0) setSlide(slide - 1)
  }

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { setTouchStart(e.touches[0].clientX) }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const delta = e.changedTouches[0].clientX - touchStart
    if (delta < -50) next()
    else if (delta > 50) prev()
    setTouchStart(null)
  }

  const current = SLIDES[slide]

  return (
    <div
      className="relative h-[100dvh] bg-[#F2F2F7] overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Background image (changes per slide) ──────────────────────── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${slide}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${current.bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </AnimatePresence>

      {/* ── Frosted glass card pinned to the bottom ───────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {/* Soft gradient fade from transparent into the blurred card,
            so the background image bleeds naturally into the copy area. */}
        <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-b from-transparent to-white/80 pointer-events-none" />

        <div
          className="relative rounded-[28px] px-5 pt-6 pb-5 bg-white/70 dark:bg-white/70 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
          style={{
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          }}
        >
          {/* Copy */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`copy-${slide}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-[22px] font-extrabold text-[#121212] leading-tight mb-2">
                {current.title}
              </h1>
              <p className="text-[14px] text-[#424242] leading-snug">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Ir a la pantalla ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === slide ? 18 : 6,
                  backgroundColor: i === slide ? '#121212' : 'rgba(18,18,18,0.25)',
                }}
              />
            ))}
          </div>

          {/* Back circle + Continue pill */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={prev}
              disabled={slide === 0}
              aria-label="Anterior"
              className="w-12 h-12 rounded-full bg-white border border-[#E8E8E8] flex items-center justify-center text-[#121212] disabled:opacity-30 active:bg-[#F2F2F7] transition-colors flex-shrink-0"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={next}
              className="flex-1 h-12 rounded-full bg-[#121212] text-white text-[15px] font-semibold active:bg-black transition-colors"
            >
              {slide === last ? 'Empezar' : 'Continuar'}
            </button>
          </div>

          {/* Subtle shortcut to sign-in */}
          <button
            onClick={openSignIn}
            className="block w-full text-center mt-3 text-[13px] font-medium text-[#3D3BF3] active:opacity-70 transition-opacity"
          >
            Iniciar sesión
          </button>
        </div>
      </div>

      {/* ── Sign-in half modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => !isLoading && setSheetOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="w-full max-w-xl bg-white rounded-t-[32px] px-5 pt-4 pb-6"
              style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-semibold text-[#121212]">Iniciar sesión</h3>
                <button
                  onClick={() => setSheetOpen(false)}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#616161] active:bg-[#E8E8E8] transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <AuthButtons isLoading={isLoading} error={error} onGoogle={handleGoogleLogin} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
