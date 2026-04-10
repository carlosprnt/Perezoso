import SwiftUI

/// Base card container matching the web app's card style: white
/// surface, subtle border, rounded corners, optional shadow.
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
    @ViewBuilder let content: () -> Content

    init(_ style: Style = .flat, @ViewBuilder content: @escaping () -> Content) {
        self.style = style
        self.content = content
    }

    var body: some View {
        content()
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
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
                    .foregroundStyle(.textSecondary)
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
