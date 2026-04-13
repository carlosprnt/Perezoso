import SwiftUI

/// Custom bottom sheet matching the web's BottomSheet.tsx exactly.
///
/// Features:
/// - Dark backdrop with tap-to-dismiss
/// - Slide-up spring animation
/// - Drag handle (w-10, h-1, rounded-full)
/// - Custom corner radius (32px top)
/// - Drag-to-dismiss gesture
/// - Height variants (auto, tall, full)
/// - Safe area bottom bleed
struct CustomBottomSheet<Content: View>: View {
    @Binding var isPresented: Bool
    var height: SheetHeight = .auto
    var showHandle: Bool = true
    var title: String? = nil
    @ViewBuilder let content: () -> Content

    enum SheetHeight {
        case auto      // 80% of screen
        case tall      // 85%
        case full      // 92%

        var fraction: CGFloat {
            switch self {
            case .auto: 0.80
            case .tall: 0.85
            case .full: 0.92
            }
        }
    }

    @State private var dragOffset: CGFloat = 0
    @State private var sheetVisible = false
    @State private var peekOffset: CGFloat = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            // ── Backdrop ──────────────────────────────────
            if sheetVisible {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        dismiss()
                    }
                    .transition(.opacity)
            }

            // ── Sheet ─────────────────────────────────────
            if sheetVisible {
                GeometryReader { geo in
                    let maxHeight = geo.size.height * height.fraction

                    VStack(spacing: 0) {
                        // Drag handle
                        if showHandle {
                            Capsule()
                                .fill(Color(light: "#D4D4D4", dark: "#3A3A3C"))
                                .frame(width: 40, height: 4)
                                .padding(.top, Spacing.md)
                                .padding(.bottom, Spacing.sm)
                        }

                        // Optional title
                        if let title {
                            HStack {
                                Text(title)
                                    .font(.rounded(.semibold, size: 17))
                                    .foregroundStyle(Color.textPrimary)
                                Spacer()
                                Button {
                                    dismiss()
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(Color.textSecondary)
                                        .frame(width: 44, height: 44)
                                        .background(Color.surfaceSecondary)
                                        .clipShape(Circle())
                                }
                            }
                            .padding(.horizontal, Spacing.xl)
                            .padding(.vertical, Spacing.md)
                        }

                        // Content
                        ScrollView {
                            content()
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(maxHeight: maxHeight)
                    .background(Color.surface)
                    .clipShape(
                        .rect(topLeadingRadius: Radius.sheet,
                              topTrailingRadius: Radius.sheet)
                    )
                    .shadow(color: .black.opacity(0.22), radius: 40, y: -12)
                    .offset(y: max(0, dragOffset + peekOffset))
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                if value.translation.height > 0 {
                                    dragOffset = value.translation.height
                                }
                            }
                            .onEnded { value in
                                if value.translation.height > 100 ||
                                   value.predictedEndTranslation.height > 200 {
                                    dismiss()
                                } else {
                                    withAnimation(.spring(MotionSpring.snap)) {
                                        dragOffset = 0
                                    }
                                }
                            }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    .transition(.move(edge: .bottom))
                }
                .ignoresSafeArea()
            }
        }
        // Web: sheet entrance 0.3s decelerate [0,0,0,1]
        .animation(MotionCurve.decelerate(duration: MotionTiming.sheetEntrance), value: sheetVisible)
        .onChange(of: isPresented) { _, newValue in
            if newValue {
                sheetVisible = true
                dragOffset = 0
                peekOffset = 0
                // Web: peek bounce after 340ms delay
                triggerPeekBounce()
            } else {
                sheetVisible = false
            }
        }
        .onAppear {
            if isPresented {
                sheetVisible = true
            }
        }
    }

    /// Web: peek bounce hint — bounces sheet down 22px then snaps back.
    /// Down: 0.38s [0.34, 1.56, 0.64, 1] (overshoot)
    /// Back: 0.36s [0.25, 0.46, 0.45, 0.94] (decelerate)
    private func triggerPeekBounce() {
        DispatchQueue.main.asyncAfter(deadline: .now() + MotionTiming.peekBounceDelay) {
            guard sheetVisible else { return }
            // Bounce down
            withAnimation(MotionCurve.overshoot(duration: MotionTiming.peekBounceDuration)) {
                peekOffset = 22
            }
            // Snap back
            DispatchQueue.main.asyncAfter(deadline: .now() + MotionTiming.peekSnapDuration) {
                withAnimation(.timingCurve(0.25, 0.46, 0.45, 0.94, duration: MotionTiming.peekSnapDuration)) {
                    peekOffset = 0
                }
            }
        }
    }

    private func dismiss() {
        Haptics.tap(.light)
        // Web: exit 0.28s [0.4, 0, 1, 1] (accelerate)
        withAnimation(MotionCurve.exit(duration: MotionTiming.sheetDismiss)) {
            sheetVisible = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + MotionTiming.sheetDismiss) {
            isPresented = false
        }
    }
}

/// Full-screen overlay matching the web's SubscriptionDetailOverlay.
/// Slides up from bottom with spring animation, brand-tinted backdrop.
struct FullScreenOverlay<Content: View>: View {
    @Binding var isPresented: Bool
    var tintColor: Color = .clear
    @ViewBuilder let content: () -> Content

    @State private var visible = false

    var body: some View {
        ZStack {
            if visible {
                // ── Backdrop ──────────────────────────
                ZStack {
                    Color.black.opacity(0.5)
                    tintColor.opacity(0.15)
                }
                .ignoresSafeArea()
                .transition(.opacity)
                .onTapGesture {
                    dismiss()
                }

                // ── Content ───────────────────────────
                VStack(spacing: 0) {
                    // Close button
                    HStack {
                        Spacer()
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(Color.textPrimary)
                                .frame(width: 36, height: 36)
                                .background(.ultraThinMaterial)
                                .clipShape(Circle())
                        }
                    }
                    .padding(.horizontal, Spacing.xl)
                    .padding(.top, Spacing.md)

                    ScrollView(showsIndicators: false) {
                        content()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.surface)
                .clipShape(
                    .rect(topLeadingRadius: Radius.sheet,
                          topTrailingRadius: Radius.sheet)
                )
                .padding(.top, 60)
                .ignoresSafeArea(edges: .bottom)
                .transition(
                    .asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .move(edge: .bottom).combined(with: .opacity)
                    )
                )
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.88), value: visible)
        .onChange(of: isPresented) { _, newValue in
            visible = newValue
        }
        .onAppear {
            if isPresented { visible = true }
        }
    }

    private func dismiss() {
        Haptics.tap(.light)
        visible = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            isPresented = false
        }
    }
}

#Preview("Bottom Sheet") {
    ZStack {
        Color.background.ignoresSafeArea()
        CustomBottomSheet(isPresented: .constant(true), title: "Filtros") {
            Text("Sheet content")
                .padding()
        }
    }
}
