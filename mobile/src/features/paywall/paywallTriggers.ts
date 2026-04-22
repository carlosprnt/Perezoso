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
    subheadline: 'Tu plan permite hasta 15 suscripciones. Con Pro, añade todas las que necesites.',
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
    headline: 'Desbloquea todo\ncon Pro',
    subheadline: 'Tu plan cubre lo esencial. Pro elimina límites y desbloquea funciones avanzadas.',
  },
};

export const PAYWALL_BENEFITS = [
  { id: 'unlimited_subscriptions', title: 'Suscripciones ilimitadas',      subtitle: 'Sin el límite de 15 del plan normal' },
  { id: 'reminders',               title: 'Avisos antes de renovar',       subtitle: 'Alertas antes de cada cobro automático' },
  { id: 'future_calendar',         title: 'Calendario completo de cobros', subtitle: 'Visualiza todos tus pagos futuros' },
  { id: 'savings',                 title: 'Recomendaciones para ahorrar',  subtitle: 'Consejos personalizados para gastar menos' },
  { id: 'custom_categories',       title: 'Categorías personalizadas',     subtitle: 'Organiza tus suscripciones a tu manera' },
] as const;
