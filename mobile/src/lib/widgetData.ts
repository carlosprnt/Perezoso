// Bridge to write subscription data into the iOS App Group container
// so WidgetKit widgets can read it. On Android this is a no-op.

import { Platform, NativeModules } from 'react-native';
import type { Subscription } from '../features/subscriptions/types';

const APP_GROUP = 'group.com.perezoso.app';

interface WidgetSharedData {
  subscriptions: WidgetSubscription[];
  currency: string;
  updatedAt: string;
}

interface WidgetSubscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  nextBillingDate: string;
  status: string;
  category: string;
  cardColor: string | null;
  monthlyEquivalent: number;
  logoUrl: string | null;
}

function toWidgetSub(s: Subscription): WidgetSubscription {
  return {
    id: s.id,
    name: s.name,
    price: s.price_amount,
    currency: s.currency,
    billingPeriod: s.billing_period,
    nextBillingDate: s.next_billing_date,
    status: s.status,
    category: s.category,
    cardColor: s.card_color,
    monthlyEquivalent: s.monthly_equivalent_cost,
    logoUrl: s.logo_url,
  };
}

export async function syncWidgetData(
  subscriptions: Subscription[],
  currency: string,
): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const data: WidgetSharedData = {
    subscriptions: subscriptions
      .filter((s) => s.status === 'active' || s.status === 'trial')
      .map(toWidgetSub),
    currency,
    updatedAt: new Date().toISOString(),
  };

  try {
    const { WidgetDataModule } = NativeModules;
    if (WidgetDataModule?.writeSharedData) {
      await WidgetDataModule.writeSharedData(APP_GROUP, JSON.stringify(data));
    }
  } catch {
    // Widget sync is best-effort — never block the app
  }
}
