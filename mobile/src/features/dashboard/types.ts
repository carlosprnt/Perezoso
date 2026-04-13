// Dashboard data types — matching web app's data structures

export interface DashboardStats {
  monthlyTotal: number;
  annualTotal: number;
  totalCount: number;
  sharedCount: number;
  savingsMonthly: number;
  currency: string;
}

export interface UpcomingRenewal {
  id: string;
  name: string;
  logoUrl?: string | null;
  simpleIconSlug?: string | null;
  monthlyCost: number;
  currency: string;
  daysUntilRenewal: number;
}

export interface CategoryRow {
  category: string;
  monthlyCost: number;
  pct: number;
}

export interface TopSubscription {
  id: string;
  name: string;
  logoUrl?: string | null;
  simpleIconSlug?: string | null;
  monthlyCost: number;
  currency: string;
  category?: string;
  isShared?: boolean;
  sharedCost?: number;
}
