'use client'

import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight, X } from 'lucide-react'
import { getOAuthRedirectUrl } from '@/lib/platform'
import { createClient } from '@/lib/supabase/client'
import haptics from '@/lib/haptics'

// ─── Floating logos (slide 0 hero) ───────────────────────────────────────────
interface FloatingLogo {
  slug: string; name: string
  left: string; top: string
  size: number
  floatIdx: number; floatDur: number; floatDelay: number
  exitX: number; exitScale: number
}

const FLOATING_LOGOS: FloatingLogo[] = [
  // ── above Perezoso (top < 30%) ──
  { slug: 'netflix',    name: 'Netflix',    left: '4%',  top: '8%',  size: 52, floatIdx: 0, floatDur: 2.6, floatDelay: 0.0, exitX: -90,  exitScale: 0.35 },
  { slug: 'figma',      name: 'Figma',      left: '36%', top: '2%',  size: 42, floatIdx: 7, floatDur: 3.2, floatDelay: 0.6, exitX: -95,  exitScale: 0.35 },
  { slug: 'spotify',    name: 'Spotify',    left: '66%', top: '5%',  size: 46, floatIdx: 3, floatDur: 3.1, floatDelay: 0.5, exitX: -115, exitScale: 0.50 },
  { slug: 'revolut',    name: 'Revolut',    left: '52%', top: '13%', size: 40, floatIdx: 6, floatDur: 3.4, floatDelay: 0.1, exitX: -70,  exitScale: 0.50 },
  { slug: 'duolingo',   name: 'Duolingo',   left: '5%',  top: '22%', size: 44, floatIdx: 3, floatDur: 2.7, floatDelay: 0.9, exitX: -105, exitScale: 0.45 },
  { slug: 'youtube',    name: 'YouTube',    left: '74%', top: '20%', size: 50, floatIdx: 1, floatDur: 2.8, floatDelay: 0.3, exitX: -75,  exitScale: 0.40 },
  // ── below Perezoso (top > 30%) ──
  { slug: 'notion',     name: 'Notion',     left: '3%',  top: '50%', size: 44, floatIdx: 5, floatDur: 3.3, floatDelay: 0.8, exitX: -100, exitScale: 0.45 },
  { slug: 'twitch',     name: 'Twitch',     left: '68%', top: '52%', size: 52, floatIdx: 2, floatDur: 2.5, floatDelay: 0.2, exitX: -85,  exitScale: 0.30 },
  { slug: 'github',     name: 'GitHub',     left: '52%', top: '63%', size: 46, floatIdx: 6, floatDur: 2.9, floatDelay: 0.4, exitX: -80,  exitScale: 0.40 },
  { slug: 'icloud',     name: 'iCloud',     left: '8%',  top: '60%', size: 44, floatIdx: 4, floatDur: 3.0, floatDelay: 0.7, exitX: -110, exitScale: 0.55 },
]

