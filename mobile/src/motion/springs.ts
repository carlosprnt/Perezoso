// Phase 2 — Motion tokens: spring configurations
// Every spring is extracted from the Perezoso web app's Framer Motion configs.
// These are NOT generic mobile defaults — they encode the product's motion personality.
//
// Reanimated withSpring config maps to Framer Motion like this:
//   Framer { type:'spring', stiffness, damping, mass }
//   → Reanimated { stiffness, damping, mass, restDisplacementThreshold, restSpeedThreshold }
//
// The web app has 7 distinct spring personalities. Each one exists because the
// interaction it serves has a different feel requirement.

import type { WithSpringConfig } from 'react-native-reanimated';

/**
 * SNAP — DraggableSurface snap-to-position.
 * Tight enough to feel decisive, but with enough mass (0.95) to feel weighty.
 * This is the surface that holds the dashboard cards — it needs to feel solid,
 * not bouncy. restDelta 0.5 prevents micro-oscillation at the end.
 *
 * Web: DraggableSurface.tsx → stiffness 340, damping 36, mass 0.95
 */
export const snap: WithSpringConfig = {
  stiffness: 340,
  damping: 36,
  mass: 0.95,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
};

/**
 * CARD — Sheet/overlay entrance and subscription detail overlay.
 * Slightly less mass (0.85) than snap → faster initial response.
 * Lower damping (32 vs 36) → tiny overshoot that makes sheets feel alive.
 * This is the spring users feel when opening a subscription detail.
 *
 * Web: SubscriptionDetailOverlay.tsx → stiffness 340, damping 32, mass 0.85
 */
export const card: WithSpringConfig = {
  stiffness: 340,
  damping: 32,
  mass: 0.85,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
};

/**
 * TAB — FloatingNav sliding indicator.
 * Highest stiffness (420) in the system → snappiest response.
 * Low mass (0.8) → near-instant reaction to tab changes.
 * This spring makes tab switching feel crisp and responsive.
 * If this is too soft, the nav feels sluggish. If too stiff, it feels mechanical.
 *
 * Web: FloatingNav.tsx → stiffness 420, damping 32, mass 0.8
 */
export const tab: WithSpringConfig = {
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

/**
 * PEEK — Savings carousel peek cards.
 * High stiffness (380) with relatively low damping (30) → noticeable overshoot.
 * This is intentional: peeking cards should feel like they "pop" into view.
 * The overshoot communicates that there's more content to discover.
 *
 * Web: SavingsCarousel.tsx → stiffness 380, damping 30
 */
export const peek: WithSpringConfig = {
  stiffness: 380,
  damping: 30,
  mass: 1,
};

/**
 * SHEET — Paywall and modal sheet entrance.
 * High stiffness (380) with higher damping (34) than peek.
 * Sheets need to feel authoritative — they demand attention.
 * The slight overshoot (less than peek) says "I'm here" without bouncing.
 *
 * Web: PaywallSheet.tsx → stiffness 380, damping 34
 */
export const sheet: WithSpringConfig = {
  stiffness: 380,
  damping: 34,
  mass: 1,
};

/**
 * ELASTIC — Pull-down refresh / elastic gesture.
 * Very high stiffness (400) with heavy damping (50) and low mass (0.8).
 * This creates a rubber-band feel: strong pull-back, almost no overshoot.
 * The high damping prevents the content from bouncing after release.
 *
 * Web: useElasticPullDown.ts → stiffness 400, damping 50, mass 0.8
 */
export const elastic: WithSpringConfig = {
  stiffness: 400,
  damping: 50,
  mass: 0.8,
};

/**
 * EMPHASIS — FloatingNav plus-button default spring.
 * Lower stiffness (300) and lower damping (22) → soft, playful feel.
 * This is used for attention-seeking elements (the "+" add button).
 * It's deliberately softer than everything else to feel inviting.
 *
 * Web: FloatingNav.tsx → stiffness 300, damping 22
 */
export const emphasis: WithSpringConfig = {
  stiffness: 300,
  damping: 22,
  mass: 1,
};

/**
 * PAN_RELEASE — Spring for settling after a pan/drag gesture ends.
 * Uses the snap config but with velocity injection from the gesture.
 * Components should pass `velocity` from the gesture handler.
 */
export const panRelease: WithSpringConfig = {
  ...snap,
};

// ─── Lookup table ───────────────────────────────────────────────────
// For components that receive a spring name as a prop.

export const springs = {
  snap,
  card,
  tab,
  peek,
  sheet,
  elastic,
  emphasis,
  panRelease,
} as const;

export type SpringName = keyof typeof springs;
