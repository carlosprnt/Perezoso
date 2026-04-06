/**
 * Event taxonomy for Perezoso product analytics.
 *
 * Rules:
 *   - snake_case
 *   - product-focused (not UI-mechanics)
 *   - one event per meaningful user intent / outcome
 *   - property set per event is disciplined (see EventPropsMap)
 *
 * Cross-platform: these constants are pure strings so the same
 * taxonomy can be reused verbatim from iOS and Android clients.
 */

// ── Acquisition / Activation ────────────────────────────────────────────────
export const SIGNUP_STARTED              = 'signup_started'
export const SIGNUP_COMPLETED            = 'signup_completed'
export const LOGIN_COMPLETED             = 'login_completed'
export const LOGOUT                      = 'logout'

// ── Subscription lifecycle ──────────────────────────────────────────────────
export const SUBSCRIPTION_CREATED        = 'subscription_created'
export const FIRST_SUBSCRIPTION_CREATED  = 'first_subscription_created'
export const SUBSCRIPTION_UPDATED        = 'subscription_updated'
export const SUBSCRIPTION_DELETED        = 'subscription_deleted'
export const PLATFORM_SELECTED           = 'platform_selected'
export const MANUAL_SUBSCRIPTION_CREATED = 'manual_subscription_created'

// ── Gmail-assisted detection ────────────────────────────────────────────────
export const GMAIL_DETECTION_STARTED     = 'gmail_detection_started'
export const GMAIL_DETECTION_COMPLETED   = 'gmail_detection_completed'
export const GMAIL_CANDIDATE_ADDED       = 'gmail_candidate_added'
export const GMAIL_PERMISSION_DENIED     = 'gmail_permission_denied'

// ── Engagement — screens ────────────────────────────────────────────────────
export const DASHBOARD_VIEWED            = 'dashboard_viewed'
export const SUBSCRIPTIONS_LIST_VIEWED   = 'subscriptions_list_viewed'
export const CALENDAR_VIEWED             = 'calendar_viewed'
export const SUBSCRIPTION_DETAIL_VIEWED  = 'subscription_detail_viewed'

// ── Engagement — actions ────────────────────────────────────────────────────
export const SORT_CHANGED                = 'sort_changed'
export const FILTER_APPLIED              = 'filter_applied'
export const SHARE_DATA_CLICKED          = 'share_data_clicked'

// ── Reminders & savings ─────────────────────────────────────────────────────
export const REMINDER_CARD_VIEWED        = 'reminder_card_viewed'
export const REMINDER_ACTIVATED          = 'reminder_activated'
export const REMINDER_TRIGGERED          = 'reminder_triggered'
export const SAVINGS_CARD_VIEWED         = 'savings_card_viewed'
export const SAVINGS_DETAILS_OPENED      = 'savings_details_opened'
export const YEARLY_REMINDER_SHEET_OPENED = 'yearly_reminder_sheet_opened'

// ── Retention ──────────────────────────────────────────────────────────────
export const SESSION_STARTED             = 'session_started'
export const RENEWAL_REVIEWED            = 'renewal_reviewed'
export const NOTIFICATION_OPENED         = 'notification_opened'

// ── Health / errors ────────────────────────────────────────────────────────
export const ERROR_SHOWN                 = 'error_shown'
export const API_REQUEST_FAILED          = 'api_request_failed'
export const NOTIFICATION_PERMISSION_DENIED = 'notification_permission_denied'
export const IMAGE_LOAD_FAILED           = 'image_load_failed'
export const EMPTY_STATE_SEEN            = 'empty_state_seen'

// ── Shared property types ──────────────────────────────────────────────────
export type Platform = 'web' | 'ios' | 'android'
export type SubscriptionSource = 'manual' | 'gmail' | 'imported' | 'detected'
export type ScreenName =
  | 'dashboard'
  | 'subscriptions'
  | 'calendar'
  | 'subscription_detail'
  | 'subscription_form'
  | 'login'

interface SubscriptionProps {
  subscription_id?: string
  subscription_name?: string
  billing_period?: string
  is_shared?: boolean
  category?: string
  amount?: number
  currency?: string
  source?: SubscriptionSource
}

interface ReminderProps {
  reminder_enabled?: boolean
  reminder_days_before?: number
}

/**
 * Disciplined property map: each event declares exactly which
 * properties it accepts. Events not listed here accept no properties.
 * This keeps the taxonomy clean without requiring a huge generic bag.
 */
export interface EventPropsMap {
  [SIGNUP_STARTED]: { method?: 'email' | 'google' }
  [SIGNUP_COMPLETED]: { method?: 'email' | 'google' }
  [LOGIN_COMPLETED]: { method?: 'email' | 'google' }
  [LOGOUT]: Record<string, never>

  [SUBSCRIPTION_CREATED]: SubscriptionProps
  [FIRST_SUBSCRIPTION_CREATED]: SubscriptionProps
  [SUBSCRIPTION_UPDATED]: SubscriptionProps
  [SUBSCRIPTION_DELETED]: SubscriptionProps
  [PLATFORM_SELECTED]: { platform_name: string }
  [MANUAL_SUBSCRIPTION_CREATED]: SubscriptionProps

  [GMAIL_DETECTION_STARTED]: Record<string, never>
  [GMAIL_DETECTION_COMPLETED]: { candidates_found: number }
  [GMAIL_CANDIDATE_ADDED]: { platform_name?: string }
  [GMAIL_PERMISSION_DENIED]: Record<string, never>

  [DASHBOARD_VIEWED]: { has_subscriptions: boolean; subscription_count: number }
  [SUBSCRIPTIONS_LIST_VIEWED]: { subscription_count: number }
  [CALENDAR_VIEWED]: Record<string, never>
  [SUBSCRIPTION_DETAIL_VIEWED]: { subscription_id: string; category?: string }

  [SORT_CHANGED]: { sort_mode: string }
  [FILTER_APPLIED]: { filter_type: 'status' | 'category'; value: string }
  [SHARE_DATA_CLICKED]: Record<string, never>

  [REMINDER_CARD_VIEWED]: Record<string, never>
  [REMINDER_ACTIVATED]: ReminderProps & { subscription_id: string }
  [REMINDER_TRIGGERED]: ReminderProps & { subscription_id: string }
  [SAVINGS_CARD_VIEWED]: Record<string, never>
  [SAVINGS_DETAILS_OPENED]: Record<string, never>
  [YEARLY_REMINDER_SHEET_OPENED]: Record<string, never>

  [SESSION_STARTED]: Record<string, never>
  [RENEWAL_REVIEWED]: { subscription_id: string }
  [NOTIFICATION_OPENED]: { subscription_id?: string }

  [ERROR_SHOWN]: { screen: ScreenName; message?: string; code?: string }
  [API_REQUEST_FAILED]: { endpoint: string; status?: number }
  [NOTIFICATION_PERMISSION_DENIED]: Record<string, never>
  [IMAGE_LOAD_FAILED]: { url: string }
  [EMPTY_STATE_SEEN]: { screen: ScreenName }
}

export type EventName = keyof EventPropsMap
