import SwiftUI

// MARK: - Perezoso brand palette
//
// Values aligned with the web design system (app/globals.css @theme).
// Web uses pure black as accent color. Each color resolves adaptively
// between light and dark mode hex values.

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
    static let textPrimary      = Color(light: "#000000", dark: "#F2F2F7")
    static let textSecondary    = Color(light: "#616161", dark: "#AEAEB2")
    static let textMuted        = Color(light: "#737373", dark: "#8E8E93")
    static let textDisabled     = Color(light: "#9E9E9E", dark: "#636366")

    // ── Accent (matches web: black in light, inverts in dark) ──
    static let accent           = Color(light: "#000000", dark: "#F2F2F7")
    static let accentLight      = Color(light: "#F0F0F0", dark: "#2C2C2E")
    static let accentForeground = Color(light: "#FFFFFF", dark: "#000000")

    // ── Semantic ────────────────────────────────────────────
    static let success          = Color(light: "#166534", dark: "#4ADE80")
    static let warning          = Color(light: "#92400E", dark: "#FBBF24")
    static let danger           = Color(light: "#991B1B", dark: "#F87171")
}

// MARK: - Subscription card color presets (matching web)

struct CardColorPreset: Identifiable, Hashable {
    let id: String
    let label: String
    let background: String
    let border: String
    let text: String
    let subtitle: String
    let isDark: Bool
}

extension CardColorPreset {
    static let presets: [CardColorPreset] = [
        .init(id: "white",    label: "Blanco",    background: "#FFFFFF", border: "#E8E8E8", text: "#121212", subtitle: "#737373", isDark: false),
        .init(id: "black",    label: "Negro",     background: "#121212", border: "#121212", text: "#FFFFFF", subtitle: "#737373", isDark: true),
        .init(id: "navy",     label: "Azul marino", background: "#1A3B8A", border: "#1A3B8A", text: "#FFFFFF", subtitle: "#8BA8D4", isDark: true),
        .init(id: "teal",     label: "Turquesa",  background: "#B8E8F0", border: "#B8E8F0", text: "#0A3D4A", subtitle: "#3A7A88", isDark: false),
        .init(id: "lime",     label: "Lima",      background: "#C4EDA8", border: "#C4EDA8", text: "#1A3D08", subtitle: "#4A7A28", isDark: false),
        .init(id: "lavender", label: "Lavanda",   background: "#E0D8FF", border: "#E0D8FF", text: "#2D1A6B", subtitle: "#6B5BAA", isDark: false),
        .init(id: "peach",    label: "Melocotón", background: "#FFE4CC", border: "#FFE4CC", text: "#5C2A00", subtitle: "#9A6040", isDark: false),
        .init(id: "rose",     label: "Rosa",      background: "#FFD6E0", border: "#FFD6E0", text: "#5C0A1A", subtitle: "#9A4060", isDark: false),
        .init(id: "midnight", label: "Medianoche", background: "#1C2B3A", border: "#1C2B3A", text: "#FFFFFF", subtitle: "#5A8A9F", isDark: true),
        .init(id: "forest",   label: "Bosque",    background: "#2D5A27", border: "#2D5A27", text: "#FFFFFF", subtitle: "#7ABF70", isDark: true),
        .init(id: "plum",     label: "Ciruela",   background: "#6C3483", border: "#6C3483", text: "#FFFFFF", subtitle: "#C39BD3", isDark: true),
        .init(id: "mint",     label: "Menta",     background: "#B5EAD7", border: "#B5EAD7", text: "#0A3D2A", subtitle: "#3A7A60", isDark: false),
        .init(id: "ice",      label: "Hielo",     background: "#D6EAF8", border: "#D6EAF8", text: "#0A2A4A", subtitle: "#3A6A8A", isDark: false),
        .init(id: "apricot",  label: "Albaricoque", background: "#FAD7A0", border: "#FAD7A0", text: "#5C2A00", subtitle: "#9A6040", isDark: false),
        .init(id: "sand",     label: "Arena",     background: "#E8D5B7", border: "#E8D5B7", text: "#3D2800", subtitle: "#7A5A30", isDark: false),
        .init(id: "gold",     label: "Oro",       background: "#F4D03F", border: "#F4D03F", text: "#3D2800", subtitle: "#7A5000", isDark: false),
    ]

    static func preset(for id: String?) -> CardColorPreset {
        guard let id else { return presets[0] }
        return presets.first(where: { $0.id == id }) ?? presets[0]
    }
}

// MARK: - Status colors on subscription cards

extension Subscription.Status {
    var lightColor: Color {
        switch self {
        case .active:    Color(hex: "#16A34A")
        case .trial:     Color(hex: "#D97706")
        case .paused:    Color(hex: "#9CA3AF")
        case .cancelled: Color(hex: "#EF4444")
        }
    }

    var darkColor: Color {
        switch self {
        case .active:    Color(hex: "#4ADE80")
        case .trial:     Color(hex: "#FCD34D")
        case .paused:    Color(hex: "#9CA3AF")
        case .cancelled: Color(hex: "#F87171")
        }
    }
}

// MARK: - Category colors (matching web)

extension Subscription.Category {
    var categoryColor: Color {
        switch self {
        case .streaming:    Color(hex: "#FECACA")
        case .music:        Color(hex: "#BBF7D0")
        case .productivity: Color(hex: "#BFDBFE")
        case .cloud:        Color(hex: "#BAE6FD")
        case .gaming:       Color(hex: "#FED7AA")
        case .health:       Color(hex: "#A7F3D0")
        case .education:    Color(hex: "#FEF08A")
        case .finance:      Color(hex: "#E5E7EB")
        case .news:         Color(hex: "#FDE68A")
        case .social:       Color(hex: "#FBCFE8")
        case .food:         Color(hex: "#FED7AA")
        case .shopping:     Color(hex: "#DDD6FE")
        case .utilities:    Color(hex: "#D1D5DB")
        case .other:        Color(hex: "#E5E7EB")
        }
    }
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
