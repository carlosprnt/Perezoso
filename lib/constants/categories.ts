import type { Category } from '@/types'

export interface CategoryMeta {
  value: Category
  label: string
  color: string        // Tailwind bg color class
  textColor: string    // Tailwind text color class
  emoji: string
}

export const CATEGORIES: CategoryMeta[] = [
  { value: 'streaming',    label: 'Streaming',    color: 'bg-red-100',    textColor: 'text-red-700',    emoji: '📺' },
  { value: 'music',        label: 'Music',        color: 'bg-green-100',  textColor: 'text-green-700',  emoji: '🎵' },
  { value: 'productivity', label: 'Productivity', color: 'bg-blue-100',   textColor: 'text-blue-700',   emoji: '⚡' },
  { value: 'cloud',        label: 'Cloud',        color: 'bg-sky-100',    textColor: 'text-sky-700',    emoji: '☁️' },
  { value: 'ai',           label: 'AI',           color: 'bg-violet-100', textColor: 'text-violet-700', emoji: '🤖' },
  { value: 'health',       label: 'Health',       color: 'bg-emerald-100',textColor: 'text-emerald-700',emoji: '🏃' },
  { value: 'gaming',       label: 'Gaming',       color: 'bg-orange-100', textColor: 'text-orange-700', emoji: '🎮' },
  { value: 'education',    label: 'Education',    color: 'bg-yellow-100', textColor: 'text-yellow-700', emoji: '📚' },
  { value: 'mobility',     label: 'Mobility',     color: 'bg-pink-100',   textColor: 'text-pink-700',   emoji: '🚗' },
  { value: 'home',         label: 'Home',         color: 'bg-amber-100',  textColor: 'text-amber-700',  emoji: '🏠' },
  { value: 'other',        label: 'Other',        color: 'bg-gray-100',   textColor: 'text-gray-700',   emoji: '📦' },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
) as Record<Category, CategoryMeta>

export function getCategoryMeta(category: Category): CategoryMeta {
  return CATEGORY_MAP[category] ?? CATEGORY_MAP['other']
}
