'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { MotionValue } from 'framer-motion'

/**
 * Provides a scroll position MotionValue when the default `window.scrollY`
 * source is not appropriate — e.g. inside a draggable fixed-position surface
 * that hosts its own scroll container.
 *
 * Consumers: `useEffectiveScrollY()` reads this value when present.
 */
const ScrollContainerContext = createContext<MotionValue<number> | null>(null)

export function ScrollContainerProvider({
  value,
  children,
}: {
  value: MotionValue<number>
  children: ReactNode
}) {
  return (
    <ScrollContainerContext.Provider value={value}>
      {children}
    </ScrollContainerContext.Provider>
  )
}

export function useScrollContainer(): MotionValue<number> | null {
  return useContext(ScrollContainerContext)
}
