import SwiftUI

/// Colored subscription card matching the web's SubscriptionCard.tsx.
///
/// Web layout: horizontal row with avatar | name+category | price+status,
/// progress bar below, then days-left + next date. Uses `rounded-3xl`
/// (24px) with custom background colors and adaptive text colors.
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
            VStack(spacing: Spacing.md) {
                // ── Top row: avatar + name/category + price/status ──
                HStack(spacing: Spacing.lg) {
                    LogoAvatar(
                        name: subscription.name,
                        logoURL: URL(string: subscription.logoUrl ?? ""),
                        size: 48
                    )

                    // Name + category
                    VStack(alignment: .leading, spacing: 2) {
                        Text(subscription.name)
                            .font(.rounded(.bold, size: 20))
                            .foregroundStyle(Color(hex: preset.text))
                            .lineLimit(1)

                        Text(subscription.category.localizedName)
                            .font(.rounded(.regular, size: 14))
                            .foregroundStyle(Color(hex: preset.subtitle))
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Price + status
                    VStack(alignment: .trailing, spacing: 2) {
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text(CurrencyFormat.string(for: subscription.monthlyEquivalent, currency: subscription.currency))
                                .font(.rounded(.bold, size: 16))
                                .foregroundStyle(Color(hex: preset.text))

                            Text("/mo")
                                .font(.rounded(.regular, size: 14))
                                .foregroundStyle(Color(hex: preset.subtitle))
                        }

                        Text(statusLabel)
                            .font(.rounded(.semibold, size: 14))
                            .foregroundStyle(statusColor)
                    }
                    .flexShrink()
                }

                // ── Progress bar + billing info ──────────────────
                if subscription.nextBillingDate > .distantPast {
                    VStack(spacing: Spacing.xs) {
                        // Progress bar
                        progressBar

                        // Days left + next date
                        HStack {
                            Text(daysLabel)
                                .font(.rounded(.regular, size: 12))
                                .foregroundStyle(Color(hex: preset.subtitle))
                            Spacer()
                            Text(formattedNextDate)
                                .font(.rounded(.regular, size: 12))
                                .foregroundStyle(Color(hex: preset.subtitle))
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(hex: preset.background))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(
                        preset.id == "white"
                            ? Color(hex: preset.border)
                            : Color.clear,
                        lineWidth: 1.5
                    )
            )
        }
        .buttonStyle(.pressable)
    }

    // MARK: - Status

    private var statusColor: Color {
        preset.isDark ? subscription.status.darkColor : subscription.status.lightColor
    }

    private var statusLabel: String {
        switch subscription.status {
        case .active:    "Active"
        case .paused:    "Paused"
        case .cancelled: "Cancelled"
        case .trial:     "Trial"
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

    // MARK: - Billing helpers

    private var daysLabel: String {
        let d = subscription.daysUntilBilling
        if d == 0 { return "Hoy" }
        if d == 1 { return "Mañana" }
        return "En \(d) días"
    }

    private var formattedNextDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        formatter.locale = Locale(identifier: "es_ES")
        return formatter.string(from: subscription.nextBillingDate)
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

// MARK: - Flex shrink helper

private extension View {
    func flexShrink() -> some View {
        self.layoutPriority(-1)
    }
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
