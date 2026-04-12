import SwiftUI

/// Create / edit form for a subscription.
///
/// Injected with a `mode` that determines whether it creates a new
/// subscription or edits an existing one. Includes card color picker
/// with 16 presets matching the web app.
struct SubscriptionFormView: View {
    @Environment(SubscriptionsStore.self) private var store
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss

    // MARK: - Mode

    enum Mode {
        case create
        case edit(Subscription)

        var title: String {
            switch self {
            case .create: "Nueva suscripción"
            case .edit:   "Editar suscripción"
            }
        }

        var subscription: Subscription? {
            if case .edit(let sub) = self { return sub }
            return nil
        }
    }

    let mode: Mode

    // MARK: - Form fields

    @State private var name: String = ""
    @State private var amountText: String = ""
    @State private var currency: String = "EUR"
    @State private var billingPeriod: Subscription.BillingPeriod = .monthly
    @State private var billingIntervalCount: Int = 1
    @State private var nextBillingDate: Date = Calendar.current.date(
        byAdding: .month, value: 1, to: .now
    )!
    @State private var category: Subscription.Category = .other
    @State private var status: Subscription.Status = .active
    @State private var notes: String = ""
    @State private var logoURLText: String = ""
    @State private var cardColor: String? = nil

    // MARK: - Action state

    @State private var isSaving = false
    @State private var errorMessage: String?

    // MARK: - Supported currencies

    private let currencies = ["EUR", "USD", "GBP", "JPY", "CHF", "MXN", "ARS", "COP"]

    // MARK: - Init

    init(mode: Mode) {
        self.mode = mode
        if let sub = mode.subscription {
            _name = State(initialValue: sub.name)
            _amountText = State(initialValue: "\(sub.amount)")
            _currency = State(initialValue: sub.currency)
            _billingPeriod = State(initialValue: sub.billingPeriod)
            _billingIntervalCount = State(initialValue: sub.billingIntervalCount)
            _nextBillingDate = State(initialValue: sub.nextBillingDate)
            _category = State(initialValue: sub.category)
            _status = State(initialValue: sub.status)
            _notes = State(initialValue: sub.notes ?? "")
            _logoURLText = State(initialValue: sub.logoUrl ?? "")
            _cardColor = State(initialValue: sub.cardColor)
        }
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // ── Basic info ────────────────────────────
                    FormSection(title: "Información básica") {
                        LabeledFormField(label: "Nombre") {
                            TextField("Netflix, Spotify…", text: $name)
                                .textContentType(.none)
                                .autocorrectionDisabled()
                        }

                        Divider()

                        LabeledFormField(label: "Logo URL") {
                            TextField("https://cdn.simpleicons.org/…", text: $logoURLText)
                                .textContentType(.URL)
                                .keyboardType(.URL)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                        }
                    }

                    // ── Amount & currency ─────────────────────
                    FormSection(title: "Importe") {
                        LabeledFormField(label: "Cantidad") {
                            TextField("0,00", text: $amountText)
                                .keyboardType(.decimalPad)
                        }

                        Divider()

                        LabeledFormField(label: "Moneda") {
                            Picker("Moneda", selection: $currency) {
                                ForEach(currencies, id: \.self) { code in
                                    Text(code).tag(code)
                                }
                            }
                            .labelsHidden()
                        }
                    }

                    // ── Billing ───────────────────────────────
                    FormSection(title: "Facturación") {
                        LabeledFormField(label: "Periodo") {
                            Picker("Periodo", selection: $billingPeriod) {
                                ForEach(Subscription.BillingPeriod.allCases, id: \.self) { period in
                                    Text(period.localizedName).tag(period)
                                }
                            }
                            .labelsHidden()
                        }

                        Divider()

                        LabeledFormField(label: "Cada (unidades)") {
                            Picker("Intervalo", selection: $billingIntervalCount) {
                                ForEach(1..<13, id: \.self) { n in
                                    Text("\(n)").tag(n)
                                }
                            }
                            .labelsHidden()
                        }

                        Divider()

                        LabeledFormField(label: "Próxima fecha") {
                            DatePicker(
                                "",
                                selection: $nextBillingDate,
                                displayedComponents: [.date]
                            )
                            .labelsHidden()
                        }
                    }

                    // ── Category & status ─────────────────────
                    FormSection(title: "Clasificación") {
                        LabeledFormField(label: "Categoría") {
                            Picker("Categoría", selection: $category) {
                                ForEach(Subscription.Category.allCases, id: \.self) { cat in
                                    Label(cat.localizedName, systemImage: cat.symbolName).tag(cat)
                                }
                            }
                            .labelsHidden()
                        }

                        Divider()

                        LabeledFormField(label: "Estado") {
                            Picker("Estado", selection: $status) {
                                ForEach(Subscription.Status.allCases, id: \.self) { s in
                                    Text(s.rawValue.capitalized).tag(s)
                                }
                            }
                            .labelsHidden()
                        }
                    }

                    // ── Card color picker ─────────────────────
                    cardColorSection

                    // ── Notes ─────────────────────────────────
                    FormSection(title: "Notas") {
                        TextEditor(text: $notes)
                            .font(.bodyRegular)
                            .foregroundStyle(Color.textPrimary)
                            .frame(minHeight: 80)
                            .scrollContentBackground(.hidden)
                            .padding(Spacing.md)
                    }

                    // ── Error ─────────────────────────────────
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(Color.danger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, Spacing.xs)
                    }

