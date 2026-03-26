interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
}

export function Card({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-[#D4D4D4]
        ${PADDING[padding]}
        ${hover ? 'hover:border-[#A3A3A3] hover:bg-[#FAFAFA] transition-colors duration-150' : ''}
        ${onClick ? 'cursor-pointer pressable' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-[#121212]">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[#616161] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
