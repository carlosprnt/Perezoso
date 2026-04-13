import SwiftUI

/// Create / edit form matching the web's SubscriptionForm.tsx exactly.
///
/// Web layout:
/// 1. Hero card: name input + currency pill + amount input
/// 2. Billing section: start date, next billing, period, custom interval, trial toggle
/// 3. Status section (only if paused/cancelled)
/// 4. Organization: category select
/// 5. Sharing: shared toggle, shared count, split mode, custom share
/// 6. Notes & Logo: logo URL, notes textarea
/// 7. Reminder: toggle + day options (1, 3, 10)
/// 8. Delete button (edit mode only)
///
/// Sections use white card containers with rounded-2xl (16px), rows with
/// min-h-[52px], px-4, py-3, separator border between rows.
struct SubscriptionFormView: View {
    @Environment(SubscriptionsStore.self) private var store
    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss

    enum Mode {
        case create
        case edit(Subscription)

        var title: String {
            switch self {
            case .create: "Crear nuevo"
            case .edit:   "Editar suscripcion"
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
    @State private var startDate: Date = .now
    @State private var nextBillingDate: Date = Calendar.current.date(
        byAdding: .month, value: 1, to: .now
    )!
    @State private var category: Subscription.Category = .other
    @State private var status: Subscription.Status = .active
    @State private var notes: String = ""
    @State private var logoURLText: String = ""
    @State private var cardColor: String? = nil

    // Shared fields
    @State private var isShared: Bool = false
    @State private var sharedCount: Int = 2
    @State private var splitMode: SplitMode = .splitEvenly
    @State private var myShareText: String = ""

    // Trial fields
    @State private var hasTrial: Bool = false
    @State private var trialEndDate: Date = Calendar.current.date(
        byAdding: .day, value: 14, to: .now
    )!

    // Reminder fields
    @State private var reminderEnabled: Bool = false
    @State private var reminderDays: Int = 3

    // Action state
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showDeleteConfirmation = false

    enum SplitMode: String, CaseIterable {
        case splitEvenly = "split_evenly"
        case custom

        var label: String {
            switch self {
            case .splitEvenly: "Dividir equitativamente"
            case .custom: "Personalizado"
            }
        }
    }

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
            if let shared = sub.sharedWith, shared > 0 {
                _isShared = State(initialValue: true)
                _sharedCount = State(initialValue: shared)
            }
        }
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                // 1. Hero card: name + price
                heroCard

                // 2. Billing section
                billingSection

                // 3. Trial section
                trialSection

                // 4. Status (only if paused/cancelled in edit mode)
                if mode.subscription != nil &&
                    (status == .paused || status == .cancelled) {
                    statusSection
                }

                // 5. Organization
                categorySection

                // 6. Sharing
                sharingSection

                // 7. Notes & Logo
                notesLogoSection

                // 8. Card color
                cardColorSection

                // 9. Reminder
                reminderSection

                // Error
                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(Color.danger)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, Spacing.xs)
                }

                // Actions
                VStack(spacing: Spacing.sm) {
                    PrimaryButton(
                        title: mode.subscription == nil ? "Crear suscripcion" : "Guardar cambios",
                        isLoading: isSaving
                    ) {
                        Task { await save() }
                    }

                    SecondaryButton(title: "Cancelar") {
                        Haptics.tap(.light)
                        dismiss()
                    }
                }

