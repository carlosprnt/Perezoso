import SwiftUI

/// Colored subscription card matching the web's SubscriptionCard
/// component with 16 color presets, progress bar, status indicator,
/// and billing period info.
///
/// Web uses `rounded-3xl` (24px) for subscription cards with custom
/// background colors and adaptive text colors.
struct SubscriptionCard: View {
    let subscription: Subscription
    var onTap: (() -> Void)?

    private var preset: CardColorPreset {
        subscription.colorPreset
    }

    var body: some View {
        Button {
            Haptics.tap(.light)
            onTap?()
        } label: {
            VStack(alignment: .leading, spacing: Spacing.md) {
                // ── Top row: logo + status ────────────────────
                HStack(alignment: .top) {
                    LogoAvatar(
                        name: subscription.name,
                        logoURL: URL(string: subscription.logoUrl ?? ""),
                        size: 44
                    )

                    Spacer()

                    cardStatusDot
                }

                Spacer(minLength: Spacing.sm)

                // ── Bottom: name + amount ─────────────────────
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(subscription.name)
                        .font(.rounded(.semibold, size: 15))
                        .foregroundStyle(Color(hex: preset.text))
                        .lineLimit(1)

                    HStack(alignment: .firstTextBaseline, spacing: Spacing.xxs) {
                        Text(CurrencyFormat.string(for: subscription.amount, currency: subscription.currency))
                            .font(.rounded(.bold, size: 20))
                            .foregroundStyle(Color(hex: preset.text))

                        Text("/ \(subscription.billingPeriod.shortLabel)")
                            .font(.rounded(.medium, size: 12))
                            .foregroundStyle(Color(hex: preset.subtitle))
                    }
                }

                // ── Progress bar ──────────────────────────────
                progressBar
            }
            .padding(Spacing.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(hex: preset.background))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(
                        preset.id == "white"
                            ? Color(hex: preset.border)
                            : Color.clear,
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.pressable)
    }

    // MARK: - Status dot

    private var cardStatusDot: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
            Text(statusLabel)
                .font(.micro)
                .foregroundStyle(Color(hex: preset.subtitle))
        }
    }

    private var statusColor: Color {
        preset.isDark ? subscription.status.darkColor : subscription.status.lightColor
    }

    private var statusLabel: String {
        switch subscription.status {
        case .active:    "Activa"
        case .paused:    "Pausada"
        case .cancelled: "Cancelada"
        case .trial:     "Prueba"
        }
    }

    // MARK: - Progress bar

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(
                        preset.isDark
                            ? Color.white.opacity(0.15)
                            : Color.black.opacity(0.08)
                    )
                    .frame(height: 4)

                Capsule()
                    .fill(
                        preset.isDark
                            ? Color.white.opacity(0.70)
                            : Color.black.opacity(0.35)
                    )
                    .frame(width: geo.size.width * subscription.billingProgress, height: 4)
            }
        }
        .frame(height: 4)
    }
}

// MARK: - Billing period short labels

extension Subscription.BillingPeriod {
    var shortLabel: String {
        switch self {
        case .monthly:   "mes"
        case .yearly:    "año"
        case .weekly:    "sem"
        case .quarterly: "trim"
        }
    }
}

// MARK: - Pressable button style (matching web's .pressable)

struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PressableButtonStyle {
    static var pressable: PressableButtonStyle { .init() }
}

#Preview {
    ScrollView {
        VStack(spacing: Spacing.md) {
            ForEach(Subscription.mockList) { sub in
                SubscriptionCard(subscription: sub)
            }
        }
        .padding()
    }
    .background(Color.background)
}
