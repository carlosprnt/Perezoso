'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ─── Logo tile configuration ─────────────────────────────────────────────────
interface LogoConfig {
  id: string
  label: string          // fallback text if image fails
  src: string            // Simple Icons CDN URL
  bg: string             // tile background colour
  size: number
  radius: number
  left: string           // initial CSS left (% of vw)
  top: string            // initial CSS top (% of vh)
  xKeys: number[]        // idle x-drift keyframes
  yKeys: number[]        // idle y-drift keyframes
  duration: number
  delay: number
  pileOffsetX: number    // horizontal offset from screen centre when piled (px)
  pileRotate: number     // tilt angle when landed (deg)
  fallDelay: number      // stagger delay for the fall spring
}

const LOGOS: LogoConfig[] = [
  // ── Row 1 (top area) ────────────────────────────────────────────────────────
  {
    id: 'spotify', label: 'S',
    src: 'https://cdn.simpleicons.org/spotify/FFFFFF',
    bg: '#1DB954', size: 78, radius: 20,
    left: '4%', top: '10%',
    xKeys: [0, 14, 5, -10, 0], yKeys: [0, -10, 16, 5, 0],
    duration: 7.2, delay: 0,
    pileOffsetX: -155, pileRotate: 12, fallDelay: 0.00,
  },
  {
    id: 'notion', label: 'N',
    src: 'https://cdn.simpleicons.org/notion/FFFFFF',
    bg: '#000000', size: 76, radius: 18,
    left: '38%', top: '5%',
    xKeys: [0, -8, 12, -4, 0], yKeys: [0, 14, -6, 10, 0],
    duration: 8.8, delay: 0.6,
    pileOffsetX: -15, pileRotate: -3, fallDelay: 0.04,
  },
  {
    id: 'netflix', label: 'N',
    src: 'https://cdn.simpleicons.org/netflix/FFFFFF',
    bg: '#E50914', size: 78, radius: 20,
    left: '68%', top: '9%',
    xKeys: [0, -12, -4, 9, 0], yKeys: [0, 14, -8, 12, 0],
    duration: 8.1, delay: 1.2,
    pileOffsetX: 110, pileRotate: -9, fallDelay: 0.06,
  },

  // ── Row 2 (middle area, orbits around Perezoso logo at ~top:22%) ────────────
  {
    id: 'google', label: 'G',
    src: 'https://cdn.simpleicons.org/google/FFFFFF',
    bg: '#4285F4', size: 74, radius: 18,
    left: '3%', top: '34%',
    xKeys: [0, 16, 6, -13, 0], yKeys: [0, -7, 18, -5, 0],
    duration: 6.9, delay: 1.8,
    pileOffsetX: -135, pileRotate: 8, fallDelay: 0.11,
  },
  {
    id: 'openai', label: 'AI',
    src: 'https://cdn.simpleicons.org/openai/FFFFFF',
    bg: '#10A37F', size: 74, radius: 18,
    left: '70%', top: '32%',
    xKeys: [0, -14, -5, 11, 0], yKeys: [0, 12, -14, 6, 0],
    duration: 9.0, delay: 0.4,
    pileOffsetX: 60, pileRotate: 6, fallDelay: 0.14,
  },

  // ── Row 3 (lower-middle) ─────────────────────────────────────────────────────
  {
    id: 'amazon', label: 'A',
    src: 'https://cdn.simpleicons.org/amazon/FFFFFF',
    bg: '#FF9900', size: 74, radius: 18,
    left: '17%', top: '50%',
    xKeys: [0, 13, 4, -11, 0], yKeys: [0, 8, -14, 9, 0],
    duration: 6.8, delay: 0.8,
    pileOffsetX: -60, pileRotate: -6, fallDelay: 0.13,
  },
  {
    id: 'apple', label: '',
    src: 'https://cdn.simpleicons.org/apple/FFFFFF',
    bg: '#1C1C1E', size: 74, radius: 18,
    left: '63%', top: '48%',
    xKeys: [0, -11, -6, 14, 0], yKeys: [0, 13, -6, -10, 0],
    duration: 9.2, delay: 2.1,
    pileOffsetX: 45, pileRotate: 7, fallDelay: 0.19,
  },

  // ── Row 4 (bottom, just above card) ─────────────────────────────────────────
  {
    id: 'youtube', label: 'YT',
    src: 'https://cdn.simpleicons.org/youtube/FFFFFF',
    bg: '#FF0000', size: 76, radius: 18,
    left: '8%', top: '63%',
    xKeys: [0, 15, 6, -12, 0], yKeys: [0, -10, 15, 4, 0],
    duration: 7.6, delay: 1.5,
    pileOffsetX: -105, pileRotate: -14, fallDelay: 0.09,
  },
  {
    id: 'disneyplus', label: 'D+',
    src: 'https://cdn.simpleicons.org/disneyplus/FFFFFF',
    bg: '#0D3B7A', size: 80, radius: 22,
    left: '55%', top: '65%',
    xKeys: [0, -13, -4, 11, 0], yKeys: [0, 11, -10, -8, 0],
    duration: 8.4, delay: 0.5,
    pileOffsetX: 145, pileRotate: 5, fallDelay: 0.16,
  },
]

