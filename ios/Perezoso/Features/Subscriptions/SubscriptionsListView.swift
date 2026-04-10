import SwiftUI

/// Subscription list — all subscriptions with filter, search, and
/// the ability to add new ones. Mirrors `/subscriptions` on the web.
struct SubscriptionsListView: View {
    @Environment(SubscriptionsStore.self) private var store
    @State private var searchText = ""
    @State private var showAddSheet = false
    @State private var selectedSubscription: Subscription?

    private var filteredSubscriptions: [Subscription] {
        if searchText.isEmpty { return store.subscriptions }
        return store.subscriptions.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(filteredSubscriptions) { sub in
                    SubscriptionRow(subscription: sub)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .onTapGesture {
                            Haptics.selection()
                            selectedSubscription = sub
                        }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.background)
            .searchable(text: $searchText, prompt: "Buscar suscripciones")
            .navigationTitle("Suscripciones")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Haptics.tap(.light)
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                    }
                }
            }
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
            .refreshable {
                await store.fetch()
            }
            .overlay {
                if store.subscriptions.isEmpty && !store.isLoading {
                    emptyState
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "rectangle.stack.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(.textMuted)
            Text("Sin suscripciones")
                .font(.headline)
                .foregroundStyle(.textPrimary)
            Text("Añade tu primera suscripción para empezar a trackear tus gastos.")
                .font(.bodyRegular)
                .foregroundStyle(.textSecondary)
                .multilineTextAlignment(.center)
            PrimaryButton("Añadir suscripción") {
                showAddSheet = true
            }
            .frame(maxWidth: 240)
        }
        .padding(.horizontal, Spacing.xxxl)
    }
}

// MARK: - Row

private struct SubscriptionRow: View {
    let subscription: Subscription

    var body: some View {
        Card {
            HStack(spacing: Spacing.md) {
                LogoAvatar(
                    name: subscription.name,
                    logoURL: URL(string: subscription.logoUrl ?? ""),
                    size: 44
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(subscription.name)
                        .font(.bodyMedium)
                        .foregroundStyle(.textPrimary)
                    Text(subscription.category.localizedName)
                        .font(.caption)
                        .foregroundStyle(.textMuted)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(CurrencyFormat.string(for: subscription.amount, currency: subscription.currency))
                        .font(.bodyMedium)
                        .foregroundStyle(.textPrimary)
                    Text(subscription.billingPeriod.rawValue.capitalized)
                        .font(.caption)
                        .foregroundStyle(.textMuted)
                }
            }
            .padding(Spacing.md)
        }
    }
}

#Preview {
    SubscriptionsListView()
        .environment(SubscriptionsStore.preview())
}
