// Mock catalog of savings suggestions surfaced from the dashboard
// reminder card. The shape is tuned to render directly in two
// places without any derivation:
//
//   · List card  — a single paragraph "Podrías ahorrar hasta {{X}} …"
//     where X is rendered in bold, plus a full-width "Ver más" button.
//   · Detail sheet — identity row, green savings summary, two-row
//     "Comparativa" table, explanatory note, primary CTA.
//
// A real recommendation engine will eventually replace this with
// personalized suggestions — for now we hand-pick common wins
// (shared plans, annual switches) so the UI can be shaped around
// realistic content.

import { resolvePlatformLogoUrl } from '../../lib/constants/platforms';

export type SuggestionKind = 'share' | 'annual';

export interface SavingsSuggestion {
  id: string;
  kind: SuggestionKind;
  serviceName: string;
  /** Resolved via platform catalog — null falls back to brand-tinted initials. */
  logoUrl: string | null;
  brandColor: string;

  // ─── List card copy ────────────────────────────────────────────────
  // Split into three segments so the middle "amount" can render in
  // bold without parsing a template string at runtime.
  listCopyBefore: string;
  listAmount: string;
  listCopyAfter: string;

  // ─── Detail sheet ──────────────────────────────────────────────────
  /** Shown in muted text under the service name. */
  currentPlanLabel: string;

  /** Green savings summary — top line, e.g. "Ahorra ~5,00€/mes". */
  monthlySavings: string;
  /** Green savings summary — sub line, e.g. "59,94€/año en tu bolsillo". */
  yearlySavings: string;

  /** "Comparativa" — left column */
  compareCurrentLabel: string;
  compareCurrentPrice: string;
  /** "Comparativa" — right column (highlighted green) */
  compareSuggestedLabel: string;
  compareSuggestedPrice: string;

  /** Explanatory note — muted text right above the CTA. */
  note: string;
}

// ─── Catalog ────────────────────────────────────────────────────────

export const MOCK_SAVINGS_SUGGESTIONS: SavingsSuggestion[] = [
  {
    id: 'spotify-family',
    kind: 'share',
    serviceName: 'Spotify',
    logoUrl: resolvePlatformLogoUrl('Spotify'),
    brandColor: '#1DB954',

    listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
    listAmount: '59,94\u20AC',
    listCopyAfter: ' al a\u00F1o si cambias Spotify a un plan compartido.',

    currentPlanLabel: 'Plan individual',
    monthlySavings: 'Ahorra ~5,00\u20AC/mes',
    yearlySavings: '59,94\u20AC/a\u00F1o en tu bolsillo',

    compareCurrentLabel: 'Plan individual',
    compareCurrentPrice: '9,99\u20AC',
    compareSuggestedLabel: 'Plan familiar (por persona)',
    compareSuggestedPrice: '~5,00\u20AC',

    note: 'Consulta en el sitio web de Spotify las opciones de plan familiar o duo. Algunos servicios tambi\u00E9n ofrecen descuentos para estudiantes.',
  },

  {
    id: 'apple-tv-family',
    kind: 'share',
    serviceName: 'Apple TV+',
    logoUrl: resolvePlatformLogoUrl('Apple TV+'),
    brandColor: '#000000',

    listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
    listAmount: '53,94\u20AC',
    listCopyAfter: ' al a\u00F1o si cambias Apple TV+ a un plan compartido.',

    currentPlanLabel: 'Plan individual',
    monthlySavings: 'Ahorra ~4,50\u20AC/mes',
    yearlySavings: '53,94\u20AC/a\u00F1o en tu bolsillo',

    compareCurrentLabel: 'Plan individual',
    compareCurrentPrice: '9,99\u20AC',
    compareSuggestedLabel: 'Compartir en familia (hasta 6)',
    compareSuggestedPrice: '~5,49\u20AC',

    note: 'Activa Compartir en familia desde los Ajustes del iPhone para repartir el coste con hasta 5 personas sin perder perfiles individuales.',
  },

  {
    id: 'chatgpt-annual',
    kind: 'annual',
    serviceName: 'ChatGPT Plus',
    logoUrl: resolvePlatformLogoUrl('ChatGPT Plus'),
    brandColor: '#10A37F',

    listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
    listAmount: '40,00US$',
    listCopyAfter: ' al a\u00F1o si pasas ChatGPT Plus al plan anual.',

    currentPlanLabel: 'Plan mensual',
    monthlySavings: 'Ahorra ~3,33US$/mes',
    yearlySavings: '40,00US$/a\u00F1o en tu bolsillo',

    compareCurrentLabel: 'Plan mensual',
    compareCurrentPrice: '20,00US$',
    compareSuggestedLabel: 'Plan anual (equivalente mensual)',
    compareSuggestedPrice: '~16,67US$',

    note: 'La facturaci\u00F3n anual incluye un descuento equivalente a unos dos meses gratis al a\u00F1o. Revisa las condiciones en la web del proveedor.',
  },

  {
    id: 'claude-annual',
    kind: 'annual',
    serviceName: 'Claude Pro',
    logoUrl: resolvePlatformLogoUrl('Claude Pro'),
    brandColor: '#CC9A5B',

    listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
    listAmount: '40,00US$',
    listCopyAfter: ' al a\u00F1o si pasas Claude Pro al plan anual.',

    currentPlanLabel: 'Plan mensual',
    monthlySavings: 'Ahorra ~3,33US$/mes',
    yearlySavings: '40,00US$/a\u00F1o en tu bolsillo',

    compareCurrentLabel: 'Plan mensual',
    compareCurrentPrice: '20,00US$',
    compareSuggestedLabel: 'Plan anual (equivalente mensual)',
    compareSuggestedPrice: '~16,67US$',

    note: 'La facturaci\u00F3n anual aplica un descuento equivalente a unos dos meses gratis al a\u00F1o. Consulta la p\u00E1gina de precios de Anthropic.',
  },

  {
    id: 'icloud-family',
    kind: 'share',
    serviceName: 'iCloud+',
    logoUrl: resolvePlatformLogoUrl('iCloud+'),
    brandColor: '#3478F6',

    listCopyBefore: 'Podr\u00EDas ahorrar hasta ',
    listAmount: '29,88\u20AC',
    listCopyAfter: ' al a\u00F1o si activas Compartir en familia en iCloud+.',

    currentPlanLabel: 'iCloud+ 200 GB (individual)',
    monthlySavings: 'Ahorra ~2,49\u20AC/mes',
    yearlySavings: '29,88\u20AC/a\u00F1o en tu bolsillo',

    compareCurrentLabel: 'Individual',
    compareCurrentPrice: '2,99\u20AC',
    compareSuggestedLabel: 'Compartir en familia (por persona)',
    compareSuggestedPrice: '~0,50\u20AC',

    note: 'Cada miembro mantiene su almacenamiento privado — solo se reparte el coste del plan. Act\u00EDvalo desde Ajustes \u203A Apple ID \u203A Compartir en familia.',
  },
];