// ─── Fallback logo image with text fallback ───────────────────────────────────
function LogoTile({ logo }: { logo: LogoConfig }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div
      style={{
        width: logo.size, height: logo.size, borderRadius: logo.radius,
        background: logo.bg,
        boxShadow: '0 3px 14px rgba(0,0,0,0.15)',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {imgError ? (
        <span style={{ fontSize: logo.size * 0.34, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.5 }}>
          {logo.label}
        </span>
      ) : (
        <img
          src={logo.src}
          alt={logo.id}
          onError={() => setImgError(true)}
          style={{ width: '62%', height: '62%', objectFit: 'contain', display: 'block' }}
        />
      )}
    </div>
  )
}

// ─── Google icon SVG ──────────────────────────────────────────────────────────
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

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [phase, setPhase] = useState<'idle' | 'falling'>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const vRef = useRef({ w: 390, h: 844 })

  useEffect(() => {
    vRef.current = { w: window.innerWidth, h: window.innerHeight }
  }, [])

  /**
   * Calculate the x/y delta each logo must travel to land at the pile zone.
   * The pile zone is ~300px above the bottom (just above the sign-in card).
   * Logo left/top are CSS % values; framer-motion x/y are additional transforms.
   */
  function getFallTarget(logo: LogoConfig) {
    const { w, h } = vRef.current
    const initLeft = parseFloat(logo.left) / 100 * w
    const initTop  = parseFloat(logo.top) / 100 * h
    // Pile: logo top-left sits ~300px from bottom, scattered around the centre
    const pileTop  = h - 305
    const pileLeft = w / 2 + logo.pileOffsetX
    return {
      x: pileLeft - initLeft,
      y: pileTop - initTop,
      rotate: logo.pileRotate,
    }
  }

  async function handleGoogleLogin() {
    if (phase === 'falling' || isLoading) return
    setPhase('falling')
    setLoginError(null)

    // Wait for the last logo to land before redirecting
    // Longest stagger = 0.19s + ~0.45s spring settle ≈ 640ms total
    setTimeout(async () => {
      setIsLoading(true)
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) {
        setLoginError(error.message)
        setIsLoading(false)
        setPhase('idle')
      }
      // On success the browser is redirected — no further action needed
    }, 680)
  }

  const isFalling = phase === 'falling'

  return (
    <div className="fixed inset-0 bg-[#ECECEC]" style={{ overflow: 'hidden' }}>

      {/* ── Hero zone ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">

        {/* Perezoso app icon — always static, centre anchor */}
        <div
          className="absolute"
          style={{ left: '50%', marginLeft: -72, top: '22%' }}
        >
          <Image
            src="/logo.png"
            alt="Perezoso"
            width={144}
            height={144}
            className="rounded-[34px]"
            priority
          />
        </div>

        {/* Floating service logos */}
        {LOGOS.map((logo) => {
          const ft = isFalling ? getFallTarget(logo) : null
          return (
            <motion.div
              key={logo.id}
              className="absolute"
              style={{ left: logo.left, top: logo.top }}
              animate={
                ft
                  ? { x: ft.x, y: ft.y, rotate: ft.rotate }
                  : { x: logo.xKeys, y: logo.yKeys, rotate: 0 }
              }
              transition={
                ft
                  ? {
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                      delay: logo.fallDelay,
                    }
                  : {
                      duration: logo.duration,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      delay: logo.delay,
                    }
              }
            >
              <LogoTile logo={logo} />
            </motion.div>
          )
        })}
      </div>

      {/* ── Sign-in card — anchored at bottom, always above logos ─────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 z-10"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="bg-white rounded-3xl border border-[#E0E0E0] shadow-[0_2px_20px_rgba(0,0,0,0.07)] p-6">
          <h1 className="text-2xl font-bold text-[#121212] mb-1">Sign in</h1>
          <p className="text-sm text-[#616161] mb-5">
            Continue with your Google account to get started.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || isFalling}
            className="
              w-full flex items-center justify-center gap-3
              px-4 py-3 rounded-xl border border-gray-200 bg-white
              text-sm font-medium text-gray-800
              hover:bg-gray-50 hover:border-gray-300
              transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
              shadow-sm
            "
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {isLoading ? 'Signing in…' : isFalling ? 'One moment…' : 'Continue with Google'}
          </button>

          {loginError && (
            <p className="text-xs text-red-600 text-center bg-red-50 rounded-lg px-3 py-2 mt-3">
              {loginError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
