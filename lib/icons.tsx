'use client'

/**
 * Compatibility shim that re-exports Phosphor Icons under the same
 * component names we previously imported from `lucide-react`.
 *
 * Every re-exported icon is wrapped so it renders in Phosphor's `fill`
 * weight by default, giving us a consistent rounded + filled look
 * across the whole app. Consumers don't need to know about Phosphor
 * or weights — they keep using `<Home />`, `<Plus />`, etc.
 *
 * Icons are imported individually (not via namespace) so bundlers can
 * tree-shake unused icons. Add new entries here as needed.
 *
 * License: Phosphor Icons — MIT.
 */

import { forwardRef } from 'react'
import type { Icon, IconProps } from '@phosphor-icons/react'
import {
  ArrowLeft as PArrowLeft,
  ArrowRight as PArrowRight,
  ArrowsClockwise as PArrowsClockwise,
  ArrowCounterClockwise as PArrowCounterClockwise,
  Bell as PBell,
  BellSlash as PBellSlash,
  BookOpen as PBookOpen,
  Calendar as PCalendar,
  CalendarDots as PCalendarDots,
  CaretLeft as PCaretLeft,
  CaretRight as PCaretRight,
  CaretUpDown as PCaretUpDown,
  Car as PCar,
  ChartPie as PChartPie,
  Check as PCheck,
  CheckCircle as PCheckCircle,
  CircleNotch as PCircleNotch,
  Cloud as PCloud,
  Coins as PCoins,
  Copy as PCopy,
  CreditCard as PCreditCard,
  Envelope as PEnvelope,
  GameController as PGameController,
  Gear as PGear,
  HandCoins as PHandCoins,
  Heart as PHeart,
  House as PHouse,
  Lightning as PLightning,
  Lock as PLock,
  Moon as PMoon,
  MusicNotes as PMusicNotes,
  Package as PPackage,
  Plus as PPlus,
  Robot as PRobot,
  ShareNetwork as PShareNetwork,
  ShieldCheck as PShieldCheck,
  SignOut as PSignOut,
  SlidersHorizontal as PSlidersHorizontal,
  Sparkle as PSparkle,
  SquaresFour as PSquaresFour,
  Star as PStar,
  Sun as PSun,
  Tag as PTag,
  Television as PTelevision,
  Trash as PTrash,
  TrendUp as PTrendUp,
  Users as PUsers,
  WarningCircle as PWarningCircle,
  X as PX,
} from '@phosphor-icons/react'

// ─── Wrapper ──────────────────────────────────────────────────────────────
function make(PhosphorIcon: Icon, name: string) {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <PhosphorIcon ref={ref} weight="fill" {...props} />
  ))
  Wrapped.displayName = name
  return Wrapped
}

// Re-export the Phosphor Icon type under the old lucide name so
// `lib/constants/categories.ts` keeps working with `icon: LucideIcon`.
export type LucideIcon = Icon

// ─── General UI ───────────────────────────────────────────────────────────
export const AlertCircle        = make(PWarningCircle,        'AlertCircle')
export const ArrowLeft          = make(PArrowLeft,            'ArrowLeft')
export const ArrowRight         = make(PArrowRight,           'ArrowRight')
export const Bell               = make(PBell,                 'Bell')
export const BellOff            = make(PBellSlash,            'BellOff')
export const Calendar           = make(PCalendar,             'Calendar')
export const CalendarDays       = make(PCalendarDots,         'CalendarDays')
export const Check              = make(PCheck,                'Check')
export const CheckCircle2       = make(PCheckCircle,          'CheckCircle2')
export const ChevronLeft        = make(PCaretLeft,            'ChevronLeft')
export const ChevronRight       = make(PCaretRight,           'ChevronRight')
export const ChevronsUpDown     = make(PCaretUpDown,          'ChevronsUpDown')
export const Coins              = make(PCoins,                'Coins')
export const Copy               = make(PCopy,                 'Copy')
export const CreditCard         = make(PCreditCard,           'CreditCard')
export const HandCoins          = make(PHandCoins,            'HandCoins')
export const LayoutDashboard    = make(PSquaresFour,          'LayoutDashboard')
export const LayoutGrid         = make(PSquaresFour,          'LayoutGrid')
export const Loader2            = make(PCircleNotch,          'Loader2')
export const Lock               = make(PLock,                 'Lock')
export const LogOut             = make(PSignOut,              'LogOut')
export const Mail               = make(PEnvelope,             'Mail')
export const Moon               = make(PMoon,                 'Moon')
export const Package            = make(PPackage,              'Package')
export const PieChart           = make(PChartPie,             'PieChart')
export const Plus               = make(PPlus,                 'Plus')
export const RefreshCw          = make(PArrowsClockwise,      'RefreshCw')
export const RotateCcw          = make(PArrowCounterClockwise,'RotateCcw')
export const Settings           = make(PGear,                 'Settings')
export const Share2             = make(PShareNetwork,         'Share2')
export const ShieldCheck        = make(PShieldCheck,          'ShieldCheck')
export const SlidersHorizontal  = make(PSlidersHorizontal,    'SlidersHorizontal')
export const Sparkles           = make(PSparkle,              'Sparkles')
export const Star               = make(PStar,                 'Star')
export const Sun                = make(PSun,                  'Sun')
export const Tag                = make(PTag,                  'Tag')
export const Trash2             = make(PTrash,                'Trash2')
export const TrendingUp         = make(PTrendUp,              'TrendingUp')
export const Users              = make(PUsers,                'Users')
export const X                  = make(PX,                    'X')

// ─── Category icons ───────────────────────────────────────────────────────
export const Tv                 = make(PTelevision,           'Tv')
export const Music              = make(PMusicNotes,           'Music')
export const Zap                = make(PLightning,            'Zap')
export const Cloud              = make(PCloud,                'Cloud')
export const Bot                = make(PRobot,                'Bot')
export const Heart              = make(PHeart,                'Heart')
export const Gamepad2           = make(PGameController,       'Gamepad2')
export const BookOpen           = make(PBookOpen,             'BookOpen')
export const Car                = make(PCar,                  'Car')
export const Home               = make(PHouse,                'Home')
