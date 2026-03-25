import Image from 'next/image'
import { getInitials, getAvatarColor } from '@/lib/utils/logos'

interface LogoAvatarProps {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: { container: 'w-8 h-8',   text: 'text-xs',  px: 32,  py: 32  },
  md: { container: 'w-10 h-10', text: 'text-sm',  px: 40,  py: 40  },
  lg: { container: 'w-12 h-12', text: 'text-base', px: 48, py: 48  },
}

export default function LogoAvatar({
  name,
  logoUrl,
  size = 'md',
  className = '',
}: LogoAvatarProps) {
  const { container, text, px, py } = SIZE_MAP[size]

  if (logoUrl) {
    return (
      <div
        className={`
          ${container} rounded-xl overflow-hidden flex-shrink-0
          bg-white border border-gray-100 shadow-sm ${className}
        `}
      >
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={px}
          height={py}
          className="w-full h-full object-cover"
          unoptimized // logos are external, skip optimization
        />
      </div>
    )
  }

  const bgColor = getAvatarColor(name)
  const initials = getInitials(name)

  return (
    <div
      className={`
        ${container} rounded-xl flex-shrink-0
        flex items-center justify-center
        font-semibold text-white select-none ${text} ${className}
      `}
      style={{ backgroundColor: bgColor }}
      aria-label={`${name} logo`}
    >
      {initials}
    </div>
  )
}
