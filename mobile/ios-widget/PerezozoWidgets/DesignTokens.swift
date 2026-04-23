import SwiftUI

// MARK: - Design tokens matching the React Native app

enum WidgetColors {
    // Light
    static let lightBg = Color(hex: "#F7F8FA")
    static let lightSurface = Color.white
    static let lightText = Color.black
    static let lightTextSecondary = Color(hex: "#616161")
    static let lightTextMuted = Color(hex: "#737373")
    static let lightBorder = Color(hex: "#E8E8E8")

    // Dark
    static let darkBg = Color(hex: "#121212")
    static let darkSurface = Color(hex: "#1C1C1E")
    static let darkText = Color(hex: "#F2F2F7")
    static let darkTextSecondary = Color(hex: "#8E8E93")
    static let darkTextMuted = Color(hex: "#9CA3AF")
    static let darkBorder = Color(hex: "#2C2C2E")

    // Category colors
    static let streaming = Color(hex: "#FECACA")
    static let music = Color(hex: "#BBF7D0")
    static let productivity = Color(hex: "#BFDBFE")
    static let cloud = Color(hex: "#BAE6FD")
    static let ai = Color(hex: "#DDD6FE")
    static let health = Color(hex: "#A7F3D0")
    static let gaming = Color(hex: "#FED7AA")
    static let education = Color(hex: "#FEF08A")
    static let mobility = Color(hex: "#FBCFE8")
    static let home = Color(hex: "#FDE68A")
    static let other = Color(hex: "#E5E7EB")

    static func categoryColor(for category: String) -> Color {
        switch category {
        case "streaming": return streaming
        case "music": return music
        case "productivity": return productivity
        case "cloud": return cloud
        case "ai": return ai
        case "health": return health
        case "gaming": return gaming
        case "education": return education
        case "mobility": return mobility
        case "home": return home
        default: return other
        }
    }

    static func categoryTextColor(for category: String) -> Color {
        switch category {
        case "streaming": return Color(hex: "#991B1B")
        case "music": return Color(hex: "#166534")
        case "productivity": return Color(hex: "#1E40AF")
        case "cloud": return Color(hex: "#0C4A6E")
        case "ai": return Color(hex: "#4C1D95")
        case "health": return Color(hex: "#065F46")
        case "gaming": return Color(hex: "#9A3412")
        case "education": return Color(hex: "#854D0E")
        case "mobility": return Color(hex: "#831843")
        case "home": return Color(hex: "#92400E")
        default: return Color(hex: "#374151")
        }
    }
}

// MARK: - Color hex init

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        if hex.count == 6 {
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        } else {
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}
