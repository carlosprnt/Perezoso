// Derive personalised savings suggestions from the user's real subscriptions.
//
// Two kinds of suggestion:
//   · 'share'  — the service offers a family/duo/team plan that splits
//                 the cost and the user's subscription is NOT already shared.
//   · 'annual' — the user pays monthly but the service is known to offer
//                 annual billing at a discount.
//
// Each entry in SAVINGS_CATALOG is keyed by the lowercase service name
// (with common aliases). The matcher fuzzy-matches the user's `sub.name`
// against these keys, so "Spotify Premium" still hits the "spotify" entry.

import type { Subscription } from '../subscriptions/types';
import { resolvePlatformLogoUrl } from '../../lib/constants/platforms';

export type SuggestionKind = 'share' | 'annual';

export interface SavingsSuggestion {
  id: string;
  kind: SuggestionKind;
  serviceName: string;
  logoUrl: string | null;
  brandColor: string;

  listCopyBefore: string;
  listAmount: string;
  listCopyAfter: string;

  currentPlanLabel: string;
  monthlySavings: string;
  yearlySavings: string;

  compareCurrentLabel: string;
  compareCurrentPrice: string;
  compareSuggestedLabel: string;
  compareSuggestedPrice: string;

  note: string;
}

// ── Catalog of known savings opportunities ───────────────────────────
// Each entry describes ONE potential saving for a service. A service can
// appear multiple times (e.g. share AND annual).

interface CatalogEntry {
  /** Lowercase keys and aliases the user's subscription name is matched against. */
  keys: string[];
  kind: SuggestionKind;
  brandColor: string;
  /** Only show if this returns true for the user's subscription. */
  shouldShow: (sub: Subscription) => boolean;
  build: (sub: Subscription) => Omit<SavingsSuggestion, 'id' | 'kind' | 'serviceName' | 'logoUrl' | 'brandColor'>;
}

function fmt(n: number, currency: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? 'US$' : currency;
  return `${n.toFixed(2).replace('.', ',')}${sym}`;
}

