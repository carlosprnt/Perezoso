// Mock catalog of savings suggestions surfaced from the dashboard
// reminder card. Each suggestion includes everything both the list
// sheet and the detail sheet need to render, so neither has to
// derive copy or do additional lookups.
//
// Real data will eventually come from a recommendation engine that
// analyses the user's plan + frequency of use; for now we hand-pick
// a handful of high-signal opportunities (shared plans, downgrades,
// annual switches) for the typical Perezoso user.

import { resolvePlatformLogoUrl } from '../../lib/constants/platforms';

export interface SuggestionComparisonRow {
  /** Left-most label, e.g. "Precio", "Pantallas", "Calidad". */
  label: string;
  current: string;
  suggested: string;
  /** When true, the suggested cell is rendered in the highlight color. */
  highlightSuggested?: boolean;
}

export type SuggestionKind = 'share' | 'downgrade' | 'annual' | 'cancel';

export interface SavingsSuggestion {
  id: string;
  kind: SuggestionKind;
  /** Service display name, e.g. "Netflix". */
  serviceName: string;
  /** Resolved via platform catalog — may be null when no match (renderer falls back to brand-tinted initials). */
  logoUrl: string | null;
  /** Soft tint behind the logo + accent color used in the detail header. */
  brandColor: string;
  /** Category label rendered under the service name in the detail sheet. */
  category: string;

  /** One-liner shown on the list card under the service name. */
  shortCopy: string;
  /** Pre-formatted yearly savings string ("Hasta 84,00€/año"). */
  yearlySavings: string;
  /** Pre-formatted monthly savings string ("7,00€/mes"). */
  monthlySavings: string;

  /** Headline + sub-label for the current plan, rendered in the detail. */
  currentPlanLabel: string;
  suggestedPlanLabel: string;

  /** Comparison rows shown in the detail sheet — usually 3 to 5 items. */
  comparison: SuggestionComparisonRow[];

  /** Short explanatory note shown beneath the comparison table. */
  note: string;
}

// ─── Catalog ────────────────────────────────────────────────────────

