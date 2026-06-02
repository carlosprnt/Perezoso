// Gmail subscription detection — mobile port of lib/subscription-detection.ts
//
// Scans Gmail message headers to identify recurring subscriptions.
// Known sender domains bypass keyword filtering; unknown domains
// require subscription-related keywords in the subject line.

import type { GmailMessageHeader } from '../../services/gmail';
import type { BillingPeriod, Category } from '../subscriptions/types';
import { PLATFORMS, logoUrlFromDomain } from '../../lib/constants/platforms';

// ── Detected subscription shape ─────────────────────────────────────
export interface DetectedSubscription {
  id: string;
  name: string;
  matchedPlatformId?: string;
  logoUrl: string | null;
  price_amount: number | null;
  currency: string | null;
  billing_period: BillingPeriod;
  source_hint: string;
  suggested_category: Category;
  confidence: 'high' | 'medium' | 'low';
}

// ── Domain → platform mapping ───────────────────────────────────────
const DOMAIN_TO_PLATFORM: Record<string, string> = {
  'netflix.com': 'netflix', 'nflximg.com': 'netflix',
  'disneyplus.com': 'disney-plus', 'disney.com': 'disney-plus',
  'hbomax.com': 'hbo-max', 'max.com': 'hbo-max',
  'hulu.com': 'hulu',
  'primevideo.com': 'prime-video', 'amazon.com': 'amazon-prime',
  'spotify.com': 'spotify',
  'apple.com': 'icloud', 'icloud.com': 'icloud',
  'google.com': 'google-one', 'youtube.com': 'youtube-premium',
  'notion.so': 'notion',
  'adobe.com': 'adobe',
  'github.com': 'github',
  'figma.com': 'figma',
  'canva.com': 'canva',
  'dropbox.com': 'dropbox',
  'openai.com': 'chatgpt',
  'anthropic.com': 'claude',
  'microsoft.com': 'microsoft-onedrive',
  'xbox.com': 'xbox-game-pass',
  'playstation.com': 'playstation-plus',
  'nintendo.com': 'nintendo-switch-online',
  'slack.com': 'slack',
  'medium.com': 'medium',
  'coursera.org': 'coursera',
  'duolingo.com': 'duolingo',
  'paypal.com': 'paypal',
  'revolut.com': 'revolut',
  'crunchyroll.com': 'crunchyroll',
  'dazn.com': 'dazn',
  'tidal.com': 'tidal',
  'deezer.com': 'deezer',
};

// ── Subject keywords (multilingual) ─────────────────────────────────
const KEYWORDS = [
  'receipt', 'invoice', 'subscription', 'renewal', 'billing',
  'charged', 'payment', 'membership', 'billed', 'confirmation',
  'factura', 'recibo', 'suscripción', 'suscripcion', 'renovación',
  'renovacion', 'cobro', 'cargo', 'pago', 'confirmación', 'membresía',
];

// ── Helpers ──────────────────────────────────────────────────────────
function extractDomain(from: string): string | null {
  const match = from.match(/<[^@]+@([^>]+)>/) ?? from.match(/@([^\s>]+)/);
  if (!match) return null;
  const parts = match[1].toLowerCase().trim().split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : null;
}

function extractDisplayName(from: string): string {
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) return nameMatch[1].trim();
  const emailMatch = from.match(/<([^>]+)>/) ?? from.match(/\S+@\S+/);
  const email = emailMatch ? (emailMatch[1] ?? emailMatch[0]) : from;
  return email.split('@')[0].replace(/[._-]/g, ' ').trim();
}

function hasKeyword(subject: string): boolean {
  const lower = subject.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

function parseAmount(texts: string[]): { amount: number; currency: string } | null {
  const patterns: { re: RegExp; currency: string }[] = [
    { re: /\$\s?(\d+(?:[.,]\d{1,2})?)/, currency: 'USD' },
    { re: /€\s?(\d+(?:[.,]\d{1,2})?)/, currency: 'EUR' },
    { re: /£\s?(\d+(?:[.,]\d{1,2})?)/, currency: 'GBP' },
    { re: /(\d+(?:[.,]\d{1,2})?)\s?€/, currency: 'EUR' },
    { re: /(\d+(?:[.,]\d{1,2})?)\s?\$/, currency: 'USD' },
    { re: /(\d+(?:[.,]\d{1,2})?)\s?£/, currency: 'GBP' },
    { re: /(\d+(?:[.,]\d{1,2})?)\s?EUR\b/, currency: 'EUR' },
    { re: /(\d+(?:[.,]\d{1,2})?)\s?USD\b/, currency: 'USD' },
  ];
  for (const text of texts) {
    for (const { re, currency } of patterns) {
      const m = text.match(re);
      if (m) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (!isNaN(val) && val > 0 && val < 10_000) return { amount: val, currency };
      }
    }
  }
  return null;
}