                    // ── Actions ───────────────────────────────
                    VStack(spacing: Spacing.sm) {
                        PrimaryButton(
                            title: mode.subscription == nil ? "Crear suscripción" : "Guardar cambios",
                            isLoading: isSaving
                        ) {
                            Task { await save() }
                        }

                        SecondaryButton(title: "Cancelar") {
                            Haptics.tap(.light)
                            dismiss()
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.lg)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.background)
            .navigationTitle(mode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        dismiss()
                    }
                    .tint(Color.textSecondary)
                }
            }
        }
    }

    // MARK: - Card Color Section

    private var cardColorSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Color de tarjeta")
                .font(.caption)
                .foregroundStyle(Color.textMuted)
                .padding(.horizontal, Spacing.xs)

            Card {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Spacing.sm), count: 8), spacing: Spacing.sm) {
                    ForEach(CardColorPreset.presets) { preset in
                        Button {
                            Haptics.selection()
                            cardColor = preset.id == "white" ? nil : preset.id
                        } label: {
                            ZStack {
                                RoundedRectangle(cornerRadius: Radius.sm, style: .continuous)
                                    .fill(Color(hex: preset.background))
                                    .frame(height: 36)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: Radius.sm, style: .continuous)
                                            .stroke(
                                                preset.id == "white"
                                                    ? Color.borderLight
                                                    : Color.clear,
                                                lineWidth: 1
                                            )
                                    )

                                if (cardColor == nil && preset.id == "white") ||
                                   cardColor == preset.id {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(
                                            preset.isDark ? Color.white : Color.black
                                        )
                                }
                            }
                        }
                    }
                }
                .padding(Spacing.lg)
            }
        }
    }

    // MARK: - Save

    private func save() async {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "El nombre es obligatorio."
            return
        }
        guard let amount = Decimal(string: amountText.replacingOccurrences(of: ",", with: ".")),
              amount >= 0 else {
            errorMessage = "Introduce un importe válido."
            return
        }
        guard let userId = auth.session?.user.id else {
            errorMessage = "Sesión no disponible. Vuelve a iniciar sesión."
            return
        }

        isSaving = true
        errorMessage = nil

        do {
            switch mode {
            case .create:
                let newSub = Subscription(
                    id: UUID(),
                    userId: userId,
                    name: name.trimmingCharacters(in: .whitespaces),
                    amount: amount,
                    currency: currency,
                    billingPeriod: billingPeriod,
                    billingIntervalCount: billingIntervalCount,
                    nextBillingDate: nextBillingDate,
                    status: status,
                    category: category,
                    logoUrl: logoURLText.isEmpty ? nil : logoURLText,
                    notes: notes.isEmpty ? nil : notes,
                    trialEndDate: nil,
                    sharedWith: nil,
                    cardColor: cardColor,
                    createdAt: .now,
                    updatedAt: .now
                )
                try await store.create(newSub)

            case .edit(let existing):
                var updated = existing
                updated.name = name.trimmingCharacters(in: .whitespaces)
                updated.amount = amount
                updated.currency = currency
                updated.billingPeriod = billingPeriod
                updated.billingIntervalCount = billingIntervalCount
                updated.nextBillingDate = nextBillingDate
                updated.status = status
                updated.category = category
                updated.logoUrl = logoURLText.isEmpty ? nil : logoURLText
                updated.notes = notes.isEmpty ? nil : notes
                updated.cardColor = cardColor
                try await store.update(updated)
            }

            Haptics.notification(.success)
            dismiss()
        } catch {
            Haptics.notification(.error)
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }
}

// MARK: - Reusable form components

private struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
                .padding(.horizontal, Spacing.xs)

            Card {
                content()
            }
        }
    }
}

private struct LabeledFormField<Control: View>: View {
    let label: String
    @ViewBuilder let control: () -> Control

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(Color.textPrimary)
            Spacer()
            control()
                .multilineTextAlignment(.trailing)
                .tint(Color.accent)
        }
        .padding(Spacing.lg)
    }
}

// MARK: - Preview

#Preview("Create") {
    SubscriptionFormView(mode: .create)
        .environment(SubscriptionsStore.preview())
        .environment(AuthStore.preview())
}

#Preview("Edit") {
    SubscriptionFormView(mode: .edit(.mock))
        .environment(SubscriptionsStore.preview())
        .environment(AuthStore.preview())
}
