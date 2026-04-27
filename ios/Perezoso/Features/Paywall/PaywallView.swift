import SwiftUI

/// Pro upgrade paywall sheet.
///
/// Lists Perezoso Pro features and offers a purchase CTA.
/// Uses rounded typography and adaptive accent matching the web.
/// RevenueCat integration is stubbed.
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var selectedPlan: PlanOption = .yearly
    @State private var isPurchasing = false
    @State private var isRestoring = false
    @State private var errorMessage: String?

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    heroSection
                    featuresSection
                    planPicker
                    ctaSection
                    legalFooter
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xxl)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Color.textMuted)
                    }
                }
            }
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(Color.accentLight)
                    .frame(width: 80, height: 80)
                Image(systemName: "star.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(Color.accent)
            }

            VStack(spacing: Spacing.sm) {
                Text("Perezoso Pro")
                    .font(.title)
                    .foregroundStyle(Color.textPrimary)

                Text("Lleva el control total de tus suscripciones sin límites.")
                    .font(.bodyRegular)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Features

    private var featuresSection: some View {
        Card {
            VStack(spacing: 0) {
                ForEach(ProFeature.allCases) { feature in
                    HStack(spacing: Spacing.md) {
                        ZStack {
                            Circle()
                                .fill(Color.accentLight)
                                .frame(width: 36, height: 36)
                            Image(systemName: feature.icon)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color.accent)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(feature.title)
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)
                            Text(feature.description)
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "checkmark")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.success)
                    }
                    .padding(Spacing.lg)
                    if feature != ProFeature.allCases.last {
                        Divider().padding(.leading, 52 + Spacing.md + Spacing.lg)
                    }
                }
            }
        }
    }

    // MARK: - Plan picker

    private var planPicker: some View {
        VStack(spacing: Spacing.sm) {
            ForEach(PlanOption.allCases) { plan in
                PlanCard(plan: plan, isSelected: selectedPlan == plan) {
                    Haptics.selection()
                    selectedPlan = plan
                }
            }
        }
    }

    // MARK: - CTA

    private var ctaSection: some View {
        VStack(spacing: Spacing.sm) {
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(Color.danger)
                    .multilineTextAlignment(.center)
            }

            PrimaryButton(
                title: selectedPlan == .yearly
                    ? "Empezar por \(PlanOption.yearly.price)/año"
                    : "Empezar por \(PlanOption.monthly.price)/mes",
                isLoading: isPurchasing
            ) {
                Task { await purchase() }
            }

            Button {
                Task { await restore() }
            } label: {
                if isRestoring {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Color.textMuted)
                } else {
                    Text("Restaurar compra")
                        .font(.bodyMedium)
                        .foregroundStyle(Color.textMuted)
                }
            }
            .disabled(isRestoring || isPurchasing)
        }
    }

    // MARK: - Legal

    private var legalFooter: some View {
        VStack(spacing: Spacing.xxs) {
            Text("El pago se cargará a tu cuenta de Apple ID. La suscripción se renueva automáticamente salvo que la canceles al menos 24 h antes del fin del periodo.")
                .font(.micro)
                .foregroundStyle(Color.textDisabled)
                .multilineTextAlignment(.center)

            HStack(spacing: Spacing.md) {
                Link("Términos de uso", destination: URL(string: "https://perezoso.vercel.app/terms")!)
                    .font(.micro)
                    .foregroundStyle(Color.textMuted)
                Link("Política de privacidad", destination: URL(string: "https://perezoso.vercel.app/privacy")!)
                    .font(.micro)
                    .foregroundStyle(Color.textMuted)
            }
        }
        .padding(.top, Spacing.sm)
    }

    // MARK: - Actions (RevenueCat stubs)

    private func purchase() async {
        isPurchasing = true
        errorMessage = nil
        defer { isPurchasing = false }

        // TODO: integrate RevenueCat
        // let offerings = try await Purchases.shared.offerings()
        // guard let package = selectedPlan == .yearly
        //     ? offerings.current?.annual
        //     : offerings.current?.monthly
        // else { return }
        // let result = try await Purchases.shared.purchase(package: package)
        // if !result.userCancelled { dismiss() }

        try? await Task.sleep(for: .milliseconds(800))
        Haptics.notification(.success)
        dismiss()
    }

    private func restore() async {
        isRestoring = true
        errorMessage = nil
        defer { isRestoring = false }

        // TODO: let customerInfo = try await Purchases.shared.restorePurchases()
        try? await Task.sleep(for: .milliseconds(600))
        Haptics.notification(.success)
    }
}

// MARK: - Plan Options

private enum PlanOption: CaseIterable, Identifiable {
    case yearly, monthly

    var id: Self { self }

    var title: String {
        switch self {
        case .yearly:  "Anual"
        case .monthly: "Mensual"
        }
    }

    var price: String {
        switch self {
        case .yearly:  "29,99 €"
        case .monthly: "3,99 €"
        }
    }

    var badge: String? {
        switch self {
        case .yearly:  "Ahorra un 37%"
        case .monthly: nil
        }
    }
}

private struct PlanCard: View {
    let plan: PlanOption
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack(spacing: Spacing.sm) {
                        Text(plan.title)
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                        if let badge = plan.badge {
                            Text(badge)
                                .font(.micro)
                                .foregroundStyle(Color.accentForeground)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, 2)
                                .background(Color.accent, in: Capsule())
                        }
                    }
                    Text(plan == .yearly ? "\(plan.price)/año" : "\(plan.price)/mes")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                }
                Spacer()
                ZStack {
                    Circle()
                        .stroke(isSelected ? Color.accent : Color.border, lineWidth: 2)
                        .frame(width: 22, height: 22)
                    if isSelected {
                        Circle()
                            .fill(Color.accent)
                            .frame(width: 12, height: 12)
                    }
                }
            }
            .padding(Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
                    .fill(isSelected ? Color.accentLight : Color.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
                    .stroke(isSelected ? Color.accent : Color.borderLight, lineWidth: isSelected ? 1.5 : 1)
            )
        }
    }
}

// MARK: - Pro Features

private enum ProFeature: CaseIterable, Identifiable {
    case unlimited, insights, reminders, export, widgets, sharedWith

    var id: Self { self }

    var icon: String {
        switch self {
        case .unlimited:  "infinity"
        case .insights:   "chart.bar.fill"
        case .reminders:  "bell.fill"
        case .export:     "square.and.arrow.up.fill"
        case .widgets:    "rectangle.3.group.fill"
        case .sharedWith: "person.2.fill"
        }
    }

    var title: String {
        switch self {
        case .unlimited:  "Suscripciones ilimitadas"
        case .insights:   "Informes y análisis"
        case .reminders:  "Alertas de renovación"
        case .export:     "Exportar a CSV / PDF"
        case .widgets:    "Widgets para la pantalla de inicio"
        case .sharedWith: "Suscripciones compartidas"
        }
    }

    var description: String {
        switch self {
        case .unlimited:  "Sin límite de suscripciones rastreadas"
        case .insights:   "Gráficas de gasto por categoría y tiempo"
        case .reminders:  "Notificaciones antes de cada cargo"
        case .export:     "Descarga tus datos cuando quieras"
        case .widgets:    "Tu gasto mensual a un vistazo"
        case .sharedWith: "Divide el coste con familia o amigos"
        }
    }
}

// MARK: - Preview

#Preview {
    PaywallView()
}
