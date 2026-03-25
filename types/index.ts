// ============================================================
// PEREZOSO — Core TypeScript Types
// ============================================================

export type BillingPeriod = 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'custom'

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial'

export type UserShareMode = 'split_evenly' | 'custom'

export type Category =
  | 'streaming'
  | 'music'
  | 'productivity'
  | 'cloud'
  | 'ai'
  | 'health'
  | 'gaming'
  | 'education'
  | 'mobility'
  | 'home'
  | 'other'

// Matches the DB schema 1:1
export interface Subscription {
  id: string
  user_id: string
  name: string
  logo_url: string | null
  category: Category
  price_amount: number
  currency: string
  billing_period: BillingPeriod
  billing_interval_count: number
  next_billing_date: string | null // ISO date string YYYY-MM-DD
  trial_end_date: string | null
  status: SubscriptionStatus
  is_shared: boolean
  shared_with_count: number
  user_share_mode: UserShareMode
  user_share_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Derived view used in the UI (adds computed fields)
export interface SubscriptionWithCosts extends Subscription {
  monthly_equivalent_cost: number
  annual_equivalent_cost: number
  my_monthly_cost: number
  my_annual_cost: number
}

// Form payload — id/user_id/timestamps handled by DB
export type SubscriptionFormData = Omit<
  Subscription,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

// Dashboard aggregations
export interface DashboardStats {
  total_monthly_cost: number
  total_annual_cost: number
  active_count: number
  trial_count: number
  paused_count: number
  shared_monthly_cost: number
}

export interface CategoryBreakdown {
  category: Category
  monthly_cost: number
  count: number
}

export interface UpcomingRenewal {
  subscription: SubscriptionWithCosts
  days_until: number
  label: 'today' | 'this_week' | 'this_month'
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

// Filter state for subscription list
export type SubscriptionFilter = SubscriptionStatus | 'all' | Category

export interface FilterState {
  status: SubscriptionStatus | 'all'
  category: Category | 'all'
}