export const MOCK_SAVINGS_SUGGESTIONS: SavingsSuggestion[] = [
  {
    id: 'netflix-share',
    kind: 'share',
    serviceName: 'Netflix',
    logoUrl: resolvePlatformLogoUrl('Netflix'),
    brandColor: '#E50914',
    category: 'Streaming',

    shortCopy: 'Comparte tu plan Premium con un amigo o familiar.',
    yearlySavings: 'Hasta 84,00\u20AC/a\u00F1o',
    monthlySavings: '7,00\u20AC/mes',

    currentPlanLabel: 'Plan Premium individual',
    suggestedPlanLabel: 'Plan Premium compartido (2 personas)',

    comparison: [
      { label: 'Precio',    current: '17,99\u20AC/mes',  suggested: '8,99\u20AC/mes', highlightSuggested: true },
      { label: 'Pantallas', current: '4 simult\u00E1neas', suggested: '4 simult\u00E1neas' },
      { label: 'Calidad',   current: '4K + HDR',         suggested: '4K + HDR' },
      { label: 'Perfiles',  current: 'Hasta 5',          suggested: 'Hasta 5' },
    ],
    note: 'Comparte tu cuenta con alguien de confianza dentro de tu hogar para reducir el coste sin perder ninguna funci\u00F3n.',
  },

  {
    id: 'spotify-duo',
    kind: 'share',
    serviceName: 'Spotify',
    logoUrl: resolvePlatformLogoUrl('Spotify'),
    brandColor: '#1DB954',
    category: 'M\u00FAsica',

    shortCopy: 'Pasa a Spotify Duo y comparte la cuenta con tu pareja.',
    yearlySavings: 'Hasta 71,88\u20AC/a\u00F1o',
    monthlySavings: '5,99\u20AC/mes',

    currentPlanLabel: 'Plan Individual',
    suggestedPlanLabel: 'Plan Duo (2 personas)',

    comparison: [
      { label: 'Precio',  current: '10,99\u20AC/mes', suggested: '14,99\u20AC/mes', highlightSuggested: true },
      { label: 'Cuentas', current: '1',               suggested: '2 independientes' },
      { label: 'Calidad', current: 'Premium',          suggested: 'Premium' },
      { label: 'Coste por persona', current: '10,99\u20AC', suggested: '7,50\u20AC' },
    ],
    note: 'Cada miembro mantiene su propia biblioteca y recomendaciones — el ahorro real aparece al dividir el coste.',
  },

  {
    id: 'icloud-family',
    kind: 'share',
    serviceName: 'iCloud+',
    logoUrl: resolvePlatformLogoUrl('iCloud+'),
    brandColor: '#3478F6',
    category: 'Almacenamiento',

    shortCopy: 'Activa Compartir en familia para que el plan se reparta.',
    yearlySavings: 'Hasta 35,88\u20AC/a\u00F1o',
    monthlySavings: '2,99\u20AC/mes',

    currentPlanLabel: 'iCloud+ 200 GB individual',
    suggestedPlanLabel: 'iCloud+ 200 GB con Compartir en familia',

    comparison: [
      { label: 'Precio',         current: '2,99\u20AC/mes', suggested: '2,99\u20AC/mes' },
      { label: 'Almacenamiento', current: '200 GB',          suggested: '200 GB' },
      { label: 'Miembros',       current: '1',               suggested: 'Hasta 6', highlightSuggested: true },
      { label: 'Coste por persona', current: '2,99\u20AC',    suggested: '0,50\u20AC' },
    ],
    note: 'Comparte el almacenamiento sin que nadie vea tus archivos: cada persona conserva su propia bandeja privada.',
  },

  {
    id: 'chatgpt-annual',
    kind: 'annual',
    serviceName: 'ChatGPT Plus',
    logoUrl: resolvePlatformLogoUrl('ChatGPT'),
    brandColor: '#10A37F',
    category: 'IA',

    shortCopy: 'Pasa a facturaci\u00F3n anual y ahorra el equivalente a 2 meses.',
    yearlySavings: 'Hasta 48,00\u20AC/a\u00F1o',
    monthlySavings: '4,00\u20AC/mes',

    currentPlanLabel: 'Plan Plus mensual',
    suggestedPlanLabel: 'Plan Plus anual',

    comparison: [
      { label: 'Precio',        current: '20,00US$/mes', suggested: '16,00US$/mes', highlightSuggested: true },
      { label: 'Facturaci\u00F3n', current: 'Mensual',     suggested: 'Anual' },
      { label: 'Funciones',     current: 'Todas',         suggested: 'Todas' },
      { label: 'L\u00EDmite mensajes', current: 'Sin l\u00EDmite', suggested: 'Sin l\u00EDmite' },
    ],
    note: 'La facturaci\u00F3n anual aplica un descuento equivalente a dos meses gratis al a\u00F1o.',
  },

  {
    id: 'youtube-family',
    kind: 'downgrade',
    serviceName: 'YouTube Premium',
    logoUrl: resolvePlatformLogoUrl('YouTube Premium'),
    brandColor: '#FF0000',
    category: 'Streaming',

    shortCopy: 'Cambia al plan familiar y compartelo con hasta 5 personas.',
    yearlySavings: 'Hasta 96,00\u20AC/a\u00F1o',
    monthlySavings: '8,00\u20AC/mes',

    currentPlanLabel: 'Plan Individual',
    suggestedPlanLabel: 'Plan Familiar (hasta 6 cuentas)',

    comparison: [
      { label: 'Precio',  current: '13,99\u20AC/mes', suggested: '23,99\u20AC/mes', highlightSuggested: true },
      { label: 'Cuentas', current: '1',               suggested: 'Hasta 6' },
      { label: 'Coste por persona', current: '13,99\u20AC', suggested: '4,00\u20AC' },
      { label: 'YouTube Music',     current: 'Incluido',    suggested: 'Incluido' },
    ],
    note: 'Todos los miembros del plan familiar deben vivir en el mismo domicilio seg\u00FAn las condiciones de Google.',
  },
];
