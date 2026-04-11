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
        bg-white dark:bg-[#1C1C1E] rounded-[32px]
        ${PADDING[padding]}
        ${hover ? 'hover:border-[#A3A3A3] hover:bg-[#F7F8FA] dark:hover:bg-[#232325] dark:hover:border-[#3A3A3C] transition-colors duration-150' : ''}
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
        <h3 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] tracking-tight leading-tight">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[#616161] dark:text-[#8E8E93] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
