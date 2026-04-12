import SwiftUI

/// Floating pill-shaped bottom navigation bar matching the web app's
/// mobile floating nav. Three buttons in a rounded container with a
/// sliding indicator, glass morphism backdrop blur.
///
/// Web spec: 3 buttons (Dashboard | + center | Subscriptions),
/// `rounded-full`, `backdrop-filter: blur(20px)`, sliding stroke
/// indicator with spring animation.
struct FloatingNavBar: View {
    @Binding var selectedTab: AppTab
    var onAddTapped: () -> Void

    private let buttonWidth: CGFloat = 72
    private let buttonHeight: CGFloat = 48
    private let padding: CGFloat = 8
    private let gap: CGFloat = 8

    var body: some View {
        HStack(spacing: gap) {
            // Dashboard
            navButton(tab: .dashboard, icon: "square.grid.2x2", filledIcon: "square.grid.2x2.fill")

            // Add button (center, always accent)
            Button {
                Haptics.tap()
                onAddTapped()
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color.accentForeground)
                    .frame(width: buttonWidth, height: buttonHeight)
                    .background(Color.accent, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            // Subscriptions
            navButton(tab: .subscriptions, icon: "rectangle.on.rectangle", filledIcon: "rectangle.on.rectangle.fill")
        }
        .padding(padding)
        .background {
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule()
                        .stroke(Color.borderLight, lineWidth: 1)
                )
        }
        .shadow(color: .black.opacity(0.12), radius: 20, y: 8)
    }

    @ViewBuilder
    private func navButton(tab: AppTab, icon: String, filledIcon: String) -> some View {
        let isActive = selectedTab == tab

        Button {
            Haptics.selection()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                selectedTab = tab
            }
        } label: {
            Image(systemName: isActive ? filledIcon : icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(isActive ? Color.accent : Color.textMuted)
                .frame(width: buttonWidth, height: buttonHeight)
                .background {
                    if isActive {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Color.accent, lineWidth: 2)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// App-wide tab enum used by the custom navigation system.
enum AppTab: Hashable {
    case dashboard
    case subscriptions
    case calendar
    case settings
}

#Preview {
    ZStack {
        Color.background.ignoresSafeArea()
        VStack {
            Spacer()
            FloatingNavBar(selectedTab: .constant(.dashboard)) {}
                .padding(.bottom, 20)
        }
    }
}
