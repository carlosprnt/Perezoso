// Phase 1 — Design tokens: z-index
// Derived from Perezoso web app's complete stacking order

export const zIndex = {
  /** Background / base layer */
  base: 0,
  /** Content overlays on surfaces */
  content: 1,
  /** Interactive nav buttons */
  navButton: 2,
  /** Default card z-index, bottom sheet content */
  card: 10,
  /** Sticky headers, fixed dividers */
  sticky: 20,
  /** Floating labels / badges */
  badge: 30,
  /** Modal backdrops */
  modalBackdrop: 40,
  /** Floating nav, dropdown menus */
  floatingNav: 50,
  /** Floating nav backdrop (pick panel) */
  navBackdrop: 54,
  /** Floating nav panel overlay */
  navPanel: 55,
  /** Bottom sheet backdrop */
  sheetBackdrop: 58,
  /** Bottom sheet content */
  sheetContent: 60,
  /** Calendar modal backdrop */
  calendarBackdrop: 200,
  /** Calendar modal content */
  calendarContent: 210,
  /** Savings / insight detail sheets */
  detailSheet: 300,
  /** Edit overlay sheets */
  editOverlay: 420,
  /** Paywall backdrop */
  paywallBackdrop: 500,
  /** Paywall sheet */
  paywallSheet: 501,
  /** Toast / notification overlay */
  toast: 999,
  /** Absolute top (user menu, fixed overlays) */
  top: 9999,
} as const;

export type ZIndexToken = keyof typeof zIndex;
