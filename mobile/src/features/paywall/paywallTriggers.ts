// Paywall trigger metadata — drives contextual copy in the paywall sheet.
// Each trigger maps to translation keys for headline + subheadline.

export type PaywallTrigger =
  | 'subscription_limit'
  | 'future_calendar'
  | 'savings_recommendations'
  | 'renewal_reminders'
  | 'custom_categories'
  | 'general';

export interface PaywallTriggerMeta {
  headlineKey: string;
  subheadlineKey: string;
  highlightBenefit?: string;
}

export const PAYWALL_COPY: Record<PaywallTrigger, PaywallTriggerMeta> = {
  subscription_limit: {
    headlineKey: 'paywall.trigger.subscriptionLimit.headline',
    subheadlineKey: 'paywall.trigger.subscriptionLimit.subheadline',
    highlightBenefit: 'unlimited_subscriptions',
  },
  future_calendar: {
    headlineKey: 'paywall.trigger.futureCalendar.headline',
    subheadlineKey: 'paywall.trigger.futureCalendar.subheadline',
    highlightBenefit: 'future_calendar',
  },
  savings_recommendations: {
    headlineKey: 'paywall.trigger.savings.headline',
    subheadlineKey: 'paywall.trigger.savings.subheadline',
    highlightBenefit: 'savings',
  },
  renewal_reminders: {
    headlineKey: 'paywall.trigger.reminders.headline',
    subheadlineKey: 'paywall.trigger.reminders.subheadline',
    highlightBenefit: 'reminders',
  },
  custom_categories: {
    headlineKey: 'paywall.trigger.categories.headline',
    subheadlineKey: 'paywall.trigger.categories.subheadline',
    highlightBenefit: 'custom_categories',
  },
  general: {
    headlineKey: 'paywall.trigger.general.headline',
    subheadlineKey: '',
  },
};

export interface PaywallBenefitMeta {
  id: string;
  titleKey: string;
  subtitleKey: string;
}

export const PAYWALL_BENEFITS: PaywallBenefitMeta[] = [
  { id: 'unlimited_subscriptions', titleKey: 'paywall.benefit.unlimited',   subtitleKey: 'paywall.benefit.unlimitedSub' },
  { id: 'reminders',               titleKey: 'paywall.benefit.reminders',   subtitleKey: 'paywall.benefit.remindersSub' },
  { id: 'future_calendar',         titleKey: 'paywall.benefit.calendar',    subtitleKey: 'paywall.benefit.calendarSub' },
  { id: 'savings',                 titleKey: 'paywall.benefit.savings',     subtitleKey: 'paywall.benefit.savingsSub' },
  { id: 'custom_categories',       titleKey: 'paywall.benefit.categories',  subtitleKey: 'paywall.benefit.categoriesSub' },
];
