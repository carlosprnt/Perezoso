import SwiftUI

// MARK: - Motion Constants
// Matches the web app's Framer Motion spring configs and CSS timing curves exactly.

/// Reusable spring configurations matching the web's Framer Motion values.
enum MotionSpring {
    /// Card stack spring (web: stiffness:340, damping:32, mass:0.85)
    /// Used for subscription wallet cards, detail overlays.
    static let card = Spring(mass: 0.85, stiffness: 340, damping: 32)

    /// Tab indicator spring (web: stiffness:420, damping:32, mass:0.8)
    /// Used for floating nav active indicator.
    static let tabIndicator = Spring(mass: 0.8, stiffness: 420, damping: 32)

    /// Elastic pull-down spring (web: stiffness:400, damping:50, mass:0.8)
    /// Overdamped — snaps back without oscillation.
    static let elastic = Spring(mass: 0.8, stiffness: 400, damping: 50)

    /// Draggable surface snap spring (web: stiffness:340, damping:36, mass:0.95)
    static let snap = Spring(mass: 0.95, stiffness: 340, damping: 36)

    /// Peek card stacking spring (web: stiffness:380, damping:30)
    static let peek = Spring(mass: 1.0, stiffness: 380, damping: 30)

    /// Sheet/overlay spring — used for paywall, sheet springs.
    static let sheet = Spring(mass: 1.0, stiffness: 380, damping: 34)
}

/// Reusable timing curves matching the web's CSS cubic-bezier values.
enum MotionCurve {
    /// Entrance/fade-in (web: [0.22, 1, 0.36, 1]) — fast decelerate.
    /// Used for card entry, toast entry.
    static func entrance(duration: Double = 0.4) -> Animation {
        .timingCurve(0.22, 1, 0.36, 1, duration: duration)
    }

    /// Exit/dismiss (web: [0.4, 0, 1, 1]) — accelerate out.
    /// Used for toast exit, sheet dismiss.
    static func exit(duration: Double = 0.28) -> Animation {
        .timingCurve(0.4, 0, 1, 1, duration: duration)
    }

    /// Decelerate (web: --ease-decelerate [0, 0, 0, 1]).
    /// Used for sheet slide-up, filter dropdown.
    static func decelerate(duration: Double = 0.3) -> Animation {
        .timingCurve(0, 0, 0, 1, duration: duration)
    }

    /// Overshoot bounce (web: [0.34, 1.56, 0.64, 1]).
    /// Used for sheet peek hint.
    static func overshoot(duration: Double = 0.38) -> Animation {
        .timingCurve(0.34, 1.56, 0.64, 1, duration: duration)
    }

    /// Subtle entrance (web: [0.16, 1, 0.3, 1]).
    /// Used for add panel expansion.
    static func subtle(duration: Double = 0.28) -> Animation {
        .timingCurve(0.16, 1, 0.3, 1, duration: duration)
    }

    /// Standard ease (web: --ease-standard [0.2, 0, 0, 1]).
    static func standard(duration: Double = 0.3) -> Animation {
        .timingCurve(0.2, 0, 0, 1, duration: duration)
    }
}

/// Stagger delay per item (web: index * 0.055s for subscription cards).
enum MotionTiming {
    static let cardStagger: Double = 0.055
    static let rowStagger: Double = 0.05
    static let sectionStagger: Double = 0.08

    static let sheetEntrance: Double = 0.3
    static let sheetDismiss: Double = 0.28
    static let peekBounceDelay: Double = 0.34
    static let peekBounceDuration: Double = 0.38
    static let peekSnapDuration: Double = 0.36

    static let filterDropdown: Double = 0.18
    static let addPulseDuration: Double = 1.6
}

// MARK: - View Modifiers

/// Staggered entrance animation matching the web's card entry:
/// y: 60→0, opacity: 0→1, scale: startScale→1, duration 0.4s, easing [0.22,1,0.36,1], delay index*stagger.
struct StaggeredEntrance: ViewModifier {
    let index: Int
    let stagger: Double
    let offsetY: CGFloat
    let duration: Double
    let startScale: CGFloat

    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : offsetY)
            .scaleEffect(appeared ? 1 : startScale)
            .animation(
                MotionCurve.entrance(duration: duration)
                    .delay(Double(index) * stagger),
                value: appeared
            )
            .onAppear {
                appeared = true
            }
    }
}

