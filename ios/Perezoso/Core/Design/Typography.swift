import SwiftUI

// MARK: - System Rounded font helpers
//
// The web app uses `font-family: ui-rounded, "SF Pro Rounded"`.
// On iOS we match this exactly with `.system(.body, design: .rounded)`.
// This provides SF Pro Rounded natively without bundling fonts.

extension Font {
    static func rounded(_ weight: Font.Weight, size: CGFloat) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    // ── Semantic shortcuts ──────────────────────────────────
    /// Hero number — big bold number on the dashboard
    static let heroNumber  = rounded(.heavy, size: 34)
    /// Page / sheet title
    static let title       = rounded(.heavy, size: 28)
    /// Section header
    static let headline    = rounded(.bold, size: 17)
    /// Body text
    static let bodyMedium  = rounded(.medium, size: 15)
    /// Secondary body
    static let bodyRegular = rounded(.regular, size: 15)
    /// Footnote / caption
    static let caption     = rounded(.medium, size: 12)
    /// Tiny label (badges, dot hints)
    static let micro       = rounded(.semibold, size: 11)
    /// Large statement text (like dashboard hero subtitle)
    static let largeStatement = rounded(.heavy, size: 25)
}
