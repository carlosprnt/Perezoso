import SwiftUI

// MARK: - Perezoso brand palette
//
// Values copied from the web design system (app/globals.css @theme).
// Each color resolves to the light-mode hex and has a dark-mode
// companion via adaptive Color init where needed.

extension Color {
    // ── Surfaces ────────────────────────────────────────────
    static let background       = Color(light: "#F7F8FA", dark: "#121212")
    static let surface          = Color(light: "#FFFFFF", dark: "#1C1C1E")
    static let surfaceSecondary = Color(light: "#F5F5F5", dark: "#2C2C2E")

    // ── Borders ─────────────────────────────────────────────
    static let border           = Color(light: "#D4D4D4", dark: "#3A3A3C")
    static let borderLight      = Color(light: "#E8E8E8", dark: "#2C2C2E")
    static let borderStrong     = Color(light: "#A3A3A3", dark: "#636366")

    // ── Text ────────────────────────────────────────────────
    static let textPrimary      = Color(light: "#121212", dark: "#F2F2F7")
    static let textSecondary    = Color(light: "#424242", dark: "#AEAEB2")
    static let textMuted        = Color(light: "#616161", dark: "#8E8E93")
    static let textDisabled     = Color(light: "#9E9E9E", dark: "#636366")

    // ── Accent ──────────────────────────────────────────────
    static let accent           = Color(hex: "#3D3BF3")
    static let accentLight      = Color(light: "#E8E8FF", dark: "#2A2A6E")
    static let accentForeground = Color.white

    // ── Semantic ────────────────────────────────────────────
    static let success          = Color(light: "#166534", dark: "#4ADE80")
    static let warning          = Color(light: "#92400E", dark: "#FBBF24")
    static let danger           = Color(light: "#991B1B", dark: "#F87171")
}

// MARK: - Hex initialiser

extension Color {
    /// Creates a Color from a hex string like `"#3D3BF3"` or `"3D3BF3"`.
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .init(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        let r = Double((rgb >> 16) & 0xFF) / 255
        let g = Double((rgb >> 8) & 0xFF) / 255
        let b = Double(rgb & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }

    /// Adaptive color that switches between light and dark hex values.
    init(light: String, dark: String) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: dark))
                : UIColor(Color(hex: light))
        })
    }
}
