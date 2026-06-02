import SwiftUI

/// Full-width rounded button used for primary CTAs.
///
/// Matches the web's primary button: pure black background, white text,
/// capsule shape, 48pt height. In dark mode the colors invert
/// (white background, black text) matching the web's adaptive accent.
///
/// ```swift
/// PrimaryButton("Continuar") { await submit() }
/// PrimaryButton("Guardar", isLoading: isSaving) { await save() }
/// ```
struct PrimaryButton: View {
    let title: String
    var isLoading: Bool = false
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title)
                    .font(.rounded(.semibold, size: 15))
                    .opacity(isLoading ? 0 : 1)

                if isLoading {
                    ProgressView()
                        .tint(Color.accentForeground)
                        .controlSize(.small)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(Color.accentForeground)
            .background(Color.accent, in: .capsule)
        }
        .disabled(isLoading || isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
        .sensoryFeedback(.impact(flexibility: .solid, intensity: 0.5), trigger: isLoading)
    }
}

/// Outlined variant for secondary actions alongside a PrimaryButton.
struct SecondaryButton: View {
    let title: String
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.rounded(.semibold, size: 15))
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .foregroundStyle(Color.textPrimary)
                .background(.clear)
                .clipShape(.capsule)
                .overlay(Capsule().stroke(Color.border, lineWidth: 1))
        }
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
    }
}

/// Ghost variant — transparent background, used in nav/toolbar.
struct GhostButton: View {
    let title: String
    let icon: String?
    var isDisabled: Bool = false
    let action: () -> Void

    init(_ title: String, icon: String? = nil, isDisabled: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .medium))
                }
                Text(title)
                    .font(.rounded(.medium, size: 14))
            }
            .foregroundStyle(Color.textPrimary)
            .padding(.horizontal, Spacing.lg)
            .frame(height: 40)
            .background(Color.surfaceSecondary, in: .capsule)
        }
        .disabled(isDisabled)
    }
}

/// Danger button — red, for destructive actions.
struct DangerButton: View {
    let title: String
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title)
                    .font(.rounded(.semibold, size: 15))
                    .opacity(isLoading ? 0 : 1)

                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .controlSize(.small)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(.white)
            .background(Color(hex: "#DC2626"), in: .capsule)
        }
        .disabled(isLoading)
    }
}

#Preview {
    VStack(spacing: Spacing.md) {
        PrimaryButton(title: "Continuar") {}
        PrimaryButton(title: "Guardando…", isLoading: true) {}
        SecondaryButton(title: "Iniciar sesión") {}
        GhostButton("Filtros", icon: "slider.horizontal.3") {}
        DangerButton(title: "Eliminar") {}
    }
    .padding()
}
