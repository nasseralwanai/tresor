# Expo vs. Bare React Native — Architectural Analysis for Trésor

**Author:** Nigel (System Architect)
**Date:** August 7, 2026
**Status:** FINAL — Recommendation included
**Audience:** Nasser (CTO/Founder), Muaath (Design Lead)

---

## Executive Summary

**Recommendation: Stay with Expo. Do not switch to bare React Native.**

Expo SDK 57 — which Trésor currently runs — uses Continuous Native Generation (CNG) with development builds. This is **not** the old "Expo Go" workflow that locked you into a sandbox. With CNG + dev builds, there is **no native capability available to bare React Native that is inaccessible to Trésor**. You can write custom native modules in Swift/Kotlin, edit the Xcode project, integrate any third-party native library, and run `pod install` — all while keeping OTA updates, EAS Build, expo-router, and a dramatically simpler upgrade path.

The "luxury feel" Nasser is asking about — 60fps animations, custom GPU shaders, canvas rendering, particle systems — is **fully achievable in Expo**. The tools that enable it (React Native Skia, Reanimated 4, Gesture Handler) are first-class Expo citizens with official Expo templates. Switching to bare RN would not unlock any visual capability we don't already have; it would only strip away productivity infrastructure and introduce months of migration risk for zero rendering gain.

The quality gap Nasser is feeling is **not an Expo limitation**. It's a design and animation implementation gap — solvable with Skia + Reanimated + proper craft, which we can adopt incrementally on our current stack.

---

## Table of Contents

