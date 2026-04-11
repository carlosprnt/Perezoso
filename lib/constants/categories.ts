import type { Category } from '@/types'
import {
  Tv, Music, Zap, Cloud, Bot, Heart,
  Gamepad2, BookOpen, Car, Home, Package,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryMeta {
  value: Category
  label: string
  icon: LucideIcon
  /* Accessible text + bg pairs — all pass WCAG AA on their bg */
  color: string      // Tailwind bg class
  textColor: string  // Tailwind text class
}

export const CATEGORIES: CategoryMeta[] = [
  { value: 'streaming',    label: 'Streaming',    icon: Tv,        color: 'bg-red-100',    textColor: 'text-red-800'    },
  { value: 'music',        label: 'Music',        icon: Music,     color: 'bg-green-100',  textColor: 'text-green-800'  },
  { value: 'productivity', label: 'Productivity', icon: Zap,       color: 'bg-neutral-200',textColor: 'text-neutral-800'},
  { value: 'cloud',        label: 'Cloud',        icon: Cloud,     color: 'bg-stone-200',  textColor: 'text-stone-800'  },
  { value: 'ai',           label: 'AI',           icon: Bot,       color: 'bg-violet-100', textColor: 'text-violet-800' },
  { value: 'health',       label: 'Health',       icon: Heart,     color: 'bg-emerald-100',textColor: 'text-emerald-800'},
  { value: 'gaming',       label: 'Gaming',       icon: Gamepad2,  color: 'bg-orange-100', textColor: 'text-orange-800' },
  { value: 'education',    label: 'Education',    icon: BookOpen,  color: 'bg-yellow-100', textColor: 'text-yellow-800' },
  { value: 'mobility',     label: 'Mobility',     icon: Car,       color: 'bg-pink-100',   textColor: 'text-pink-800'   },
  { value: 'home',         label: 'Home',         icon: Home,      color: 'bg-amber-100',  textColor: 'text-amber-800'  },
  { value: 'other',        label: 'Other',        icon: Package,   color: 'bg-neutral-100',textColor: 'text-neutral-800'},
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c])
) as Record<Category, CategoryMeta>

export function getCategoryMeta(category: Category): CategoryMeta {
  return CATEGORY_MAP[category] ?? CATEGORY_MAP['other']
}
