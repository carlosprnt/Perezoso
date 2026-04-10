import Foundation

/// User profile from the `profiles` table. Created by a Supabase
/// trigger when a new user signs up via OAuth.
struct Profile: Codable, Identifiable, Sendable {
    let id: UUID
    var email: String?
    var fullName: String?
    var avatarUrl: String?
    var isPro: Bool
    var createdAt: Date?
    var updatedAt: Date?

    /// Display name: full name if set, email prefix, or "User".
    var displayName: String {
        if let fullName, !fullName.isEmpty { return fullName }
        if let email { return String(email.prefix(while: { $0 != "@" })) }
        return "User"
    }

    /// First name only (for "Hola, Carlos." greeting).
    var firstName: String {
        displayName.components(separatedBy: " ").first ?? displayName
    }
}

extension Profile {
    static let mock = Profile(
        id: UUID(),
        email: "carlos@example.com",
        fullName: "Carlos Pérez",
        avatarUrl: nil,
        isPro: false,
        createdAt: .now,
        updatedAt: .now
    )
}
