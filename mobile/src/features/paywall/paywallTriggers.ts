// Paywall trigger metadata — mirrors the web app so copy stays aligned.
// Every place in the app that can open the paywall passes a trigger.
// The trigger drives the contextual header copy in the paywall sheet.

export type PaywallTrigger =
  | 'subscription_limit'
  | 'future_calendar'
  | 'savings_recommendations'
  | 'renewal_reminders'
  | 'custom_categories'
  | 'general';

export interface PaywallTriggerMeta {
  headline: string;
  subheadline: string;
  highlightBenefit?: string;
}

export const PAYWALL_COPY: Record<PaywallTrigger, PaywallTriggerMeta> = {
  subscription_limit: {
    headline: 'Has llegado al l\u00EDmite de 15 suscripciones',
    subheadline: 'A\u00F1ade todas las que necesites con Pro',
    highlightBenefit: 'unlimited_subscriptions',
  },
  future_calendar: {
    headline: 'Solo est\u00E1s viendo el mes actual',
    subheadline: 'Con Pro, anticípate a los pr\u00F3ximos cobros',
    highlightBenefit: 'future_calendar',
  },
  savings_recommendations: {
    headline: 'Solo ves 3 de tus oportunidades de ahorro',
    subheadline: 'Desbloquea todas las recomendaciones con Pro',
    highlightBenefit: 'savings',
  },
  renewal_reminders: {
    headline: 'Los avisos llegan antes que el cargo',
    subheadline: 'Actívalos con Perezoso Pro',
    highlightBenefit: 'reminders',
  },
  custom_categories: {
    headline: 'Organiza tus suscripciones como quieras',
    subheadline: 'Crea categor\u00EDas personalizadas con Pro',
    highlightBenefit: 'custom_categories',
  },
  general: {
    headline: 'Toma el control total',
    subheadline: 'Todo lo que necesitas para gestionar tus suscripciones',
  },
};

export const PAYWALL_BENEFITS = [
  { id: 'unlimited_subscriptions', text: 'Añade todas las suscripciones que quieras, sin límite de 15' },
  { id: 'reminders',               text: 'Recibe un aviso días antes de cada renovación para que nada te pille por sorpresa' },
  { id: 'future_calendar',         text: 'Visualiza tus próximos cobros en el calendario, no solo el mes actual' },
  { id: 'savings',                 text: 'Descubre cuánto puedes ahorrar con recomendaciones personalizadas' },
  { id: 'custom_categories',       text: 'Crea tus propias categorías para organizar las suscripciones como prefieras' },
] as const;