const SAVINGS_CATALOG: CatalogEntry[] = [
  // ─── Spotify ────────────────────────────────────────────
  {
    keys: ['spotify'],
    kind: 'share',
    brandColor: '#1DB954',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.5;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año si cambias a un plan familiar o duo.',
        currentPlanLabel: 'Plan individual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan individual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan familiar (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Consulta en spotify.com las opciones de plan familiar o duo. El precio por persona depende del número de miembros.',
      };
    },
  },
  // ─── Netflix ────────────────────────────────────────────
  {
    keys: ['netflix'],
    kind: 'share',
    brandColor: '#E50914',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.5;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año compartiendo tu cuenta de Netflix.',
        currentPlanLabel: `Plan actual — ${fmt(monthly, c)}/mes`,
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Tú solo',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Compartido (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Netflix permite miembros extra en el mismo hogar. El coste por persona baja cuanto más miembros compartan.',
      };
    },
  },
  // ─── Apple TV+ ──────────────────────────────────────────
  {
    keys: ['apple tv', 'apple tv+', 'appletv'],
    kind: 'share',
    brandColor: '#000000',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.55;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año activando Compartir en familia.',
        currentPlanLabel: 'Plan individual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan individual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Compartir en familia (hasta 6)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Activa Compartir en familia desde los Ajustes del iPhone para repartir el coste con hasta 5 personas sin perder perfiles individuales.',
      };
    },
  },
  // ─── iCloud+ ────────────────────────────────────────────
  {
    keys: ['icloud', 'icloud+'],
    kind: 'share',
    brandColor: '#3478F6',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.35;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año activando Compartir en familia en iCloud+.',
        currentPlanLabel: `iCloud+ — ${fmt(monthly, c)}/mes`,
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Individual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Compartir en familia (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Cada miembro mantiene su almacenamiento privado — solo se reparte el coste del plan. Actívalo desde Ajustes › Apple ID › Compartir en familia.',
      };
    },
  },
  // ─── YouTube Premium ────────────────────────────────────
  {
    keys: ['youtube', 'youtube premium', 'yt premium'],
    kind: 'share',
    brandColor: '#FF0000',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.45;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año con el plan familiar de YouTube Premium.',
        currentPlanLabel: 'Plan individual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan individual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan familiar (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'El plan familiar de YouTube Premium permite hasta 5 miembros del hogar con cuentas individuales.',
      };
    },
  },
  // ─── Disney+ ────────────────────────────────────────────
  {
    keys: ['disney', 'disney+', 'disneyplus', 'disney plus'],
    kind: 'share',
    brandColor: '#113CCF',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.5;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año compartiendo tu cuenta de Disney+.',
        currentPlanLabel: `Plan actual — ${fmt(monthly, c)}/mes`,
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Tú solo',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Compartido (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Disney+ permite hasta 4 perfiles y compartir con miembros del hogar.',
      };
    },
  },
  // ─── HBO Max / Max ──────────────────────────────────────
  {
    keys: ['hbo', 'hbo max', 'max'],
    kind: 'share',
    brandColor: '#5822B4',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.5;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año compartiendo tu cuenta de Max.',
        currentPlanLabel: `Plan actual — ${fmt(monthly, c)}/mes`,
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Tú solo',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Compartido (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Max permite perfiles múltiples. Comparte con tu hogar para repartir el coste.',
      };
    },
  },
  // ─── Microsoft 365 ──────────────────────────────────────
  {
    keys: ['microsoft 365', 'office 365', 'ms 365'],
    kind: 'share',
    brandColor: '#D83B01',
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const sharedPerPerson = monthly * 0.35;
      const savingsMonth = monthly - sharedPerPerson;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año con el plan Microsoft 365 Familia.',
        currentPlanLabel: 'Plan personal',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan personal',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan familia (por persona)',
        compareSuggestedPrice: `~${fmt(sharedPerPerson, c)}/mes`,
        note: 'Microsoft 365 Familia incluye hasta 6 personas, cada una con 1 TB de OneDrive y las apps completas de Office.',
      };
    },
  },

  // ── Annual-billing suggestions ─────────────────────────

  // Generic "switch to annual" — applies to any monthly subscription
  // for services known to offer annual discounts (roughly 2 months free).
  ...(['chatgpt', 'chatgpt plus'] as const).map<CatalogEntry>((key) => ({
    keys: [key],
    kind: 'annual' as const,
    brandColor: '#10A37F',
    shouldShow: (s) => s.billing_period === 'monthly',
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const annualMonthly = monthly * (10 / 12);
      const savingsMonth = monthly - annualMonthly;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año pasando a facturación anual.',
        currentPlanLabel: 'Plan mensual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan mensual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan anual (equivalente mensual)',
        compareSuggestedPrice: `~${fmt(annualMonthly, c)}/mes`,
        note: 'La facturación anual incluye un descuento equivalente a unos dos meses gratis al año. Revisa las condiciones en la web del proveedor.',
      };
    },
  })),

  ...(['claude', 'claude pro'] as const).map<CatalogEntry>((key) => ({
    keys: [key],
    kind: 'annual' as const,
    brandColor: '#CC9A5B',
    shouldShow: (s) => s.billing_period === 'monthly',
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const annualMonthly = monthly * (10 / 12);
      const savingsMonth = monthly - annualMonthly;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año pasando a facturación anual.',
        currentPlanLabel: 'Plan mensual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan mensual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan anual (equivalente mensual)',
        compareSuggestedPrice: `~${fmt(annualMonthly, c)}/mes`,
        note: 'La facturación anual aplica un descuento equivalente a unos dos meses gratis al año. Consulta la página de precios del proveedor.',
      };
    },
  })),

  ...(['notion'] as const).map<CatalogEntry>((key) => ({
    keys: [key],
    kind: 'annual' as const,
    brandColor: '#000000',
    shouldShow: (s) => s.billing_period === 'monthly',
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const annualMonthly = monthly * 0.8;
      const savingsMonth = monthly - annualMonthly;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año pasando Notion a facturación anual.',
        currentPlanLabel: 'Plan mensual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan mensual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan anual (equivalente mensual)',
        compareSuggestedPrice: `~${fmt(annualMonthly, c)}/mes`,
        note: 'Notion ofrece un 20% de descuento al pasar a facturación anual. Consulta notion.so/pricing.',
      };
    },
  })),

  ...(['adobe', 'adobe creative cloud', 'adobe cc', 'photoshop', 'lightroom'] as const).map<CatalogEntry>((key) => ({
    keys: [key],
    kind: 'annual' as const,
    brandColor: '#DA1F26',
    shouldShow: (s) => s.billing_period === 'monthly',
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const annualMonthly = monthly * 0.8;
      const savingsMonth = monthly - annualMonthly;
      const savingsYear = savingsMonth * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podrías ahorrar hasta ',
        listAmount: fmt(savingsYear, c),
        listCopyAfter: ' al año pasando Adobe al plan anual prepagado.',
        currentPlanLabel: 'Plan mensual',
        monthlySavings: `Ahorra ~${fmt(savingsMonth, c)}/mes`,
        yearlySavings: `${fmt(savingsYear, c)}/año en tu bolsillo`,
        compareCurrentLabel: 'Plan mensual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan anual prepagado',
        compareSuggestedPrice: `~${fmt(annualMonthly, c)}/mes`,
        note: 'Adobe ofrece descuentos significativos al pagar el plan anual por adelantado. Revisa adobe.com.',
      };
    },
  })),
];

// ── Matcher ──────────────────────────────────────────────────────────
// Normalises the subscription name and checks if any catalog key is a
// substring, or vice-versa. This handles "Spotify Premium", "Spotify
// (familiar)", "ChatGPT Plus", "ChatGPT" etc.

function normalise(s: string): string {
  return s.toLowerCase().replace(/[+™®]/g, '').trim();
}

function matchesCatalog(subName: string, keys: string[]): boolean {
  const norm = normalise(subName);
  return keys.some((k) => norm.includes(k) || k.includes(norm));
}

// ── Public API ───────────────────────────────────────────────────────

export function deriveSavingsSuggestions(
  subscriptions: Subscription[],
): SavingsSuggestion[] {
  const active = subscriptions.filter((s) => s.status === 'active' || s.status === 'trial');
  const results: SavingsSuggestion[] = [];
  const seen = new Set<string>();

  for (const sub of active) {
    for (const entry of SAVINGS_CATALOG) {
      if (!matchesCatalog(sub.name, entry.keys)) continue;
      if (!entry.shouldShow(sub)) continue;

      const dedupeKey = `${normalise(sub.name)}-${entry.kind}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const built = entry.build(sub);
      results.push({
        id: `${sub.id}-${entry.kind}`,
        kind: entry.kind,
        serviceName: sub.name,
        logoUrl: sub.logo_url ?? resolvePlatformLogoUrl(sub.name),
        brandColor: entry.brandColor,
        ...built,
      });
    }
  }

  return results;
}
