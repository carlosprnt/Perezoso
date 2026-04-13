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

    // MARK: - Scroll-Linked Transitions

    /// Items fade and blur smoothly as they scroll out of the visible area.
    /// Web: dashboard sections + subscription cards use scroll-linked opacity + blur.
    func scrollFadeBlur(maxBlur: CGFloat = 8) -> some View {
        scrollTransition(.interactive) { effect, phase in
            effect
                .opacity(phase.isIdentity ? 1 : 1 - abs(phase.value))
                .blur(radius: phase.isIdentity ? 0 : abs(phase.value) * maxBlur)
        }
    }

    /// Items fade, blur, AND scale as they scroll in/out.
    /// Used for QuickAdd rows: entrance from 0.9→1, exit from 1→0.9.
    func scrollFadeBlurScale(maxBlur: CGFloat = 6, minScale: CGFloat = 0.9) -> some View {
        scrollTransition(.interactive) { effect, phase in
            effect
                .opacity(phase.isIdentity ? 1 : 1 - abs(phase.value))
                .blur(radius: phase.isIdentity ? 0 : abs(phase.value) * maxBlur)
                .scaleEffect(phase.isIdentity ? 1 : 1 - abs(phase.value) * (1 - minScale))
        }
    }
}
