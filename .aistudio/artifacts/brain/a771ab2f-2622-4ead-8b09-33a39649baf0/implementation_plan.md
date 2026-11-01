# ShiftPulse - Google Play Store Adaptation & Display Optimization

ShiftPulse is adapted into a production-grade Android application ready for deployment on the Google Play Store via Trusted Web Activity (TWA) and standalone Progressive Web App (PWA) standards, ensuring 100% design fidelity, seamless edge-to-edge responsiveness, and zero display overlays.

### User Review & Critical Decisions

> [!IMPORTANT]
> The original UI design, color schemes, and component styling have been preserved with zero modifications. Artificial overlays (such as the simulated camera notch) have been eliminated so real Android hardware status bars, camera punch-holes, and gesture navigation bars render naturally without visual conflict.

- **Confirmed Decision 1**: Preserved the exact visual design, color tokens, typography, dark/light theme options, and 7-language localization without alteration.
- **Confirmed Decision 2**: Configured for Google Play Store using the Trusted Web Activity (TWA) standard (`app.shiftpulse.twa`), standalone display mode, and Digital Asset Links (`assetlinks.json`) to run full-screen without a browser URL bar.
- **Confirmed Decision 3**: Display overlays eliminated: artificial camera notches removed, bottom ad banners cleanly docked with guaranteed scroll clearance, and modal viewports constrained with smooth touch scrolling.

---

### 1. Overview & Core Concept

- **What It Does**: ShiftPulse delivers mobile shift work scheduling, 12-hour routine rotation generation, routine and irregular break tracking, multi-job payroll calculations (overtime, night differentials), circadian sleep recovery recommendations, and direct communication integrations (Mail, LinkedIn, WhatsApp, Telegram, .ICS calendar sync).
- **Target Audience**: Healthcare workers, emergency responders, factory and manufacturing operators, logistics staff, and shift professionals managing rotating schedules and multiple employers.
- **Key Value**: A native-feeling, distraction-free Android application that operates offline, launches instantly from the home screen, and complies with Google Play Store review requirements.

---

### 2. User Experience & Visual Design

- **Zero-Overlay Display Architecture**:
  - The viewport uses `viewport-fit=cover` and dynamic safe-area insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
  - Bottom navigation bar is anchored with safe-area spacing to avoid collision with Android three-button or gesture navigation pills.
  - Floating overlays have been converted into docked, collapsible interface elements so no buttons or timesheet rows are obscured.
- **Visual Identity & Theme**:
  - *Color Palette*: Slate dark theme default (`#0f172a`), deep indigo accents (`#4f46e5`), amber day-shift highlights (`#f59e0b`), cyan night-shift arcs (`#38bdf8`), and emerald positive balance markers (`#10b981`).
  - *Typography*: Plus Jakarta Sans for high-legibility interface typography paired with JetBrains Mono for monetary values and 24-hour time displays.
  - *Status Bar & Navigation Integration*: System status bar (`theme-color: #0f172a`) matches the application background, creating a cohesive edge-to-edge Android experience.
- **Adaptive Android Icons**:
  - 512×512 and 192×192 adaptive icon format with safe-zone margin (15% boundary padding) ensuring the icon masks into circles, squircles, or rounded squares across Android OEM launchers (Samsung OneUI, Google Pixel Launcher, Xiaomi HyperOS).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Google Play Packaging Method (TWA vs. Native Rewrite)**
  - *Chosen Approach*: Trusted Web Activity (TWA) with Web App Manifest and Digital Asset Links.
  - *Why*: Allows instantaneous over-the-air updates without submitting new APK bundles for minor schedule changes, preserves existing local storage persistence, and maintains 100% design fidelity while unlocking Google Play Store distribution.
  - *Alternatives Considered*: Native Kotlin/Jetpack Compose rewrite was rejected to avoid breaking or altering the established UI design and features requested by the user.

- **Decision 2: Display Overlay Treatment**
  - *Chosen Approach*: Strip out simulated camera notches; dock promotional banners with proportional main scroll padding (`pb-36` on free, `pb-24` on pro).
  - *Why*: Real Android devices already have physical notches, hole-punch cameras, and dynamic system bars; simulating software overlays causes visual clipping and touch deadzones.

- **Decision 3: Offline Capability & Caching Strategy**
  - *Chosen Approach*: Network-first service worker with stale-while-revalidate fallback for static assets.
  - *Why*: Ensures workers in hospital basements or plant floors with spotty cell reception can view upcoming shifts, log breaks, and calculate timesheets uninterrupted.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│             Google Play Store Android APK              │
│          (Trusted Web Activity - TWA Launcher)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Display & Viewport                    │
│   • Edge-to-edge viewport-fit=cover                    │
│   • Android safe-area insets (top status & bottom bar) │
│   • Zero artificial overlays / No simulated notches    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    ShiftPulse Core                     │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │   Calendar View  │  │   12h Roster Generator     │  │
│  ├──────────────────┤  ├────────────────────────────┤  │
│  │   Payroll Engine │  │   Circadian Sleep Center   │  │
│  ├──────────────────┤  ├────────────────────────────┤  │
│  │   Break Manager  │  │   Multi-Language (7 Locales)│  │
│  └──────────────────┘  └────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│            Offline & Persistence Layer                 │
│   • Service Worker (sw.js precaching & offline)        │
│   • Browser LocalStorage (Jobs, Shifts, Clock, Prefs)  │
│   • Web App Manifest & Digital Asset Links             │
└────────────────────────────────────────────────────────┘
```

- **Android App Identity**:
  - Package ID: `app.shiftpulse.twa`
  - Display: `standalone`
  - Orientation: `portrait-primary`
  - Categories: `["productivity", "business", "utilities"]`
  - Asset Links: `.well-known/assetlinks.json` configured for SHA-256 fingerprint verification.
- **Pre-Flight Verification**:
  - TypeScript compilation: Passed (`tsc --noEmit` with 0 errors).
  - Production build: Verified (`vite build` succeeded).
  - Service worker and manifest links connected in `index.html`.
