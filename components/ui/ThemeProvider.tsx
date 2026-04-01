'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })
export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => {
    try {
      const stored = localStorage.getItem('perezoso_theme') as Theme | null
      const t = stored === 'dark' ? 'dark' : 'light'
      setTheme(t)
      document.documentElement.classList.toggle('dark', t === 'dark')
    } catch {
      // localStorage unavailable (private browsing, native sandbox, etc.)
    }
  }, [])
  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { localStorage.setItem('perezoso_theme', next) } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', next === 'dark')
  }
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}