function parsePeriod(texts: string[]): BillingPeriod | null {
  for (const text of texts) {
    const l = text.toLowerCase();
    if (/\b(annual|yearly|year|anual|año)\b/.test(l)) return 'yearly';
    if (/\b(monthly|month|mensual|mes)\b/.test(l)) return 'monthly';
    if (/\b(quarterly|quarter|trimestral|trimestre)\b/.test(l)) return 'quarterly';
    if (/\b(weekly|week|semanal|semana)\b/.test(l)) return 'weekly';
  }
  return null;
}

function nameFromDomain(domain: string, display: string): string {
  const generic = ['billing', 'invoice', 'noreply', 'no-reply', 'notify', 'notifications', 'info', 'support', 'team', 'mail'];
  const cleaned = display.toLowerCase().replace(/\s/g, '');
  if (!generic.includes(cleaned) && display.length > 2 && !/\d/.test(display)) {
    return display.charAt(0).toUpperCase() + display.slice(1);
  }
  const base = domain.split('.')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// ── Main detection ──────────────────────────────────────────────────
export function detectSubscriptions(
  messages: GmailMessageHeader[],
): DetectedSubscription[] {
  const relevant = messages.filter((m) => {
    const domain = extractDomain(m.from);
    if (domain && DOMAIN_TO_PLATFORM[domain]) return true;
    return hasKeyword(m.subject);
  });

  const byDomain = new Map<string, GmailMessageHeader[]>();
  for (const msg of relevant) {
    const domain = extractDomain(msg.from);
    if (!domain) continue;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(msg);
  }

  const candidates: DetectedSubscription[] = [];
  const seenPlatforms = new Set<string>();

  for (const [domain, msgs] of byDomain) {
    const sorted = [...msgs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sorted[0];

    const platformId = DOMAIN_TO_PLATFORM[domain];
    if (platformId && seenPlatforms.has(platformId)) continue;
    if (platformId) seenPlatforms.add(platformId);

    const platform = platformId
      ? PLATFORMS.find((p) => p.id === platformId)
      : undefined;
    const name = platform?.name ?? nameFromDomain(domain, extractDisplayName(latest.from));
    const logoUrl = platform ? logoUrlFromDomain(platform.domain) : null;

    const textsForAmount = sorted.slice(0, 5).flatMap((m) => [m.subject, m.snippet ?? '']);
    const amountData = parseAmount(textsForAmount);

    const textsForPeriod = sorted.flatMap((m) => [m.subject, m.snippet ?? '']);
    const billing_period: BillingPeriod = parsePeriod(textsForPeriod) ?? 'monthly';

    const isRecurring = sorted.length >= 2;
    const confidence: DetectedSubscription['confidence'] =
      platform && isRecurring ? 'high'
        : platform || isRecurring ? 'medium'
          : 'low';

    const latestDate = new Date(latest.date);
    const dateHint = isNaN(latestDate.getTime())
      ? ''
      : latestDate.toLocaleDateString('es', { month: 'short', year: 'numeric' });
    const sourceHint = dateHint ? `${domain} · ${dateHint}` : domain;

    const suggested_category = (platform?.category ?? 'other') as Category;

    candidates.push({
      id: `gmail-${domain}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      matchedPlatformId: platform?.id,
      logoUrl,
      price_amount: amountData?.amount ?? null,
      currency: amountData?.currency ?? 'EUR',
      billing_period,
      source_hint: sourceHint,
      suggested_category,
      confidence,
    });
  }

  return candidates.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    const diff = order[a.confidence] - order[b.confidence];
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}
