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

// Primary = nav blue (#3D3BF3), all sizes fixed to 40 px
const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#3D3BF3] text-white hover:bg-[#3230D0] active:bg-[#2B29B8] border border-[#3D3BF3]',
  secondary: 'bg-white text-[#121212] border border-[#D4D4D4] hover:bg-[#F5F5F5] hover:border-[#A3A3A3]',
  ghost:     'bg-transparent text-[#424242] hover:bg-[#F5F5F5] border border-transparent',
  danger:    'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] border border-[#DC2626]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-4 text-xs  rounded-[10px] gap-1.5 h-12',
  md: 'px-4 text-sm  rounded-[10px] gap-2   h-12',
  lg: 'px-6 text-sm  rounded-[10px] gap-2   h-12',
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
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D3BF3]/40 focus-visible:ring-offset-1
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
