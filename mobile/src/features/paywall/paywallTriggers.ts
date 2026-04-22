// Paywall trigger metadata — drives contextual copy in the paywall sheet.
// Each trigger maps to a headline + subheadline shown at the top.
// The general trigger uses the default value-focused copy.

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
    headline: 'Has llegado al límite',
    subheadline: 'Con Pro, añade todas las suscripciones que necesites sin restricciones.',
    highlightBenefit: 'unlimited_subscriptions',
  },
  future_calendar: {
    headline: 'Anticípate a tus cobros',
    subheadline: 'Visualiza los próximos meses en el calendario y planifica mejor tus gastos.',
    highlightBenefit: 'future_calendar',
  },
  savings_recommendations: {
    headline: 'Ahorra más cada mes',
    subheadline: 'Desbloquea todas las recomendaciones personalizadas para reducir tus gastos.',
    highlightBenefit: 'savings',
  },
  renewal_reminders: {
    headline: 'No te pillen por sorpresa',
    subheadline: 'Activa avisos antes de cada renovación para decidir si quieres seguir pagando.',
    highlightBenefit: 'reminders',
  },
  custom_categories: {
    headline: 'Organiza a tu manera',
    subheadline: 'Crea categorías personalizadas y clasifica tus suscripciones como prefieras.',
    highlightBenefit: 'custom_categories',
  },
  general: {
    headline: 'Nunca vuelvas a olvidar\nuna renovación',
    subheadline: 'Gestiona todas tus suscripciones sin límites, recibe avisos antes de cada cobro y planifica mejor tus gastos.',
  },
};

export const PAYWALL_BENEFITS = [
  { id: 'unlimited_subscriptions', text: 'Suscripciones ilimitadas' },
  { id: 'reminders',               text: 'Avisos antes de renovar' },
  { id: 'future_calendar',         text: 'Calendario completo de cobros' },
  { id: 'savings',                 text: 'Recomendaciones para ahorrar' },
  { id: 'custom_categories',       text: 'Categorías personalizadas' },
] as const;
