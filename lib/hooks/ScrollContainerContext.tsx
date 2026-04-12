'use client'

import { createContext, useContext, type ReactNode, type RefObject } from 'react'
import type { MotionValue } from 'framer-motion'

interface ScrollContainerValue {
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

export function useScrollContainer(): MotionValue<number> | null {
  return useContext(ScrollContainerContext)?.scrollY ?? null
}

export function useScrollContainerRef(): RefObject<HTMLElement | null> | undefined {
  return useContext(ScrollContainerContext)?.ref ?? undefined
}
