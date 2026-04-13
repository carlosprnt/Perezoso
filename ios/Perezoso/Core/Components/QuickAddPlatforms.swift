import SwiftUI

/// Data for a quick-add platform suggestion.
/// Matches the web's `platforms.ts` catalog + `QuickAddPlatforms.tsx` list.
struct QuickAddPlatformInfo: Identifiable {
    let id: String
    let name: String
    let logoUrl: String
    let category: Subscription.Category
    let billingPeriod: Subscription.BillingPeriod

    static let all: [QuickAddPlatformInfo] = [
        .init(id: "netflix", name: "Netflix", logoUrl: "https://cdn.simpleicons.org/netflix", category: .streaming, billingPeriod: .monthly),
        .init(id: "spotify", name: "Spotify", logoUrl: "https://cdn.simpleicons.org/spotify", category: .music, billingPeriod: .monthly),
        .init(id: "disney-plus", name: "Disney+", logoUrl: "https://cdn.simpleicons.org/disneyplus", category: .streaming, billingPeriod: .monthly),
        .init(id: "youtube-premium", name: "YouTube Premium", logoUrl: "https://cdn.simpleicons.org/youtube", category: .streaming, billingPeriod: .monthly),
        .init(id: "amazon-prime-video", name: "Amazon Prime Video", logoUrl: "https://cdn.simpleicons.org/amazonprimevideo", category: .streaming, billingPeriod: .monthly),
        .init(id: "hbo-max", name: "HBO Max", logoUrl: "https://cdn.simpleicons.org/hbo", category: .streaming, billingPeriod: .monthly),
        .init(id: "apple-tv-plus", name: "Apple TV+", logoUrl: "https://cdn.simpleicons.org/appletv", category: .streaming, billingPeriod: .monthly),
        .init(id: "apple-music", name: "Apple Music", logoUrl: "https://cdn.simpleicons.org/applemusic", category: .music, billingPeriod: .monthly),
        .init(id: "notion", name: "Notion", logoUrl: "https://cdn.simpleicons.org/notion", category: .productivity, billingPeriod: .monthly),
        .init(id: "github", name: "GitHub", logoUrl: "https://cdn.simpleicons.org/github", category: .productivity, billingPeriod: .monthly),
        .init(id: "adobe-cc", name: "Adobe Creative Cloud", logoUrl: "https://cdn.simpleicons.org/adobecreativecloud", category: .productivity, billingPeriod: .monthly),
        .init(id: "google-one", name: "Google One", logoUrl: "https://cdn.simpleicons.org/google", category: .cloud, billingPeriod: .monthly),
        .init(id: "amazon-prime", name: "Amazon Prime", logoUrl: "https://cdn.simpleicons.org/amazon", category: .other, billingPeriod: .yearly),
        .init(id: "duolingo", name: "Duolingo", logoUrl: "https://cdn.simpleicons.org/duolingo", category: .education, billingPeriod: .monthly),
    ]
}

/// Quick-add platforms list matching the web's QuickAddPlatforms.tsx exactly.
///
/// Web spec:
/// - Logo: 40x40, rounded-[10px], bg #F2F2F7
/// - Name: text-[15px] font-medium text-black
/// - Add button: w-8 h-8 rounded-full bg-[#F0F0F0]
/// - Dividers: h-px bg-[#E5E5EA]
/// - Header: text-[13px] font-semibold text-[#737373] mb-3
/// - Footer: "Anadir manualmente" row with Plus icon
struct QuickAddPlatforms: View {
    var onSelect: (QuickAddPlatformInfo) -> Void
    var onAddManually: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header (web: text-[13px] font-semibold text-[#737373] mb-3)
            Text("Añade tu primera suscripción")
                .font(.rounded(.semibold, size: 13))
                .foregroundStyle(Color(hex: "#737373"))
                .padding(.bottom, 12)

            // Platform rows
            VStack(spacing: 0) {
                ForEach(Array(QuickAddPlatformInfo.all.enumerated()), id: \.element.id) { idx, platform in
                    VStack(spacing: 0) {
                        Button {
                            Haptics.tap(.light)
                            onSelect(platform)
                        } label: {
                            platformRow(platform)
                        }
                        .buttonStyle(.plain)

                        // Divider (web: h-px bg-[#E5E5EA])
                        Rectangle()
                            .fill(Color(hex: "#E5E5EA"))
                            .frame(height: 0.5)
                    }
                    .scrollFadeBlurScale()
                    .staggeredEntrance(
                        index: idx,
                        stagger: MotionTiming.rowStagger,
                        offsetY: 30,
                        duration: 0.35,
                        startScale: 0.9
                    )
                }

                // "Anadir manualmente" row
                Button {
                    Haptics.tap(.light)
                    onAddManually()
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color(hex: "#F2F2F7"))
                                .frame(width: 40, height: 40)
                            Image(systemName: "plus")
                                .font(.system(size: 17, weight: .medium))
                                .foregroundStyle(Color.textPrimary)
                        }

                        Text("Añadir manualmente")
                            .font(.rounded(.medium, size: 15))
                            .foregroundStyle(Color.textPrimary)

                        Spacer()
                    }
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
                .scrollFadeBlurScale()
                .staggeredEntrance(
                    index: QuickAddPlatformInfo.all.count,
                    stagger: MotionTiming.rowStagger,
                    offsetY: 30,
                    duration: 0.35,
                    startScale: 0.9
                )
            }
        }
    }

    // MARK: - Platform Row (web: gap-3=12px, py-2.5=10px)

    private func platformRow(_ platform: QuickAddPlatformInfo) -> some View {
        HStack(spacing: 12) {
            // Logo 40x40, rounded-[10px]
            LogoAvatar(
                name: platform.name,
                logoURL: URL(string: platform.logoUrl),
                size: 40
            )

            // Platform name (web: text-[15px] font-medium)
            Text(platform.name)
                .font(.rounded(.medium, size: 15))
                .foregroundStyle(Color.textPrimary)
                .lineLimit(1)

            Spacer()

            // Add button (web: w-8 h-8 rounded-full bg-[#F0F0F0])
            ZStack {
                Circle()
                    .fill(Color(hex: "#F0F0F0"))
                    .frame(width: 32, height: 32)
                Image(systemName: "plus")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.textPrimary)
            }
        }
        .padding(.vertical, 10)
    }
}

#Preview {
    ScrollView {
        QuickAddPlatforms(
            onSelect: { _ in },
            onAddManually: { }
        )
        .padding(.horizontal, 20)
    }
    .background(Color.background)
}