function FloatingLogoTile({ logo }: { logo: FloatingLogo }) {
  const [failed, setFailed] = useState(false)
  const onError = useCallback(() => setFailed(true), [])
  if (failed) return null
  return (
    <div
      className="bg-white rounded-[14px] flex items-center justify-center border border-[#E8E8E8] shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
      style={{ width: logo.size, height: logo.size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://cdn.simpleicons.org/${logo.slug}`}
        alt={logo.name}
        style={{ width: '60%', height: '60%', objectFit: 'contain' }}
        onError={onError}
      />
    </div>
  )
}

const floatingLogoVariants = {
  enter: { opacity: 0, scale: 0.4 },
  center: { opacity: 1, scale: 1 },
  exit: (logo: FloatingLogo) => ({
    opacity: 0,
    x: logo.exitX,
    scale: logo.exitScale,
    filter: 'blur(12px)',
  }),
}

// ─── Content ─────────────────────────────────────────────────────────────────
interface Slide {
  /** Phone screenshot for this step. Drop the files in /public/onboarding/. */
  image: string
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    image: '/onboarding/01.png',
    title: 'Todas tus suscripciones en un solo sitio',
    body: 'Cuánto pagas al mes, qué se renueva esta semana y dónde puedes ahorrar.',
  },
  {
    image: '/onboarding/02.png',
    title: 'Calendario con próximas renovaciones',
    body: 'Visualiza de un vistazo todo lo que se va a cobrar en los próximos días y meses.',
  },
  {
    image: '/onboarding/03.png',
    title: 'Anticípate a cada renovación',
    body: 'Consulta tus próximos cobros y recibe avisos antes de que se renueven.',
  },
  {
    image: '/onboarding/04.png',
    title: 'Insights de gasto y sugerencias de ahorro',
    body: 'Descubre patrones y recomendaciones para reducir lo que pagas cada mes sin renunciar a lo que importa.',
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
  const [direction, setDirection] = useState<1 | -1>(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const totalSlides = SLIDES.length + 1

  const measureRef = useRef<HTMLDivElement>(null)
  const [textHeight, setTextHeight] = useState<number | undefined>(undefined)

  // Bubble-bounce: tap on slide 0 makes logos jump randomly
  const heroRef = useRef<HTMLDivElement>(null)
  function handleHeroTap() {
    haptics.tap('light')
    FLOATING_LOGOS.forEach((logo) => {
      if (!heroRef.current) return
      const el = heroRef.current.querySelector<HTMLElement>(`[data-slug="${logo.slug}"]`)
      if (!el) return
      const peak = 1.25 + Math.random() * 0.35   // scale up to 1.25–1.60
      animate(el, { scale: [1, peak, 1] }, {
        duration: 0.45 + Math.random() * 0.3,
        ease: [0.34, 1.56, 0.64, 1],
        delay: Math.random() * 0.12,
      })
    })
  }

  // Scroll-up gesture on image: scales + rotates at max travel (400px)
  const panY      = useMotionValue(0)
  const imgScale  = useTransform(panY, [-400, 0], [0.98, 1])
  const imgY      = useTransform(panY, [-400, 0], [-400, 0])
  const imgRotate = useTransform(panY, [-400, 0], [15, 0])

  useLayoutEffect(() => {
    if (!measureRef.current) return
    const els = measureRef.current.querySelectorAll<HTMLDivElement>('[data-measure]')
    let max = 0
    els.forEach(el => { max = Math.max(max, el.offsetHeight) })
    setTextHeight(max + 8)
  }, [])


  function go(to: number) {
    if (to === slide || to < 0 || to >= totalSlides) return
    setDirection(to > slide ? 1 : -1)
    haptics.selection()
    setSlide(to)
  }

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
    haptics.tap('medium')
    setSheetOpen(true)
  }

  function next() { go(slide + 1) }
  function goTo(i: number) { go(i) }

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { setTouchStart(e.touches[0].clientX) }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const delta = e.changedTouches[0].clientX - touchStart
    if (delta < -50) go(slide + 1)
    else if (delta > 50) go(slide - 1)
    setTouchStart(null)
  }

  return (
    <>
    <div
      className="fixed inset-0 overflow-hidden bg-[#F7F8FA]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Preload all slide images so transitions are instant ── */}
      <div className="hidden" aria-hidden>
        {SLIDES.map(s => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.image} src={s.image} alt="" />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onboarding/05.png" alt="" />
      </div>

      {/* ── Image / logo – absolute, sits behind the fixed bottom panel ── */}
      <motion.div
        className="absolute top-[80px] left-5 right-5 h-[600px] z-0"
        style={slide > 0 ? { scale: imgScale, y: imgY, rotate: imgRotate, touchAction: 'none' } : undefined}
        onPan={slide > 0 ? ((_, info) => {
          if (info.delta.y < 0 || panY.get() < 0)
            panY.set(Math.max(-400, Math.min(0, panY.get() + info.delta.y)))
        }) : undefined}
        onPanEnd={slide > 0 ? (() => animate(panY, 0, { type: 'spring', stiffness: 220, damping: 28 })) : undefined}
        onClick={slide === 0 ? handleHeroTap : undefined}
      >
        <AnimatePresence mode="wait" custom={direction}>
          {slide === 0 ? (
            /* ── Slide 0: Perezoso logo + floating service logos ── */
            <motion.div
              key="hero-0"
              ref={heroRef}
              className="absolute inset-0"
              variants={{
                enter: {},
                center: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } },
                exit:   { transition: { staggerChildren: 0.035 } },
              }}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Floating subscription logos */}
              {FLOATING_LOGOS.map((logo) => (
                <motion.div
                  key={logo.slug}
                  data-slug={logo.slug}
                  custom={logo}
                  variants={floatingLogoVariants}
                  transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                  className="absolute"
                  style={{
                    left: logo.left,
                    top: logo.top,
                    animation: `logo-float-${logo.floatIdx} ${logo.floatDur}s ease-in-out ${logo.floatDelay}s infinite`,
                  }}
                >
                  <FloatingLogoTile logo={logo} />
                </motion.div>
              ))}
            </motion.div>
          ) : slide < SLIDES.length ? (
            <motion.img
              key={`img-${slide}`}
              src={SLIDES[slide].image}
              alt=""
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: `${dir * 100}%`, filter: 'blur(12px)' }),
                center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                exit: (dir: number) => ({ opacity: 0, x: `${dir * -100}%`, filter: 'blur(12px)' }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
              className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            />
          ) : (
            <motion.img
              key="img-login"
              src="/onboarding/05.png"
              alt=""
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: `${dir * 100}%`, filter: 'blur(12px)' }),
                center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                exit: (dir: number) => ({ opacity: 0, x: `${dir * -100}%`, filter: 'blur(12px)' }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.42, 0, 0.58, 1] }}
              className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Slide 0 center logo — fixed to visual center of available screen ── */}
      <AnimatePresence>
        {slide === 0 && (
          <motion.div
            key="perezoso-logo"
            className="absolute pointer-events-none z-[5]"
            style={{
              /*
               * Do NOT use transform: translate(-50%,-50%) here — Framer Motion
               * owns the `transform` property for scale animations and would
               * override it, pushing the logo off-center.
               * Instead compute the top-left corner directly:
               *   horizontal: 50vw − 44px  (half of 88 px logo)
               *   vertical:   safe-area-top + (visible height − 260px panel) / 2 − 44px
               */
              top:  'calc(env(safe-area-inset-top) + (100vh - env(safe-area-inset-top) - 260px) / 2 - 44px)',
              left: 'calc(50% - 44px)',
            }}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] } }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(6px)', transition: { duration: 0.22 } }}
          >
            <div className="w-[88px] h-[88px] rounded-[24px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
              <Image src="/logo.png" alt="Perezoso" width={88} height={88} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed bottom panel: title + body + dots + buttons ── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white px-6 pt-6 z-10 rounded-t-[40px]"
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
      >
        <div className="w-full max-w-sm mx-auto">
          {/* Hidden measurement: render all 4 slide texts in-flow (correct width), h-0 so no space taken */}
          <div
            ref={measureRef}
            style={{ height: 0, overflow: 'visible', visibility: 'hidden', pointerEvents: 'none' }}
            aria-hidden
          >
            {SLIDES.map((s, i) => (
              <div key={i} data-measure>
                <h1 className="text-[28px] font-extrabold text-[#121212] leading-tight mb-3">{s.title}</h1>
                <p className="text-[15px] text-[#424242] leading-relaxed mb-10">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Text block — fixed height for slides 0-3, auto for login */}
          <div
            className={slide < SLIDES.length ? 'relative' : ''}
            style={slide < SLIDES.length && textHeight ? { height: textHeight } : undefined}
          >
            <AnimatePresence mode="wait">
              {slide < SLIDES.length ? (
                <motion.div
                  key={`text-${slide}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-0 left-0 right-0"
                >
                  <h1 className="text-[28px] font-extrabold text-[#121212] leading-tight mb-3">
                    {SLIDES[slide].title}
                  </h1>
                  <p className="text-[15px] text-[#424242] leading-relaxed mb-5">
                    {SLIDES[slide].body}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="text-login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="text-[28px] font-extrabold text-[#121212] leading-tight mb-3">
                    Empieza ahora
                  </h1>
                  <p className="text-[15px] text-[#424242] leading-relaxed mb-5">
                    Inicia sesión y vuelca todas tus suscripciones en un solo sitio.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ir a la pantalla ${i + 1}`}
                className="rounded-full transition-all"
                style={{
                  width: i === slide ? 24 : 4,
                  height: 4,
                  backgroundColor: i === slide ? '#3D3BF3' : '#E8E8E8',
                }}
              />
            ))}
          </div>

          {/* CTA buttons */}
          {slide < SLIDES.length ? (
            <div className="flex items-center gap-3">
              <button
                onClick={openSignIn}
                className="flex-1 h-12 rounded-full border border-[#E8E8E8] bg-white text-[15px] font-semibold text-[#121212] active:bg-[#F2F2F7] transition-colors"
              >
                Iniciar sesión
              </button>
              <button
                onClick={next}
                className="flex-1 h-12 rounded-full bg-[#3D3BF3] text-white text-[15px] font-semibold active:bg-[#3230D0] transition-colors flex items-center justify-center gap-1.5"
              >
                Continuar
                <motion.span
                  animate={slide === 0 ? { x: [0, 5, 0] } : { x: 0 }}
                  transition={slide === 0 ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  <ArrowRight size={16} strokeWidth={2.5} />
                </motion.span>
              </button>
            </div>
          ) : (
            <AuthButtons isLoading={isLoading} error={error} onGoogle={handleGoogleLogin} />
          )}
        </div>
      </div>

    </div>

    {/*
      ── Sign-in modal ──────────────────────────────────────────────────────
      Two independent fixed siblings. Backdrop uses a plain CSS transition
      (not Framer Motion) because Framer Motion's initial/animate opacity
      cycle on a freshly-mounted element does not reliably fire on iOS
      Safari PWA — the element stays at opacity:0 indefinitely, leaving
      the backdrop invisible. CSS transitions are executed by the browser
      compositor and never miss on iOS.

      Backdrop is always in the DOM; opacity and pointer-events are driven
      by the sheetOpen boolean. Panel uses Framer Motion spring (transform
      animations are reliable on iOS; only opacity/filter ones are flaky).
    */}

    {/* Backdrop: CSS transition, always mounted */}
    <div
      className="fixed inset-0 z-[200] bg-black/50"
      style={{
        opacity:       sheetOpen ? 1 : 0,
        transition:    'opacity 0.25s linear',
        pointerEvents: sheetOpen ? 'auto' : 'none',
      }}
      onClick={() => !isLoading && setSheetOpen(false)}
    />

    {/* Panel: Framer Motion spring on transform only */}
    <AnimatePresence>
      {sheetOpen && (
        <motion.div
          key="sheet-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-[40px] px-5 pt-4"
          style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-full max-w-xl mx-auto">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