/// Fade-in entrance with optional delay.
struct FadeEntrance: ViewModifier {
    let delay: Double
    let duration: Double

    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .animation(
                MotionCurve.entrance(duration: duration).delay(delay),
                value: appeared
            )
            .onAppear {
                appeared = true
            }
    }
}

/// Continuous scroll-driven blur using `.visualEffect` (iOS 17+).
///
/// Reads each item's frame relative to the scroll viewport every frame and computes
/// blur + opacity + optional scale from the item's distance to the viewport edges.
/// No re-renders — runs entirely on the GPU composition layer.
///
/// Layout:
/// ```
/// ┌─── viewport ────────────────┐
/// │  ▓▓▓  transition zone (blur)│  ← top ~22 %
/// │                             │
/// │       sharp zone (crisp)    │  ← center ~55 %
/// │                             │
/// │  ▓▓▓  transition zone (blur)│  ← bottom ~22 %
/// └─────────────────────────────┘
/// ```
struct ScrollDrivenBlur: ViewModifier {
    var maxBlur: CGFloat = 10
    /// Fraction of viewport center that stays fully sharp (0.0–1.0).
    var sharpFraction: CGFloat = 0.55
    var fadeOpacity: Bool = true
    /// Minimum scale at viewport edge. Set to 1.0 to disable scaling.
    var minScale: CGFloat = 1.0

    func body(content: Content) -> some View {
        content
            .visualEffect { effect, proxy in
                let scrollBounds = proxy.bounds(of: .scrollView(axis: .vertical))
                guard let scrollBounds, scrollBounds.height > 0 else {
                    return effect.blur(radius: 0).opacity(1).scaleEffect(1)
                }

                let frame = proxy.frame(in: .scrollView(axis: .vertical))

                // Item center normalised within viewport: 0 = top edge, 1 = bottom edge
                let center = (frame.midY - scrollBounds.minY) / scrollBounds.height

                // Sharp zone boundaries
                let edge = (1 - sharpFraction) / 2
                let lo = edge
                let hi = 1 - edge

                // Progress: 0 inside sharp zone → 1 at viewport edge → >1 beyond
                let progress: CGFloat
                if center < lo {
                    progress = (lo - center) / edge
                } else if center > hi {
                    progress = (center - hi) / edge
                } else {
                    progress = 0
                }

                let t = min(max(progress, 0), 1)
                let curved = t * t // ease-in ramp — gentle near sharp zone, steep near edge

                return effect
                    .blur(radius: curved * maxBlur)
                    .opacity(fadeOpacity ? 1 - curved * 0.55 : 1)
                    .scaleEffect(minScale < 1 ? 1 - curved * (1 - minScale) : 1)
            }
    }
}

extension View {
    /// Staggered entrance: slides up from offsetY with fade + optional scale, delayed by index.
    /// Matches web's card entry animation exactly.
    func staggeredEntrance(
        index: Int,
        stagger: Double = MotionTiming.cardStagger,
        offsetY: CGFloat = 60,
        duration: Double = 0.4,
        startScale: CGFloat = 1.0
    ) -> some View {
        modifier(StaggeredEntrance(
            index: index,
            stagger: stagger,
            offsetY: offsetY,
            duration: duration,
            startScale: startScale
        ))
    }

    /// Simple fade-in entrance with optional delay.
    func fadeEntrance(delay: Double = 0, duration: Double = 0.35) -> some View {
        modifier(FadeEntrance(delay: delay, duration: duration))
    }

    // MARK: - Scroll-Driven Blur

    /// Continuous position-based blur: items are crisp in the center of the viewport
    /// and progressively blur + fade as they approach the top/bottom edges.
    /// Matches the web app's scroll-linked blur behavior.
    func scrollDrivenBlur(
        maxBlur: CGFloat = 10,
        sharpFraction: CGFloat = 0.55,
        fadeOpacity: Bool = true,
        minScale: CGFloat = 1.0
    ) -> some View {
        modifier(ScrollDrivenBlur(
            maxBlur: maxBlur,
            sharpFraction: sharpFraction,
            fadeOpacity: fadeOpacity,
            minScale: minScale
        ))
    }
}
