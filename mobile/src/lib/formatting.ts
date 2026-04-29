// Shared formatting utilities used across the mobile app.
//
// Consolidates duplicated helpers that previously lived in WalletCard,
// SubscriptionEditView, CreateSubscriptionSheet, and helpers.ts.

// ─── Month abbreviations (Spanish) ─────────────────────────────────

export const MONTHS_ES_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

// ─── Currency symbol resolution ─────────────────────────────────────

const SYMBOL_MAP: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$',
  BRL: 'R$', CHF: 'Fr', CNY: '¥', CZK: 'Kč', DKK: 'kr', HKD: 'HK$',
  HUF: 'Ft', IDR: 'Rp', ILS: '₪', INR: '₹', KRW: '₩', MXN: '$',
  NOK: 'kr', NZD: 'NZ$', PEN: 'S/.', PLN: 'zł', RUB: '₽', SEK: 'kr',
  SGD: 'S$', THB: '฿', TRY: '₺', TWD: 'NT$', ARS: '$', CLP: '$',
  COP: '$', UYU: '$U', ZAR: 'R',
};

export function currencyToSymbol(code: string): string {
  return SYMBOL_MAP[code] ?? code;
}

export function currencyCodeFromLabel(label: string): string {
  const parts = label.trim().split(' ');
  return parts[parts.length - 1] || 'EUR';
}

// ─── Price / money ──────────────────────────────────────────────────

export function formatPrice(amount: number, currency: string): string {
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const symbol = currencyToSymbol(currency);
  return `${intPart},${decPart}${symbol}`;
}

export function formatMoney(
  amount: number,
  currency: string,
  opts?: { trimZeros?: boolean; thousandSep?: boolean },
): string {
  let formatted = amount.toFixed(2).replace('.', ',');
  if (opts?.trimZeros && formatted.endsWith(',00')) {
    formatted = formatted.slice(0, -3);
  }
  if (opts?.thousandSep) {
    const [int, dec] = formatted.split(',');
    formatted = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? ',' + dec : ''}`;
  }
  return `${formatted}${currencyToSymbol(currency)}`;
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
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parseInt(parts[2], 10)} ${MONTHS_ES_SHORT[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a Date object as "5 ene 2025". */
export function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
