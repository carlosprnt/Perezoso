// Mock data for dashboard fidelity testing
// Values match the screenshots provided by the user
// Logo URLs resolved via platform catalog (Google Favicons PNG)

import type { DashboardStats, UpcomingRenewal, CategoryRow, TopSubscription } from './types';
import { resolvePlatformLogoUrl, logoUrlFromDomain } from '../../lib/constants/platforms';

export const MOCK_STATS: DashboardStats = {
  monthlyTotal: 98.26,
  annualTotal: 1179.07,
  totalCount: 10,
  sharedCount: 2,
  savingsMonthly: 8.29,
  currency: 'EUR',
};

export const MOCK_FIRST_NAME = 'Carlos';

export const MOCK_RENEWALS: UpcomingRenewal[] = [
  {
    id: '1',
    name: 'GitHub',
    simpleIconSlug: 'github',
    logoUrl: resolvePlatformLogoUrl('GitHub'),
    monthlyCost: 4.00,
    currency: 'US$',
    daysUntilRenewal: 1,
  },
  {
    id: '2',
    name: 'Notion',
    simpleIconSlug: 'notion',
    logoUrl: resolvePlatformLogoUrl('Notion'),
    monthlyCost: 16.00,
    currency: 'EUR',
    daysUntilRenewal: 3,
  },
  {
    id: '3',
    name: 'Netflix',
    simpleIconSlug: 'netflix',
    logoUrl: resolvePlatformLogoUrl('Netflix'),
    monthlyCost: 6.00,
    currency: 'EUR',
    daysUntilRenewal: 5,
  },
];

export const MOCK_CATEGORIES: CategoryRow[] = [
  { category: 'ai', monthlyCost: 40.00, pct: 41 },
  { category: 'productivity', monthlyCost: 24.00, pct: 24 },
  { category: 'streaming', monthlyCost: 17.28, pct: 18 },
  { category: 'music', monthlyCost: 9.99, pct: 10 },
  { category: 'other', monthlyCost: 6.99, pct: 7 },
];

export const MOCK_TOP_EXPENSIVE: TopSubscription[] = [
  {
    id: '1',
    name: 'ChatGPT Plus',
    simpleIconSlug: 'openai',
    logoUrl: resolvePlatformLogoUrl('ChatGPT Plus'),
    monthlyCost: 20.00,
    currency: 'US$',
    category: 'ai',
  },
  {
    id: '2',
    name: 'Claude Pro',
    simpleIconSlug: 'anthropic',
    logoUrl: resolvePlatformLogoUrl('Claude Pro'),
    monthlyCost: 20.00,
    currency: 'US$',
    category: 'ai',
  },
  {
    id: '3',
    name: 'Notion',
    simpleIconSlug: 'notion',
    logoUrl: resolvePlatformLogoUrl('Notion'),
    monthlyCost: 16.00,
    currency: 'EUR',
    category: 'productivity',
  },
];

export const MOCK_HIGHEST_COST: TopSubscription = MOCK_TOP_EXPENSIVE[0];

export const MOCK_TOP_CATEGORY = {
  name: 'IA',
  monthlyCost: 40.00,
  currency: 'EUR',
  count: 2,
};

// Logo URLs for the inline LogoStack in SummaryHero
// Resolved via platform catalog — Google Favicons API (PNG)
export const MOCK_LOGO_URLS: string[] = [
  logoUrlFromDomain('netflix.com'),
  logoUrlFromDomain('spotify.com'),
  logoUrlFromDomain('openai.com'),
  logoUrlFromDomain('notion.so'),
  logoUrlFromDomain('youtube.com'),
  logoUrlFromDomain('github.com'),
  logoUrlFromDomain('figma.com'),
  logoUrlFromDomain('icloud.com'),
  logoUrlFromDomain('anthropic.com'),
  logoUrlFromDomain('disneyplus.com'),
];
