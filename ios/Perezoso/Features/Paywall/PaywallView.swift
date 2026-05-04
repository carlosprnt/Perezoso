import SwiftUI
import RevenueCat

/// Pro upgrade paywall sheet.
///
/// Loads RevenueCat offerings on appear, lets the user pick the
/// monthly or annual package, and runs a real StoreKit purchase via
/// `Purchases.shared.purchase(package:)`. Prices come from the
/// store-localized string so they always match what Apple charges.
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(ProMembershipStore.self) private var proMembership

    @State private var offering: Offering?
    @State private var selectedPackage: Package?
    @State private var loadError: String?

    @State private var isLoadingOfferings = true
    @State private var isPurchasing = false
    @State private var isRestoring = false
    @State private var errorMessage: String?

    private var monthlyPackage: Package? { offering?.monthly ?? offering?.availablePackages.first(where: { $0.packageType == .monthly }) }
    private var annualPackage: Package? { offering?.annual ?? offering?.availablePackages.first(where: { $0.packageType == .annual }) }

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
            .task { await loadOfferings() }
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
            if isLoadingOfferings {
                ProgressView()
                    .controlSize(.regular)
                    .tint(Color.textMuted)
                    .padding(.vertical, Spacing.xl)
            } else if let loadError {
                Text(loadError)
                    .font(.caption)
                    .foregroundStyle(Color.danger)
                    .multilineTextAlignment(.center)
                    .padding(.vertical, Spacing.lg)
            } else {
                if let annual = annualPackage {
                    PlanCard(
                        title: "Anual",
                        priceLabel: "\(annual.storeProduct.localizedPriceString)/año",
                        badge: monthlyPackage.flatMap { savingsBadge(annual: annual, monthly: $0) },
                        isSelected: selectedPackage?.identifier == annual.identifier,
                    ) {
                        Haptics.selection()
                        selectedPackage = annual
                    }
                }
                if let monthly = monthlyPackage {
                    PlanCard(
                        title: "Mensual",
                        priceLabel: "\(monthly.storeProduct.localizedPriceString)/mes",
                        badge: nil,
                        isSelected: selectedPackage?.identifier == monthly.identifier,
                    ) {
                        Haptics.selection()
                        selectedPackage = monthly
                    }
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
                title: ctaTitle,
                isLoading: isPurchasing,
                isDisabled: selectedPackage == nil || isRestoring
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

    private var ctaTitle: String {
        guard let pkg = selectedPackage else { return "Empezar" }
        let suffix = pkg.packageType == .annual ? "/año" : "/mes"
        return "Empezar por \(pkg.storeProduct.localizedPriceString)\(suffix)"
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

    // MARK: - Actions

    private func loadOfferings() async {
        guard !AppEnvironment.shared.isPreview else {
            isLoadingOfferings = false
            loadError = "Previsualización: las suscripciones no están disponibles."
            return
        }
        isLoadingOfferings = true
        loadError = nil
        do {
            let offerings = try await Purchases.shared.offerings()
            offering = offerings.current
            // Default to annual if available, otherwise monthly.
            selectedPackage = annualPackage ?? monthlyPackage
            if offering == nil || (annualPackage == nil && monthlyPackage == nil) {
                loadError = "No hay suscripciones disponibles. Inténtalo de nuevo más tarde."
            }
        } catch {
            loadError = "No se han podido cargar los planes. Comprueba tu conexión."
        }
        isLoadingOfferings = false
    }

    private func purchase() async {
        guard let package = selectedPackage else { return }
        isPurchasing = true
        errorMessage = nil
        defer { isPurchasing = false }

        do {
            let result = try await Purchases.shared.purchase(package: package)
            if result.userCancelled { return }
            proMembership.refresh(with: result.customerInfo)
            if result.customerInfo.entitlements[ProMembershipStore.entitlementID]?.isActive == true {
                Haptics.notification(.success)
                dismiss()
            } else {
                errorMessage = "La compra se ha procesado pero no se ha activado el acceso. Si el problema persiste, contacta con soporte."
            }
        } catch {
            errorMessage = error.localizedDescription
            Haptics.notification(.error)
        }
    }

    private func restore() async {
        isRestoring = true
        errorMessage = nil
        defer { isRestoring = false }

        do {
            let info = try await Purchases.shared.restorePurchases()
            proMembership.refresh(with: info)
            if info.entitlements[ProMembershipStore.entitlementID]?.isActive == true {
                Haptics.notification(.success)
                dismiss()
            } else {
                errorMessage = "No hemos encontrado compras previas con tu cuenta de Apple."
            }
        } catch {
            errorMessage = error.localizedDescription
            Haptics.notification(.error)
        }
    }

    private func savingsBadge(annual: Package, monthly: Package) -> String? {
        let yearlyAtMonthly = monthly.storeProduct.price * 12
        guard yearlyAtMonthly > 0, annual.storeProduct.price < yearlyAtMonthly else { return nil }
        let saved = (yearlyAtMonthly - annual.storeProduct.price) / yearlyAtMonthly
        let percent = Int((saved * 100).rounded())
        guard percent > 0 else { return nil }
        return "Ahorra un \(percent)%"
    }
}

// MARK: - Plan Card

private struct PlanCard: View {
    let title: String
    let priceLabel: String
    let badge: String?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack(spacing: Spacing.sm) {
                        Text(title)
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                        if let badge {
                            Text(badge)
                                .font(.micro)
                                .foregroundStyle(Color.accentForeground)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, 2)
                                .background(Color.accent, in: Capsule())
                        }
                    }
                    Text(priceLabel)
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
        .environment(ProMembershipStore.preview())
}
