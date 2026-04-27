// Derive personalised savings suggestions from the user's real subscriptions.
//
// Two kinds of suggestion:
//   · 'share'  — the service offers a family/duo/team plan that splits
//                 the cost and the user's subscription is NOT already shared.
//   · 'annual' — the user pays monthly but the service is known to offer
//                 annual billing at a discount.
//
// Every entry in SAVINGS_CATALOG comes from one of two helpers
// (buildShareEntry / buildAnnualEntry) so adding a new service is a
// single line. The matcher fuzzy-matches the user's `sub.name` against
// each entry's keys, so "Spotify Premium" still hits the "spotify" entry.

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

// ── Helpers ─────────────────────────────────────────────────────────

interface CatalogEntry {
  keys: string[];
  kind: SuggestionKind;
  brandColor: string;
  /** Official page used to verify pricing / plan details. */
  sourceUrl: string;
  /** ISO date (YYYY-MM-DD) when the entry was last checked against sourceUrl. */
  lastVerified: string;
  shouldShow: (sub: Subscription) => boolean;
  build: (sub: Subscription) => Omit<
    SavingsSuggestion,
    'id' | 'kind' | 'serviceName' | 'logoUrl' | 'brandColor'
  >;
}

function fmt(n: number, currency: string): string {
  const sym = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? 'US$' : currency;
  return `${n.toFixed(2).replace('.', ',')}${sym}`;
}

/** Build a "switch to a shared / family plan" suggestion. */
function share(params: {
  keys: string[];
  brandColor: string;
  /** Fraction of the monthly price that the user would pay as one
   *  member of the shared plan (0-1). 0.5 means "pay half". */
  ratio: number;
  /** Label for the suggested plan in the comparison table, e.g.
   *  "Plan familiar", "Compartir en familia". */
  planName: string;
  /** Human-friendly copy slot — "...al año con {planPhrase}." */
  planPhrase: string;
  note: string;
  sourceUrl: string;
  lastVerified: string;
}): CatalogEntry {
  return {
    keys: params.keys,
    kind: 'share',
    brandColor: params.brandColor,
    sourceUrl: params.sourceUrl,
    lastVerified: params.lastVerified,
    shouldShow: (s) => !s.is_shared,
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const perPerson = monthly * params.ratio;
      const savingsM = monthly - perPerson;
      const savingsY = savingsM * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
        listAmount: fmt(savingsY, c),
        listCopyAfter: ` al a\u00F1o con ${params.planPhrase}.`,
        currentPlanLabel: 'Plan individual',
        monthlySavings: `Ahorra ~${fmt(savingsM, c)}/mes`,
        yearlySavings: `${fmt(savingsY, c)}/a\u00F1o en tu bolsillo`,
        compareCurrentLabel: 'Plan individual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: `${params.planName} (por persona)`,
        compareSuggestedPrice: `~${fmt(perPerson, c)}/mes`,
        note: params.note,
      };
    },
  };
}

/** Build a "switch to annual billing" suggestion. */
function annual(params: {
  keys: string[];
  brandColor: string;
  /** Monthly-equivalent of the annual plan as a fraction of the
   *  current monthly price (0-1). 0.83 ≈ "2 months free". */
  ratio: number;
  note: string;
  sourceUrl: string;
  lastVerified: string;
}): CatalogEntry {
  return {
    keys: params.keys,
    kind: 'annual',
    brandColor: params.brandColor,
    sourceUrl: params.sourceUrl,
    lastVerified: params.lastVerified,
    shouldShow: (s) => s.billing_period === 'monthly',
    build: (s) => {
      const monthly = s.monthly_equivalent_cost;
      const annualM = monthly * params.ratio;
      const savingsM = monthly - annualM;
      const savingsY = savingsM * 12;
      const c = s.currency;
      return {
        listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
        listAmount: fmt(savingsY, c),
        listCopyAfter: ' al a\u00F1o pasando a facturaci\u00F3n anual.',
        currentPlanLabel: 'Plan mensual',
        monthlySavings: `Ahorra ~${fmt(savingsM, c)}/mes`,
        yearlySavings: `${fmt(savingsY, c)}/a\u00F1o en tu bolsillo`,
        compareCurrentLabel: 'Plan mensual',
        compareCurrentPrice: `${fmt(monthly, c)}/mes`,
        compareSuggestedLabel: 'Plan anual (equivalente mensual)',
        compareSuggestedPrice: `~${fmt(annualM, c)}/mes`,
        note: params.note,
      };
    },
  };
}

// ── Catalog ─────────────────────────────────────────────────────────

