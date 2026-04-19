// Onboarding + Login constants — single source of truth for copy,
// slide metadata, and pacing. Keep this free of JSX so it stays easy to
// swap for i18n dictionaries later.

export type SlideId =
  | 'floating-logos'
  | 'renewals-dashboard'
  | 'calendar'
  | 'savings'
  | 'final-login';

export interface SlideMeta {
  id: SlideId;
  title: string;
  body: string;
}

export const ONBOARDING_SLIDES: readonly SlideMeta[] = [
  {
    id: 'floating-logos',
    title: 'Todas tus suscripciones en un solo sitio',
    body: 'Cuánto pagas al mes, qué se renueva esta semana y dónde puedes ahorrar.',
  },
  {
    id: 'renewals-dashboard',
    title: 'Anticípate a cada renovación',
    body: 'Consulta tus próximos cobros y recibe avisos antes de que se renueven.',
  },
  {
    id: 'calendar',
    title: 'Calendario con próximas renovaciones',
    body: 'Visualiza de un vistazo todo lo que se va a cobrar en los próximos días y meses.',
  },
  {
    id: 'savings',
    title: 'Insights de gasto y sugerencias de ahorro',
    body: 'Descubre patrones y recomendaciones para reducir lo que pagas cada mes sin renunciar a lo que importa.',
  },
  {
    id: 'final-login',
    title: 'Empieza ahora',
    body: 'Inicia sesión y vuelca todas tus suscripciones en un solo sitio.',
  },
] as const;

export const LAST_SLIDE_INDEX = ONBOARDING_SLIDES.length - 1;

// Accent blue/violet used for emphasized numbers — matches web app body
// copy highlights ("148,33€", "1.779,96€").
export const ACCENT_PRIMARY = '#3D3BF3';

// ─── Legal copy ───────────────────────────────────────────────────
export const LEGAL = {
  prefix: 'Al continuar aceptas nuestros ',
  terms: 'Términos',
  middle: ' y la ',
  privacy: 'Política de privacidad',
  suffix: '.',
} as const;

// ─── Mock data for the hero mockups ──────────────────────────────
// These are intentionally co-located so copy tweaks don't require
// hunting across hero files.

export const MOCK_DASHBOARD = {
  greeting: 'Hola, Carlos.',
  monthlyLabel: 'Al mes gastas',
  monthlyAmount: '148,33€',
  yearlyLabel: 'Eso al año es',
  yearlyAmount: '1.779,96€',
  activeCount: 11,
  shareDiscount: '4,17€',
  reminderBody: 'Podrías evitar 3 renovaciones anuales por sorpresa si activas avisos 7 días antes.',
} as const;

export const MOCK_RENEWALS_STATS = {
  topSpend: { label: 'Mayor gasto', name: 'Amazon Prime', sub: '30,00€ al mes · Otros' },
  topCategory: { label: 'Categoría principal', name: 'Otros', sub: '53,00€ al mes · 2 suscr.' },
  shared: { label: 'Planes compartidos', name: '1 plan', sub: 'Ahorrando 8,33€ al mes' },
  nextRenewal: { label: 'Próxima renovación', name: 'Notion', sub: 'En 3 días · 20,00€' },
} as const;

export const MOCK_SAVINGS = [
  {
    domain: 'apple.com/apple-tv-plus',
    amount: '120,00€',
    body: 'si cambias Apple TV+ a un plan compartido.',
  },
  {
    domain: '__bundle__',
    amount: '94,20€',
    body: 'si agrupas algunos de tus servicios.',
  },
  {
    domain: 'apple.com/apple-music',
    amount: '66,00€',
    body: 'si cambias Apple Music a un plan compartido.',
  },
  {
    domain: 'amazon.com/prime',
    amount: '60,00€',
    body: 'si pasas Amazon Prime al plan anual.',
  },
] as const;

export const MOCK_CALENDAR = {
  monthName: 'Abril',
  totalLabel: '476,58€ total',
  renewalsLabel: '11 renovaciones',
  // Start weekday of Apr 1 = Wednesday (iOS Spanish locale, Lun-first)
  firstWeekdayIndex: 2,
  daysInMonth: 30,
  today: 7,
  // Days with renewal markers and the platform showing on top.
  renewals: [
    { day: 5, domain: 'netflix.com', stackCount: 6 },
    { day: 10, domain: 'notion.so' },
    { day: 16, domain: 'disneyplus.com' },
  ],
} as const;

export const FLOATING_LOGOS = [
  { domain: 'netflix.com' },
  { domain: 'figma.com' },
  { domain: 'spotify.com' },
  { domain: 'revolut.com' },
  { domain: 'youtube.com' },
  { domain: 'duolingo.com' },
  { domain: 'notion.so' },
  { domain: 'twitch.tv' },
  { domain: 'github.com' },
  { domain: 'icloud.com' },
] as const;
