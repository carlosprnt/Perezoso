import SwiftUI

// MARK: - Inter font helpers
//
// The Inter font files must be added to the Xcode target and listed
// in Info.plist → "Fonts provided by application". If Inter is not
// available at runtime the helpers fall back to the system font so
// the app never crashes on a missing font.

extension Font {
    static func inter(_ weight: Font.Weight, size: CGFloat) -> Font {
        let name: String = switch weight {
        case .ultraLight: "Inter-Thin"
        case .light:      "Inter-Light"
        case .regular:    "Inter-Regular"
        case .medium:     "Inter-Medium"
        case .semibold:   "Inter-SemiBold"
        case .bold:       "Inter-Bold"
        case .heavy:      "Inter-ExtraBold"
        case .black:      "Inter-Black"
        default:          "Inter-Regular"
        }
        return .custom(name, size: size, relativeTo: .body)
    }

    // ── Semantic shortcuts ──────────────────────────────────
    /// Hero number — big bold number on the dashboard
    static let heroNumber  = inter(.heavy, size: 34)
    /// Page / sheet title
    static let title       = inter(.heavy, size: 28)
    /// Section header
    static let headline    = inter(.bold, size: 17)
    /// Body text
    static let bodyMedium  = inter(.medium, size: 15)
    /// Secondary body
    static let bodyRegular = inter(.regular, size: 15)
    /// Footnote / caption
    static let caption     = inter(.medium, size: 12)
    /// Tiny label (badges, dot hints)
    static let micro       = inter(.semibold, size: 11)
}
