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
  titleKey: string;
  bodyKey: string;
}

export const ONBOARDING_SLIDES: readonly SlideMeta[] = [
  { id: 'floating-logos', titleKey: 'onboarding.slide1.title', bodyKey: 'onboarding.slide1.body' },
  { id: 'renewals-dashboard', titleKey: 'onboarding.slide2.title', bodyKey: 'onboarding.slide2.body' },
  { id: 'calendar', titleKey: 'onboarding.slide3.title', bodyKey: 'onboarding.slide3.body' },
  { id: 'savings', titleKey: 'onboarding.slide4.title', bodyKey: 'onboarding.slide4.body' },
  { id: 'final-login', titleKey: 'onboarding.slide5.title', bodyKey: 'onboarding.slide5.body' },
] as const;

export const LAST_SLIDE_INDEX = ONBOARDING_SLIDES.length - 1;

// Accent blue/violet used for emphasized numbers — matches web app body
// copy highlights ("148,33€", "1.779,96€").
export const ACCENT_PRIMARY = '#3D3BF3';

// ─── Legal copy ───────────────────────────────────────────────────
export const LEGAL = {
  prefix: 'onboarding.legalPrefix',
  terms: 'onboarding.terms',
  middle: 'onboarding.legalMiddle',
  privacy: 'onboarding.privacy',
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

// Screenshot assets for each image-based slide. Matches the web app's
// /public/onboarding/*.png set. Keys align with SlideId.
export const SLIDE_SCREENSHOTS: Partial<Record<SlideId, number>> = {
  'renewals-dashboard': require('../../../assets/onboarding/03.png'),
  calendar: require('../../../assets/onboarding/02.png'),
  savings: require('../../../assets/onboarding/04.png'),
  'final-login': require('../../../assets/onboarding/05.png'),
};

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

// Mock subscription list shown in the first onboarding slide.
// 10 most recognisable services — varied categories so the hero
// feels universal rather than tied to one vertical.
export const MOCK_SUBSCRIPTIONS = [
  { domain: 'netflix.com',              name: 'Netflix',          price: '12,99€', period: 'mes', renewsIn: '3 días' },
  { domain: 'spotify.com',              name: 'Spotify Premium',  price: '10,99€', period: 'mes', renewsIn: '12 días' },
  { domain: 'youtube.com',              name: 'YouTube Premium',  price: '13,99€', period: 'mes', renewsIn: '8 días' },
  { domain: 'amazon.com',               name: 'Amazon Prime',     price: '4,99€',  period: 'mes', renewsIn: '21 días' },
  { domain: 'disneyplus.com',           name: 'Disney+',          price: '8,99€',  period: 'mes', renewsIn: '15 días' },
  { domain: 'max.com',                  name: 'Max',              price: '9,99€',  period: 'mes', renewsIn: '5 días' },
  { domain: 'apple.com/apple-music',    name: 'Apple Music',      price: '10,99€', period: 'mes', renewsIn: '18 días' },
  { domain: 'icloud.com',               name: 'iCloud+',          price: '2,99€',  period: 'mes', renewsIn: '26 días' },
  { domain: 'openai.com',               name: 'ChatGPT Plus',     price: '20,00€', period: 'mes', renewsIn: '9 días' },
  { domain: 'figma.com',                name: 'Figma',            price: '15,00€', period: 'mes', renewsIn: '2 días' },
] as const;