const SAVINGS_CATALOG: CatalogEntry[] = [
  // ─── Streaming ──────────────────────────────────────────
  // Netflix (ES): Estándar 14,99€, Premium 21,99€; miembro extra 6,99€.
  // Dividir Premium entre 2 hogares ≈ 0,55; entre 3 ≈ 0,44. Usamos 0,55.
  share({
    keys: ['netflix'],
    brandColor: '#E50914',
    ratio: 0.55,
    planName: 'Cuenta compartida con miembro extra',
    planPhrase: 'la funci\u00F3n de miembros extra de Netflix',
    note: 'Netflix permite a\u00F1adir miembros extra por 6,99\u20AC/mes (5,99\u20AC con anuncios). Comparte una cuenta Est\u00E1ndar o Premium con alguien de tu confianza para repartir el coste.',
    sourceUrl: 'https://help.netflix.com/es-es/node/24926',
    lastVerified: '2026-04-20',
  }),
  // Spotify (ES): Individual 11,99€, Duo 16,99€ (2 pers → 8,50€/pers ≈ 0,71),
  // Familiar 20,99€ (hasta 6 pers). 4 personas ≈ 5,25€/pers ≈ 0,44.
  share({
    keys: ['spotify'],
    brandColor: '#1DB954',
    ratio: 0.45,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar o Duo de Spotify',
    note: 'Spotify Familiar (20,99\u20AC/mes, hasta 6 personas) o Duo (16,99\u20AC/mes, 2 personas) baja el coste por persona. Todos deben vivir en la misma direcci\u00F3n.',
    sourceUrl: 'https://www.spotify.com/es/premium/',
    lastVerified: '2026-04-20',
  }),
  // Apple TV+ (ES): 9,99€/mes. Compartir en familia GRATIS con hasta 5 personas
  // (6 total). Realista con 4 personas: ratio ≈ 0,25.
  share({
    keys: ['apple tv', 'apple tv+', 'appletv'],
    brandColor: '#000000',
    ratio: 0.25,
    planName: 'Compartir en familia',
    planPhrase: 'Compartir en familia de Apple',
    note: 'Compartir en familia permite incluir Apple TV+ para hasta 5 personas adicionales sin coste extra. Act\u00EDvalo desde Ajustes \u203A Tu nombre \u203A Familia.',
    sourceUrl: 'https://tv.apple.com/es',
    lastVerified: '2026-04-20',
  }),
  // Disney+ (ES): Estándar 10,99€/mes → 109,9€/año (ratio 0,833).
  // Premium 15,99€/mes → 159,9€/año (ratio 0,833).
  annual({
    keys: ['disney', 'disney+', 'disneyplus', 'disney plus'],
    brandColor: '#113CCF',
    ratio: 0.83,
    note: 'Disney+ ofrece plan anual con ahorro equivalente a unos dos meses gratis al a\u00F1o. Est\u00E1ndar: 109,9\u20AC/a\u00F1o vs 10,99\u20AC/mes. Premium: 159,9\u20AC/a\u00F1o vs 15,99\u20AC/mes.',
    sourceUrl: 'https://help.disneyplus.com/es/article/disneyplus-price',
    lastVerified: '2026-04-20',
  }),
  // Max (ES): Estándar 10,99€/mes → 109€/año. Premium 15,99€/mes → 159€/año.
  // Ambos ratio ≈ 0,83.
  annual({
    keys: ['hbo', 'hbo max', 'max'],
    brandColor: '#5822B4',
    ratio: 0.83,
    note: 'Max ofrece plan anual con ahorro de ~2 meses. Est\u00E1ndar: 109\u20AC/a\u00F1o vs 10,99\u20AC/mes. Premium: 159\u20AC/a\u00F1o vs 15,99\u20AC/mes.',
    sourceUrl: 'https://help.hbomax.com/es-es/answer/detail/000002547',
    lastVerified: '2026-04-20',
  }),
  // YouTube Premium (ES): Individual 13,99€/mes, Familiar 25,99€/mes (hasta
  // 6 pers del mismo hogar → 4,33€/pers, ratio ≈ 0,31). Realista 4 pers ≈ 0,46.
  share({
    keys: ['youtube', 'youtube premium', 'yt premium'],
    brandColor: '#FF0000',
    ratio: 0.4,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de YouTube Premium',
    note: 'YouTube Premium Familiar (25,99\u20AC/mes) admite hasta 5 miembros adicionales. Todos deben vivir en la misma direcci\u00F3n (Google lo verifica).',
    sourceUrl: 'https://www.youtube.com/premium',
    lastVerified: '2026-04-20',
  }),
  // Prime Video (ES): 4,99€/mes o 49,90€/año (ratio 0,833). Amazon Household
  // permite compartir con 1 adulto del hogar (share 0,5).
  annual({
    keys: ['prime video', 'amazon prime video', 'amazon prime'],
    brandColor: '#00A8E1',
    ratio: 0.83,
    note: 'Amazon Prime ofrece pago anual (49,90\u20AC con anuncios, 69,80\u20AC sin) frente al mensual (4,99\u20AC/6,98\u20AC). Ahorras unos 2 meses al a\u00F1o.',
    sourceUrl: 'https://www.amazon.es/amazonprime',
    lastVerified: '2026-04-20',
  }),
  share({
    keys: ['prime video', 'amazon prime video', 'amazon prime'],
    brandColor: '#00A8E1',
    ratio: 0.5,
    planName: 'Amazon Household',
    planPhrase: 'Amazon Household para compartir con el hogar',
    note: 'Amazon Household permite compartir las ventajas de Prime (incluido Prime Video) con otra persona adulta de tu hogar sin coste extra.',
    sourceUrl: 'https://www.amazon.es/amazonprime',
    lastVerified: '2026-04-20',
  }),
  // Crunchyroll (ES): Fan 5,99€/mes → 47,99€/año (ratio 0,67).
  // Mega Fan 7,49€/mes → 59,99€/año (ratio 0,67). Mejor como ANUAL.
  annual({
    keys: ['crunchyroll'],
    brandColor: '#F47521',
    ratio: 0.67,
    note: 'Crunchyroll ofrece plan anual con ~33% de descuento. Fan: 47,99\u20AC/a\u00F1o vs 5,99\u20AC/mes. Mega Fan: 59,99\u20AC/a\u00F1o vs 7,49\u20AC/mes.',
    sourceUrl: 'https://www.crunchyroll.com/es/premium',
    lastVerified: '2026-04-20',
  }),
  // DAZN (ES): precios varían por plan. Premium mensual 44,99€,
  // pago único anual 384,99€ (= 32,08€/mes, ratio 0,71). Otros planes
  // descuentos similares. Usamos 0,75 como aproximación conservadora.
  annual({
    keys: ['dazn'],
    brandColor: '#F8F800',
    ratio: 0.75,
    note: 'DAZN aplica descuento al contratar el plan anual por adelantado frente al mensual sin permanencia. El ahorro var\u00EDa seg\u00FAn el plan (F\u00FAtbol, Baloncesto, Premium\u2026). Consulta dazn.com.',
    sourceUrl: 'https://www.dazn.com/es-ES/home',
    lastVerified: '2026-04-20',
  }),
  // Filmin (ES): mensual 9,99€, anual 99€ (= 8,25€/mes, ratio 0,83).
  annual({
    keys: ['filmin'],
    brandColor: '#FFC600',
    ratio: 0.83,
    note: 'Filmin tiene plan anual a 99\u20AC frente al mensual de 9,99\u20AC. Ahorras unos 20\u20AC al a\u00F1o.',
    sourceUrl: 'https://www.filmin.es/suscribete',
    lastVerified: '2026-04-20',
  }),
  // Movistar Plus+ (ES): mensual 9,99€, anual 99,9€ (ratio 0,833).
  annual({
    keys: ['movistar', 'movistar plus', 'movistar+'],
    brandColor: '#019DF4',
    ratio: 0.83,
    note: 'Movistar Plus+ ofrece plan anual a 99,9\u20AC (ahorro ~17%) frente al mensual de 9,99\u20AC. Sin permanencia.',
    sourceUrl: 'https://www.movistarplus.es',
    lastVerified: '2026-04-20',
  }),

  // ─── Music ──────────────────────────────────────────────
  // Apple Music (ES): Individual 10,99€, Familiar 16,99€ (6 pers →
  // 2,83€/pers, ratio 0,26). Con 4 pers ≈ 0,39.
  share({
    keys: ['apple music'],
    brandColor: '#FA243C',
    ratio: 0.3,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Apple Music',
    note: 'Apple Music Familiar (16,99\u20AC/mes) admite hasta 6 personas con biblioteca individual. Act\u00EDvalo desde Ajustes \u203A Tu nombre \u203A Familia.',
    sourceUrl: 'https://www.apple.com/es/apple-music/',
    lastVerified: '2026-04-20',
  }),
  // Tidal: Individual 10,99€/mes (ES), Family ~17$/mes (hasta 6 pers).
  share({
    keys: ['tidal'],
    brandColor: '#000000',
    ratio: 0.3,
    planName: 'Plan Familia',
    planPhrase: 'el plan Familia de Tidal',
    note: 'Tidal Familia admite hasta 6 cuentas. Con 4 personas el coste baja a aprox. 3\u20AC/mes cada una. Precios pueden variar por pa\u00EDs.',
    sourceUrl: 'https://tidal.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Deezer (ES): Individual 10,99€/mes, Familia 17,99€/mes (hasta 6 pers →
  // 3€/pers, ratio 0,27).
  share({
    keys: ['deezer'],
    brandColor: '#A238FF',
    ratio: 0.3,
    planName: 'Plan Familia',
    planPhrase: 'el plan Familia de Deezer',
    note: 'Deezer Familia (17,99\u20AC/mes) admite hasta 6 perfiles individuales. A plena capacidad el coste baja a ~3\u20AC/mes por persona.',
    sourceUrl: 'https://www.deezer.com/es/offers',
    lastVerified: '2026-04-20',
  }),
  // Amazon Music Unlimited (ES): Individual 12,99€, Familiar 22,99€ (6 pers →
  // 3,83€/pers, ratio 0,30).
  share({
    keys: ['amazon music', 'amazon music unlimited'],
    brandColor: '#00A8E1',
    ratio: 0.3,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Amazon Music Unlimited',
    note: 'Amazon Music Unlimited Familiar (22,99\u20AC/mes, 230\u20AC/a\u00F1o) admite hasta 6 cuentas del hogar con bibliotecas propias.',
    sourceUrl: 'https://www.amazon.es/music/unlimited/family',
    lastVerified: '2026-04-20',
  }),

  // ─── Cloud ──────────────────────────────────────────────
  // iCloud+ (ES): 50GB 0,99€, 200GB 2,99€, 2TB 9,99€. Compartir en familia
  // es GRATIS (hasta 6 personas). Realista: 3 pers → ratio ≈ 0,33.
  share({
    keys: ['icloud', 'icloud+'],
    brandColor: '#3478F6',
    ratio: 0.33,
    planName: 'Compartir en familia',
    planPhrase: 'Compartir en familia en iCloud+',
    note: 'Compartir en familia reparte el coste del plan entre hasta 6 personas sin coste extra. Cada miembro mantiene su espacio privado. Act\u00EDvalo desde Ajustes \u203A Tu nombre \u203A Familia.',
    sourceUrl: 'https://support.apple.com/es-es/108047',
    lastVerified: '2026-04-20',
  }),
  // Google One (ES): 100GB 1,99€, 200GB 2,99€, 2TB 9,99€. Compartir con
  // hasta 5 personas GRATIS. Realista 3-4 pers: ratio ≈ 0,25-0,33.
  share({
    keys: ['google one'],
    brandColor: '#1A73E8',
    ratio: 0.25,
    planName: 'Grupo familiar',
    planPhrase: 'Google One compartido con tu familia',
    note: 'Cualquier plan de Google One (100GB 1,99\u20AC, 200GB 2,99\u20AC, 2TB 9,99\u20AC) se puede compartir con hasta 5 personas sin coste extra. Act\u00EDvalo desde one.google.com \u203A Ajustes \u203A Compartir.',
    sourceUrl: 'https://one.google.com/about/plans',
    lastVerified: '2026-04-20',
  }),
  // Dropbox: Plus $11.99/mes anual, Family $19.99/mes para 6 pers → 3,33€/pers.
  // Ratio ≈ 0,28.
  share({
    keys: ['dropbox'],
    brandColor: '#0061FF',
    ratio: 0.3,
    planName: 'Plan Familia',
    planPhrase: 'el plan Familia de Dropbox',
    note: 'Dropbox Familia incluye hasta 6 personas con 2 TB compartidos y carpetas privadas para cada miembro.',
    sourceUrl: 'https://www.dropbox.com/family',
    lastVerified: '2026-04-20',
  }),

  // ─── Productivity ───────────────────────────────────────
  // Microsoft 365 Familia: 99€/año para hasta 6 personas, 1TB cada una.
  // Personal ~70€/año. Compartido entre 4 pers: ratio ≈ 0,35. Entre 6: 0,24.
  share({
    keys: ['microsoft 365', 'office 365', 'ms 365'],
    brandColor: '#D83B01',
    ratio: 0.3,
    planName: 'Plan Familia',
    planPhrase: 'Microsoft 365 Familia',
    note: 'Microsoft 365 Familia (99\u20AC/a\u00F1o) incluye hasta 6 personas, cada una con 1 TB de OneDrive y las apps completas de Office.',
    sourceUrl: 'https://www.microsoft.com/es-es/microsoft-365/buy/microsoft-365-family',
    lastVerified: '2026-04-20',
  }),
  // 1Password: Individual $3.99/mes anual, Family $5.99/mes anual para hasta
  // 5 pers → $1.20/pers. Ratio = 1.20/3.99 ≈ 0,30.
  share({
    keys: ['1password'],
    brandColor: '#0572EC',
    ratio: 0.3,
    planName: 'Plan Familias',
    planPhrase: 'el plan Familias de 1Password',
    note: '1Password Familias ($5.99/mes facturaci\u00F3n anual) admite hasta 5 personas con b\u00F3vedas privadas y compartidas.',
    sourceUrl: 'https://1password.com/pricing',
    lastVerified: '2026-04-20',
  }),

  // ─── Gaming ─────────────────────────────────────────────
  // Nintendo Switch Online (ES): Individual 19,99€/año, Familiar 34,99€/año
  // hasta 8 cuentas (4,37€/pers = ratio 0,22). Realista 4-5 pers: ratio ~0,35.
  share({
    keys: ['nintendo switch online', 'nintendo online'],
    brandColor: '#E60012',
    ratio: 0.35,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Nintendo Switch Online',
    note: 'Nintendo Switch Online Familiar (34,99\u20AC/a\u00F1o) admite hasta 8 cuentas Nintendo del mismo grupo familiar. Por 4-5 personas, baja a ~7\u20AC/a\u00F1o por cada una.',
    sourceUrl: 'https://www.nintendo.com/es-es/Nintendo-Switch-Online/Opciones-de-suscripcion/Opciones-de-suscripcion-1374627.html',
    lastVerified: '2026-04-20',
  }),
  // PS Plus (ES): Essential 8,99€/mes vs 71,99€/año (ratio 0,67). Extra
  // 13,99€/mes vs 125,99€/año (ratio 0,75). Premium 13,99€/mes vs 151,99€/año
  // (ratio 0,91). Usamos 0,67 como ahorro tipo en Essential.
  annual({
    keys: ['playstation plus', 'ps plus', 'ps+'],
    brandColor: '#003791',
    ratio: 0.67,
    note: 'PS Plus tiene plan anual con descuento vs mensual. Essential: 71,99\u20AC/a\u00F1o vs 8,99\u20AC/mes (ahorro ~33%). Extra: 125,99\u20AC/a\u00F1o vs 13,99\u20AC/mes.',
    sourceUrl: 'https://www.playstation.com/es-es/ps-plus/',
    lastVerified: '2026-04-20',
  }),
  // Xbox Game Pass Amigos y Familia: ELIMINADO — el plan se canceló
  // globalmente en agosto 2024 y no ha vuelto. Solo quedan Core/Standard/
  // Ultimate sin opción familiar oficial en España.

  // ─── AI ─────────────────────────────────────────────────
  // ChatGPT Plus: ELIMINADO — a abril 2026 OpenAI NO ofrece facturaci\u00F3n
  // anual para Plus/Go/Pro. Solo mensual. No hay ahorro que sugerir.
  //
  // Claude Pro: $20/mes mensual vs $200/a\u00F1o ($16,67/mes), ratio 0,83.
  annual({
    keys: ['claude', 'claude pro'],
    brandColor: '#CC9A5B',
    ratio: 0.83,
    note: 'Claude Pro tiene plan anual ($200/a\u00F1o, ~$16,67/mes) con ~17% de descuento frente al mensual ($20/mes).',
    sourceUrl: 'https://claude.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Perplexity Pro: $20/mes mensual vs $200/a\u00F1o, ratio 0,83.
  annual({
    keys: ['perplexity', 'perplexity pro'],
    brandColor: '#20808D',
    ratio: 0.83,
    note: 'Perplexity Pro tiene plan anual ($200/a\u00F1o) con ~17% de descuento frente al mensual ($20/mes).',
    sourceUrl: 'https://www.perplexity.ai/pro',
    lastVerified: '2026-04-20',
  }),
  // Google AI Pro / Gemini Advanced: suele aplicar descuento anual similar.
  annual({
    keys: ['gemini', 'gemini advanced', 'google ai pro', 'google ai premium'],
    brandColor: '#1A73E8',
    ratio: 0.83,
    note: 'Google AI Pro / Gemini Advanced suele ofrecer descuento al contratar el plan anual. Consulta la p\u00E1gina de precios actualizada.',
    sourceUrl: 'https://one.google.com/about/google-ai-plans',
    lastVerified: '2026-04-20',
  }),
  // Midjourney: 20% de descuento oficial al pasar a anual.
  annual({
    keys: ['midjourney'],
    brandColor: '#000000',
    ratio: 0.8,
    note: 'Midjourney aplica un 20% de descuento en todos los planes al pagar anualmente (equivale a >2 meses gratis al a\u00F1o).',
    sourceUrl: 'https://www.midjourney.com/account',
    lastVerified: '2026-04-20',
  }),
  // Cursor: plan Pro suele ofrecer descuento al anual.
  annual({
    keys: ['cursor'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'Cursor Pro suele ofrecer ~17% de descuento en la facturaci\u00F3n anual frente al plan mensual. Revisa cursor.com/pricing.',
    sourceUrl: 'https://cursor.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // GitHub Copilot / Pro: descuento al anual.
  annual({
    keys: ['github', 'github copilot', 'copilot'],
    brandColor: '#181717',
    ratio: 0.83,
    note: 'GitHub Copilot Pro y GitHub Pro ofrecen descuento al pasar a facturaci\u00F3n anual. Consulta github.com/pricing.',
    sourceUrl: 'https://github.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // ─── SaaS / Productivity Annual ─────────────────────────
  // Notion Plus: $10/mes anual vs $12/mes mensual = ratio 0,83 (17% off).
  annual({
    keys: ['notion'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'Notion aplica ~17% de descuento al pasar a facturaci\u00F3n anual en los planes Plus y Business ($10/mes anual vs $12/mes mensual en Plus).',
    sourceUrl: 'https://www.notion.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Figma Professional: $12/mes anual vs $15/mes mensual = ratio 0,8 (20% off).
  annual({
    keys: ['figma'],
    brandColor: '#F24E1E',
    ratio: 0.8,
    note: 'Figma Professional cuesta $12/mes en facturaci\u00F3n anual frente a $15/mes en mensual (20% de ahorro).',
    sourceUrl: 'https://www.figma.com/pricing/',
    lastVerified: '2026-04-20',
  }),
  // Canva Pro: $120/año ($10/mes efectivo) vs $15/mes mensual = ratio 0,67.
  annual({
    keys: ['canva', 'canva pro'],
    brandColor: '#00C4CC',
    ratio: 0.67,
    note: 'Canva Pro cuesta $120/a\u00F1o ($10/mes efectivo) frente a $15/mes mensual: ahorras ~$60 al a\u00F1o.',
    sourceUrl: 'https://www.canva.com/pricing/',
    lastVerified: '2026-04-20',
  }),
  // Grammarly Premium: el plan anual suele ser ~40% m\u00E1s barato por mes.
  annual({
    keys: ['grammarly'],
    brandColor: '#15C39A',
    ratio: 0.6,
    note: 'Grammarly Premium anual suele aplicar ~40% de descuento frente al plan mensual. Revisa grammarly.com/plans.',
    sourceUrl: 'https://www.grammarly.com/plans',
    lastVerified: '2026-04-20',
  }),
  // Evernote: descuento habitual ~17% al pasar a anual.
  annual({
    keys: ['evernote'],
    brandColor: '#00A82D',
    ratio: 0.83,
    note: 'Evernote ofrece ~17% de descuento al pagar por adelantado el plan anual. Consulta evernote.com/pricing.',
    sourceUrl: 'https://evernote.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Todoist Pro: descuento al anual.
  annual({
    keys: ['todoist'],
    brandColor: '#E44332',
    ratio: 0.83,
    note: 'Todoist Pro ofrece descuento al pagar el plan anual por adelantado (equivalente a ~2 meses gratis).',
    sourceUrl: 'https://todoist.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Zoom Pro: descuento al anual.
  annual({
    keys: ['zoom'],
    brandColor: '#2D8CFF',
    ratio: 0.83,
    note: 'Los planes de pago de Zoom aplican ~17% de descuento al pasar a facturaci\u00F3n anual. Revisa zoom.us/pricing.',
    sourceUrl: 'https://zoom.us/pricing',
    lastVerified: '2026-04-20',
  }),
  // Slack: descuento al anual.
  annual({
    keys: ['slack'],
    brandColor: '#611F69',
    ratio: 0.83,
    note: 'Slack aplica ~17% de descuento al pasar a facturaci\u00F3n anual en Pro y Business+. Consulta slack.com/pricing.',
    sourceUrl: 'https://slack.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Linear: descuento al anual.
  annual({
    keys: ['linear'],
    brandColor: '#5E6AD2',
    ratio: 0.83,
    note: 'Linear ofrece descuento al pasar a facturaci\u00F3n anual (~17% frente al mensual). Consulta linear.app/pricing.',
    sourceUrl: 'https://linear.app/pricing',
    lastVerified: '2026-04-20',
  }),
  // Adobe Creative Cloud: plan anual con pago por adelantado ~17-20% m\u00E1s
  // barato que el mensual sin permanencia. El 44% del primer a\u00F1o es
  // promoci\u00F3n nueva-alta, no aplicable en renovaci\u00F3n.
  annual({
    keys: ['adobe', 'adobe creative cloud', 'adobe cc', 'photoshop', 'lightroom', 'illustrator', 'premiere'],
    brandColor: '#DA1F26',
    ratio: 0.8,
    note: 'Adobe ofrece descuento al contratar el plan anual con pago por adelantado frente al mensual sin permanencia. Revisa adobe.com/es/creativecloud/plans.html.',
    sourceUrl: 'https://www.adobe.com/es/creativecloud/plans.html',
    lastVerified: '2026-04-20',
  }),

  // ─── VPN / Privacy ──────────────────────────────────────
  // NordVPN: plan 2 a\u00F1os $3.39/mes vs $12.99/mes mensual = ratio 0,26.
  annual({
    keys: ['nordvpn'],
    brandColor: '#4687FF',
    ratio: 0.3,
    note: 'NordVPN ofrece hasta un 70% de descuento en los planes de 2 a\u00F1os ($3.39/mes vs $12.99/mes mensual).',
    sourceUrl: 'https://nordvpn.com/pricing/',
    lastVerified: '2026-04-20',
  }),
  // ExpressVPN: plan 12m aproximadamente 50% off frente al mensual.
  annual({
    keys: ['expressvpn'],
    brandColor: '#DA3940',
    ratio: 0.5,
    note: 'ExpressVPN aplica descuentos importantes en los planes de 12 o 24 meses frente al mensual. Consulta expressvpn.com.',
    sourceUrl: 'https://www.expressvpn.com/order',
    lastVerified: '2026-04-20',
  }),
  // Surfshark: plan 2 a\u00F1os ~70% off frente al mensual.
  annual({
    keys: ['surfshark'],
    brandColor: '#1EBFBF',
    ratio: 0.3,
    note: 'Surfshark tiene descuentos de hasta el 70% en planes de 12 o 24 meses frente a la facturaci\u00F3n mensual.',
    sourceUrl: 'https://surfshark.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // Proton Unlimited: $7.99/mes 2 a\u00F1os vs $12.99/mes mensual = ratio 0,62.
  annual({
    keys: ['proton', 'protonvpn', 'proton vpn', 'proton mail', 'protonmail'],
    brandColor: '#6D4AFF',
    ratio: 0.62,
    note: 'Proton Unlimited ofrece ~40% de descuento en el plan de 2 a\u00F1os ($7.99/mes) frente al mensual ($12.99/mes). Aplica tambi\u00E9n a Proton VPN y Mail.',
    sourceUrl: 'https://proton.me/pricing',
    lastVerified: '2026-04-20',
  }),

  // ─── Health / Fitness / Learning ───────────────────────
  // Calm Premium: $69.99/a\u00F1o vs $14.99/mes = ratio 0,39.
  annual({
    keys: ['calm'],
    brandColor: '#2B6EF6',
    ratio: 0.39,
    note: 'Calm Premium cuesta $69.99/a\u00F1o frente a $14.99/mes mensual: ahorras ~60% pas\u00E1ndote a anual.',
    sourceUrl: 'https://www.calm.com/subscribe',
    lastVerified: '2026-04-20',
  }),
  // Headspace: $69.99/a\u00F1o vs $12.99/mes = ratio 0,45.
  annual({
    keys: ['headspace'],
    brandColor: '#F47D31',
    ratio: 0.45,
    note: 'Headspace cuesta $69.99/a\u00F1o frente a $12.99/mes mensual: ahorras ~55% con el plan anual.',
    sourceUrl: 'https://www.headspace.com/subscriptions',
    lastVerified: '2026-04-20',
  }),
  // Strava Premium: $79.99/a\u00F1o vs $11.99/mes = ratio 0,56.
  annual({
    keys: ['strava'],
    brandColor: '#FC4C02',
    ratio: 0.56,
    note: 'Strava Premium cuesta $79.99/a\u00F1o frente a $11.99/mes mensual: ahorras ~44% con el plan anual.',
    sourceUrl: 'https://www.strava.com/pricing',
    lastVerified: '2026-04-20',
  }),
  // MyFitnessPal Premium: descuento t\u00EDpico ~50% en el plan anual.
  annual({
    keys: ['myfitnesspal'],
    brandColor: '#0072CE',
    ratio: 0.5,
    note: 'MyFitnessPal Premium aplica ~50% de descuento en la facturaci\u00F3n anual frente al mensual.',
    sourceUrl: 'https://www.myfitnesspal.com/premium',
    lastVerified: '2026-04-20',
  }),
  // Super Duolingo: anual $6.99/mes efectivo vs $12.99/mes mensual = ratio 0,54.
  annual({
    keys: ['duolingo', 'duolingo super', 'super duolingo'],
    brandColor: '#58CC02',
    ratio: 0.54,
    note: 'Super Duolingo cuesta ~$6.99/mes en el plan anual ($84/a\u00F1o) frente a $12.99/mes mensual: ahorras ~46%.',
    sourceUrl: 'https://www.duolingo.com/super',
    lastVerified: '2026-04-20',
  }),
  // Babbel: plan 12 meses habitualmente ~50-60% m\u00E1s barato que mensual.
  annual({
    keys: ['babbel'],
    brandColor: '#FF6A00',
    ratio: 0.5,
    note: 'Babbel aplica descuentos importantes en los planes de 6 y 12 meses frente a la facturaci\u00F3n mensual.',
    sourceUrl: 'https://www.babbel.com/prices',
    lastVerified: '2026-04-20',
  }),

  // ─── News / Reading ─────────────────────────────────────
  // NYT: anual habitualmente ~40-50% m\u00E1s barato por mes.
  annual({
    keys: ['new york times', 'nyt'],
    brandColor: '#000000',
    ratio: 0.6,
    note: 'The New York Times aplica descuentos importantes en la suscripci\u00F3n anual frente a la mensual (m\u00E1s a\u00FAn con la oferta de primer a\u00F1o).',
    sourceUrl: 'https://www.nytimes.com/subscription',
    lastVerified: '2026-04-20',
  }),
  // Audible Premium Plus: anual ~20% m\u00E1s barato que mensual en EE.UU.
  annual({
    keys: ['audible'],
    brandColor: '#F7971E',
    ratio: 0.8,
    note: 'Audible Premium Plus ofrece descuento al pagar 12 meses por adelantado frente a la membres\u00EDa mensual.',
    sourceUrl: 'https://www.audible.com/ep/annual-offer',
    lastVerified: '2026-04-20',
  }),
  // Kindle Unlimited: ELIMINADO \u2014 no es compartible con Household (solo
  // libros comprados, no la suscripci\u00F3n KU). No hay plan anual oficial
  // con descuento consistente en ES. Evitamos sugerencia enga\u00F1osa.

  // ═══════════════════════════════════════════════════════════════════
  // Servicios adicionales: ratios basados en descuentos t\u00EDpicos del
  // sector + sourceUrl oficial para auditar precios exactos.
  // ═══════════════════════════════════════════════════════════════════

  // ─── Streaming adicional ────────────────────────────────
  annual({
    keys: ['skyshowtime'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'SkyShowtime suele ofrecer plan anual con ~2 meses gratis frente al mensual. En Espa\u00F1a sustituye al cat\u00E1logo que en otros mercados cubre Paramount+. Consulta skyshowtime.com.',
    sourceUrl: 'https://www.skyshowtime.com/es',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['mubi'],
    brandColor: '#000000',
    ratio: 0.67,
    note: 'MUBI ofrece descuento significativo al pasar a facturaci\u00F3n anual frente al mensual (~33% de ahorro).',
    sourceUrl: 'https://mubi.com/subscribe',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['atresplayer', 'atres player'],
    brandColor: '#FF6600',
    ratio: 0.83,
    note: 'Atresplayer Premium ofrece plan anual con descuento frente al mensual. Revisa atresplayer.com.',
    sourceUrl: 'https://www.atresplayer.com/premium/',
    lastVerified: '2026-04-20',
  }),
  share({
    keys: ['apple arcade'],
    brandColor: '#000000',
    ratio: 0.2,
    planName: 'Compartir en familia',
    planPhrase: 'Compartir en familia de Apple',
    note: 'Apple Arcade se incluye en Compartir en familia (hasta 6 personas) sin coste extra. Act\u00EDvalo desde Ajustes \u203A Familia.',
    sourceUrl: 'https://www.apple.com/es/apple-arcade/',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['eurosport'],
    brandColor: '#FFED00',
    ratio: 0.6,
    note: 'Eurosport / discovery+ suele aplicar ~40% de descuento en el plan anual frente al mensual.',
    sourceUrl: 'https://www.eurosport.es/',
    lastVerified: '2026-04-20',
  }),

  // ─── Cloud / Backup adicional ───────────────────────────
  annual({
    keys: ['backblaze'],
    brandColor: '#E8332A',
    ratio: 0.83,
    note: 'Backblaze Personal Backup ofrece planes anuales y bianuales con descuento frente al mensual. Revisa backblaze.com/pricing.',
    sourceUrl: 'https://www.backblaze.com/cloud-backup/personal',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['pcloud'],
    brandColor: '#20B7FF',
    ratio: 0.5,
    note: 'pCloud tiene descuentos de hasta el 50% en planes anuales (o bianuales / lifetime) frente al mensual.',
    sourceUrl: 'https://www.pcloud.com/eu/cloud-storage-pricing-plans.html',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['mega', 'mega.nz'],
    brandColor: '#D9272E',
    ratio: 0.83,
    note: 'MEGA Pro ofrece descuento en el plan anual frente al mensual. Consulta mega.io/pricing.',
    sourceUrl: 'https://mega.io/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['box personal', 'box cloud', 'box.com'],
    brandColor: '#0061D5',
    ratio: 0.83,
    note: 'Box Personal Pro aplica descuento al pasar a facturaci\u00F3n anual. Consulta box.com/pricing.',
    sourceUrl: 'https://www.box.com/pricing/individual',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['sync.com', 'sync cloud'],
    brandColor: '#0075C9',
    ratio: 0.75,
    note: 'Sync.com ofrece descuento al pasar al plan anual en sus planes Solo y Teams.',
    sourceUrl: 'https://www.sync.com/pricing/personal/',
    lastVerified: '2026-04-20',
  }),

  // ─── SaaS / Collaboration adicional ─────────────────────
  annual({
    keys: ['miro'],
    brandColor: '#FFD02F',
    ratio: 0.83,
    note: 'Miro aplica ~17% de descuento al pagar anualmente en los planes Starter y Business.',
    sourceUrl: 'https://miro.com/pricing/',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['airtable'],
    brandColor: '#FCB400',
    ratio: 0.83,
    note: 'Airtable aplica descuento de ~17% al pasar a facturaci\u00F3n anual en los planes Team y Business.',
    sourceUrl: 'https://www.airtable.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['asana'],
    brandColor: '#F06A6A',
    ratio: 0.83,
    note: 'Asana ofrece ~17% de descuento al pagar anualmente los planes Starter y Advanced.',
    sourceUrl: 'https://asana.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['monday', 'monday.com'],
    brandColor: '#FF3D57',
    ratio: 0.82,
    note: 'monday.com ofrece ~18% de descuento en la facturaci\u00F3n anual frente al mensual.',
    sourceUrl: 'https://monday.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['clickup'],
    brandColor: '#7B68EE',
    ratio: 0.8,
    note: 'ClickUp aplica ~20% de descuento al pagar el plan anual por adelantado.',
    sourceUrl: 'https://clickup.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['trello'],
    brandColor: '#0079BF',
    ratio: 0.83,
    note: 'Trello Premium / Standard ofrecen ~17% de descuento en el plan anual.',
    sourceUrl: 'https://trello.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['calendly'],
    brandColor: '#006BFF',
    ratio: 0.8,
    note: 'Calendly aplica ~20% de descuento al pasar a facturaci\u00F3n anual en los planes de pago.',
    sourceUrl: 'https://calendly.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['lucidchart', 'lucidspark'],
    brandColor: '#F47E21',
    ratio: 0.83,
    note: 'Lucidchart y Lucidspark ofrecen descuento al pasar a facturaci\u00F3n anual.',
    sourceUrl: 'https://lucid.co/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['webflow'],
    brandColor: '#4353FF',
    ratio: 0.83,
    note: 'Webflow aplica ~17% de descuento al pasar a facturaci\u00F3n anual en sus planes de Site y Workspace.',
    sourceUrl: 'https://webflow.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['squarespace'],
    brandColor: '#000000',
    ratio: 0.75,
    note: 'Squarespace suele aplicar ~25% de descuento al contratar 12 meses por adelantado.',
    sourceUrl: 'https://www.squarespace.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['wix'],
    brandColor: '#0C6EFC',
    ratio: 0.83,
    note: 'Wix aplica descuento en los planes de 1 o 2 a\u00F1os frente a la facturaci\u00F3n mensual.',
    sourceUrl: 'https://www.wix.com/upgrade/website',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['framer'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'Framer aplica ~17% de descuento al pasar a facturaci\u00F3n anual en los planes de pago.',
    sourceUrl: 'https://www.framer.com/pricing/',
    lastVerified: '2026-04-20',
  }),

  // ─── Password managers adicional ────────────────────────
  share({
    keys: ['dashlane'],
    brandColor: '#007C89',
    ratio: 0.4,
    planName: 'Plan Friends & Family',
    planPhrase: 'el plan Friends & Family de Dashlane',
    note: 'Dashlane Friends & Family (~$7.49/mes anual) admite hasta 10 personas, con enorme ahorro por cabeza si lo compart\u00EDs.',
    sourceUrl: 'https://www.dashlane.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['bitwarden'],
    brandColor: '#175DDC',
    ratio: 0.83,
    note: 'Bitwarden Premium cuesta $10/a\u00F1o (~$0,83/mes). Si ya pagas el plan mensual equivalente, el anual es la opci\u00F3n m\u00E1s barata. La Family Organization cuesta $40/a\u00F1o para 6 personas.',
    sourceUrl: 'https://bitwarden.com/pricing/',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['nordpass'],
    brandColor: '#4687FF',
    ratio: 0.4,
    note: 'NordPass aplica descuentos de hasta el 60% en los planes de 1 o 2 a\u00F1os frente al mensual.',
    sourceUrl: 'https://nordpass.com/plans/',
    lastVerified: '2026-04-20',
  }),

  // ─── AI / Dev adicional ─────────────────────────────────
  annual({
    keys: ['jetbrains', 'intellij', 'pycharm', 'webstorm', 'datagrip', 'rider', 'goland', 'phpstorm'],
    brandColor: '#000000',
    ratio: 0.75,
    note: 'JetBrains aplica descuentos progresivos en renovaciones anuales (20% segundo a\u00F1o, 40% tercer a\u00F1o) frente al mensual. Usuarios individuales ahorran mucho pagando anualmente.',
    sourceUrl: 'https://www.jetbrains.com/store/',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['replit'],
    brandColor: '#F26207',
    ratio: 0.83,
    note: 'Replit Core ofrece descuento al pasar a facturaci\u00F3n anual frente al mensual.',
    sourceUrl: 'https://replit.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['raycast'],
    brandColor: '#FF6363',
    ratio: 0.83,
    note: 'Raycast Pro aplica ~17% de descuento al pasar a facturaci\u00F3n anual. Revisa raycast.com/pro.',
    sourceUrl: 'https://www.raycast.com/pro',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['warp'],
    brandColor: '#01A4FF',
    ratio: 0.83,
    note: 'Warp Pro ofrece descuento al pasar a facturaci\u00F3n anual frente al mensual.',
    sourceUrl: 'https://www.warp.dev/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['descript'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'Descript aplica ~17% de descuento al pasar a facturaci\u00F3n anual en sus planes Creator y Pro.',
    sourceUrl: 'https://www.descript.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['jasper', 'jasper ai'],
    brandColor: '#C6A0FA',
    ratio: 0.8,
    note: 'Jasper AI ofrece ~20% de descuento al pagar anualmente frente al mensual.',
    sourceUrl: 'https://www.jasper.ai/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['elevenlabs'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'ElevenLabs aplica ~17% de descuento al pasar a facturaci\u00F3n anual en sus planes de pago.',
    sourceUrl: 'https://elevenlabs.io/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['vercel'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'Vercel Pro / Enterprise aplican descuento al contratar anualmente frente al mensual.',
    sourceUrl: 'https://vercel.com/pricing',
    lastVerified: '2026-04-20',
  }),

  // ─── Email / Communication adicional ────────────────────
  annual({
    keys: ['superhuman'],
    brandColor: '#000000',
    ratio: 0.83,
    note: 'Superhuman ofrece ~17% de descuento al pagar anualmente frente al mensual ($30 vs $25/mes).',
    sourceUrl: 'https://superhuman.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['hey', 'hey email'],
    brandColor: '#5522FA',
    ratio: 0.83,
    note: 'HEY (37signals) factura de forma anual por defecto a un precio m\u00E1s favorable que cualquier opci\u00F3n mensual.',
    sourceUrl: 'https://www.hey.com/pricing',
    lastVerified: '2026-04-20',
  }),
  share({
    keys: ['discord nitro', 'discord'],
    brandColor: '#5865F2',
    ratio: 0.4,
    planName: 'Amigos en Server Boost',
    planPhrase: 'un server compartido con amigos para dividir el Boost',
    note: 'Si us\u00E1is Nitro solo por Server Boost, pod\u00E9is reparir costes entre varios miembros del servidor. Para uso individual, plan anual con ~17% de descuento.',
    sourceUrl: 'https://discord.com/nitro',
    lastVerified: '2026-04-20',
  }),

  // ─── Learning adicional ─────────────────────────────────
  annual({
    keys: ['masterclass'],
    brandColor: '#000000',
    ratio: 0.5,
    note: 'MasterClass solo se vende en plan anual: ~$10-20/mes efectivo frente a precios mensuales no disponibles oficialmente. Evita pasarelas intermedias.',
    sourceUrl: 'https://www.masterclass.com/pricing',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['skillshare'],
    brandColor: '#002333',
    ratio: 0.5,
    note: 'Skillshare Premium cobra anualmente a ~50% del equivalente mensual que cobra en algunos mercados.',
    sourceUrl: 'https://www.skillshare.com/en/membership',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['linkedin learning', 'linkedin premium'],
    brandColor: '#0A66C2',
    ratio: 0.67,
    note: 'LinkedIn Learning y LinkedIn Premium aplican ~33% de descuento al pagar el plan anual por adelantado.',
    sourceUrl: 'https://www.linkedin.com/premium/products',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['coursera', 'coursera plus'],
    brandColor: '#0056D2',
    ratio: 0.67,
    note: 'Coursera Plus ofrece descuento de ~33% en el plan anual ($399/a\u00F1o) frente al mensual ($59/mes).',
    sourceUrl: 'https://www.coursera.org/courseraplus',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['scribd', 'everand'],
    brandColor: '#1E7B85',
    ratio: 0.83,
    note: 'Everand (antes Scribd) suele ofrecer plan anual con ~17% de descuento frente al mensual.',
    sourceUrl: 'https://www.everand.com/subscription',
    lastVerified: '2026-04-20',
  }),
  share({
    keys: ['storytel'],
    brandColor: '#F7403A',
    ratio: 0.5,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Storytel',
    note: 'Storytel tiene plan Familiar con dos licencias. A dividir entre dos personas el coste por cabeza baja a la mitad.',
    sourceUrl: 'https://www.storytel.com/es/planes',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['brilliant'],
    brandColor: '#F68C45',
    ratio: 0.5,
    note: 'Brilliant Premium ofrece ~50% de descuento en el plan anual frente al mensual.',
    sourceUrl: 'https://brilliant.org/premium/',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['rosetta stone', 'rosettastone'],
    brandColor: '#F2CE1B',
    ratio: 0.5,
    note: 'Rosetta Stone aplica descuentos importantes en planes de 12 o 24 meses frente al mensual.',
    sourceUrl: 'https://www.rosettastone.com/pricing/',
    lastVerified: '2026-04-20',
  }),

  // ─── Health / Fitness adicional ─────────────────────────
  share({
    keys: ['apple fitness', 'apple fitness+'],
    brandColor: '#000000',
    ratio: 0.2,
    planName: 'Compartir en familia',
    planPhrase: 'Compartir en familia de Apple',
    note: 'Apple Fitness+ se incluye en Compartir en familia (hasta 6 personas) sin coste extra. Act\u00EDvalo desde Ajustes \u203A Familia.',
    sourceUrl: 'https://www.apple.com/es/apple-fitness-plus/',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['peloton app'],
    brandColor: '#181A1D',
    ratio: 0.83,
    note: 'Peloton App One/+ ofrece descuento al pasar a facturaci\u00F3n anual frente al mensual.',
    sourceUrl: 'https://www.onepeloton.com/app',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['fitbit premium'],
    brandColor: '#00B0B9',
    ratio: 0.5,
    note: 'Fitbit Premium aplica ~50% de descuento al pagar el plan anual ($79,99) frente al mensual ($9,99/mes).',
    sourceUrl: 'https://www.fitbit.com/global/us/technology/premium',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['noom'],
    brandColor: '#2FC5D2',
    ratio: 0.4,
    note: 'Noom aplica descuento notable al contratar el plan anual frente al mensual.',
    sourceUrl: 'https://www.noom.com/pricing/',
    lastVerified: '2026-04-20',
  }),

  // ─── Gaming adicional ───────────────────────────────────
  annual({
    keys: ['ea play'],
    brandColor: '#FF4747',
    ratio: 0.6,
    note: 'EA Play ofrece plan anual ($39.99/a\u00F1o) con ~40% de descuento frente al mensual ($5.99/mes).',
    sourceUrl: 'https://www.ea.com/ea-play/buy',
    lastVerified: '2026-04-20',
  }),
  annual({
    keys: ['ubisoft+', 'ubisoft plus'],
    brandColor: '#0071C3',
    ratio: 0.83,
    note: 'Ubisoft+ ofrece descuento al contratar el plan anual frente al mensual (Classics y Premium).',
    sourceUrl: 'https://www.ubisoft.com/es-es/ubisoftplus',
    lastVerified: '2026-04-20',
  }),
];

// ── Matcher ─────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().replace(/[+\u2122\u00AE]/g, '').trim();
}

function matches(subName: string, keys: string[]): boolean {
  const norm = normalise(subName);
  return keys.some((k) => norm.includes(k) || k.includes(norm));
}

// ── Public API ──────────────────────────────────────────────────────

export function deriveSavingsSuggestions(
  subscriptions: Subscription[],
): SavingsSuggestion[] {
  const active = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'trial',
  );
  const results: SavingsSuggestion[] = [];
  const seen = new Set<string>();

  for (const sub of active) {
    for (const entry of SAVINGS_CATALOG) {
      if (!matches(sub.name, entry.keys)) continue;
      if (!entry.shouldShow(sub)) continue;

      const dedupeKey = `${normalise(sub.name)}-${entry.kind}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      results.push({
        id: `${sub.id}-${entry.kind}`,
        kind: entry.kind,
        serviceName: sub.name,
        logoUrl: sub.logo_url ?? resolvePlatformLogoUrl(sub.name),
        brandColor: entry.brandColor,
        ...entry.build(sub),
      });
    }
  }

  return results;
}