                // Delete (edit mode)
                if mode.subscription != nil {
                    Button {
                        Haptics.notification(.warning)
                        showDeleteConfirmation = true
                    } label: {
                        Text("Eliminar suscripcion")
                            .font(.rounded(.medium, size: 15))
                            .foregroundStyle(Color.danger)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                    }
                    .padding(.top, Spacing.sm)
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.lg)
            .padding(.bottom, Spacing.xxxl)
        }
        .background(Color.background)
        .confirmationDialog(
            "Eliminar \(name)?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Eliminar", role: .destructive) {
                Task { await deleteSubscription() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Esta accion no se puede deshacer.")
        }
    }

    // MARK: - Hero Card (name + price)

    private var heroCard: some View {
        FormCard {
            VStack(spacing: 0) {
                // Name input
                TextField("Nombre de la suscripcion", text: $name)
                    .font(.rounded(.semibold, size: 17))
                    .foregroundStyle(Color.textPrimary)
                    .textContentType(.none)
                    .autocorrectionDisabled()
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)

                Divider().padding(.leading, Spacing.lg)

                // Currency + amount
                HStack(spacing: Spacing.md) {
                    // Currency pill
                    Menu {
                        ForEach(currencies, id: \.self) { code in
                            Button(code) { currency = code }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(currency)
                                .font(.rounded(.medium, size: 14))
                                .foregroundStyle(Color.textPrimary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 10))
                                .foregroundStyle(Color.textMuted)
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.surfaceSecondary)
                        .clipShape(Capsule())
                    }

                    // Amount input
                    TextField("0,00", text: $amountText)
                        .keyboardType(.decimalPad)
                        .font(.rounded(.medium, size: 17))
                        .foregroundStyle(Color.textPrimary)
                        .multilineTextAlignment(.trailing)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.md)
            }
        }
    }

    // MARK: - Billing Section

    private var billingSection: some View {
        FormSection(title: "Facturacion") {
            FormCard {
                VStack(spacing: 0) {
                    FormDateRow(label: "Fecha de inicio", date: $startDate)
                    Divider().padding(.leading, Spacing.lg)
                    FormDateRow(label: "Proxima facturacion", date: $nextBillingDate)
                    Divider().padding(.leading, Spacing.lg)
                    FormPickerRow(label: "Periodo") {
                        Picker("", selection: $billingPeriod) {
                            ForEach(Subscription.BillingPeriod.allCases, id: \.self) { period in
                                Text(period.localizedName).tag(period)
                            }
                        }
                        .tint(Color.textSecondary)
                    }
                    Divider().padding(.leading, Spacing.lg)
                    FormPickerRow(label: "Cada (unidades)") {
                        Picker("", selection: $billingIntervalCount) {
                            ForEach(1..<13, id: \.self) { n in
                                Text("\(n)").tag(n)
                            }
                        }
                        .tint(Color.textSecondary)
                    }
                }
            }
        }
    }

    // MARK: - Trial Section

    private var trialSection: some View {
        FormCard {
            VStack(spacing: 0) {
                FormToggleRow(label: "Periodo de prueba", isOn: $hasTrial)
                if hasTrial {
                    Divider().padding(.leading, Spacing.lg)
                    FormDateRow(label: "Fin de prueba", date: $trialEndDate)
                }
            }
        }
    }

    // MARK: - Status Section

    private var statusSection: some View {
        FormSection(title: "Estado") {
            FormCard {
                FormPickerRow(label: "Estado") {
                    Picker("", selection: $status) {
                        ForEach(Subscription.Status.allCases, id: \.self) { s in
                            Text(s.rawValue.capitalized).tag(s)
                        }
                    }
                    .tint(Color.textSecondary)
                }
            }
        }
    }

    // MARK: - Category Section

    private var categorySection: some View {
        FormSection(title: "Organizacion") {
            FormCard {
                FormPickerRow(label: "Categoria") {
                    Picker("", selection: $category) {
                        ForEach(Subscription.Category.allCases, id: \.self) { cat in
                            Label(cat.localizedName, systemImage: cat.symbolName).tag(cat)
                        }
                    }
                    .tint(Color.textSecondary)
                }
            }
        }
    }

    // MARK: - Sharing Section

    private var sharingSection: some View {
        FormCard {
            VStack(spacing: 0) {
                FormToggleRow(label: "Compartida", isOn: $isShared)

                if isShared {
                    Divider().padding(.leading, Spacing.lg)

                    // Shared count
                    HStack {
                        Text("Personas")
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                        Spacer()
                        Stepper("\(sharedCount)", value: $sharedCount, in: 2...20)
                            .labelsHidden()
                        Text("\(sharedCount)")
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textSecondary)
                            .frame(width: 30, alignment: .trailing)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .frame(minHeight: 52)

                    Divider().padding(.leading, Spacing.lg)

                    // Split mode
                    FormPickerRow(label: "Reparto") {
                        Picker("", selection: $splitMode) {
                            ForEach(SplitMode.allCases, id: \.self) { mode in
                                Text(mode.label).tag(mode)
                            }
                        }
                        .tint(Color.textSecondary)
                    }

                    if splitMode == .custom {
                        Divider().padding(.leading, Spacing.lg)

                        HStack {
                            Text("Mi parte (\(currency))")
                                .font(.bodyMedium)
                                .foregroundStyle(Color.textPrimary)
                            Spacer()
                            TextField("0,00", text: $myShareText)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .font(.bodyRegular)
                                .foregroundStyle(Color.textSecondary)
                        }
                        .padding(.horizontal, Spacing.lg)
                        .frame(minHeight: 52)
                    }
                }
            }
        }
    }

    // MARK: - Notes & Logo Section

    private var notesLogoSection: some View {
        FormSection(title: "Detalles") {
            FormCard {
                VStack(spacing: 0) {
                    // Logo URL
                    HStack {
                        Text("Logo URL")
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                        Spacer()
                        TextField("https://...", text: $logoURLText)
                            .textContentType(.URL)
                            .keyboardType(.URL)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .multilineTextAlignment(.trailing)
                            .font(.bodyRegular)
                            .foregroundStyle(Color.textSecondary)
                        if !logoURLText.isEmpty {
                            Button {
                                logoURLText = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(Color.textDisabled)
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .frame(minHeight: 52)

                    Divider().padding(.leading, Spacing.lg)

                    // Notes
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("Notas")
                            .font(.bodyMedium)
                            .foregroundStyle(Color.textPrimary)
                        TextEditor(text: $notes)
                            .font(.bodyRegular)
                            .foregroundStyle(Color.textPrimary)
                            .frame(minHeight: 60)
                            .scrollContentBackground(.hidden)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                }
            }
        }
    }

    // MARK: - Card Color Section

    private var cardColorSection: some View {
        FormSection(title: "Color de tarjeta") {
            FormCard {
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

    // MARK: - Reminder Section

    private var reminderSection: some View {
        FormCard {
            VStack(spacing: 0) {
                FormToggleRow(label: "Recordatorio", isOn: $reminderEnabled)

                if reminderEnabled {
                    Divider().padding(.leading, Spacing.lg)

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("DIAS DE ANTELACION")
                            .font(.rounded(.semibold, size: 11))
                            .foregroundStyle(Color.textMuted)
                            .textCase(.uppercase)

                        HStack(spacing: Spacing.sm) {
                            ForEach([1, 3, 10], id: \.self) { days in
                                Button {
                                    Haptics.selection()
                                    reminderDays = days
                                } label: {
                                    Text("\(days) \(days == 1 ? "dia" : "dias")")
                                        .font(.rounded(.medium, size: 14))
                                        .foregroundStyle(
                                            reminderDays == days
                                                ? Color.accentForeground
                                                : Color.textPrimary
                                        )
                                        .padding(.horizontal, Spacing.lg)
                                        .padding(.vertical, Spacing.sm)
                                        .background(
                                            reminderDays == days
                                                ? Color.accent
                                                : Color.surfaceSecondary,
                                            in: Capsule()
                                        )
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                }
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
            errorMessage = "Introduce un importe valido."
            return
        }
        guard let userId = auth.session?.user.id else {
            errorMessage = "Sesion no disponible. Vuelve a iniciar sesion."
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
                    status: hasTrial ? .trial : status,
                    category: category,
                    logoUrl: logoURLText.isEmpty ? nil : logoURLText,
                    notes: notes.isEmpty ? nil : notes,
                    trialEndDate: hasTrial ? trialEndDate : nil,
                    sharedWith: isShared ? sharedCount : nil,
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
                updated.status = hasTrial ? .trial : status
                updated.category = category
                updated.logoUrl = logoURLText.isEmpty ? nil : logoURLText
                updated.notes = notes.isEmpty ? nil : notes
                updated.trialEndDate = hasTrial ? trialEndDate : nil
                updated.sharedWith = isShared ? sharedCount : nil
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

    private func deleteSubscription() async {
        guard let sub = mode.subscription else { return }
        do {
            try await store.delete(id: sub.id)
            Haptics.notification(.success)
            dismiss()
        } catch {
            Haptics.notification(.error)
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Reusable form components

/// White card container for form sections.
/// Web: mx-5 mb-3 bg-white rounded-2xl border border-[#F0F0F0] dark:border-[#2C2C2E]
private struct FormCard<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color(light: "#F0F0F0", dark: "#2C2C2E"), lineWidth: 1)
            )
    }
}

/// Section with title label above a card.
private struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
                .padding(.horizontal, Spacing.xs)
            content()
        }
    }
}

/// Row with label + date picker.
private struct FormDateRow: View {
    let label: String
    @Binding var date: Date

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(Color.textPrimary)
            Spacer()
            DatePicker("", selection: $date, displayedComponents: [.date])
                .labelsHidden()
                .tint(Color.accent)
        }
        .padding(.horizontal, Spacing.lg)
        .frame(minHeight: 52)
    }
}

/// Row with label + picker control.
private struct FormPickerRow<Control: View>: View {
    let label: String
    @ViewBuilder let control: () -> Control

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(Color.textPrimary)
            Spacer()
            control()
                .labelsHidden()
        }
        .padding(.horizontal, Spacing.lg)
        .frame(minHeight: 52)
    }
}

/// Row with label + toggle.
private struct FormToggleRow: View {
    let label: String
    @Binding var isOn: Bool

    var body: some View {
        HStack {
            Text(label)
                .font(.bodyMedium)
                .foregroundStyle(Color.textPrimary)
            Spacer()
            Toggle("", isOn: $isOn)
                .tint(Color.accent)
                .labelsHidden()
        }
        .padding(.horizontal, Spacing.lg)
        .frame(minHeight: 52)
    }
}

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
