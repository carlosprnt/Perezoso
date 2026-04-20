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
}): CatalogEntry {
  return {
    keys: params.keys,
    kind: 'share',
    brandColor: params.brandColor,
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
}): CatalogEntry {
  return {
    keys: params.keys,
    kind: 'annual',
    brandColor: params.brandColor,
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
  share({
    keys: ['netflix'],
    brandColor: '#E50914',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'una cuenta compartida de Netflix',
    note: 'Netflix permite miembros extra en el mismo hogar. El coste por persona baja cuanto m\u00E1s miembros compartan.',
  }),
  share({
    keys: ['spotify'],
    brandColor: '#1DB954',
    ratio: 0.5,
    planName: 'Plan familiar',
    planPhrase: 'un plan familiar o duo de Spotify',
    note: 'Consulta en spotify.com las opciones de plan familiar o duo. El precio por persona depende del n\u00FAmero de miembros.',
  }),
  share({
    keys: ['apple tv', 'apple tv+', 'appletv'],
    brandColor: '#000000',
    ratio: 0.55,
    planName: 'Compartir en familia',
    planPhrase: 'Compartir en familia de Apple',
    note: 'Activa Compartir en familia desde los Ajustes del iPhone para repartir el coste con hasta 5 personas sin perder perfiles individuales.',
  }),
  share({
    keys: ['disney', 'disney+', 'disneyplus', 'disney plus'],
    brandColor: '#113CCF',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'tu cuenta compartida de Disney+',
    note: 'Disney+ permite hasta 4 perfiles y compartir con miembros del hogar.',
  }),
  share({
    keys: ['hbo', 'hbo max', 'max'],
    brandColor: '#5822B4',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'tu cuenta compartida de Max',
    note: 'Max permite perfiles m\u00FAltiples. Comparte con tu hogar para repartir el coste.',
  }),
  share({
    keys: ['youtube', 'youtube premium', 'yt premium'],
    brandColor: '#FF0000',
    ratio: 0.45,
    planName: 'Plan familiar',
    planPhrase: 'el plan familiar de YouTube Premium',
    note: 'El plan familiar de YouTube Premium permite hasta 5 miembros del hogar con cuentas individuales.',
  }),
  share({
    keys: ['prime video', 'amazon prime video', 'amazon prime'],
    brandColor: '#00A8E1',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'tu cuenta compartida de Prime Video',
    note: 'Prime Video permite compartir las ventajas de Amazon Prime con otra persona adulta del hogar mediante Amazon Household.',
  }),
  share({
    keys: ['paramount', 'paramount+', 'paramount plus'],
    brandColor: '#0064FF',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'tu cuenta compartida de Paramount+',
    note: 'Paramount+ permite varios perfiles y compartir con el hogar para repartir el coste.',
  }),
  share({
    keys: ['crunchyroll'],
    brandColor: '#F47521',
    ratio: 0.5,
    planName: 'Mega Fan / Ultimate Fan',
    planPhrase: 'el plan Mega Fan o Ultimate Fan de Crunchyroll',
    note: 'Los planes superiores de Crunchyroll permiten perfiles adicionales para reducir el coste por persona.',
  }),
  share({
    keys: ['dazn'],
    brandColor: '#F8F800',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'una cuenta compartida de DAZN',
    note: 'DAZN permite ver en varios dispositivos del hogar. Revisa las condiciones en dazn.com.',
  }),
  share({
    keys: ['filmin'],
    brandColor: '#FFC600',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'una cuenta compartida de Filmin',
    note: 'Filmin permite varios perfiles por cuenta. Comparte con el hogar para repartir el coste.',
  }),
  share({
    keys: ['movistar', 'movistar plus', 'movistar+'],
    brandColor: '#019DF4',
    ratio: 0.5,
    planName: 'Compartido',
    planPhrase: 'tu cuenta compartida de Movistar Plus+',
    note: 'Movistar Plus+ permite varios perfiles y dispositivos simult\u00E1neos. Com\u00E1rtalo con el hogar.',
  }),

  // ─── Music ──────────────────────────────────────────────
  share({
    keys: ['apple music'],
    brandColor: '#FA243C',
    ratio: 0.35,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Apple Music',
    note: 'El plan Familiar de Apple Music incluye hasta 6 personas con cuentas individuales. Act\u00EDvalo con Compartir en familia.',
  }),
  share({
    keys: ['tidal'],
    brandColor: '#000000',
    ratio: 0.5,
    planName: 'Plan Familia',
    planPhrase: 'el plan Familia de Tidal',
    note: 'El plan Familia de Tidal admite hasta 6 cuentas. Consulta tidal.com/pricing.',
  }),
  share({
    keys: ['deezer'],
    brandColor: '#A238FF',
    ratio: 0.5,
    planName: 'Plan Familia',
    planPhrase: 'el plan Familia de Deezer',
    note: 'Deezer Familia permite hasta 6 perfiles individuales en la misma suscripci\u00F3n.',
  }),
  share({
    keys: ['amazon music', 'amazon music unlimited'],
    brandColor: '#00A8E1',
    ratio: 0.4,
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Amazon Music Unlimited',
    note: 'Amazon Music Unlimited Familiar admite hasta 6 cuentas del hogar con sus propias bibliotecas.',
  }),

  // ─── Cloud ──────────────────────────────────────────────
  share({
    keys: ['icloud', 'icloud+'],
    brandColor: '#3478F6',
    ratio: 0.35,
    planName: 'Compartir en familia',
    planPhrase: 'Compartir en familia en iCloud+',
    note: 'Cada miembro mantiene su almacenamiento privado \u2014 solo se reparte el coste del plan. Act\u00EDvalo desde Ajustes \u203A Apple ID \u203A Compartir en familia.',
  }),
  share({
    keys: ['google one'],
    brandColor: '#1A73E8',
    ratio: 0.2,
    planName: 'Compartido con hasta 5 personas',
    planPhrase: 'Google One compartido con tu familia',
    note: 'Cualquier plan de Google One se puede compartir con hasta 5 miembros del hogar sin coste extra. Act\u00EDvalo desde one.google.com.',
  }),
  share({
    keys: ['dropbox'],
    brandColor: '#0061FF',
    ratio: 0.35,
    planName: 'Plan Familia',
    planPhrase: 'el plan Familia de Dropbox',
    note: 'Dropbox Familia incluye hasta 6 personas con 2 TB compartidos y espacios privados.',
  }),

  // ─── Productivity ───────────────────────────────────────
  share({
    keys: ['microsoft 365', 'office 365', 'ms 365'],
    brandColor: '#D83B01',
    ratio: 0.35,
    planName: 'Plan familia',
    planPhrase: 'Microsoft 365 Familia',
    note: 'Microsoft 365 Familia incluye hasta 6 personas, cada una con 1 TB de OneDrive y las apps completas de Office.',
  }),
  share({
    keys: ['1password'],
    brandColor: '#0572EC',
    ratio: 0.4,
    planName: 'Plan Familias',
    planPhrase: 'el plan Familias de 1Password',
    note: '1Password Familias permite hasta 5 personas con sus b\u00F3vedas privadas y compartidas.',
  }),

  // ─── Gaming ─────────────────────────────────────────────
  share({
    keys: ['nintendo switch online', 'nintendo online'],
    brandColor: '#E60012',
    ratio: 0.13, // ~8 personas
    planName: 'Plan Familiar',
    planPhrase: 'el plan Familiar de Nintendo Switch Online',
    note: 'El plan Familiar de Nintendo Switch Online admite hasta 8 cuentas Nintendo, ideal para repartir el coste.',
  }),
  share({
    keys: ['playstation plus', 'ps plus', 'ps+'],
    brandColor: '#003791',
    ratio: 0.5,
    planName: 'Compartido con el \u201Camigo de consola\u201D',
    planPhrase: 'la funci\u00F3n \u201CCompartir Juegos\u201D de PS Plus',
    note: 'Puedes compartir PS Plus con otra persona configur\u00E1ndola como tu \u201Camigo de consola\u201D en tu PS5. Revisa playstation.com.',
  }),
  share({
    keys: ['xbox game pass', 'game pass'],
    brandColor: '#107C10',
    ratio: 0.3,
    planName: 'Plan Amigos y Familia',
    planPhrase: 'el plan Amigos y Familia de Xbox Game Pass',
    note: 'El plan Amigos y Familia de Xbox Game Pass Ultimate admite hasta 5 personas por suscripci\u00F3n (disponibilidad seg\u00FAn pa\u00EDs).',
  }),

  // ─── Annual ─────────────────────────────────────────────
  annual({
    keys: ['chatgpt', 'chatgpt plus'],
    brandColor: '#10A37F',
    ratio: 10 / 12, // ~2 months free
    note: 'La facturaci\u00F3n anual de ChatGPT Plus suele incluir un descuento equivalente a unos dos meses gratis al a\u00F1o. Revisa las condiciones en openai.com.',
  }),
  annual({
    keys: ['claude', 'claude pro'],
    brandColor: '#CC9A5B',
    ratio: 10 / 12,
    note: 'La facturaci\u00F3n anual de Claude Pro suele aplicar un descuento equivalente a unos dos meses gratis al a\u00F1o. Consulta la p\u00E1gina de precios de Anthropic.',
  }),
  annual({
    keys: ['perplexity', 'perplexity pro'],
    brandColor: '#20808D',
    ratio: 10 / 12,
    note: 'Perplexity Pro ofrece descuento al pagar anualmente. Revisa perplexity.ai/pro.',
  }),
  annual({
    keys: ['gemini', 'gemini advanced', 'google ai pro'],
    brandColor: '#1A73E8',
    ratio: 10 / 12,
    note: 'El plan anual de Google AI / Gemini suele equivaler a unos dos meses gratis. Consulta one.google.com/about/ai-premium.',
  }),
  annual({
    keys: ['midjourney'],
    brandColor: '#000000',
    ratio: 0.8,
    note: 'Midjourney aplica un 20% de descuento al pasar a facturaci\u00F3n anual. Revisa midjourney.com/account.',
  }),
  annual({
    keys: ['cursor'],
    brandColor: '#000000',
    ratio: 10 / 12,
    note: 'Cursor suele aplicar un descuento equivalente a unos dos meses gratis en facturaci\u00F3n anual. Consulta cursor.com/pricing.',
  }),
  annual({
    keys: ['github', 'github copilot', 'copilot'],
    brandColor: '#181717',
    ratio: 10 / 12,
    note: 'GitHub Copilot y GitHub Pro ofrecen descuento en la facturaci\u00F3n anual. Consulta github.com/pricing.',
  }),
  annual({
    keys: ['notion'],
    brandColor: '#000000',
    ratio: 0.8,
    note: 'Notion ofrece un 20% de descuento al pasar a facturaci\u00F3n anual. Consulta notion.so/pricing.',
  }),
  annual({
    keys: ['figma'],
    brandColor: '#F24E1E',
    ratio: 10 / 12,
    note: 'Figma aplica descuento al pasar a facturaci\u00F3n anual (aprox. dos meses gratis). Consulta figma.com/pricing.',
  }),
  annual({
    keys: ['canva', 'canva pro'],
    brandColor: '#00C4CC',
    ratio: 10 / 12,
    note: 'Canva Pro aplica un descuento equivalente a unos dos meses gratis al pasar a anual.',
  }),
  annual({
    keys: ['grammarly'],
    brandColor: '#15C39A',
    ratio: 0.6,
    note: 'Grammarly Premium puede ahorrar hasta un 40% pas\u00E1ndote a la suscripci\u00F3n anual.',
  }),
  annual({
    keys: ['evernote'],
    brandColor: '#00A82D',
    ratio: 10 / 12,
    note: 'Evernote suele aplicar unos dos meses gratis al pasar a facturaci\u00F3n anual. Consulta evernote.com/pricing.',
  }),
  annual({
    keys: ['todoist'],
    brandColor: '#E44332',
    ratio: 10 / 12,
    note: 'Todoist Pro ofrece descuento al pagar el plan anual por adelantado.',
  }),
  annual({
    keys: ['zoom'],
    brandColor: '#2D8CFF',
    ratio: 10 / 12,
    note: 'Los planes de Zoom aplican un descuento al pasar a facturaci\u00F3n anual. Consulta zoom.us/pricing.',
  }),
  annual({
    keys: ['slack'],
    brandColor: '#611F69',
    ratio: 10 / 12,
    note: 'Slack aplica un descuento al pasar a facturaci\u00F3n anual en sus planes de pago. Revisa slack.com/pricing.',
  }),
  annual({
    keys: ['linear'],
    brandColor: '#5E6AD2',
    ratio: 10 / 12,
    note: 'Linear ofrece un descuento al pasar a facturaci\u00F3n anual. Consulta linear.app/pricing.',
  }),
  annual({
    keys: ['adobe', 'adobe creative cloud', 'adobe cc', 'photoshop', 'lightroom', 'illustrator', 'premiere'],
    brandColor: '#DA1F26',
    ratio: 0.8,
    note: 'Adobe ofrece descuentos significativos al pagar el plan anual por adelantado. Revisa adobe.com.',
  }),

  // ─── VPN / Privacy ──────────────────────────────────────
  annual({
    keys: ['nordvpn'],
    brandColor: '#4687FF',
    ratio: 0.4,
    note: 'NordVPN suele ofrecer hasta un 60% de descuento en los planes de 1 o 2 a\u00F1os frente al mensual.',
  }),
  annual({
    keys: ['expressvpn'],
    brandColor: '#DA3940',
    ratio: 0.5,
    note: 'ExpressVPN aplica descuentos notables al pasar a planes anuales. Consulta expressvpn.com.',
  }),
  annual({
    keys: ['surfshark'],
    brandColor: '#1EBFBF',
    ratio: 0.3,
    note: 'Surfshark tiene descuentos de hasta el 70% en planes de 12 o 24 meses.',
  }),
  annual({
    keys: ['proton', 'protonvpn', 'proton vpn', 'proton mail', 'protonmail'],
    brandColor: '#6D4AFF',
    ratio: 0.6,
    note: 'Proton aplica un descuento importante al pasar a facturaci\u00F3n anual en Proton VPN, Mail y Unlimited.',
  }),

  // ─── Health / Fitness ───────────────────────────────────
  annual({
    keys: ['calm'],
    brandColor: '#2B6EF6',
    ratio: 0.35,
    note: 'Calm Premium se suele ofrecer a un precio anual muy inferior al equivalente mensual. Revisa calm.com.',
  }),
  annual({
    keys: ['headspace'],
    brandColor: '#F47D31',
    ratio: 0.5,
    note: 'Headspace aplica un descuento considerable al pasar a facturaci\u00F3n anual.',
  }),
  annual({
    keys: ['strava'],
    brandColor: '#FC4C02',
    ratio: 10 / 12,
    note: 'Strava aplica unos dos meses gratis en su plan anual. Revisa strava.com/premium.',
  }),
  annual({
    keys: ['myfitnesspal'],
    brandColor: '#0072CE',
    ratio: 0.5,
    note: 'MyFitnessPal Premium ofrece un ahorro notable al pasar al plan anual frente al mensual.',
  }),
  annual({
    keys: ['duolingo', 'duolingo super', 'super duolingo'],
    brandColor: '#58CC02',
    ratio: 0.5,
    note: 'Super Duolingo es sensiblemente m\u00E1s barato en su plan anual frente al mensual.',
  }),
  annual({
    keys: ['babbel'],
    brandColor: '#FF6A00',
    ratio: 0.4,
    note: 'Babbel aplica un descuento significativo en los planes de 6 y 12 meses frente al mensual.',
  }),

  // ─── News / Reading ─────────────────────────────────────
  annual({
    keys: ['new york times', 'nyt'],
    brandColor: '#000000',
    ratio: 0.6,
    note: 'The New York Times aplica un descuento importante en la suscripci\u00F3n anual frente a la mensual.',
  }),
  annual({
    keys: ['audible'],
    brandColor: '#F7971E',
    ratio: 0.8,
    note: 'Audible tiene descuentos al pagar por adelantado 12 meses de la membres\u00EDa.',
  }),
  share({
    keys: ['kindle unlimited'],
    brandColor: '#FF9900',
    ratio: 0.5,
    planName: 'Amazon Household',
    planPhrase: 'Amazon Household para compartir Kindle',
    note: 'Puedes compartir libros de Kindle con otra persona adulta del hogar mediante Amazon Household sin pagar doble.',
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
