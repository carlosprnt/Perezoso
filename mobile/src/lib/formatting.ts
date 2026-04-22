// Shared formatting utilities used across the mobile app.
//
// Consolidates duplicated helpers that previously lived in WalletCard,
// SubscriptionEditView, CreateSubscriptionSheet, and helpers.ts.

// ─── Month abbreviations (Spanish) ─────────────────────────────────

export const MONTHS_ES_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

// ─── Price / money ──────────────────────────────────────────────────

export function formatPrice(amount: number, currency: string): string {
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const symbol = currency === 'US$' ? 'US$' : '€';
  return `${intPart},${decPart}${symbol}`;
}

// ─── Billing ────────────────────────────────────────────────────────

export function billingLabel(period: string): string {
  switch (period) {
    case 'monthly': return 'Mes';
    case 'yearly': return 'Año';
    case 'quarterly': return 'Trimestre';
    case 'weekly': return 'Semana';
    default: return '';
  }
}

// ─── Date helpers ───────────────────────────────────────────────────

export function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

export function renewalText(days: number): string {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

export function formatBillingDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a Date object as "5 ene 2025". */
export function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
