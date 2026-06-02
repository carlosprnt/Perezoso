import SwiftUI

/// Standard spacing scale matching the web Tailwind config.
///
/// Usage: `.padding(.horizontal, Spacing.md)` or
/// `VStack(spacing: Spacing.sm)`
enum Spacing {
    /// 4 pt
    static let xxs: CGFloat = 4
    /// 6 pt
    static let xs: CGFloat = 6
    /// 8 pt
    static let sm: CGFloat = 8
    /// 12 pt
    static let md: CGFloat = 12
    /// 16 pt
    static let lg: CGFloat = 16
    /// 20 pt
    static let xl: CGFloat = 20
    /// 24 pt
    static let xxl: CGFloat = 24
    /// 32 pt
    static let xxxl: CGFloat = 32
}

/// Standard corner radius scale.
enum Radius {
    /// 6 pt — small chips, badges
    static let sm: CGFloat = 6
    /// 10 pt — inputs, small cards
    static let md: CGFloat = 10
    /// 14 pt — logo tiles, floating logos
    static let lg: CGFloat = 14
    /// 24 pt — subscription cards (web rounded-3xl)
    static let xl: CGFloat = 24
    /// 32 pt — cards, bottom sheet top corners (web rounded-[32px])
    static let card: CGFloat = 32
    /// 32 pt — bottom sheet top corners
    static let sheet: CGFloat = 32
    /// 40 pt — login panel top corners
    static let panel: CGFloat = 40
}
