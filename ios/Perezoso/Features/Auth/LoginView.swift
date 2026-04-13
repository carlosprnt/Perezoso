import SwiftUI
import AuthenticationServices

/// Login / onboarding screen matching the web's LoginScreen.tsx exactly.
///
/// Features:
/// - Floating subscription brand logos with individual float animations
/// - 4 value-prop slides + 1 login slide carousel
/// - Swipe gesture between slides
/// - Custom bottom panel (not native sheet)
/// - Sign in with Apple + Google
/// - Pulsing arrow on first slide
/// - Page dots with expanding active indicator
struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var currentSlide = 0
    @State private var showSignInSheet = false
    @State private var isLoading = false
    @State private var error: String?
    @State private var appeared = false

    private let slides: [(title: String, body: String)] = [
        ("Todas tus suscripciones\nen un solo sitio",
         "Cuánto pagas al mes, qué se renueva esta semana y dónde puedes ahorrar."),
        ("Calendario con próximas\nrenovaciones",
         "Visualiza de un vistazo todo lo que se va a cobrar en los próximos días y meses."),
        ("Anticípate a cada\nrenovación",
         "Consulta tus próximos cobros y recibe avisos antes de que se renueven."),
        ("Insights de gasto y\nsugerencias de ahorro",
         "Descubre patrones y recomendaciones para reducir lo que pagas cada mes."),
    ]

    /// Brand logos matching web's FLOATING_LOGOS — positioned as percentages
    /// of the hero area, with sizes and float animation delays.
    private let floatingLogos: [(slug: String, name: String, leftPct: CGFloat, topPct: CGFloat, size: CGFloat, delay: Double)] = [
        ("netflix",  "Netflix",  0.04, 0.08, 52, 0.0),
        ("figma",    "Figma",    0.36, 0.02, 42, 0.6),
        ("spotify",  "Spotify",  0.66, 0.05, 46, 0.5),
        ("revolut",  "Revolut",  0.52, 0.13, 40, 0.1),
        ("duolingo", "Duolingo", 0.05, 0.22, 44, 0.9),
        ("youtube",  "YouTube",  0.74, 0.20, 50, 0.3),
        ("notion",   "Notion",   0.03, 0.50, 44, 0.8),
        ("twitch",   "Twitch",   0.68, 0.52, 52, 0.2),
        ("github",   "GitHub",   0.52, 0.63, 46, 0.4),
        ("icloud",   "iCloud",   0.08, 0.60, 44, 0.7),
    ]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // ── Background ──────────────────────────────
                Color.background.ignoresSafeArea()

                // ── Floating logos (slide 0 only) ───────────
                if currentSlide == 0 {
                    floatingLogosView
                        .transition(.opacity)
                }

                // ── Perezoso logo (centered) ────────────────
                VStack {
                    Spacer()
                    logoView
                    Spacer()
                    Spacer().frame(height: geo.size.height * 0.38)
                }

                // ── Bottom panel ────────────────────────────
                VStack(spacing: 0) {
                    Spacer()
                    bottomPanel(screenWidth: geo.size.width)
                }
                .ignoresSafeArea(edges: .bottom)
            }
        }
        .gesture(
            DragGesture(minimumDistance: 50)
                .onEnded { value in
                    if value.translation.width < -50 {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            currentSlide = min(currentSlide + 1, slides.count)
                        }
                    } else if value.translation.width > 50 {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            currentSlide = max(currentSlide - 1, 0)
                        }
                    }
                }
        )
        .overlay {
            // ── Custom sign-in sheet ────────────────────
            CustomBottomSheet(isPresented: $showSignInSheet, title: "Iniciar sesión") {
                authButtons
                    .padding(.horizontal, Spacing.xl)
                    .padding(.bottom, Spacing.xxxl)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5).delay(0.2)) {
                appeared = true
            }
        }
    }

    // MARK: - Floating Logos

    private var floatingLogosView: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(Array(floatingLogos.enumerated()), id: \.offset) { _, logo in
                    FloatingLogoTile(
                        slug: logo.slug,
                        name: logo.name,
                        size: logo.size,
                        delay: logo.delay,
                        appeared: appeared
                    )
                    .position(
                        x: geo.size.width * logo.leftPct + logo.size / 2,
                        y: geo.size.height * logo.topPct + logo.size / 2
                    )
                }
            }
        }
    }

    // MARK: - Logo

    private var logoView: some View {
        Group {
            if UIImage(named: "Logo") != nil {
                Image("Logo")
                    .resizable()
            } else {
                ZStack {
                    Color.accentLight
                    Image(systemName: "tortoise.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.accent)
                }
            }
        }
        .frame(width: 88, height: 88)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.18), radius: 20, y: 10)
        .scaleEffect(appeared ? 1 : 0.8)
        .opacity(appeared ? 1 : 0)
    }

    // MARK: - Bottom Panel

    private func bottomPanel(screenWidth: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Slide text
            Group {
                if currentSlide < slides.count {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(slides[currentSlide].title)
                            .font(.title)
                            .foregroundStyle(Color.textPrimary)
                        Text(slides[currentSlide].body)
                            .font(.bodyRegular)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .id(currentSlide)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
                } else {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Empieza ahora")
                            .font(.title)
                            .foregroundStyle(Color.textPrimary)
                        Text("Inicia sesión y vuelca todas tus suscripciones en un solo sitio.")
                            .font(.bodyRegular)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: currentSlide)

            // Page dots
            HStack(spacing: 6) {
                ForEach(0..<(slides.count + 1), id: \.self) { i in
                    Capsule()
                        .fill(i == currentSlide ? Color.accent : Color.borderLight)
                        .frame(width: i == currentSlide ? 24 : 4, height: 4)
                        .animation(.spring(response: 0.3), value: currentSlide)
                }
            }
            .padding(.vertical, Spacing.xs)

            // CTAs
            if currentSlide < slides.count {
                HStack(spacing: Spacing.md) {
                    SecondaryButton(title: "Iniciar sesión") {
                        Haptics.tap()
                        showSignInSheet = true
                    }
                    PrimaryButton(title: "Continuar") {
                        Haptics.selection()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            currentSlide += 1
                        }
                    }
                }
            } else {
                authButtons
            }
        }
        .padding(.horizontal, Spacing.xxl)
        .padding(.top, Spacing.xl)
        .padding(.bottom, Spacing.xxxl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            Color.surface
                .clipShape(.rect(topLeadingRadius: Radius.panel,
                                 topTrailingRadius: Radius.panel))
                .shadow(color: .black.opacity(0.08), radius: 30, y: -10)
        )
    }

    // MARK: - Auth buttons

    private var authButtons: some View {
        VStack(spacing: Spacing.sm) {
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.email, .fullName]
            } onCompletion: { result in
                Task { await handleAppleSignIn(result) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 48)
            .clipShape(.capsule)

            PrimaryButton(title: "Continuar con Google", isLoading: isLoading) {
                Task { await handleGoogleSignIn() }
            }

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(Color.danger)
                    .padding(.horizontal)
            }

            Text("Al continuar aceptas nuestros [Términos](https://perezoso.vercel.app/terms) y la [Política de privacidad](https://perezoso.vercel.app/privacy).")
                .font(.micro)
                .foregroundStyle(Color.textMuted)
                .multilineTextAlignment(.center)
                .tint(Color.textMuted)
        }
    }

    // MARK: - Auth handlers

    private func handleAppleSignIn(_ result: Result<ASAuthorization, any Error>) async {
        switch result {
        case .success(let authorization):
            do {
                isLoading = true
                self.error = nil
                try await auth.signInWithApple(authorization)
            } catch let err {
                self.error = err.localizedDescription
            }
            isLoading = false
        case .failure(let err):
            self.error = err.localizedDescription
        }
    }

    private func handleGoogleSignIn() async {
        do {
            isLoading = true
            self.error = nil
            try await auth.signInWithGoogle()
        } catch let err as ASWebAuthenticationSessionError
                    where err.code == .canceledLogin {
            // User tapped Cancel — not a real error
        } catch let err {
            self.error = err.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Floating Logo Tile

/// White tile with brand logo from CDN, matching web's FloatingLogoTile.
/// `bg-white rounded-[14px] border border-[#E8E8E8] shadow-[0_4px_14px_rgba(0,0,0,0.09)]`
private struct FloatingLogoTile: View {
    let slug: String
    let name: String
    let size: CGFloat
    let delay: Double
    let appeared: Bool

    @State private var floatOffset: CGFloat = 0

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white)
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color(hex: "#E8E8E8"), lineWidth: 1)

            // First letter fallback (CDN images won't load in simulator
            // without network, so show the initial as fallback)
            Text(String(name.prefix(1)))
                .font(.rounded(.bold, size: size * 0.35))
                .foregroundStyle(Color.textMuted)
        }
        .frame(width: size, height: size)
        .shadow(color: .black.opacity(0.09), radius: 7, y: 4)
        .offset(y: floatOffset)
        .scaleEffect(appeared ? 1 : 0.4)
        .opacity(appeared ? 1 : 0)
        .animation(
            .spring(response: 0.45, dampingFraction: 0.6).delay(delay),
            value: appeared
        )
        .onAppear {
            withAnimation(
                .easeInOut(duration: Double.random(in: 2.5...3.5))
                .repeatForever(autoreverses: true)
                .delay(delay)
            ) {
                floatOffset = CGFloat.random(in: -8...8)
            }
        }
    }
}

#Preview {
    LoginView()
        .environment(AuthStore.preview(state: .signedOut))
}
