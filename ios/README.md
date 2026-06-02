# Perezoso iOS — native SwiftUI app

100% native Swift + SwiftUI port of the Perezoso web app. Shares the
same Supabase backend (auth + database), the same RevenueCat
entitlements, and the same brand assets, but the UI, navigation,
animations, and local state are fully native.

## Requirements

- **Xcode 15.3+** (Swift 5.10 / Swift 6 concurrency, iOS 17+ minimum)
- **XcodeGen** — the project file is generated from `project.yml`, not
  committed. Install with: `brew install xcodegen`
- An Apple Developer account for Signing / IAP / Push Notifications
- Supabase and RevenueCat keys (same as the web app)

## First-time setup

```bash
cd ios

# 1. Install XcodeGen if you don't have it
brew install xcodegen

# 2. Copy the example config and fill in your keys
cp Config.xcconfig.example Config.xcconfig
# edit Config.xcconfig — do NOT commit it

# 3. Generate the Xcode project from project.yml
xcodegen generate

# 4. Open in Xcode
open Perezoso.xcodeproj
```

The first build will pull the SPM dependencies (Supabase, RevenueCat,
Kingfisher). Don't wait staring at the spinner — it takes a couple
minutes the first time.

## Project structure

```
ios/
├── project.yml              # XcodeGen spec — the source of truth for the project
├── Config.xcconfig.example  # template for Supabase / RevenueCat keys
├── Perezoso/
│   ├── App/                 # @main entry + root navigation + environment loader
│   ├── Core/
│   │   ├── Design/          # tokens: colors, typography, spacing, radius, shadows
│   │   ├── Components/      # shared SwiftUI components (buttons, cards, sheets…)
│   │   ├── Models/          # Codable domain models matching the Supabase schema
│   │   ├── Networking/      # SupabaseClient configuration
│   │   ├── Stores/          # @Observable app state (AuthStore, SubscriptionsStore)
│   │   ├── Services/        # haptics, formatters, calendar helpers
│   │   └── Calculations/    # pure-function business logic (ported from lib/calculations)
│   ├── Features/
│   │   ├── Auth/            # LoginView + onboarding carousel
│   │   ├── Dashboard/       # summary hero + insights + cards
│   │   ├── Subscriptions/   # list, detail, create/edit
│   │   ├── Calendar/        # renewals calendar
│   │   ├── Settings/        # settings + account
│   │   └── Paywall/         # RevenueCat paywall
│   └── Resources/
│       ├── Assets.xcassets  # colors, app icon, brand art
│       ├── Info.plist
│       └── Perezoso.entitlements
└── PerezosoTests/           # unit tests for Core/*
```

## Regenerating the project

Anytime you add or rename a Swift file, run:

```bash
xcodegen generate
```

and the `.xcodeproj` picks it up. Don't edit the `.xcodeproj` by hand;
it's overwritten on every regeneration.

## Shared backend

- **Supabase**: same instance as the web app. Same tables, same RLS,
  same OAuth providers. The iOS client uses `supabase-swift` and
  talks to the exact same REST / Realtime endpoints.
- **RevenueCat**: same API key, same entitlement (`pro`), same
  offerings. Use the iOS API key — not the web one.
- **Assets**: logos, onboarding images, and `logo-premium.png` are
  imported into `Assets.xcassets` so they work offline and don't
  depend on the Vercel host.