1. [What Does Expo SDK 57 Actually Limit?](#1-what-does-expo-sdk-57-actually-limit)
2. [What Does Expo Give You That You'd Lose?](#2-what-does-expo-give-you-that-youd-lose)
3. [Is the "Luxury Feel" Achievable in Expo?](#3-is-the-luxury-feel-achievable-in-expo)
4. [What's the Migration Cost?](#4-whats-the-migration-cost)
5. [What Does the Industry Say?](#5-what-does-the-industry-say)
6. [Recommendation](#6-recommendation)

---

## 1. What Does Expo SDK 57 Actually Limit?

### The Critical Distinction: CNG + Dev Builds ≠ Expo Go

The most common misconception — and the one that drives most "should we leave Expo?" questions — comes from confusing **Expo Go** with **Expo managed workflow + CNG + development builds**. These are fundamentally different things:

| Capability | Expo Go | Expo CNG + Dev Builds (Trésor's setup) | Bare React Native |
|---|---|---|---|
| Custom native modules | ❌ | ✅ | ✅ |
| Any third-party native library | ❌ (only SDK-included) | ✅ | ✅ |
| Edit native Xcode/Android project | ❌ | ✅ (via prebuild + config plugins, or direct edit) | ✅ |
| `pod install` / Gradle control | ❌ | ✅ | ✅ |
| Custom Swift/Kotlin code | ❌ | ✅ (Expo Modules API) | ✅ |
| App Store / Play Store deployment | ❌ | ✅ | ✅ |
| React Native Skia | ❌ (not in Expo Go) | ✅ | ✅ |

> **"Expo Go cannot use third-party libraries that require custom native code and you cannot edit native code directly in Expo Go. It's limited and not useful for building production-grade projects. We strongly recommend using development builds for any real project."**
> — Expo Official FAQ ([docs.expo.dev/faq](https://docs.expo.dev/faq))

Trésor is already on development builds (installed on a physical iPhone via `xcrun devicectl`), not Expo Go. **Every limitation commonly attributed to "Expo" is actually an Expo Go limitation that does not apply to Trésor.**

### 1.1 Custom Native Modules

**Bare RN:** You write Swift/Obj-C modules, add them to your Xcode project, and they're available.

**Expo CNG + Dev Builds:** You write the same Swift/Kotlin code using the **Expo Modules API** — which is actually a *nicer* abstraction for writing native modules. You can also write traditional React Native native modules. Both work. The Expo Modules API auto-supports the New Architecture (Fabric/TurboModules) with zero additional work.

> **"All modules written using the Expo Modules API support the New Architecture by default! So if you have built your own native modules using this API, no additional work is needed to use them with the New Architecture."**
> — Expo New Architecture Guide ([docs.expo.dev/guides/new-architecture](https://docs.expo.dev/guides/new-architecture))

The only friction: if you need to make a one-off native file edit (e.g., adding a single `.swift` file for experimentation), it's slightly more work in CNG because you either write a config plugin or run `npx expo prebuild` and edit the generated `ios/` directory directly. In bare RN, you just drop the file in. This is a **workflow friction**, not a capability limitation.

**Verdict:** No meaningful limitation for Trésor. We can write any native module we need.

### 1.2 Animation Performance (Reanimated, Skia, Canvas)

This is the core of Nasser's concern, so let's be precise.

**Reanimated 4.5.1** (our version): Runs worklets on the UI thread via JSI. It is **identical** in Expo and bare RN — same library, same native binary, same performance characteristics. The Reanimated docs explicitly state:

> **"Is performance worse with Expo? No. Expo and Reanimated together are production-proven."**
> — Stackademic, "Optimizing animations for 60 FPS with React Native Reanimated" (March 2026)

There is a **known New Architecture regression** where screens with many animated views can cause UI drops during scrolling. This affects both Expo and bare RN equally — it's a Reanimated/Fabric issue, not an Expo issue:

> **"We have been ready for new arch since day 1, and the only thing that stopped us from migrating is having the performance issues with reanimated, and until today (expo 54, reanimated 4.1.0, rn 81.4) sadly it wasn't solved."**
> — GitHub Issue #8250, software-mansion/react-native-reanimated (Sep 2025)

This is important: the performance ceiling for animations is set by **Reanimated + Fabric**, not by Expo vs. bare. Switching to bare RN would not help.

**React Native Skia:** Fully supported in Expo. There's an official Expo template (`npx create-expo-app -e with-skia`) and official Expo documentation page for it. See Section 3 for deep dive.

**Canvas rendering:** Skia provides a `<Canvas>` component that draws directly to the GPU via JSI, bypassing the native view system. This works identically in Expo and bare RN.

**Verdict:** Animation performance is **not limited by Expo**. The same libraries, the same native binaries, the same GPU access.

### 1.3 Deep Native API Access (Camera, AR, MLKit, etc.)

| API | Expo SDK 57 | Bare RN |
|---|---|---|
| Camera | ✅ `expo-camera` | ✅ `react-native-vision-camera` |
| Biometrics/FaceID | ✅ `expo-local-authentication` | ✅ `react-native-biometrics` |
| Haptics | ✅ `expo-haptics` | ✅ custom or community lib |
| Image manipulation | ✅ `expo-image-manipulator` | ✅ community libs |
| Push notifications | ✅ `expo-notifications` | ✅ `@react-native-firebase/messaging` |
| Background tasks | ✅ `expo-task-manager` + `expo-background-fetch` | ✅ community libs |
| ARKit/ARKit | ⚠️ No first-party Expo module, but writeable via custom Expo Module | ✅ |
| MLKit (on-device ML) | ⚠️ No first-party module, but integrable via custom module or config plugin | ✅ |
| NFC | ⚠️ Via config plugin / custom module | ✅ |

For AR and MLKit: there's no built-in Expo module, but you can either (a) write a custom Expo Module in Swift (straightforward — the Expo team has a [video tutorial](https://www.youtube.com/watch?v=zReFsPgUdMs) on building a Foundation Models module), or (b) use a community library with a config plugin. This is more work than bare RN but not blocked.

**For Trésor specifically:** We use camera, haptics, biometrics, image manipulation, secure storage, and notifications. All of these have first-party Expo SDK modules. We have **zero current or planned need** for AR or MLKit.

**Verdict:** No limitation for Trésor's actual or foreseeable feature set.

### 1.4 App Size / Bundle Optimization

Expo apps are typically **2-4 MB larger** than equivalent bare RN apps due to the included Expo SDK runtime ([Leanware, 2026](https://leanware.co/insights/react-native-vs-expo)). For a luxury inventory app targeting 5-15 users, this is completely negligible. The iOS App Store also applies app thinning, which reduces the effective download size.

You can optimize further with:
- **Expo Atlas** — visual bundle analyzer to inspect what's shipping in your JS bundle
- ** Hermes** (enabled by default in SDK 57) — bytecodes JS for smaller footprint and faster startup
- Tree-shaking unused `expo-*` packages (only what you import is bundled)

**Verdict:** ~2-4 MB overhead. Irrelevant for Trésor.

### 1.5 Build Pipeline Control (Xcode Project, Native Dependencies)

**Bare RN:** You own `ios/` and `android/` directories. You edit `Info.plist`, `build.gradle`, `project.pbxproj` directly. Full control, full maintenance burden.

**Expo CNG:** Native directories are **generated artifacts**. You define configuration in `app.json`/`app.config.ts` and config plugins. When you run `npx expo prebuild`, the `ios/` and `android/` directories are generated fresh. You *can* edit them directly (and run `expo prebuild` without `--clean` to layer changes), but manual edits risk being overwritten on a clean prebuild.

The key question: **can you do everything you need via config?**

For 95%+ of use cases: **yes**. Config plugins can modify `Info.plist`, `AndroidManifest.xml`, `build.gradle`, `project.pbxproj`, add entitlements, copy native files, and add framework targets. The Expo team provides a registry of out-of-tree config plugins for popular libraries ([github.com/expo/config-plugins](https://github.com/expo/config-plugins)).

> **"Config plugins let you customize native Android and iOS projects generated with `npx expo prebuild` in Continuous Native Generation (CNG) projects. You can use them to add properties to native config files, copy assets to native projects, or apply advanced configurations, such as adding an app extension target."**
> — Expo Docs ([docs.expo.dev/modules/config-plugin-and-native-module-tutorial](https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial))

The remaining ~5% (highly custom Xcode target configurations, complex build phases, app extensions with tight memory constraints) may require either writing a `dangerousMod` config plugin or temporarily editing the generated native code directly. But this is rare and manageable.

**Verdict:** Slightly more friction for exotic native configurations, but full capability. Trésor's needs (standard iOS app, no extensions, no custom build phases) are fully covered.

### 1.6 Push Notifications & Background Tasks

`expo-notifications` and `expo-task-manager` are mature, production-grade, and arguably **better** than the bare RN alternatives (which typically require `@react-native-firebase/messaging` plus manual APNs setup). Expo handles the APNs certificate management, token registration, and notification channel configuration declaratively.

**Verdict:** No limitation. Expo's notification system is superior in DX.

### 1.7 Third-Party Library Compatibility

**Expo Go:** Limited to libraries with no custom native code, or those included in the SDK. **This is the old limitation.**

**Expo CNG + Dev Builds:** Any library that works in bare RN works here. You install it, and if it needs native configuration, you either (a) use the library's config plugin if it ships one, (b) use an out-of-tree plugin from `expo/config-plugins`, or (c) write a small config plugin yourself. After that, `npx expo prebuild` handles linking.

The one caveat: not every library ships a config plugin, so occasionally you'll need to write one. This is a one-time cost of 30-120 minutes for most integrations.

> **"Not all packages support Expo Prebuild yet. If you find a library that requires extra setup after installation and doesn't yet have a config plugin, we recommend opening a pull request or an issue so that the maintainer is aware of the feature request."**
> — Expo CNG Docs ([docs.expo.dev/workflow/continuous-native-generation](https://docs.expo.dev/workflow/continuous-native-generation))

**Verdict:** Full compatibility. Minor friction for libraries without config plugins.

---

## 2. What Does Expo Give You That You'd Lose?

Switching to bare RN means **giving up** the following. This is the real cost.

### 2.1 EAS Build

**What it is:** Cloud-based builds. You run `eas build --platform ios` and Expo's servers compile your app — no local Xcode needed (though local builds are also supported). Handles code signing, provisioning profiles, and App Store submission (`eas submit`).

**What you'd lose:** You'd need to manage Xcode builds, signing certificates, provisioning profiles, and App Store Connect submissions manually. For a solo developer or small team, this is a significant ongoing time sink. Every CI/CD pipeline would need to be built from scratch.

**Cost of replacement:** Set up Fastlane + match for signing + GitHub Actions for CI. Several days of initial setup, ongoing maintenance.

### 2.2 OTA Updates (EAS Update / expo-updates)

**What it is:** Push JavaScript and asset updates directly to user devices without an App Store review. `eas update` deploys a new bundle; users get it on next app launch.

**What you'd lose:** Instant bug fixes, instant UI changes, instant feature flags. You'd need to go through App Store review (1-7 days) for every JS-only change. Alternatives like CodePush (Microsoft) are being deprecated; Stallion and Shorebird are emerging but less mature.

> **"OTA updates can change: ✅ UI, ✅ Business logic, ✅ Bug fixes, ✅ Assets. OTA updates cannot change: ❌ Native code, ❌ Permissions, ❌ Native SDKs."**
> — DEV Community, "Expo, EAS, Prebuild, OTA, CI/CD" ([dev.to/ersuman](https://dev.to/ersuman/expo-eas-prebuild-ota-cicd-a-complete-mental-model-for-modern-react-native-development-1cm4))

For Trésor with 5-15 users, OTA updates are extremely valuable — you can ship fixes instantly without waiting for App Store review.

**Cost of replacement:** Self-host `expo-updates` (it's open source and self-hostable) or use a third-party OTA service. The self-hosting route keeps the capability but adds infra burden.

### 2.3 expo-router

**What it is:** File-based routing for React Native (like Next.js). Handles navigation, deep linking, universal links, typed routes, and web compatibility automatically.

**What you'd lose:** You'd migrate to React Navigation (programmatic). This means rewriting all navigation code, manually configuring deep linking, and losing typed routes. expo-router is built on top of React Navigation, so the migration is possible, but it's a significant refactor.

**Cost of replacement:** 1-2 weeks of rewriting navigation, plus ongoing manual deep-link maintenance.

### 2.4 Continuous Native Generation (CNG) / Prebuild

**What it is:** Native `ios/` and `android/` directories are generated from `app.json`/`app.config.ts` on demand. This means **SDK upgrades are trivial** — you update `expo` in package.json, run `npx expo install --fix`, and prebuild regenerates fresh native projects. No manual merge of native changes across versions.

**What you'd lose:** Every React Native upgrade becomes a manual merge process. You'd use the React Native Upgrade Helper, manually resolve conflicts in `project.pbxproj`, `Info.plist`, `build.gradle`, etc. This is historically the **most painful part** of bare RN maintenance.

> **"Upgrading between React Native versions has historically been painful, requiring manual changes to native configuration files."**
> — Leanware ([leanware.co/insights/react-native-vs-expo](https://leanware.co/insights/react-native-vs-expo))

**Cost of replacement:** Hours to days per upgrade cycle, depending on how far behind you are. The RN community repeatedly cites this as the #1 pain point of bare RN.

### 2.5 Developer Experience

| Feature | Expo | Bare RN |
|---|---|---|
| Fast Refresh | ✅ | ✅ |
| Dev client on device | ✅ (QR code or direct install) | ✅ (but more setup) |
| `npx expo start` (one command) | ✅ | ❌ (Metro + native build separately) |
| `npx expo install --fix` (auto-align versions) | ✅ | ❌ (manual version matching) |
| `npx expo-doctor` (health check) | ✅ | ❌ |
| Expo Atlas (bundle analyzer) | ✅ | ❌ (use Metro bundle visualizer) |
| Config validation | ✅ (app.json schema) | ❌ |

### 2.6 Library Ecosystem (expo-* packages)

Trésor currently uses 15+ `expo-*` packages: `expo-camera`, `expo-haptics`, `expo-image-manipulator`, `expo-image-picker`, `expo-linear-gradient`, `expo-local-authentication`, `expo-notifications`, `expo-secure-store`, `expo-splash-screen`, `expo-font`, `expo-router`, `expo-status-bar`, `expo-linking`, `expo-constants`, `expo-build-properties`.

These are **all usable in bare RN** (you can install Expo modules in a bare project via `install-expo-modules`), but the integration is smoother in an Expo project. You'd need to set up `expo` as a dependency and configure autolinking. It works, but it's the Expo framework running inside a bare project — you'd effectively be running "Expo without the Expo workflow," which is the worst of both worlds.

**Verdict:** You can keep the libraries but lose the workflow cohesion.

### 2.7 Configuration (app.json vs. native iOS config)

Expo's declarative `app.json`/`app.config.ts` is a single source of truth for app name, bundle ID, icons, splash screen, permissions, orientation, scheme, plugins, and environment-specific overrides. In bare RN, these are scattered across `Info.plist`, `project.pbxproj`, `AndroidManifest.xml`, `build.gradle`, `xcconfig` files, and Build Settings in Xcode.

**Cost of switching:** You'd manage 5-10 native config files instead of 1 JSON/TS file.

---

## 3. Is the "Luxury Feel" Achievable in Expo?

**Yes. Unambiguously.** This section directly addresses Nasser's core concern.

### 3.1 60fps Animations

**Reanimated 4.5.1** (our version) runs animations on the **UI thread** via JSI worklets. The JavaScript thread can be completely blocked and animations still run at 60fps. This is identical in Expo and bare RN — same library, same native binary.

> **"The most powerful pair of tools for gesture-driven animations is using Gesture Handler combined with Reanimated. They were designed to work together and give the possibility to build complex gesture-driven animations that are fully calculated on the native side."**
> — Callstack, "How to Achieve 60FPS Animations in React Native" ([callstack.com/blog/60fps-animations-in-react-native](https://www.callstack.com/blog/60fps-animations-in-react-native))

**What you need to do:** Use `useSharedValue`, `useAnimatedStyle`, and `withTiming`/`withSpring`/`withDecay` correctly. Avoid animating layout properties that trigger re-renders. Use `Animated.createAnimatedComponent` for custom components. This is an **implementation quality** issue, not a framework issue.

### 3.2 Custom GPU Shaders

**React Native Skia** provides full GPU shader support via SkSL (Skia Shading Language). You write shaders declaratively in JSX, and they execute on the GPU.

> **"React Native Skia changes the equation. Maintained by Shopify and led by William Candillon, it brings Google's Skia 2D graphics engine directly into React Native. Skia is the same engine that powers Chrome, Android, Flutter, and most of Google's rendering infrastructure. It draws directly to the GPU, bypassing the native view system entirely."**
> — Variant Systems, "React Native Skia: Shaders, Uniforms & Reanimated" (Feb 2026) ([variantsystems.io/blog/react-native-skia](https://variantsystems.io/blog/react-native-skia))

### 3.3 Canvas Rendering

Skia's `<Canvas>` component gives you a real drawing surface: paths, shapes, images, gradients, blend modes, and filters — all rendered natively at 60fps. It uses its own React reconciler (SkiaDOM) and communicates with the C++ Skia engine via JSI (synchronous, no bridge).

> **"JSI makes Skia calls feel like regular function calls because, at the machine level, they are."**
> — Variant Systems

### 3.4 Particle Systems

Skia supports particle systems via `useRSXformBuffer` and `useRectBuffer` hooks that allocate typed arrays read directly by Skia — no per-frame JavaScript object creation. Combined with Reanimated worklets, you get particle systems running at 60fps with **zero JS thread involvement**.

> **"500 particles in a single draw call. The `useRSXformBuffer` and `useRectBuffer` hooks allocate typed arrays that Skia reads directly - no per-frame JavaScript object creation. Animate the transform buffer with Reanimated worklets, and you have a particle system running at 60fps with no JS thread involvement."**
> — Variant Systems

### 3.5 Does Expo Support Skia?

**Yes.** This is confirmed by multiple primary sources:

1. **Official Expo documentation page** for `@shopify/react-native-skia`: [docs.expo.dev/versions/latest/sdk/skia](https://docs.expo.dev/versions/latest/sdk/skia) — recommends version 2.6.2, lists iOS/Android/tvOS/Web support.

2. **Official Expo template**: `npx create-expo-app -e with-skia` creates a pre-configured Skia + Expo project.

3. **Installation is one command**: `npx expo install @shopify/react-native-skia`

> **"Yes, Skia can be used in Expo projects. Expo SDK has added support for React Native Skia, and as mentioned, there's even a template (`with-skia`) to start an Expo app preconfigured for Skia. Expo handles the native configuration (like including the Skia binaries and loading the WebAssembly for web, etc.), making it very convenient."**
> — Expert App Devs, "Skia: Game Changer for React Native in 2026" ([medium.com/@expertappdevs](https://medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841))

> **"Getting started with an Expo project: `npx expo install @shopify/react-native-skia`. With bare React Native: `npm install @shopify/react-native-skia` then `cd ios && pod install`. Skia requires the New Architecture (Fabric) and JSI. If you're on Expo SDK 51+ or React Native 0.74+, you're already there."**
> — Variant Systems

We're on SDK 57 / RN 0.86 — well beyond the minimum. **Skia works out of the box.**

### 3.6 What About Muaath's "60+ CSS Animations" Concern?

If Muaath is designing onboarding with "60+ CSS animations" and "canvas + particle systems," the issue is likely that **CSS/Web animation patterns don't map directly to React Native**. React Native doesn't have CSS animations in the web sense. You need:

| Web/CSS Concept | React Native Equivalent |
|---|---|
| CSS `@keyframes` | Reanimated `withRepeat`/`withSequence` + `useAnimatedStyle` |
| CSS transitions | Reanimated `withTiming` |
| Canvas 2D API | Skia `<Canvas>` + `<Path>`, `<Circle>`, `<Rect>` |
| CSS `transform: matrix3d()` | Skia shaders / Reanimated transforms |
| `requestAnimationFrame` loops | Reanimated worklets (run on UI thread) |
| SVG animations | Skia (faster) or `react-native-svg` |
| WebGL shaders | Skia SkSL shaders (GPU-accelerated) |

The path forward for luxury onboarding:
1. **Install Skia**: `npx expo install @shopify/react-native-skia` — one command, zero native config.
2. **Use Skia Canvas** for particle systems, custom illustrations, gradient animations.
3. **Use Reanimated 4** for gesture-driven transitions, spring physics, shared element transitions.
4. **Use Gesture Handler** for multi-touch, pan, pinch, and custom gestures.
5. **Use `expo-haptics`** for tactile feedback on interactions.

All of this is **fully supported in our current Expo setup**.

### 3.7 Performance Benchmarks

| Metric | Skia Performance | Source |
|---|---|---|
| 5,000+ data points at 60fps with touch scrubbing | ✅ (SVG alternatives stutter above a few hundred) | Variant Systems |
| 500 particles in a single draw call at 60fps | ✅ (no JS thread involvement) | Variant Systems |
| Animation performance vs pre-Fabric | Up to 50% faster on iOS, ~200% faster on Android | Variant Systems |
| SkiaList rendering | Consistent 120fps, no blank spaces | Variant Systems |

---

## 4. What's the Migration Cost?

If we decided to switch to bare RN today, here's what would happen:

### 4.1 What Breaks

| Component | Impact |
|---|---|
| **expo-router** | Must be replaced with React Navigation. All route files (`app/` directory) rewritten as screen components + navigation config. Deep links reconfigured manually. Typed routes lost. |
| **app.json config** | Must be manually translated into `Info.plist`, `project.pbxproj`, `AndroidManifest.xml`, `build.gradle`. Every plugin config becomes a manual native edit. |
| **EAS Build** | Replaced with manual Xcode builds + Fastlane. Code signing setup from scratch. |
| **EAS Update (OTA)** | Lost. Must self-host `expo-updates` or switch to CodePush/Stallion. |
| **Config plugins** | `expo-build-properties`, `expo-splash-screen`, `expo-font`, `expo-secure-store` plugins → manual native configuration. |
| **`npx expo install --fix`** | Lost. Version alignment becomes manual. |
| **`npx expo prebuild`** | Lost. Native projects must be maintained manually forever. |
| **`npx expo-doctor`** | Lost. No health checks. |

### 4.2 What Needs Rewriting

1. **Navigation layer** (all of `app/` directory) — 1-2 weeks
2. **Configuration migration** (app.json → native files) — 2-3 days
3. **CI/CD pipeline** (EAS → Fastlane + GitHub Actions) — 3-5 days
4. **OTA infrastructure** (if keeping OTA) — 2-3 days
5. **Testing & QA** (verify every feature works identically) — 1 week
6. **Splash screen, fonts, icons, build properties** — 1-2 days

### 4.3 How Long Would It Take?

**Conservative estimate: 3-4 weeks of dedicated work** for a developer who knows both Expo and bare RN well. This is pure migration cost — zero new features, zero quality improvement. It's 3-4 weeks of making the app do exactly what it already does, but on a different build system.

If the developer is less experienced with bare RN native configuration, add 1-2 weeks.

### 4.4 What's the Risk?

1. **Regression risk**: Every screen, every navigation flow, every deep link, every push notification must be re-verified. The app currently has 30 PRs merged and all bugs fixed. A migration introduces a fresh surface of bugs.

2. **OTA loss during migration**: During the 3-4 week migration, you can't ship OTA updates. Any bug found requires a full App Store release.

3. **Upgrade pain forever after**: Every future React Native upgrade becomes a manual native merge instead of `npx expo install --fix`.

4. **Opportunity cost**: 3-4 weeks spent on migration is 3-4 weeks **not** spent on the actual quality improvements (Skia animations, premium onboarding, luxury UI polish) that Nasser actually wants.

5. **No capability gain**: After migration, you can do exactly what you could do before — no more, no less. The migration buys nothing.

> **"The practical signal that determines migration scope: count the libraries in your dependency tree... If most are in the first two categories, the migration is a two-to-four-week project. If a load-bearing library is in the third category and you have to rewrite or replace it, double or triple that estimate."**
> — Procedure Tech, "React Native's New Architecture in Production" ([procedure.tech/blogs/react-native-new-architecture-in-production](https://procedure.tech/blogs/react-native-new-architecture-in-production))

### 4.5 Risk Summary

| Risk | Severity | Mitigation |
|---|---|---|
| Navigation regressions | High | Full QA pass required |
| Deep link breakage | Medium | Manual testing of all schemes |
| Lost OTA capability | High | Self-host expo-updates |
| Future upgrade pain | Medium (ongoing) | None — inherent to bare RN |
| Zero capability gain | Critical | **This is the killer: we pay all the cost for zero benefit** |

---

## 5. What Does the Industry Say?

### 5.1 Top Apps Using Expo (2026)

Evan Bacon (Expo team) compiled a list of **2,521 apps** using Expo SDK libraries in 2026, including:

- **Microsoft Authenticator** — Enterprise security app by Microsoft
- **Discord** — Chat platform (100M+ users)
- **Shop** (Shopify) — E-commerce
- **Coinbase** — Cryptocurrency exchange
- **Bluesky Social** — Social media
- **Chime** — Mobile banking
- **Rocket Money** — Personal finance
- **Character AI** — AI chat
- **FanDuel** — Sports betting
- **Toyota Financial Services** — Automotive finance
- **The White House** — Government

([evanbacon.dev/blog/expo-apps](https://evanbacon.dev/blog/expo-apps), January 2026)

These include fintech, social, e-commerce, and enterprise apps — categories with stringent quality, security, and performance requirements. If Expo were limiting quality, these companies wouldn't use it.

### 5.2 What Agencies Recommend

**Callstack** (the leading React Native consultancy, maintainers of Reanimated, React Native Paper, and Haul):

> Callstack offers dedicated **Expo Development** services and co-hosted a webinar with Expo's Keith Kurak titled **"How to Gradually Migrate From React Native Community CLI to Expo"** (August 2025). Their direction of travel is **toward Expo, not away from it**.

([callstack.com/services/expo-development](https://www.callstack.com/services/expo-development))

**Infinite Red** (major RN consultancy, creators of Ignite):

> **"CNG (and Expo Prebuild) works well for almost any app. It's a great middle ground between Expo Go and the 'do it yourself' (manual) workflow."**

([docs.infinite.red/ignite-cli/expo/CNG](https://docs.infinite.red/ignite-cli/expo/CNG))

**Variant Systems** (agency building fintech/healthcare/e-commerce RN apps):

> Uses Skia as their "go-to for any feature that needs custom visuals" and notes that setup in Expo is a single `npx expo install` command.

([variantsystems.io/blog/react-native-skia](https://variantsystems.io/blog/react-native-skia))

**Leanware** (2026 analysis):

> **"For most new projects in 2026, Expo is the recommended starting point. It covers the majority of mobile app requirements with less configuration overhead."**

([leanware.co/insights/react-native-vs-expo](https://leanware.co/insights/react-native-vs-expo))

### 5.3 What Meta/React Native Team Says

> **"Expo is the officially recommended way to start new React Native projects."**
> — React Native 0.82 release blog post (October 2025), as cited by Leanware

React Native 0.82 made the New Architecture the only architecture. Expo SDK 55+ has the New Architecture always enabled. The React Native team and Expo team are aligned — Expo is the recommended path.

### 5.4 The "When to Use Bare RN" Consensus

Across all sources, the consensus for when bare RN is justified:

1. **Existing bare RN codebase** — don't migrate to Expo if you're already deep in bare (though many are migrating the other direction)
2. **Heavy proprietary native SDKs** — when you have custom SDKs with complex build requirements that can't be expressed via config plugins
3. **Team with deep native expertise and no Expo experience** — if your team are Xcode/Android Studio wizards who've never touched Expo, the learning curve may not be worth it
4. **Games or AR engines** — when you need Unity-level native rendering pipelines

**None of these apply to Trésor.** We're an inventory app with standard native API needs, already on Expo, and the team is already productive in the Expo workflow.

### 5.5 Recent Community Sentiment (2025-2026)

> **"2026 — Expo is production-ready and widely used. The 'Expo = can't use native' idea is outdated. Choose based on your app's needs and your team's comfort with native tooling, not on old stereotypes."**
> — Saad Mehmood, DEV Community ([dev.to/iamsaadmehmood](https://dev.to/iamsaadmehmood/-expo-vs-bare-react-native-4ek0))

> **"Runtime performance is identical. Both run on the same architecture, the same JavaScript engine, and the same native rendering pipeline. The difference is in development tooling, not execution speed."**
> — Leanware

> **"Expo no longer requires full 'ejecting'. You can switch gradually to the bare workflow by running `npx expo prebuild`... Expo is a spectrum, not a lock-in."**
> — Medium, "Expo vs React Native CLI in 2025"

---

## 6. Recommendation

### Stay with Expo. Here's why and what to do differently.

#### The Core Logic

| Question | Answer |
|---|---|
| Is Expo limiting our rendering capability? | **No.** Skia, Reanimated, Gesture Handler all work identically. |
| Is Expo limiting our native API access? | **No.** Dev builds + CNG give full native access. |
| Would bare RN unlock any visual quality we can't achieve? | **No.** Same libraries, same GPU, same performance ceiling. |
| Would switching cost time? | **Yes.** 3-4 weeks minimum, zero feature gain. |
| Would switching introduce risk? | **Yes.** Regression risk on all 30 PRs of work. |
| Does the industry recommend switching? | **No.** The trend is toward Expo, not away. |

**The quality gap Nasser feels is real, but the cause is misdiagnosed.** It's not Expo limiting us — it's that we haven't yet adopted the tools that enable luxury-grade visuals (Skia, advanced Reanimated patterns, proper animation choreography). Switching frameworks would not close this gap; it would just delay addressing it by a month.

#### What We Should Do Differently to Push Quality

**Phase 1: Adopt Skia (Week 1)**
```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor/app
npx expo install @shopify/react-native-skia
npx expo prebuild --clean  # regenerate native project with Skia linked
npx expo run:ios           # rebuild dev client
```
This gives Muaath a GPU-accelerated `<Canvas>` for particle systems, custom illustrations, gradient animations, and shader effects.

**Phase 2: Build a Skia + Reanimated Design System (Weeks 2-3)**
- Create reusable Skia components: particle fields, gradient meshes, animated paths
- Build Reanimated-based gesture-driven transitions
- Establish animation timing tokens (durations, easings, springs) for consistency
- Use `expo-haptics` to pair visual moments with tactile feedback

**Phase 3: Onboarding Rewrite (Weeks 3-4)**
- Port Muaath's "60+ CSS animations" design into Skia Canvas + Reanimated worklets
- Replace CSS-style animation patterns with native worklet-based patterns
- Benchmark on physical iPhone to verify 60fps

**Phase 4: Polish Pass (Week 5+)**
- Shared element transitions between list → detail
- Custom splash animation with Skia
- Micro-interactions on every tappable element
- Performance profiling with Flipper/React DevTools

#### Specific Technical Actions

1. **Add Skia to package.json**: `npx expo install @shopify/react-native-skia`
2. **Audit Reanimated usage**: Ensure all animations use worklets, not JS-thread `Animated.timing`
3. **Set up Expo Atlas**: `npx expo export --analyze` to profile bundle size
4. **Create animation tokens**: Define standard durations, easings, spring configs in a shared file
5. **Profile on device**: Use React Native Performance Monitor (`Cmd+D → Show Perf Monitor`) on the physical iPhone to identify frame drops
6. **Consider `react-native-gesture-handler`**: If not already installed, add it for smooth gesture-driven animations

#### When to Reconsider Switching

We should only revisit a switch to bare RN if:
1. We need a native capability that **cannot** be expressed via config plugins or Expo Modules (extremely unlikely for an inventory app)
2. We need to build an **app extension** (Widget, Share Extension) with tight memory constraints where React Native's overhead is too high
3. We need to integrate a **proprietary SDK** with build requirements incompatible with CNG
4. Expo as a company becomes unsustainable (no signal of this — they're well-funded with 3M+ developers and SOC 2 / GDPR compliance)

None of these are on the horizon.

---

## Sources

### Primary Sources (Official Documentation)
1. Expo FAQ — [docs.expo.dev/faq](https://docs.expo.dev/faq)
2. Expo CNG Documentation — [docs.expo.dev/workflow/continuous-native-generation](https://docs.expo.dev/workflow/continuous-native-generation)
3. Expo New Architecture Guide — [docs.expo.dev/guides/new-architecture](https://docs.expo.dev/guides/new-architecture)
4. Expo Skia SDK Reference — [docs.expo.dev/versions/latest/sdk/skia](https://docs.expo.dev/versions/latest/sdk/skia)
5. Expo Config Plugin Tutorial — [docs.expo.dev/modules/config-plugin-and-native-module-tutorial](https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial)
6. React Native Skia Installation — [shopify.github.io/react-native-skia/docs/getting-started/installation](https://shopify.github.io/react-native-skia/docs/getting-started/installation)
7. Reanimated Performance Guide — [docs.swmansion.com/react-native-reanimated/docs/guides/performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance)

### Industry Analysis (2025-2026)
8. Godel Technologies — "Expo vs. Bare React Native in 2025" — [godeltech.com/blog/expo-vs-bare-react-native-in-2025](https://www.godeltech.com/blog/expo-vs-bare-react-native-in-2025)
9. Leanware — "React Native vs Expo: Key Differences & When to Use Each" (2026) — [leanware.co/insights/react-native-vs-expo](https://leanware.co/insights/react-native-vs-expo)
10. Hashrocket — "Expo for React Native in 2025: A Perspective" — [hashrocket.com/blog/posts/expo-for-react-native-in-2025-a-perspective](https://hashrocket.com/blog/posts/expo-for-react-native-in-2025-a-perspective)
11. Medium / React Native Journal — "Expo vs React Native CLI in 2025" — [medium.com/.../expo-vs-react-native-cli-in-2025-7badd45e5fa7](https://medium.com/react-native-journal/expo-vs-react-native-cli-in-2025-which-one-should-you-choose-7badd45e5fa7)
12. DEV Community / Saad Mehmood — "Expo vs Bare React Native" — [dev.to/iamsaadmehmood/-expo-vs-bare-react-native-4ek0](https://dev.to/iamsaadmehmood/-expo-vs-bare-react-native-4ek0)

### Technical Deep Dives
13. Variant Systems — "React Native Skia: Shaders, Uniforms & Reanimated" (Feb 2026) — [variantsystems.io/blog/react-native-skia](https://variantsystems.io/blog/react-native-skia)
14. Callstack — "How to Achieve 60FPS Animations in React Native" — [callstack.com/blog/60fps-animations-in-react-native](https://www.callstack.com/blog/60fps-animations-in-react-native)
15. Stackademic — "Optimizing animations for 60 FPS with React Native Reanimated" (Mar 2026) — [blog.stackademic.com/optimizing-animations-for-60-fps-with-react-native-reanimated-fb2d4c97d9ef](https://blog.stackademic.com/optimizing-animations-for-60-fps-with-react-native-reanimated-fb2d4c97d9ef)
16. Expert App Devs — "Skia: Game Changer for React Native in 2026" — [medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841](https://medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841)
17. Onix React — "What's New in Expo SDK 57" (Jul 2026) — [medium.com/@onix_react/whats-new-in-expo-sdk-57-c3133d32ba37](https://medium.com/@onix_react/whats-new-in-expo-sdk-57-c3133d32ba37)
18. PkgPulse — "React Native New Architecture: Fabric & Expo 2026" — [pkgpulse.com/guides/react-native-new-architecture-fabric-turbomodules-expo-2026](https://www.pkgpulse.com/guides/react-native-new-architecture-fabric-turbomodules-expo-2026)
19. Procedure Tech — "React Native's New Architecture in Production" — [procedure.tech/blogs/react-native-new-architecture-in-production](https://procedure.tech/blogs/react-native-new-architecture-in-production)

### Migration & Industry Adoption
20. Evan Bacon — "Who's using Expo in 2026" (2,521 apps) — [evanbacon.dev/blog/expo-apps](https://evanbacon.dev/blog/expo-apps)
21. Callstack — Expo Development Services — [callstack.com/services/expo-development](https://www.callstack.com/services/expo-development)
22. Infinite Red — CNG Guide — [docs.infinite.red/ignite-cli/expo/CNG](https://docs.infinite.red/ignite-cli/expo/CNG)
23. SitePen — "Doing More with Expo: Using Custom Native Code" — [sitepen.com/blog/doing-more-with-expo-using-custom-native-code](https://www.sitepen.com/blog/doing-more-with-expo-using-custom-native-code)
24. OneUptime — "How to Migrate from Expo Managed Workflow to Bare Workflow" (Jan 2026) — [oneuptime.com/blog/post/2026-01-15-expo-managed-to-bare-workflow/view](https://oneuptime.com/blog/post/2026-01-15-expo-managed-to-bare-workflow/view)
25. DEV Community / ersuman — "Expo, EAS, Prebuild, OTA, CI/CD — A Complete Mental Model" — [dev.to/ersuman/expo-eas-prebuild-ota-cicd-a-complete-mental-model-for-modern-react-native-development-1cm4](https://dev.to/ersuman/expo-eas-prebuild-ota-cicd-a-complete-mental-model-for-modern-react-native-development-1cm4)

### GitHub Issues & Discussions
26. Reanimated Issue #8250 — New Architecture performance regression — [github.com/software-mansion/react-native-reanimated/issues/8250](https://github.com/software-mansion/react-native-reanimated/issues/8250)
27. RN Community Discussion #975 — Managing constant RN upgrades — [github.com/react-native-community/discussions-and-proposals/discussions/975](https://github.com/react-native-community/discussions-and-proposals/discussions/975)

---

*Document ends. Questions → Nigel.*
