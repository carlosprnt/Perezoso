'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#121212] text-white hover:bg-[#2A2A2A] border border-[#121212]',
  secondary: 'bg-white text-[#121212] border border-[#D4D4D4] hover:bg-[#F5F5F5] hover:border-[#A3A3A3]',
  ghost:     'bg-transparent text-[#424242] hover:bg-[#F5F5F5] border border-transparent',
  danger:    'bg-[#991B1B] text-white hover:bg-[#7F1D1D] border border-[#991B1B]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg  gap-1.5 h-8',
  md: 'px-4 py-2   text-sm rounded-xl  gap-2   h-9',
  lg: 'px-5 py-2.5 text-sm rounded-xl  gap-2   h-10',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    children,
    className = '',
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        transition-colors duration-150 select-none pressable
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B21B6] focus-visible:ring-offset-1
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  )
})
