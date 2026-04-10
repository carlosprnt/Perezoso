import SwiftUI
import AuthenticationServices

/// Login / onboarding screen matching the web app's `/login`.
///
/// Shows a page-style carousel with 4 value-proposition slides
/// (+ a 5th login-only slide), floating subscription brand logos
/// in the hero area, the Perezoso sloth logo in the center, and
/// a bottom panel with "Iniciar sesión" / "Continuar" CTAs.
struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var currentSlide = 0
    @State private var showSignInSheet = false
    @State private var isLoading = false
    @State private var error: String?

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

    var body: some View {
        ZStack {
            // ── Hero background ─────────────────────────────
            Color.background.ignoresSafeArea()

            // ── Perezoso logo (centered above the panel) ────
            VStack {
                Spacer()
                Image("Logo") // from Assets.xcassets
                    .resizable()
                    .frame(width: 88, height: 88)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .shadow(color: .black.opacity(0.18), radius: 20, y: 10)
                Spacer()
                Spacer()
                    .frame(height: 260)
            }

            // ── Bottom panel ────────────────────────────────
            VStack(spacing: 0) {
                Spacer()
                VStack(alignment: .leading, spacing: Spacing.md) {
                    // Slide text (animated)
                    if currentSlide < slides.count {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text(slides[currentSlide].title)
                                .font(.title)
                                .foregroundStyle(.textPrimary)
                                .animation(.easeInOut(duration: 0.2), value: currentSlide)

                            Text(slides[currentSlide].body)
                                .font(.bodyRegular)
                                .foregroundStyle(.textSecondary)
                                .animation(.easeInOut(duration: 0.2), value: currentSlide)
                        }
                        .id(currentSlide) // force re-render for transition
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                    } else {
                        VStack(alignment: .leading, spacing: Spacing.sm) {
                            Text("Empieza ahora")
                                .font(.title)
                                .foregroundStyle(.textPrimary)
                            Text("Inicia sesión y vuelca todas tus suscripciones en un solo sitio.")
                                .font(.bodyRegular)
                                .foregroundStyle(.textSecondary)
                        }
                    }

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
                            SecondaryButton("Iniciar sesión") {
                                Haptics.tap()
                                showSignInSheet = true
                            }
                            PrimaryButton("Continuar") {
                                Haptics.selection()
                                withAnimation { currentSlide += 1 }
                            }
                        }
                    } else {
                        // Last slide: show auth providers directly
                        authButtons
                    }
                }
                .padding(.horizontal, Spacing.xxl)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.lg)
                .background(
                    Color.surface
                        .clipShape(.rect(topLeadingRadius: Radius.panel,
                                         topTrailingRadius: Radius.panel))
                )
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .sheet(isPresented: $showSignInSheet) {
            signInSheet
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(Radius.sheet)
        }
        .gesture(
            DragGesture(minimumDistance: 50)
                .onEnded { value in
                    if value.translation.width < -50 {
                        withAnimation { currentSlide = min(currentSlide + 1, slides.count) }
                    } else if value.translation.width > 50 {
                        withAnimation { currentSlide = max(currentSlide - 1, 0) }
                    }
                }
        )
    }

    // MARK: - Auth buttons

    private var authButtons: some View {
        VStack(spacing: Spacing.sm) {
            // Sign in with Apple (native)
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.email, .fullName]
            } onCompletion: { result in
                Task { await handleAppleSignIn(result) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 48)
            .clipShape(.capsule)

            // Google OAuth
            PrimaryButton("Continuar con Google", isLoading: isLoading) {
                Task { await handleGoogleSignIn() }
            }

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.danger)
                    .padding(.horizontal)
            }

            Text("Al continuar aceptas nuestros [Términos](https://perezoso.vercel.app/terms) y la [Política de privacidad](https://perezoso.vercel.app/privacy).")
                .font(.micro)
                .foregroundStyle(.textMuted)
                .multilineTextAlignment(.center)
                .tint(.textMuted)
        }
    }

    private var signInSheet: some View {
        VStack(spacing: Spacing.lg) {
            Text("Iniciar sesión")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            authButtons
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.top, Spacing.lg)
        .padding(.bottom, Spacing.xxxl)
    }

    // MARK: - Auth handlers

    private func handleAppleSignIn(_ result: Result<ASAuthorization, any Error>) async {
        switch result {
        case .success(let authorization):
            do {
                isLoading = true
                error = nil
                try await auth.signInWithApple(authorization)
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        case .failure(let err):
            error = err.localizedDescription
        }
    }

    private func handleGoogleSignIn() async {
        do {
            isLoading = true
            error = nil
            try await auth.signInWithGoogle()
        } catch {
            error = error.localizedDescription
        }
        isLoading = false
    }
}

#Preview {
    LoginView()
        .environment(AuthStore.preview(state: .signedOut))
}
