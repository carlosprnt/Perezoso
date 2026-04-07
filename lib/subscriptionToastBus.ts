/**
 * Minimal event bus for subscription action toasts.
 * SubscriptionForm emits; SubscriptionToastHost (in the dashboard layout)
 * listens and renders the toast. This keeps the toast alive across sheet
 * open/close cycles because the host component never unmounts.
 */

export type SubscriptionToastKind = 'created' | 'updated' | 'deleted'

type Listener = (kind: SubscriptionToastKind) => void
const listeners = new Set<Listener>()

export const subscriptionToastBus = {
  emit(kind: SubscriptionToastKind) {
    listeners.forEach(l => l(kind))
  },
  on(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
