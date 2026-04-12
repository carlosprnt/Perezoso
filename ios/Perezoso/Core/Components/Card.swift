import SwiftUI

/// Base card container matching the web app's card style.
///
/// Web uses `rounded-[32px]` (32px) for cards. On iOS this maps to
/// `Radius.sheet` for the default card style, matching the web's
/// generous rounded corners.
///
/// ```swift
/// Card { Text("Hello") }
/// Card(.elevated) { SubscriptionRow(sub) }
/// ```
struct Card<Content: View>: View {
    enum Style {
        case flat      // border only
        case elevated  // border + shadow
    }

    let style: Style
    var cornerRadius: CGFloat = Radius.card
    @ViewBuilder let content: () -> Content

    init(
        _ style: Style = .flat,
        cornerRadius: CGFloat = Radius.card,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.style = style
        self.cornerRadius = cornerRadius
        self.content = content
    }

    var body: some View {
        content()
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.borderLight, lineWidth: 1)
            )
            .shadow(
                color: style == .elevated ? .black.opacity(0.06) : .clear,
                radius: 8, y: 4
            )
    }
}

#Preview {
    VStack(spacing: Spacing.lg) {
        Card {
            HStack {
                Text("Netflix")
                    .font(.headline)
                Spacer()
                Text("12,99 €")
                    .font(.bodyMedium)
                    .foregroundStyle(Color.textSecondary)
            }
            .padding()
        }
        Card(.elevated) {
            Text("Con sombra")
                .padding()
        }
    }
    .padding()
    .background(Color.background)
}
