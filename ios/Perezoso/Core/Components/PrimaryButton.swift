import SwiftUI

/// Full-width rounded accent button used for primary CTAs.
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
                    .font(.inter(.semibold, size: 15))
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
                .font(.inter(.semibold, size: 15))
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .foregroundStyle(Color.textPrimary)
                .background(.clear)
                .clipShape(.capsule)
                .overlay(Capsule().stroke(Color.borderLight, lineWidth: 1))
        }
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
    }
}

#Preview {
    VStack(spacing: Spacing.md) {
        PrimaryButton(title: "Continuar") {}
        PrimaryButton(title: "Guardando…", isLoading: true) {}
        SecondaryButton(title: "Iniciar sesión") {}
    }
    .padding()
}
