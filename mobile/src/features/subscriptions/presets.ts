// Demo presets — three app states the user can switch between from
// Ajustes › Demo. Drives the global subscriptionsStore so every screen
// that reads subscriptions (SubscriptionsScreen, dashboard renewals/
// top-expensive, settings "Perezoso Plus" status…) reacts in lockstep.
//
//   empty — fresh install, zero subscriptions
//   basic — 10 active subs, free user (no Perezoso Plus)
//   pro   — 20 active subs, Perezoso Plus active
//
// The "basic" set is the existing MOCK_SUBSCRIPTIONS (10 items). The
// "pro" set extends it with 10 additional commonly-used services to
// exercise the UI at scale (longer list, wider category spread, more
// renewals, higher totals).

import type { Subscription } from './types';
import { resolvePlatformLogoUrl } from '../../lib/constants/platforms';
import { MOCK_SUBSCRIPTIONS } from './mockData';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── EMPTY ──────────────────────────────────────────────────────────
export const EMPTY_SUBS: Subscription[] = [];

// ─── BASIC 10 — already defined in mockData.ts ──────────────────────
export const BASIC_10_SUBS: Subscription[] = MOCK_SUBSCRIPTIONS;

// ─── Extra 10 to build PRO 20 ──────────────────────────────────────
// Varied billing periods, currencies, and categories so the derived
// dashboard numbers (totals, categories, renewals) look believable.
const EXTRA_10_SUBS: Subscription[] = [
  {
    id: '11',
    name: 'Amazon Prime',
    logo_url: resolvePlatformLogoUrl('Amazon Prime'),
    category: 'other',
    price_amount: 49.90,
    currency: 'EUR',
    billing_period: 'yearly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(46),
    status: 'active',
    is_shared: true,
    shared_with_count: 3,
    card_color: null,
    created_at: '2022-03-12T10:00:00Z',
    updated_at: '2022-03-12T10:00:00Z',
    monthly_equivalent_cost: 4.16,
    my_monthly_cost: 1.04,
  },
  {
    id: '12',
    name: 'Apple TV+',
    logo_url: resolvePlatformLogoUrl('Apple TV+'),
    category: 'streaming',
    price_amount: 9.99,
    currency: 'EUR',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(9),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2024-07-01T10:00:00Z',
    updated_at: '2024-07-01T10:00:00Z',
    monthly_equivalent_cost: 9.99,
    my_monthly_cost: 9.99,
  },
  {
    id: '13',
    name: 'HBO Max',
    logo_url: resolvePlatformLogoUrl('HBO Max'),
    category: 'streaming',
    price_amount: 9.99,
    currency: 'EUR',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(16),
    status: 'active',
    is_shared: true,
    shared_with_count: 1,
    card_color: null,
    created_at: '2024-04-10T10:00:00Z',
    updated_at: '2024-04-10T10:00:00Z',
    monthly_equivalent_cost: 9.99,
    my_monthly_cost: 5.00,
  },
  {
    id: '14',
    name: 'Dropbox',
    logo_url: resolvePlatformLogoUrl('Dropbox'),
    category: 'cloud',
    price_amount: 11.99,
    currency: 'EUR',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(6),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2023-11-20T10:00:00Z',
    updated_at: '2023-11-20T10:00:00Z',
    monthly_equivalent_cost: 11.99,
    my_monthly_cost: 11.99,
  },
  {
    id: '15',
    name: 'Adobe Creative Cloud',
    logo_url: resolvePlatformLogoUrl('Adobe Creative Cloud'),
    category: 'productivity',
    price_amount: 59.99,
    currency: 'EUR',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(20),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2023-02-01T10:00:00Z',
    updated_at: '2023-02-01T10:00:00Z',
    monthly_equivalent_cost: 59.99,
    my_monthly_cost: 59.99,
  },
  {
    id: '16',
    name: 'Midjourney',
    logo_url: resolvePlatformLogoUrl('Midjourney'),
    category: 'ai',
    price_amount: 10.00,
    currency: 'US$',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(4),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2024-09-01T10:00:00Z',
    updated_at: '2024-09-01T10:00:00Z',
    monthly_equivalent_cost: 10.00,
    my_monthly_cost: 10.00,
  },
  {
    id: '17',
    name: 'Canva',
    logo_url: resolvePlatformLogoUrl('Canva'),
    category: 'productivity',
    price_amount: 119.99,
    currency: 'EUR',
    billing_period: 'yearly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(120),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2024-02-15T10:00:00Z',
    updated_at: '2024-02-15T10:00:00Z',
    monthly_equivalent_cost: 10.00,
    my_monthly_cost: 10.00,
  },
  {
    id: '18',
    name: 'Xbox Game Pass',
    logo_url: resolvePlatformLogoUrl('Xbox Game Pass'),
    category: 'gaming',
    price_amount: 14.99,
    currency: 'EUR',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(11),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    monthly_equivalent_cost: 14.99,
    my_monthly_cost: 14.99,
  },
  {
    id: '19',
    name: 'Audible',
    logo_url: resolvePlatformLogoUrl('Audible'),
    category: 'music',
    price_amount: 9.99,
    currency: 'EUR',
    billing_period: 'monthly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(17),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2023-12-10T10:00:00Z',
    updated_at: '2023-12-10T10:00:00Z',
    monthly_equivalent_cost: 9.99,
    my_monthly_cost: 9.99,
  },
  {
    id: '20',
    name: 'Strava',
    logo_url: resolvePlatformLogoUrl('Strava'),
    category: 'health',
    price_amount: 59.99,
    currency: 'EUR',
    billing_period: 'yearly',
    billing_interval_count: 1,
    next_billing_date: daysFromNow(200),
    status: 'active',
    is_shared: false,
    shared_with_count: 0,
    card_color: null,
    created_at: '2024-08-20T10:00:00Z',
    updated_at: '2024-08-20T10:00:00Z',
    monthly_equivalent_cost: 5.00,
    my_monthly_cost: 5.00,
  },
];

// ─── PRO 20 ─────────────────────────────────────────────────────────
export const PRO_20_SUBS: Subscription[] = [
  ...BASIC_10_SUBS,
  ...EXTRA_10_SUBS,
];

// ─── Preset registry ───────────────────────────────────────────────
export type AppPreset = 'empty' | 'basic' | 'pro';

export const PRESET_CONFIG: Record<AppPreset, {
  subscriptions: Subscription[];
  isPlusActive: boolean;
}> = {
  empty: { subscriptions: EMPTY_SUBS,    isPlusActive: false },
  basic: { subscriptions: BASIC_10_SUBS, isPlusActive: false },
  pro:   { subscriptions: PRO_20_SUBS,   isPlusActive: true  },
};
