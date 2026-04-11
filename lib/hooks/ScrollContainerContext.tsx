'use client'

import { createContext, useContext, type ReactNode, type RefObject } from 'react'
import type { MotionValue } from 'framer-motion'

/**
 * Provides a scroll position MotionValue and the DOM element ref of the
 * owning scroll container, when the default `window.scrollY` source is
 * not appropriate — e.g. inside a draggable fixed-position surface that
 * hosts its own scroll container.
 *
 * Consumers:
 * - `useEffectiveScrollY()` → reads `scrollY` MotionValue
 * - `useScrollContainerRef()` → reads `ref` for framer-motion's
 *   `useScroll({ container })` option (target/progress tracking)
 */
export interface ScrollContainerValue {
  scrollY: MotionValue<number>
  ref: RefObject<HTMLElement | null>
}

const ScrollContainerContext = createContext<ScrollContainerValue | null>(null)

export function ScrollContainerProvider({
  value,
  children,
}: {
  value: ScrollContainerValue
  children: ReactNode
}) {
  return (
    <ScrollContainerContext.Provider value={value}>
      {children}
    </ScrollContainerContext.Provider>
  )
}

/** Returns the scrollY MotionValue, or null when outside a provider. */
export function useScrollContainer(): MotionValue<number> | null {
  return useContext(ScrollContainerContext)?.scrollY ?? null
}

/** Returns the scroll container element ref, or null when outside a provider. */
export function useScrollContainerRef(): RefObject<HTMLElement | null> | null {
  return useContext(ScrollContainerContext)?.ref ?? null
}
