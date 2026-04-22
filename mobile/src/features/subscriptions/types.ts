// Subscription data types — matching web app's data structures

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial' | 'ended';
export type BillingPeriod = 'monthly' | 'yearly' | 'quarterly' | 'weekly';
export type Category =
  | 'streaming' | 'music' | 'productivity' | 'cloud' | 'ai'
  | 'health' | 'gaming' | 'education' | 'mobility' | 'home' | 'other'
  | (string & {});

export interface Subscription {
  id: string;
  name: string;
  logo_url: string | null;
  category: Category;
  price_amount: number;
  currency: string;
  billing_period: BillingPeriod;
  billing_interval_count: number;
  next_billing_date: string;
  status: SubscriptionStatus;
  is_shared: boolean;
  shared_with_count: number;
  card_color: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  monthly_equivalent_cost: number;
  my_monthly_cost: number;
  // Optional reminder metadata (populated on load / after edit)
  reminderEnabled?: boolean;
  reminderDays?: '1 día antes' | '3 días antes' | '7 días antes';
  // Optional notes
  notes?: string;
  // Optional edit-form metadata — not yet persisted server-side but
  // surfaced in Create / Edit sheets so the user input round-trips.
  start_date?: string;      // YYYY-MM-DD
  end_date?: string;        // YYYY-MM-DD (absence ⇒ "no end")
  payment_method?: string;  // Free-text: "Visa ••9921", "PayPal"…
}

export type SortMode =
  | 'alphabetical'
  | 'price_high'
  | 'price_low'
  | 'recently_added';

export const CATEGORY_LABELS: Record<string, string> = {
  streaming: 'Streaming',
  music: 'Música',
  productivity: 'Productividad',
  cloud: 'Cloud',
  ai: 'IA',
  health: 'Salud',
  gaming: 'Gaming',
  education: 'Educación',
  mobility: 'Movilidad',
  home: 'Hogar',
  other: 'Otros',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  trial: 'Prueba',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  ended: 'Finalizado',
};
