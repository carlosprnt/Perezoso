import SwiftUI

/// Subscription list — all subscriptions with filter, search, and
/// the ability to add new ones. Mirrors `/subscriptions` on the web.
///
/// Uses the new SubscriptionCard component with colored presets
/// instead of plain list rows.
struct SubscriptionsListView: View {
    @Environment(SubscriptionsStore.self) private var store
    @State private var searchText = ""
    @State private var showAddSheet = false
    @State private var selectedSubscription: Subscription?
    @State private var statusFilter: Subscription.Status?
    @State private var categoryFilter: Subscription.Category?
    @State private var showFilterSheet = false

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

    private var hasActiveFilters: Bool {
        statusFilter != nil || categoryFilter != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.md) {
                    // ── Header row ────────────────────────────
                    headerRow

                    // ── Search bar ────────────────────────────
                    searchBar

                    // ── Active filter chips ───────────────────
                    if hasActiveFilters {
                        filterChips
                    }

                    // ── Subscription count ────────────────────
                    HStack {
                        Text("\(filteredSubscriptions.count) suscripciones")
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                        Spacer()
                    }

                    // ── Subscription cards ────────────────────
                    if filteredSubscriptions.isEmpty && !store.isLoading {
                        emptyState
                            .padding(.top, Spacing.xxxl)
                    } else {
                        LazyVStack(spacing: Spacing.md) {
                            ForEach(filteredSubscriptions) { sub in
                                SubscriptionCard(subscription: sub) {
                                    selectedSubscription = sub
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.md)
                .padding(.bottom, 120)
            }
            .background(Color.background)
            .sheet(item: $selectedSubscription) { sub in
                SubscriptionDetailView(subscription: sub)
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(Radius.sheet)
            }
            .sheet(isPresented: $showAddSheet) {
                SubscriptionFormView(mode: .create)
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(Radius.sheet)
            }
            .sheet(isPresented: $showFilterSheet) {
                filterSheet
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(Radius.sheet)
            }
            .refreshable {
                await store.fetch()
            }
        }
    }

    // MARK: - Header

    private var headerRow: some View {
        HStack {
            Text("Suscripciones")
                .font(.title)
                .foregroundStyle(Color.textPrimary)
            Spacer()
            Button {
                Haptics.tap(.light)
                showAddSheet = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.accentForeground)
                    .frame(width: 36, height: 36)
                    .background(Color.accent, in: Circle())
            }
        }
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

            // Filter button
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

    // MARK: - Filter Sheet

    private var filterSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    // Status filters
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

                    // Category filters
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Categoría")
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
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xxxl)
            }
            .background(Color.background)
            .navigationTitle("Filtros")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") {
                        showFilterSheet = false
                    }
                    .tint(Color.textSecondary)
                }
                if hasActiveFilters {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Limpiar") {
                            statusFilter = nil
                            categoryFilter = nil
                        }
                        .tint(Color.danger)
                    }
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "rectangle.stack.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(Color.textMuted)
            Text("Sin suscripciones")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            Text(hasActiveFilters
                 ? "Ninguna suscripción coincide con los filtros seleccionados."
                 : "Añade tu primera suscripción para empezar a trackear tus gastos.")
                .font(.bodyRegular)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
            if !hasActiveFilters {
                PrimaryButton(title: "Añadir suscripción") {
                    showAddSheet = true
                }
                .frame(maxWidth: 240)
            }
        }
        .padding(.horizontal, Spacing.xxxl)
    }
}

#Preview {
    SubscriptionsListView()
        .environment(SubscriptionsStore.preview())
}
