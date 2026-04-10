import SwiftUI
import Kingfisher

/// Displays a subscription logo with a consistent rounded container,
/// white background, and a fallback letter initial when the image
/// fails to load.
struct LogoAvatar: View {
    let name: String
    var logoURL: URL?
    var size: CGFloat = 44

    private var cornerRadius: CGFloat { size * 0.22 }

    var body: some View {
        ZStack {
            Color.white
            if let logoURL {
                KFImage(logoURL)
                    .resizable()
                    .placeholder {
                        initialFallback
                    }
                    .scaledToFit()
                    .padding(size * 0.18)
            } else {
                initialFallback
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(Color.borderLight, lineWidth: 1)
        )
    }

    private var initialFallback: some View {
        Text(String(name.prefix(1)).uppercased())
            .font(.inter(.bold, size: size * 0.4))
            .foregroundStyle(.textMuted)
    }
}

#Preview {
    HStack(spacing: Spacing.md) {
        LogoAvatar(name: "Netflix", logoURL: URL(string: "https://cdn.simpleicons.org/netflix"))
        LogoAvatar(name: "Spotify", size: 56)
        LogoAvatar(name: "YouTube", logoURL: URL(string: "https://invalid.url/fail.png"))
    }
    .padding()
}
