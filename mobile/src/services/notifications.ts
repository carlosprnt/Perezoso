// Local renewal reminders.
//
// Schedules a single banner notification per active subscription, fired
// `daysBefore` days ahead of `next_billing_date` at 09:00 local time.
// Backed entirely by `expo-notifications` (the iOS UNUserNotificationCenter
// queue) — no APNs, no backend, fully offline.
//
// We persist a `subscription_id → notification_id` map in AsyncStorage so
// edits and deletions can target the right scheduled notification. Treat
// the map as best-effort: if the OS already delivered the notification,
// `cancelScheduledNotificationAsync` is a no-op and we simply forget the id.

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Subscription } from '../features/subscriptions/types';

// Foreground display: still show the banner if the app happens to be open
// when a reminder fires. Badges stay off — we don't track unread state.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Permission ──────────────────────────────────────────────────────────
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/** Requests notifications permission. Returns true on grant, false on
 *  denial or when iOS has previously denied and won't prompt again. */
export async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied' && !existing.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return status === 'granted';
}

// ── Persistence map ────────────────────────────────────────────────────
const STORAGE_KEY = 'perezoso-notification-ids';

async function readMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: Record<string, string>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ── Public API ─────────────────────────────────────────────────────────
export interface ScheduleArgs {
  daysBefore: number;
  locale: 'es' | 'en';
}

/** Schedules (or re-schedules) a reminder for one subscription.
 *
 *  Returns true if a notification was queued, false if skipped because:
 *    - subscription is paused / cancelled / ended
 *    - next_billing_date is missing or invalid
 *    - the trigger moment (renewal − daysBefore) is already in the past
 */
export async function scheduleRenewalReminder(
  sub: Subscription,
  args: ScheduleArgs,
): Promise<boolean> {
  // Always cancel any previous reminder for this sub first so callers can
  // use this as the single "make-the-state-correct" entry point.
  await cancelRenewalReminder(sub.id);

  if (sub.status !== 'active' && sub.status !== 'trial') return false;
  if (!sub.next_billing_date) return false;

  const renewal = new Date(sub.next_billing_date);
  if (Number.isNaN(renewal.getTime())) return false;

  const trigger = new Date(renewal);
  trigger.setDate(trigger.getDate() - args.daysBefore);
  // Fire at 09:00 local time on the trigger day — less startling than 00:00.
  trigger.setHours(9, 0, 0, 0);

  if (trigger.getTime() <= Date.now()) return false;

  const { title, body } = buildContent(sub, args.daysBefore, args.locale);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { subscriptionId: sub.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });

  const map = await readMap();
  map[sub.id] = notificationId;
  await writeMap(map);
  return true;
}

/** Cancels the pending reminder for one subscription, if any. */
export async function cancelRenewalReminder(subId: string): Promise<void> {
  const map = await readMap();
  const id = map[subId];
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already delivered or invalidated — ignore.
  }
  delete map[subId];
  await writeMap(map);
}

/** Cancels every reminder we've ever scheduled. Called when the user
 *  toggles reminders off. We don't want to leave stale notifications
 *  lingering in the OS queue past the moment the user opted out. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await writeMap({});
}

/** Reschedules reminders for the given subscription set in one shot.
 *
 *  Use cases:
 *    - User flips the global toggle on for the first time.
 *    - Just pulled fresh data from Supabase and `next_billing_date`
 *      values may have advanced since last schedule.
 *
 *  Cancels everything first to avoid duplicates.
 */
export async function rescheduleAllReminders(
  subs: Subscription[],
  args: ScheduleArgs,
): Promise<number> {
  await cancelAllReminders();
  let scheduled = 0;
  for (const sub of subs) {
    const ok = await scheduleRenewalReminder(sub, args);
    if (ok) scheduled += 1;
  }
  return scheduled;
}

// ── Content ────────────────────────────────────────────────────────────
function buildContent(
  sub: Subscription,
  daysBefore: number,
  locale: 'es' | 'en',
): { title: string; body: string } {
  const dateFmt = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
  const dateStr = dateFmt.format(new Date(sub.next_billing_date));
  const priceStr = formatPrice(sub.price_amount, sub.currency, locale);

  if (locale === 'es') {
    const when = daysBefore === 1 ? 'mañana' : `en ${daysBefore} días`;
    return {
      title: `${sub.name} se renueva ${when}`,
      body: `Cobro de ${priceStr} el ${dateStr}.`,
    };
  }
  const when = daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
  return {
    title: `${sub.name} renews ${when}`,
    body: `Charge of ${priceStr} on ${dateStr}.`,
  };
}

function formatPrice(amount: number, currency: string, locale: 'es' | 'en'): string {
  try {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency || ''}`.trim();
  }
}
