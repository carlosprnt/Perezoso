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

    /// Brand logos that float in the hero area (matching web's floatingLogos)
    private let floatingLogos: [(name: String, icon: String, offset: CGSize, delay: Double)] = [
        ("Netflix",  "play.tv.fill",        CGSize(width: -100, height: -60), 0.0),
        ("Spotify",  "music.note",          CGSize(width: 90, height: -90),  0.3),
        ("Figma",    "paintbrush.fill",     CGSize(width: -50, height: -140), 0.6),
        ("YouTube",  "play.rectangle.fill", CGSize(width: 70, height: -30),  0.2),
        ("iCloud",   "cloud.fill",          CGSize(width: -120, height: -160), 0.8),
        ("Notion",   "doc.text.fill",       CGSize(width: 110, height: -140), 0.5),
        ("GitHub",   "chevron.left.forwardslash.chevron.right", CGSize(width: -80, height: -200), 1.0),
        ("Twitch",   "play.fill",           CGSize(width: 60, height: -200), 0.4),
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
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height * 0.32)
            ZStack {
                ForEach(Array(floatingLogos.enumerated()), id: \.offset) { idx, logo in
                    FloatingLogoView(
                        icon: logo.icon,
                        initialName: String(logo.name.prefix(1)),
                        position: CGPoint(
                            x: center.x + logo.offset.width,
                            y: center.y + logo.offset.height
                        ),
                        delay: logo.delay,
                        appeared: appeared
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

// MARK: - Floating Logo

/// Individual floating logo bubble matching web's logo-float animations.
private struct FloatingLogoView: View {
    let icon: String
    let initialName: String
    let position: CGPoint
    let delay: Double
    let appeared: Bool

    @State private var floatOffset: CGFloat = 0

    var body: some View {
        Image(systemName: icon)
            .font(.system(size: 18, weight: .medium))
            .foregroundStyle(Color.textMuted.opacity(0.5))
            .frame(width: 44, height: 44)
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.borderLight, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.06), radius: 8, y: 4)
            .position(x: position.x, y: position.y + floatOffset)
            .scaleEffect(appeared ? 1 : 0)
            .opacity(appeared ? 0.7 : 0)
            .animation(
                .easeOut(duration: 0.4).delay(delay),
                value: appeared
            )
            .onAppear {
                withAnimation(
                    .easeInOut(duration: Double.random(in: 3...5))
                    .repeatForever(autoreverses: true)
                    .delay(delay)
                ) {
                    floatOffset = CGFloat.random(in: -10...10)
                }
            }
    }
}

#Preview {
    LoginView()
        .environment(AuthStore.preview(state: .signedOut))
}
