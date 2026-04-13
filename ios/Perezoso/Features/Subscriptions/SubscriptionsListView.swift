import SwiftUI

/// Subscription list with wallet-style stacked white cards matching
/// the web's SubscriptionsView.tsx exactly.
///
/// Web spec:
/// - Active subs: white cards stacked with -76px overlap (wallet style)
/// - Card radius: 28px, shadow: 0 -1px 2px rgba(0,0,0,0.04)
/// - Card padding: 20px all sides
/// - Top row: avatar(48) + name(16px bold)+category(14px) + price(16px bold)+status(14px)
/// - Progress bar: 4px green #22C55E
/// - Inactive subs: compact rows at bottom, 20px radius
struct SubscriptionsListView: View {
    @Environment(SubscriptionsStore.self) private var store
    @State private var searchText = ""
    @State private var showAddSheet = false
    @State private var selectedSubscription: Subscription?
    @State private var statusFilter: Subscription.Status?
    @State private var categoryFilter: Subscription.Category?
    @State private var showFilterSheet = false
    @State private var selectedPlatform: QuickAddPlatformInfo?

    private var filteredSubscriptions: [Subscription] {
        var result = store.subscriptions
        if let statusFilter {
            result = result.filter { $0.status == statusFilter }
        }
        if let categoryFilter {
            result = result.filter { $0.category == categoryFilter }
        }
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
            }
        }
        return result
    }

    private var activeSubscriptions: [Subscription] {
        filteredSubscriptions.filter { $0.status == .active || $0.status == .trial }
    }

    private var inactiveSubscriptions: [Subscription] {
        filteredSubscriptions.filter { $0.status != .active && $0.status != .trial }
    }

    private var hasActiveFilters: Bool {
        statusFilter != nil || categoryFilter != nil
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                // ── Header ──────────────────────────────────
                headerRow
                    .scrollFadeBlur()

                if store.subscriptions.isEmpty && !store.isLoading {
                    // ── True empty state: QuickAdd ──────────
                    quickAddEmptyState
                } else {
                    // ── Search ──────────────────────────────
                    searchBar

                    // ── Filter chips ────────────────────────
                    if hasActiveFilters {
                        filterChips
                    }

                    // ── Count ───────────────────────────────
                    HStack {
                        Text("\(filteredSubscriptions.count) suscripciones")
                            .font(.rounded(.medium, size: 12))
                            .foregroundStyle(Color.textMuted)
                        Spacer()
                    }

                    if filteredSubscriptions.isEmpty && !store.isLoading {
                        filteredEmptyState
                            .padding(.top, Spacing.xxxl)
                    } else {
                        // ── Active: wallet stack ─────────────
                        if !activeSubscriptions.isEmpty {
                            walletStack
                        }

                        // ── Inactive: compact rows ──────────
                        if !inactiveSubscriptions.isEmpty {
                            inactiveSection
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.top, Spacing.md)
            .padding(.bottom, 120)
        }
        .background(Color.background)
        .refreshable {
            await store.fetch()
        }
        .overlay {
            if let sub = selectedSubscription {
                SubscriptionDetailOverlay(
                    subscription: sub,
                    isPresented: Binding(
                        get: { selectedSubscription != nil },
                        set: { if !$0 { selectedSubscription = nil } }
                    )
                )
            }
        }
        .overlay {
            CustomBottomSheet(isPresented: $showAddSheet, height: .full, title: "Nueva suscripción") {
                SubscriptionFormView(mode: .create, prefill: selectedPlatform)
            }
        }
        .overlay {
            CustomBottomSheet(isPresented: $showFilterSheet, title: "Filtros") {
                filterContent
            }
        }
    }

    // MARK: - Header

    private var headerRow: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Mis suscripciones")
                .font(.rounded(.bold, size: 17))
                .foregroundStyle(Color.textPrimary)
                .tracking(-0.3)
            if !store.subscriptions.isEmpty {
                Text("\(activeSubscriptions.count) activas \u{00B7} \(CurrencyFormat.string(for: store.monthlyTotal, currency: "EUR"))/mes")
                    .font(.rounded(.regular, size: 12))
                    .foregroundStyle(Color.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Search

    private var searchBar: some View {
        HStack(spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.textMuted)
                TextField("Buscar suscripciones", text: $searchText)
                    .font(.bodyRegular)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.textDisabled)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .frame(height: 44)
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .stroke(Color.borderLight, lineWidth: 1)
            )

            Button {
                Haptics.tap(.light)
                showFilterSheet = true
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(hasActiveFilters ? Color.accentForeground : Color.textMuted)
                        .frame(width: 44, height: 44)
                        .background(hasActiveFilters ? Color.accent : Color.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                                .stroke(hasActiveFilters ? Color.clear : Color.borderLight, lineWidth: 1)
                        )
                    if hasActiveFilters {
                        Circle()
                            .fill(Color.danger)
                            .frame(width: 8, height: 8)
                            .offset(x: -4, y: 4)
                    }
                }
            }
        }
    }

    // MARK: - Wallet Stack (active subscriptions)

    private var walletStack: some View {
        VStack(spacing: 0) {
            ForEach(Array(activeSubscriptions.enumerated()), id: \.element.id) { idx, sub in
                WalletCardView(subscription: sub) {
                    Haptics.tap(.light)
                    selectedSubscription = sub
                }
                .zIndex(Double(idx + 1))
                .offset(y: CGFloat(idx) * -76)
                .scrollFadeBlur()
                .staggeredEntrance(index: idx, stagger: MotionTiming.cardStagger)
            }
        }
        // Compensate for the negative offsets so the stack doesn't leave empty space
        .padding(.bottom, activeSubscriptions.count > 1
                 ? CGFloat(activeSubscriptions.count - 1) * -76
                 : 0)
    }

    // MARK: - Inactive Section

    private var inactiveSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Inactivas")
                .font(.rounded(.semibold, size: 13))
                .foregroundStyle(Color.textMuted)
                .padding(.top, Spacing.lg)

            VStack(spacing: Spacing.sm) {
                ForEach(inactiveSubscriptions) { sub in
                    Button {
                        Haptics.tap(.light)
                        selectedSubscription = sub
                    } label: {
                        HStack(spacing: Spacing.md) {
                            LogoAvatar(
                                name: sub.name,
                                logoURL: URL(string: sub.logoUrl ?? ""),
                                size: 40
                            )

                            Text(sub.name)
                                .font(.rounded(.bold, size: 14))
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(1)

                            Spacer()

                            Text(statusLabel(for: sub.status))
                                .font(.rounded(.medium, size: 12))
                                .foregroundStyle(statusColor(for: sub.status))
                        }
                        .padding(.horizontal, Spacing.lg)
                        .padding(.vertical, Spacing.md)
                        .background(Color.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    }
                    .buttonStyle(.pressable)
                }
            }
        }
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        HStack(spacing: Spacing.sm) {
            if let statusFilter {
                filterChip(statusFilter.rawValue.capitalized) {
                    self.statusFilter = nil
                }
            }
            if let categoryFilter {
                filterChip(categoryFilter.localizedName) {
                    self.categoryFilter = nil
                }
            }
            Button {
                self.statusFilter = nil
                self.categoryFilter = nil
            } label: {
                Text("Limpiar todo")
                    .font(.micro)
                    .foregroundStyle(Color.textMuted)
            }
            Spacer()
        }
    }

    private func filterChip(_ label: String, onRemove: @escaping () -> Void) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.micro)
                .foregroundStyle(Color.accentForeground)
            Button {
                Haptics.tap(.light)
                onRemove()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(Color.accentForeground.opacity(0.7))
            }
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xxs)
        .background(Color.accent, in: Capsule())
    }

    // MARK: - Filter Content

    private var filterContent: some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Estado")
                    .font(.micro)
                    .foregroundStyle(Color.textMuted)
                    .padding(.horizontal, Spacing.xs)
                Card {
                    VStack(spacing: 0) {
                        ForEach(Subscription.Status.allCases, id: \.self) { status in
                            Button {
                                Haptics.selection()
                                statusFilter = statusFilter == status ? nil : status
                            } label: {
                                HStack {
                                    Text(status.rawValue.capitalized)
                                        .font(.bodyMedium)
                                        .foregroundStyle(Color.textPrimary)
                                    Spacer()
                                    if statusFilter == status {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(Color.accent)
                                    }
                                }
                                .padding(Spacing.lg)
                            }
                            if status != Subscription.Status.allCases.last {
                                Divider().padding(.leading, Spacing.lg)
                            }
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Categoria")
                    .font(.micro)
                    .foregroundStyle(Color.textMuted)
                    .padding(.horizontal, Spacing.xs)
                Card {
                    VStack(spacing: 0) {
                        ForEach(Subscription.Category.allCases, id: \.self) { cat in
                            Button {
                                Haptics.selection()
                                categoryFilter = categoryFilter == cat ? nil : cat
                            } label: {
                                HStack(spacing: Spacing.md) {
                                    Image(systemName: cat.symbolName)
                                        .font(.system(size: 14))
                                        .foregroundStyle(Color.textMuted)
                                        .frame(width: 20)
                                    Text(cat.localizedName)
                                        .font(.bodyMedium)
                                        .foregroundStyle(Color.textPrimary)
                                    Spacer()
                                    if categoryFilter == cat {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(Color.accent)
                                    }
                                }
                                .padding(Spacing.lg)
                            }
                            if cat != Subscription.Category.allCases.last {
                                Divider().padding(.leading, Spacing.lg + 20 + Spacing.md)
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.bottom, Spacing.xxxl)
    }

    // MARK: - Quick Add Empty State (no subscriptions at all)

    private var quickAddEmptyState: some View {
        QuickAddPlatforms(
            onSelect: { platform in
                selectedPlatform = platform
                showAddSheet = true
            },
            onAddManually: {
                selectedPlatform = nil
                showAddSheet = true
            }
        )
    }

    // MARK: - Filtered Empty State (has subs, but filters match none)

    private var filteredEmptyState: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(Color.textMuted)
            Text("Sin resultados")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            Text("Ninguna suscripción coincide con los filtros.")
                .font(.bodyRegular)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, Spacing.xxxl)
    }

    // MARK: - Helpers

    private func statusLabel(for status: Subscription.Status) -> String {
        switch status {
        case .active:    "Activa"
        case .paused:    "Pausada"
        case .cancelled: "Cancelada"
        case .trial:     "Prueba"
        }
    }

    private func statusColor(for status: Subscription.Status) -> Color {
        switch status {
        case .active:    Color(hex: "#16A34A")
        case .paused:    Color(hex: "#E07B1A")
        case .cancelled: Color(hex: "#EF4444")
        case .trial:     Color(hex: "#D97706")
        }
    }
}

// MARK: - Wallet Card (matches web's stacked white cards)

/// White card used in the subscription list wallet stack.
/// Matches web: bg-white, borderRadius 28, px-5 pt-5 pb-5,
/// shadow 0 -1px 2px rgba(0,0,0,0.04), progress bar green #22C55E.
private struct WalletCardView: View {
    let subscription: Subscription
    var onTap: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            VStack(spacing: Spacing.xl) {
                // ── Top row: avatar | name+cat | price+status ──
                HStack(alignment: .top, spacing: Spacing.xl) {
                    LogoAvatar(
                        name: subscription.name,
                        logoURL: URL(string: subscription.logoUrl ?? ""),
                        size: 48
                    )

                    VStack(alignment: .leading, spacing: 4) {
                        Text(subscription.name)
                            .font(.rounded(.bold, size: 16))
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)
                        Text(subscription.category.localizedName)
                            .font(.rounded(.regular, size: 14))
                            .foregroundStyle(Color.textMuted)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text(CurrencyFormat.string(for: subscription.monthlyEquivalent, currency: subscription.currency))
                                .font(.rounded(.bold, size: 16))
                                .foregroundStyle(Color.textPrimary)
                            Text("/mes")
                                .font(.rounded(.regular, size: 12))
                                .foregroundStyle(Color.textMuted)
                        }
                        Text(walletStatusLabel)
                            .font(.rounded(.semibold, size: 14))
                            .foregroundStyle(walletStatusColor)
                    }
                    .layoutPriority(-1)
                }

                // ── Progress section ───────────────────────────
                if subscription.nextBillingDate > .distantPast {
                    VStack(spacing: Spacing.xs) {
                        Text(daysLabel)
                            .font(.rounded(.regular, size: 12))
                            .foregroundStyle(Color.textMuted)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        // Progress bar (green)
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.black.opacity(0.07))
                                    .frame(height: 4)
                                Capsule()
                                    .fill(Color(hex: "#22C55E"))
                                    .frame(width: geo.size.width * subscription.billingProgress, height: 4)
                            }
                        }
                        .frame(height: 4)

                        // Days + date
                        HStack {
                            Text(daysShortLabel)
                                .font(.rounded(.regular, size: 12))
                                .foregroundStyle(Color.textMuted)
                            Spacer()
                            Text(formattedNextDate)
                                .font(.rounded(.regular, size: 12))
                                .foregroundStyle(Color.textMuted)
                        }
                    }
                }
            }
            .padding(Spacing.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 2, y: -1)
        }
        .buttonStyle(.pressable)
        .contentShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
    }

    private var walletStatusLabel: String {
        switch subscription.status {
        case .active:    "Activa"
        case .paused:    "Pausada"
        case .cancelled: "Cancelada"
        case .trial:     "Prueba"
        }
    }

    private var walletStatusColor: Color {
        switch subscription.status {
        case .active:    Color(hex: "#16A34A")
        case .paused:    Color(hex: "#E07B1A")
        case .cancelled: Color(hex: "#EF4444")
        case .trial:     Color(hex: "#D97706")
        }
    }

    private var daysLabel: String {
        let d = subscription.daysUntilBilling
        if d == 0 { return "Se renueva hoy" }
        if d == 1 { return "Se renueva manana" }
        return "Se renueva en \(d) dias"
    }

    private var daysShortLabel: String {
        let d = subscription.daysUntilBilling
        if d == 0 { return "Hoy" }
        if d == 1 { return "1 dia" }
        return "\(d) dias"
    }

    private var formattedNextDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        formatter.locale = Locale(identifier: "es_ES")
        return formatter.string(from: subscription.nextBillingDate)
    }
}

#Preview {
    SubscriptionsListView()
        .environment(SubscriptionsStore.preview())
}
