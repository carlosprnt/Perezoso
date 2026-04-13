import SwiftUI

/// Floating pill-shaped bottom navigation bar matching the web's
/// FloatingNav.tsx exactly.
///
/// Web spec:
/// - Background: rgba(255,255,255,0.65) light / rgba(28,28,30,0.85) dark
/// - Backdrop blur: 20px
/// - 3 buttons: Dashboard | + center | Subscriptions
/// - Button size: 72×48, center button rounded-full with accent bg
/// - Non-active buttons: 1.5px solid border (#E5E5EA light / #2C2C2E dark)
/// - Sliding stroke indicator: 2px solid accent, spring animated
struct FloatingNavBar: View {
    @Binding var selectedTab: AppTab
    var onAddTapped: () -> Void
    var emphasizeAdd: Bool = false
    @Environment(\.colorScheme) private var colorScheme

    private let buttonWidth: CGFloat = 72
    private let buttonHeight: CGFloat = 48
    private let pad: CGFloat = 8
    private let gap: CGFloat = 8

    private var isDark: Bool { colorScheme == .dark }

    /// Web: scale [1, 1.15, 1], duration 1.6s, repeat Infinity, easeInOut
    @State private var addPulse = false

    var body: some View {
        ZStack {
            // ── Pill background ──────────────────────────────
            Capsule()
                .fill(
                    isDark
                        ? Color(red: 28/255, green: 28/255, blue: 30/255).opacity(0.85)
                        : Color.white.opacity(0.65)
                )
                .background {
                    Capsule()
                        .fill(.ultraThinMaterial)
                }

            // ── Sliding stroke indicator ─────────────────────
            // Web: spring stiffness:420, damping:32, mass:0.8
            let indicatorOffset = selectedTab == .subscriptions
                ? 2 * (buttonWidth + gap)
                : 0.0

            Capsule()
                .stroke(Color.accent, lineWidth: 2)
                .frame(width: buttonWidth, height: buttonHeight)
                .offset(x: -((buttonWidth + gap)) + indicatorOffset)
                .animation(.spring(MotionSpring.tabIndicator), value: selectedTab)

            // ── Buttons ──────────────────────────────────────
            HStack(spacing: gap) {
                // Dashboard
                navButton(
                    tab: .dashboard,
                    icon: "square.grid.2x2",
                    filledIcon: "square.grid.2x2.fill"
                )

                // + button — accent bg, always rounded-full
                // Web: pulse scale [1, 1.15, 1] when no subscriptions
                Button {
                    Haptics.tap()
                    onAddTapped()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color.accentForeground)
                        .frame(width: buttonWidth, height: buttonHeight)
                        .background(Color.accent, in: Capsule())
                        .scaleEffect(addPulse ? 1.15 : 1.0)
                }
                .onChange(of: emphasizeAdd) { _, shouldPulse in
                    if shouldPulse {
                        withAnimation(
                            .easeInOut(duration: MotionTiming.addPulseDuration)
                            .repeatForever(autoreverses: true)
                        ) {
                            addPulse = true
                        }
                    } else {
                        withAnimation(.easeOut(duration: 0.2)) {
                            addPulse = false
                        }
                    }
                }
                .onAppear {
                    if emphasizeAdd {
                        withAnimation(
                            .easeInOut(duration: MotionTiming.addPulseDuration)
                            .repeatForever(autoreverses: true)
                        ) {
                            addPulse = true
                        }
                    }
                }

                // Subscriptions
                navButton(
                    tab: .subscriptions,
                    icon: "rectangle.on.rectangle",
                    filledIcon: "rectangle.on.rectangle.fill"
                )
            }
        }
        .padding(pad)
        .fixedSize()
        .shadow(color: .black.opacity(0.12), radius: 20, y: 8)
    }

    @ViewBuilder
    private func navButton(tab: AppTab, icon: String, filledIcon: String) -> some View {
        let isActive = selectedTab == tab

        Button {
            Haptics.selection()
            withAnimation(.spring(MotionSpring.tabIndicator)) {
                selectedTab = tab
            }
        } label: {
            Image(systemName: isActive ? filledIcon : icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(Color.accent)
                .frame(width: buttonWidth, height: buttonHeight)
                .overlay {
                    if !isActive {
                        Capsule()
                            .stroke(
                                isDark
                                    ? Color(hex: "#2C2C2E")
                                    : Color(hex: "#E5E5EA"),
                                lineWidth: 1.5
                            )
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
