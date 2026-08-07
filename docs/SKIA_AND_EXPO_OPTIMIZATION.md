# Skia & Expo Optimization — Trésor Technical Guide

**Author:** Nigel (System Architect)  
**Date:** August 2026  
**Status:** Research Complete  
**Audience:** Development team (Nasser, Dwight, Zizo)

---

## Table of Contents

1. [What is Skia?](#1-what-is-skia)
2. [How to Install Skia in Expo](#2-how-to-install-skia-in-expo)
3. [Making Expo Optimal — Production Configuration](#3-making-expo-optimal)
4. [Best Practices from Top Expo Projects](#4-best-practices-from-top-expo-projects)
5. [Recommended Library Stack for Trésor](#5-recommended-library-stack-for-trésor)
6. [Action Plan — Basic to Luxury Editorial](#6-action-plan)

---

## 1. What is Skia?

### Plain Language Explanation

**`@shopify/react-native-skia`** is a React Native library that brings the **Skia Graphics Engine** — the same 2D rendering engine that powers Google Chrome, Android, Flutter, and Firefox — directly into your React Native app. It gives you a `<Canvas>` component where you can draw shapes, apply GPU shaders, render particle systems, build custom charts, and create visual effects that are simply impossible with standard React Native `<View>` components.

> *"Standard React Native rendering was built for layouts, lists, and buttons. It works well for that. But the moment you need a custom chart that scrubs at 60fps, a gradient animation that follows a gesture, or a blur effect that doesn't stutter on Android — you hit the ceiling."*  
> — Variant Systems ([source](https://variantsystems.io/blog/react-native-skia))

**In one sentence:** Skia gives React Native a second rendering path — one that draws directly to the GPU, bypassing the platform's native view system entirely for the components that need it.

### What Does It Do?

Skia provides:

| Capability | Description |
|---|---|
| **Shapes & Paths** | Circles, rectangles, rounded rects, complex SVG-like paths, bézier curves |
| **Gradients** | Linear, radial, sweep — applied as fill or stroke on any shape |
| **Shaders (SkSL)** | Custom GPU shaders written in Skia's shading language (similar to GLSL) — procedural textures, noise, wave patterns, holographic effects |
| **Image Processing** | Blur, backdrop blur (frosted glass), color filters, image shaders, displacement effects |
| **Particle Systems** | `Atlas` component with typed-array buffers — render 500+ particles in a single draw call |
| **Charts** | Custom line/area/bar charts with 5,000+ data points at 60fps with touch scrubbing |
| **Path Animations** | Shape morphing — interpolate between a circle and a square frame-by-frame |
| **Gesture Integration** | Full interop with Reanimated shared values and Gesture Handler — drag, pinch, scroll-reactive graphics |
| **Masking & Clipping** | Clip paths, mask layers, blend modes |

### How Does It Differ from CSS Animations and Reanimated?

This is the critical distinction for the team:

```
┌─────────────────┬──────────────────────┬───────────────────────────┐
│   CSS/Animated   │   Reanimated 4.x      │   Skia + Reanimated       │
├─────────────────┼──────────────────────┼───────────────────────────┤
│ Runs on JS thread│ Runs on UI thread     │ Runs on GPU + UI thread   │
│ Animates View    │ Animates View props   │ Draws to GPU canvas       │
│ props (opacity,  │ (any style value)     │ (pixels, shaders, paths)  │
│ transform)       │                       │                           │
│ ~30-60fps        │ 60-120fps             │ 60-120fps (GPU-bound)     │
│ Limited to View  │ Limited to View props │ Unlimited custom graphics │
│ properties       │                       │                           │
│ Bridge/JSI       │ JSI (direct C++ calls)│ JSI → Skia C++ engine     │
│ Good for: simple │ Good for: gesture-    │ Good for: shaders, charts,│
│ fades, slides    │ driven UI animations  │ particles, custom drawing │
└─────────────────┴──────────────────────┴───────────────────────────┘
```

**Key differences:**

1. **Rendering target:** Reanimated animates React Native `<View>` properties (opacity, transform, etc.) on the UI thread. Skia draws pixels directly to a GPU surface — it doesn't create platform views at all.

2. **What you can render:** Reanimated can animate what Views can express — position, scale, opacity, color. Skia can draw *anything* — custom paths, GPU-computed shader patterns, 5,000-point charts, particle fields, frosted glass.

3. **Performance ceiling:** Reanimated on Views is fast, but each View is a platform UI object with layout overhead. Skia batches everything into draw calls on a single GPU texture. 3,000 rotating squares at 60fps is achievable with Skia + Reanimated; it's not with View-based animation ([source: animation stress test](https://medium.com/@islamrustamov/how-react-native-improved-from-2023-to-2025-animation-stress-testing-and-a-little-bit-of-flutter-edd44297b815)).

4. **They work together, not against each other:** Skia and Reanimated have native interop. Reanimated `SharedValue`s can be passed *directly* as Skia component props — no `createAnimatedComponent` or `useAnimatedProps` needed. The animation runs on the UI thread, the rendering runs on the GPU.

### How Does It Achieve 60fps?

Three architectural decisions make Skia fast ([source](https://variantsystems.io/blog/react-native-skia)):

#### 1. JSI, Not the Bridge

React Native Skia communicates with Skia's C++ engine through **JSI (JavaScript Interface)** — synchronous, direct C++ function calls from JavaScript. No serialization. No async bridge. No JSON encoding of drawing commands.

The old React Native bridge serialized everything into JSON, sent it across an async channel, and deserialized it on the other side. For layout updates, this is fine. For 60fps animations where you're updating paths and colors every frame, the serialization overhead is fatal.

JSI makes Skia calls feel like regular function calls because, at the machine level, they are.

#### 2. The SkiaDOM (Custom React Reconciler)

Skia uses its own React reconciler. When you write `<Canvas><Circle/></Canvas>`, it doesn't create a native platform view. It creates a node in Skia's internal **display list** — the SkiaDOM.

The reconciler diffs this display list the same way React diffs the component tree. When a prop changes, only the affected node is updated and redrawn. You get React's declarative model with Skia's GPU-accelerated rendering.

#### 3. UI Thread Rendering

The SkiaDOM can execute drawing commands on the **UI thread**, independent of the JavaScript thread. When paired with Reanimated, animations run entirely on the UI thread — JavaScript never enters the picture during a frame.

This is why Skia animations don't drop frames when your JS thread is busy with network calls or state management.

#### Performance Numbers

- **Animation performance:** Up to 50% faster on iOS, nearly 200% faster on Android compared to the pre-Fabric implementation ([source](https://variantsystems.io/blog/react-native-skia))
- **Chart rendering:** 5,000+ data points at 60fps with touch scrubbing. SVG-based alternatives stutter above a few hundred points.
- **SkiaList (experimental):** Renders at consistent 120fps with no blank spaces
- **Stress test:** 3,000 rotating squares at 60fps with Skia + Reanimated (2025 benchmark, up from 38fps on 1,500 elements in 2023) ([source](https://medium.com/@islamrustamov/how-react-native-improved-from-2023-to-2025-animation-stress-testing-and-a-little-bit-of-flutter-edd44297b815))
- **Bundle size cost:** +6 MB on iOS, +4 MB on Android ([source](https://shopify.github.io/react-native-skia/docs/getting-started/installation))

### Code Examples

#### Example 1: Basic Shapes with Gradient

```tsx
import { Canvas, Circle, Group, LinearGradient, vec } from "@shopify/react-native-skia";

function GradientCircle() {
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Group>
        <Circle cx={128} cy={128} r={100}>
          <LinearGradient
            start={vec(28, 28)}
            end={vec(228, 228)}
            colors={["#4776E6", "#8E54E9"]}
          />
        </Circle>
      </Group>
    </Canvas>
  );
}
```
*Source: [Skia official docs](https://shopify.github.io/react-native-skia/docs/shaders/overview)*

#### Example 2: Pulsing Animation with Reanimated Interop

```tsx
import { Canvas, Circle } from "@shopify/react-native-skia";
import { useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useEffect } from "react";

function PulsingCircle() {
  const radius = useSharedValue(50);

  useEffect(() => {
    radius.value = withRepeat(withTiming(100, { duration: 1000 }), -1, true);
  }, []);

  // radius is a SharedValue — passed directly as a Skia prop.
  // No createAnimatedComponent, no useAnimatedProps.
  // Animation runs on UI thread. JS thread can be frozen.
  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Circle cx={128} cy={128} r={radius} color="#4776E6" />
    </Canvas>
  );
}
```
*Source: [Variant Systems](https://variantsystems.io/blog/react-native-skia)*

#### Example 3: GPU Shader (SkSL) — Animated Wave

```tsx
import { Canvas, Fill, Skia, Shader, vec } from "@shopify/react-native-skia";
import { useSharedValue, useDerivedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useEffect } from "react";

// SkSL is Skia's shading language — very similar to GLSL.
// This shader runs entirely on the GPU.
const source = Skia.RuntimeEffect.Make(`
  uniform float2 iResolution;
  uniform float iTime;

  half4 main(float2 pos) {
    float2 uv = pos / iResolution;
    float wave = sin(uv.x * 10.0 + iTime * 2.0) * 0.5 + 0.5;
    return half4(uv.x, wave, uv.y, 1.0);
  }
`)!;

function AnimatedShader() {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(withTiming(Math.PI * 2, { duration: 3000 }), -1);
  }, []);

  const uniforms = useDerivedValue(() => ({
    iResolution: vec(256, 256),
    iTime: time.value,
  }));

  return (
    <Canvas style={{ width: 256, height: 256 }}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
```
*Source: [Variant Systems](https://variantsystems.io/blog/react-native-skia) — shader uniforms driven by Reanimated*

#### Example 4: Particle Field (500 particles, single draw call)

```tsx
import { Canvas, Atlas, useRSXformBuffer, useRectBuffer, useImage } from "@shopify/react-native-skia";

function ParticleField({ count = 500 }) {
  const spriteSheet = useImage(require("./particle.png"));

  // Typed arrays — Skia reads these directly, no per-frame JS object creation
  const sprites = useRectBuffer(count, (rect, i) => {
    rect.setXYWH(0, 0, 16, 16); // All sprites use same source rect
  });

  const transforms = useRSXformBuffer(count, (transform, i) => {
    const x = Math.random() * 400;
    const y = Math.random() * 800;
    const scale = 0.5 + Math.random() * 1.5;
    transform.set(scale, 0, x, y);
  });

  if (!spriteSheet) return null;

  return (
    <Canvas style={{ flex: 1 }}>
      <Atlas image={spriteSheet} sprites={sprites} transforms={transforms} />
    </Canvas>
  );
}
```
*Source: [Variant Systems](https://variantsystems.io/blog/react-native-skia)*

> **For Trésor:** Animate the `transforms` buffer with Reanimated worklets to create a gold-dust particle effect on item detail screens — 500 particles drifting upward, all at 60fps with zero JS thread involvement.

#### Example 5: Frosted Glass (Backdrop Blur)

```tsx
import { Canvas, BackdropBlur, Fill, RoundedRect } from "@shopify/react-native-skia";

function FrostedOverlay() {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />
      <BackdropBlur blur={20} clip={{ x: 20, y: 100, width: 260, height: 200 }}>
        <RoundedRect
          x={20}
          y={100}
          width={260}
          height={200}
          r={16}
          color="rgba(255,255,255,0.1)"
        />
      </BackdropBlur>
    </Canvas>
  );
}
```
*Source: [Variant Systems](https://variantsystems.io/blog/react-native-skia)*

#### Example 6: Gesture-Driven Graphics

```tsx
import { Canvas, Circle } from "@shopify/react-native-skia";
import { useSharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

function DraggableCircle() {
  const cx = useSharedValue(128);
  const cy = useSharedValue(128);

  const gesture = Gesture.Pan().onChange((event) => {
    cx.value += event.changeX;
    cy.value += event.changeY;
  });

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1 }}>
        <Circle cx={cx} cy={cy} r={40} color="#8E54E9" />
      </Canvas>
    </GestureDetector>
  );
}
```
*Source: [Skia gestures docs](https://shopify.github.io/react-native-skia/docs/animations/gestures)*

#### ⚠️ Color Interpolation Gotcha

Skia uses a different internal color format than Reanimated. If you need to animate between colors, use `interpolateColors` from **Skia**, not `interpolateColor` from Reanimated:

```tsx
import { interpolateColors } from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

const progress = useSharedValue(0);
const color = useDerivedValue(() => {
  return interpolateColors(progress.value, [0, 1], ["#4776E6", "#E94E77"]);
});
```
*Source: [Skia animations docs](https://shopify.github.io/react-native-skia/docs/animations/animations)*

---

## 2. How to Install Skia in Expo

### Prerequisites

Trésor already meets all requirements:

| Requirement | Trésor Status |
|---|---|
| React Native ≥ 0.79 | ✅ 0.86.2 |
| React ≥ 19 | ✅ 19.2.3 |
| iOS 14+ | ✅ (set deployment target) |
| New Architecture (Fabric) | ✅ `newArchEnabled: true` in app.json |
| Dev build (not Expo Go) | ✅ Already using dev build |
| Reanimated 4.x installed | ✅ 4.5.1 |

### Installation Steps

#### Step 1: Install the package

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor/app
npx expo install @shopify/react-native-skia
```

> **Always use `npx expo install`** — it resolves the correct version for SDK 57. Using `npm install` or `yarn add` directly can install an incompatible version. ([source](https://docs.expo.dev/versions/latest/sdk/skia/))

The recommended version for Expo SDK 57 is **2.6.2** ([source](https://docs.expo.dev/versions/latest/sdk/skia/)).

#### Step 2: No config plugin needed

Skia does **not** require an Expo config plugin. The prebuilt binaries (`react-native-skia-android` and `react-native-skia-apple-*`) are delivered as regular npm dependencies and are resolved automatically by CocoaPods (iOS) and Gradle (Android). No `postinstall` script is required. ([source](https://shopify.github.io/react-native-skia/docs/getting-started/installation))

#### Step 3: Rebuild the dev client

Since Skia includes native code, you **must** rebuild the development client:

```bash
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android
```

#### Step 4: Verify it works

Create a test file `app/src/test/skia-test.tsx`:

```tsx
import { Canvas, Circle, Fill } from "@shopify/react-native-skia";

export default function SkiaTest() {
  return (
    <Canvas style={{ flex: 1 }}>
      <Fill color="black" />
      <Circle cx={200} cy={400} r={100} color="#C9A961" />
    </Canvas>
  );
}
```

If you see a gold circle on a black background, Skia is working.

### Potential Pitfalls

| Pitfall | Solution |
|---|---|
| **Android NDK missing** | Skia needs Android NDK. Install via Android Studio → SDK Manager → SDK Tools → NDK. Set `ANDROID_NDK` env var. ([source](https://shopify.github.io/react-native-skia/docs/getting-started/installation)) |
| **CMake version mismatch** | If you see "CMake 'X.X.X' was not found", open Android Studio → SDK Manager → SDK Tools → CMake → Show Package Details → install the required version. |
| **ProGuard stripping Skia** | Add to `proguard-rules.pro`: `-keep class com.shopify.reactnative.skia.** { *; }` |
| **Jest test failures** | Add Skia to `transformIgnorePatterns` in jest.config.js and set up the Skia test environment. See [installation docs](https://shopify.github.io/react-native-skia/docs/getting-started/installation). |
| **Version mismatch with RN** | RN ≥ 0.79 requires Skia ≥ 2.x. RN ≤ 0.78 requires Skia ≤ 1.12.4. Trésor is on RN 0.86, so Skia 2.6.2 is correct. |
| **Web support** | Skia on web requires loading CanvasKit. Run `yarn setup-skia-web` and use `LoadSkiaWeb()`. See [web docs](https://shopify.github.io/react-native-skia/docs/getting-started/web). |
| **Bundle size** | Adding Skia increases app size by ~6 MB (iOS) / ~4 MB (Android). This is acceptable for a luxury app. |

### What NOT to Do

- ❌ Do **not** install with `npm install @shopify/react-native-skia` — use `npx expo install`
- ❌ Do **not** add Skia to Expo Go — it requires a dev build (Trésor already uses one ✅)
- ❌ Do **not** try to use Skia without the New Architecture — it requires Fabric/JSI
- ❌ Do **not** use `react-native-reanimated/plugin` in babel — Reanimated 4.x uses `react-native-worklets/plugin` (see Section 3)

---

## 3. Making Expo Optimal — Production Configuration

### 3.1 Current State Analysis

Trésor's current `app.json` and `package.json` were reviewed. Here's the status:

| Item | Current | Status |
|---|---|---|
| Expo SDK | 57.0.10 | ✅ Latest |
| React Native | 0.86.2 | ✅ Latest |
| React | 19.2.3 | ✅ Latest |
| New Architecture | Enabled | ✅ |
| Hermes engine | **Not explicitly set** | ⚠️ See below |
| Reanimated | 4.5.1 | ✅ |
| react-native-worklets | 0.10.3 | ✅ |
| Babel worklets plugin | **MISSING** | ❌ Critical |
| Gesture Handler | **Not installed** | ❌ Needed |
| app.config.ts | Not using | ⚠️ Should migrate |
| EAS config | Basic | ⚠️ Needs optimization |

### 3.2 Hermes Engine

**Is Hermes on?** On Expo SDK 57 / React Native 0.86, Hermes is the **default and only** JavaScript engine. As of React Native 0.82 (October 2025), the legacy bridge and JSC were removed entirely — the New Architecture is the only option. ([source](https://procedure.tech/blogs/react-native-new-architecture-in-production))

However, **explicitly declare it** in `app.json` for clarity and to ensure OTA updates work correctly:

```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

> **OTA update warning:** If you push an OTA update compiled with a different Hermes version than the binary, the app may crash on launch. Always set `runtimeVersion` in your app config when using Hermes with OTA updates. ([source](https://docs.expo.dev/guides/using-hermes))

**Hermes benefits:**
- Faster startup time (precompiled bytecode)
- Lower memory usage
- Smaller bundle size
- 2.5–9% TTI improvements with Hermes V1 ([source](https://dev.to/haider_mukhtar/migrating-to-react-native-082-unlocking-the-full-power-of-the-new-architecture-in-expo-apps-2ca7))

### 3.3 Reanimated 4.x Worklets Configuration

**This is currently broken in Trésor.** The `babel.config.js` does NOT include the worklets plugin, which means Reanimated's worklet-based animations will fail.

In Reanimated 4.x, the Babel plugin moved from `react-native-reanimated/plugin` to `react-native-worklets/plugin`. ([source](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713))

**Fix `babel.config.js`:**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
      // ⬇️ ADD THIS — must be LAST in the plugins array
      'react-native-worklets/plugin',
    ],
  };
};
```

> **Critical:** `react-native-worklets/plugin` **must be the last plugin** in the array. The worklets plugin needs to process code after all other transformations. ([source](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started))

After changing babel config, clear the Metro cache:

```bash
npx expo start --clear
```

### 3.4 app.json / app.config.ts Optimizations

**Recommendation: Migrate from `app.json` to `app.config.ts`** for environment-specific configuration (dev/preview/production).

```ts
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Trésor Dev' : IS_PREVIEW ? 'Trésor Preview' : 'Trésor',
  slug: 'tresor',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'tresor',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  jsEngine: 'hermes',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tresor.app',
    infoPlist: {
      UIViewControllerBasedStatusBarAppearance: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#0A0A0B',
    },
    package: 'com.tresor.app',
  },
  web: {
    bundler: 'metro',
    output: 'server',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0A0A0B',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          newArchEnabled: true,
          deploymentTarget: '15.1',
        },
        android: {
          newArchEnabled: true,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
        },
      },
    ],
    'expo-secure-store',
    'expo-font',
    'expo-haptics',
  ],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '',
    },
    router: {
      origin: false,
    },
  },
  owner: 'nasseralnuaimi',
  updates: {
    url: 'https://u.expo.dev/your-project-id',
    checkAutomatically: 'ON_LOAD',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
```

**Key optimizations:**
- `jsEngine: 'hermes'` — explicit declaration
- `deploymentTarget: '15.1'` — Apple's 2025 minimum for new submissions ([source](https://javascript.plainenglish.io/expo-build-properties-configuration-complete-guide-2025-38cd1ebf946c))
- `compileSdkVersion: 35` — 2025 Android compliance
- `runtimeVersion: { policy: 'appVersion' }` — ensures OTA update compatibility
- `checkAutomatically: 'ON_LOAD'` — checks for updates on app launch
- Environment-specific `name` and `bundleIdentifier` for dev/preview/production

### 3.5 Bundle Size Optimization

| Strategy | Implementation |
|---|---|
| **Hermes bytecode** | Already on (default in SDK 57). Hermes precompiles JS to bytecode, reducing parse time. |
| **Tree shaking** | Ensure all imports are named (not `import * as`). Metro does dead code elimination. |
| **Inline requires** | Add `inlineRequires: true` to metro.config.js (enabled by default in SDK 57). |
| **Asset optimization** | Compress images with `expo-optimize`. Run `npx expo-optimize` to compress all images in the project. |
| **Minification** | Enabled by default in production builds. |
| **Code splitting** | Use Expo Router's lazy loading: `expo-router/lazy` for deferred route loading. |
| **Remove unused expo modules** | Only install expo packages you actually use. Each adds native binary weight. |
| **Font subsetting** | Only include the font weights you use. Playfair Display + Jost with 4 weights each is reasonable. |

**metro.config.js optimization:**

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [`${__dirname}/node_modules`];

// Remove SVG from assetExts so react-native-svg or Skia can handle them
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg'
);

// Enable inline requires for smaller initial bundle
config.transformer.inlineRequires = true;

module.exports = config;
```

### 3.6 Splash Screen, App Icons, Assets Pipeline

**Splash Screen:**

Trésor already has `expo-splash-screen` in plugins. For a luxury app, configure it properly:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#0A0A0B"
  }
]
```

**Best practice:** Keep the native splash visible until your app is ready, then fade it out:

```tsx
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export function AppReady({ children }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        // Preload fonts, images, etc.
        await loadAssets();
      } catch (e) {
        console.warn(e);
      } finally {
        setLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!loaded) return null;
  return children;
}
```

**App Icons:**
- iOS: 1024×1024 PNG, no alpha channel, no rounded corners (iOS rounds automatically)
- Android: Adaptive icon with foreground (1080×1080, safe zone 660×660 center) + background color
- Use `expo-image`'s image manipulation for generating variants

**Assets pipeline:**
- Store source assets in `assets/`
- Use `@expo/vector-icons` for icons (already installed)
- Preload critical fonts with `expo-font`:
  ```tsx
  await Font.loadAsync({
    'PlayfairDisplay': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Bold': require('./assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Jost': require('./assets/fonts/Jost-Regular.ttf'),
    'Jost-Medium': require('./assets/fonts/Jost-Medium.ttf'),
  });
  ```

### 3.7 Build Configuration (EAS vs Local)

Trésor's `eas.json` is already set up with three profiles (development, preview, production). Recommended improvements:

```json
{
  "cli": {
    "version": ">= 5.9.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true,
        "resourceClass": "m-medium"
      },
      "env": {
        "APP_ENV": "development",
        "EXPO_PUBLIC_SUPABASE_URL": "http://localhost:54321"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "env": {
        "APP_ENV": "preview"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

**EAS vs Local builds:**

| Approach | When to Use |
|---|---|
| **EAS Build (cloud)** | Production builds, CI/CD, team collaboration. No local Xcode needed. |
| **Local build (`expo run:ios`)** | Development iteration, debugging native issues, faster iteration cycle. |
| **EAS Update** | OTA updates for JS-only changes. No App Store review needed. |

**Recommendation for Trésor:**
- Development: Local `npx expo run:ios` for fast iteration
- Preview: EAS Build for QA/stakeholder testing
- Production: EAS Build with auto-increment + EAS Update for hotfixes

### 3.8 Performance Profiling Tools

| Tool | Purpose | How to Use |
|---|---|---|
| **React Native DevTools** | JS debugging, profiler, network inspector | Built into React Native 0.86. `npx react-native-devtools` or press `j` in Metro terminal. ([source](https://shopify.github.io/react-native-skia/docs/getting-started/installation)) |
| **Expo DevTools** | Bundle inspector, launch screen | `npx expo start` → press `shift+m` to open in browser |
| **Flipper** | Deprecated for SDK 57. React Native DevTools replaced it. | Don't install. |
| **Xcode Instruments** | Native performance, CPU, GPU, memory | Profile → Time Profiler / Core Animation FPS |
| **Android Studio Profiler** | Native Android profiling | View → Tool Windows → Profiler |
| **React Profiler** | Component render performance | Wrap components with `<Profiler>` from React |
| **`useFrameCallback`** | Measure FPS in Reanimated | Use Reanimated's frame callback to log frame timing |

**Key metrics to watch:**
- JS thread frame time (should be < 16.67ms for 60fps)
- UI thread frame time (should be < 16.67ms)
- Bridge traffic (should be minimal with New Architecture)
- Memory usage (watch for leaks in long sessions)

**Pro tip for Skia performance:**
```tsx
import { Canvas, useCanvasClock } from "@shopify/react-native-skia";
// useCanvasClock gives you a frame-accurate clock for shader animations
// It runs on the UI thread, not the JS thread
```

### 3.9 React Compiler (Bonus)

Expo SDK 57 supports the React Compiler. Enable it for automatic memoization:

```bash
npx expo install babel-plugin-react-compiler
```

```js
// babel.config.js
plugins: [
  'react-native-worklets/plugin',
  // React Compiler must be before worklets plugin
  'react-compiler',
],
```

> React Compiler eliminates the need for `useMemo`, `useCallback`, and `React.memo` by automatically optimizing re-renders. ([source](https://docs.expo.dev))

---

## 4. Best Practices from Top Expo Projects

Research into premium Expo apps (fintech, e-commerce, social) reveals a consistent library stack. Here's each library with what it does, why it matters for a luxury app, and installation command.

### 4.1 Graphics & Animation

#### `@shopify/react-native-skia`
- **What:** GPU-accelerated 2D graphics — shaders, canvas, particles, charts, custom drawing
- **Why for luxury:** Gold-dust particle effects, shader-based gradient backgrounds, custom chart rendering, frosted glass — all at 60fps. This is what separates a "basic" app from "Vogue/Hermès quality."
- **Install:** `npx expo install @shopify/react-native-skia`
- **Source:** [Expo docs](https://docs.expo.dev/versions/latest/sdk/skia/), [Skia docs](https://shopify.github.io/react-native-skia/)

#### `react-native-reanimated` (already installed ✅)
- **What:** UI-thread animations with worklets. The animation engine.
- **Why for luxury:** 60-120fps gesture-driven animations, spring physics, shared element transitions. Powers every smooth interaction.
- **Install:** Already at 4.5.1
- **Source:** [Reanimated docs](https://docs.swmansion.com/react-native-reanimated/)

#### `react-native-worklets` (already installed ✅)
- **What:** Worklet runtime for Reanimated 4.x. Separated from Reanimated in v4.
- **Why for luxury:** Required for Reanimated 4.x to function. Enables multi-threaded animation code.
- **Install:** Already at 0.10.3
- **Source:** [Reanimated 4 release](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)

#### `react-native-gesture-handler` (NOT installed ❌)
- **What:** Native gesture system — pan, pinch, rotate, fling, long press. Runs on UI thread.
- **Why for luxury:** Smooth swipe-to-dismiss, pinch-to-zoom on item photos, custom scroll behaviors, drag-to-reorder. Standard React Native touch handlers run on the JS thread and cause lag.
- **Install:** `npx expo install react-native-gesture-handler`
- **Source:** [Gesture Handler docs](https://docs.swmansion.com/react-native-gesture-handler/)

> **Critical for Skia:** The Skia docs explicitly recommend using `react-native-gesture-handler` for gesture integration with Skia canvases. ([source](https://shopify.github.io/react-native-skia/docs/animations/gestures))

#### `moti` (NOT installed)
- **What:** Declarative animation library built on Reanimated. Framer Motion-style API for React Native.
- **Why for luxury:** Mount/unmount animations (content fades in/out), variant animations, sequence animations. Much simpler API than raw Reanimated for common animation patterns. Powers smooth screen transitions.
- **Install:** `npx expo install moti`
- **Source:** [Moti docs](https://moti.fyi)

### 4.2 Visual Polish

#### `expo-blur` (NOT installed ❌)
- **What:** Native iOS blur view (UIVisualEffectView) — real-time frosted glass.
- **Why for luxury:** Translucent navigation bars, blurred backgrounds behind modals, the iOS-style material design that feels premium. On Android, falls back gracefully.
- **Install:** `npx expo install expo-blur`
- **Source:** [Expo Blur docs](https://docs.expo.dev/versions/latest/sdk/blur)

> **Note:** For cross-platform blur (including Android), use Skia's `BackdropBlur` instead. `expo-blur` is iOS-optimized native blur; Skia `BackdropBlur` works everywhere on the GPU.

#### `expo-haptics` (already installed ✅)
- **What:** Native haptic feedback — impact, notification, selection patterns.
- **Why for luxury:** Haptic feedback is *the* difference between feeling premium and feeling cheap. A subtle impact when favoriting an item, a success notification when saving — these micro-interactions are what Apple, Hermès, and Vogue apps all do.
- **Install:** Already at 57.0.1
- **Source:** [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics)

**Usage pattern for luxury:**
```tsx
import * as Haptics from 'expo-haptics';

// Selection feedback — light, when scrolling through items
Haptics.selectionAsync();

// Impact — medium, when favoriting an item
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Notification — success, when saving
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

#### `expo-linear-gradient` (already installed ✅)
- **What:** Native gradient view component.
- **Why for luxury:** Gradient backgrounds, overlay gradients on images, gold-to-bronze color transitions for the Warm Atelier palette.
- **Install:** Already at 57.0.0
- **Source:** [Expo LinearGradient docs](https://docs.expo.dev/versions/latest/sdk/linear-gradient)

> **Note:** For animated gradients or gradient *inside* Skia canvases, use Skia's `<LinearGradient>` instead.

#### `expo-image` (NOT installed — should be)
- **What:** High-performance image component with caching, blur-up transitions, placeholder support.
- **Why for luxury:** Smooth blur-up loading (like Instagram/Pinterest), proper memory management for large item photos, cache control. Far superior to React Native's `<Image>`.
- **Install:** `npx expo install expo-image`
- **Source:** [Expo Image docs](https://docs.expo.dev/versions/latest/sdk/image)

#### `expo-video` (NOT installed)
- **What:** Native video playback component. Replaces the old `expo-av`.
- **Why for luxury:** Background video on onboarding screens, item showcase videos, fullscreen video viewers. Native performance, PiP support.
- **Install:** `npx expo install expo-video`
- **Source:** [Expo Video docs](https://docs.expo.dev/versions/latest/sdk/video)

### 4.3 Navigation & Layout

#### `react-native-bottom-sheet` (@gorhom/bottom-sheet) (NOT installed)
- **What:** Performant interactive bottom sheet with snap points, backdrop, and custom content.
- **Why for luxury:** Item detail sheets that slide up smoothly, filter panels, action menus. The snap-point physics feel native and premium. Used by every top-tier app.
- **Install:** `npx expo install @gorhom/bottom-sheet`
- **Dependencies:** Requires `react-native-reanimated` and `react-native-gesture-handler` (both needed anyway)
- **Source:** [Bottom Sheet docs](https://gorhom.dev/react-native-bottom-sheet/)

### 4.4 Icons & Typography

#### `@expo/vector-icons` (already installed ✅)
- **What:** Icon libraries — Ionicons, MaterialIcons, FontAwesome, SF Symbols (via expo-symbols).
- **Why for luxury:** Consistent icon set across platforms. For a luxury app, use a single consistent icon family (recommend Ionicons or SF Symbols on iOS).
- **Install:** Already at 15.1.1
- **Source:** [Expo Vector Icons docs](https://docs.expo.dev/guides/icons/)

#### `expo-symbols` (NOT installed)
- **What:** Native SF Symbols on iOS — 5,000+ Apple-designed symbols.
- **Why for luxury:** SF Symbols are what Apple uses in its own apps. They're animated, scalable, and feel natively iOS. For a luxury iOS app, using SF Symbols is the gold standard.
- **Install:** `npx expo install expo-symbols`
- **Source:** [Expo Symbols docs](https://docs.expo.dev/versions/latest/sdk/symbols)

#### `expo-font` (already installed ✅)
- **What:** Font loading and management.
- **Why for luxury:** Playfair Display + Jost — the editorial typography foundation.
- **Install:** Already at 57.0.1

### 4.5 Additional Premium Libraries

#### `react-native-graph` (by Margelo) (NOT installed)
- **What:** Skia-powered chart library — line charts, candlestick, with touch scrubbing and animated transitions.
- **Why for luxury:** If Trésor ever shows portfolio value over time, item price history, or any data viz, this renders thousands of points at 120fps. Built on Skia.
- **Install:** `npx expo install react-native-graph`
- **Source:** [react-native-graph GitHub](https://github.com/margelo/react-native-graph)

#### `react-native-mmkv` (NOT installed)
- **What:** Ultra-fast key-value storage. Replacement for AsyncStorage.
- **Why for luxury:** 30x faster than AsyncStorage. Synchronous reads. Used for caching user preferences, recent items, UI state. Makes the app feel instant.
- **Install:** `npx expo install react-native-mmkv`
- **Source:** [MMKV GitHub](https://github.com/mrousavy/react-native-mmkv)

#### `@shopify/flash-list` (NOT installed)
- **What:** High-performance list renderer. Drop-in replacement for FlatList.
- **Why for luxury:** Smooth scrolling through large inventories without blank cells or jank. Recycles cells efficiently.
- **Install:** `npx expo install @shopify/flash-list`
- **Source:** [Flash List docs](https://shopify.github.io/flash-list/)

#### `expo-local-authentication` (already installed ✅)
- **What:** Biometric authentication — Face ID, Touch ID.
- **Why for luxury:** Security for a luxury item inventory app. Face ID to unlock feels premium and secure.
- **Install:** Already at 57.0.2

#### `react-native-safe-area-context` (already installed ✅)
- **What:** Safe area insets for notch/dynamic island handling.
- **Why for luxury:** Proper edge-to-edge layouts, notch-aware navigation.
- **Install:** Already at 5.7.0

---

## 5. Recommended Library Stack for Trésor

Given the design goals (luxury, editorial, 60fps animations, particle effects, smooth transitions), here is the prioritized library stack:

### Priority 1: Critical — Install Immediately

These are blocking. The app cannot achieve "luxury" without them.

| # | Library | Status | Why |
|---|---|---|---|
| 1 | `react-native-worklets/plugin` in babel | ❌ Missing | **Reanimated 4.x won't work without it.** Animations are currently broken. |
| 2 | `react-native-gesture-handler` | ❌ Not installed | Required for smooth gestures + Skia integration |
| 3 | `@shopify/react-native-skia` | ❌ Not installed | Particle effects, shaders, custom drawing — the "wow" factor |
| 4 | `expo-image` | ❌ Not installed | Blur-up image loading for item photos |

**Commands:**
```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor/app

# 1. Fix babel config (manual edit — see Section 3.3)

# 2. Install gesture handler
npx expo install react-native-gesture-handler

# 3. Install Skia
npx expo install @shopify/react-native-skia

# 4. Install expo-image
npx expo install expo-image

# Rebuild dev client
npx expo prebuild --clean
npx expo run:ios
```

### Priority 2: High — Install Before Feature Work

These elevate the app from "functional" to "premium."

| # | Library | Why |
|---|---|---|
| 5 | `expo-blur` | Native frosted glass for nav bars and modals |
| 6 | `@gorhom/bottom-sheet` | Item detail sheets, filter panels — snap-point physics |
| 7 | `moti` | Declarative mount/unmount animations, screen transitions |
| 8 | `react-native-mmkv` | Instant local storage — caching, UI state |
| 9 | `@shopify/flash-list` | Smooth inventory list scrolling |
| 10 | `expo-symbols` | SF Symbols for native iOS iconography |

**Commands:**
```bash
npx expo install expo-blur @gorhom/bottom-sheet moti react-native-mmkv @shopify/flash-list expo-symbols
```

### Priority 3: Medium — Install When Needed

| # | Library | When |
|---|---|---|
| 11 | `expo-video` | When adding item showcase/onboarding videos |
| 12 | `react-native-graph` | When adding charts (portfolio value, price history) |
| 13 | `react-native-pulsar` | When needing advanced haptic patterns beyond expo-haptics |
| 14 | `babel-plugin-react-compiler` | When ready to optimize re-renders automatically |

### Already Installed (✅)

These are already in the stack and should be leveraged:

| Library | Version |
|---|---|
| `expo` | ~57.0.10 |
| `react-native` | 0.86.2 |
| `react` | 19.2.3 |
| `react-native-reanimated` | 4.5.1 |
| `react-native-worklets` | ^0.10.3 |
| `expo-haptics` | ~57.0.1 |
| `expo-linear-gradient` | ~57.0.0 |
| `expo-font` | ~57.0.1 |
| `@expo/vector-icons` | ^15.1.1 |
| `expo-local-authentication` | ~57.0.2 |
| `expo-splash-screen` | ~57.0.5 |
| `expo-router` | ~57.0.10 |
| `expo-secure-store` | ~57.0.1 |

### Full Install Command (Priority 1 + 2)

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor/app

npx expo install \
  @shopify/react-native-skia \
  react-native-gesture-handler \
  expo-image \
  expo-blur \
  @gorhom/bottom-sheet \
  moti \
  react-native-mmkv \
  @shopify/flash-list \
  expo-symbols
```

Then rebuild:
```bash
npx expo prebuild --clean
npx expo run:ios
```

---

## 6. Action Plan — Basic to Luxury Editorial

### Phase 0: Fix the Foundation (Day 1)

**Goal:** Fix broken Reanimated config, install critical dependencies.

- [ ] **0.1** Add `react-native-worklets/plugin` to `babel.config.js` (must be last plugin)
- [ ] **0.2** Add `jsEngine: "hermes"` to `app.json`
- [ ] **0.3** Install Priority 1 libraries: `react-native-gesture-handler`, `@shopify/react-native-skia`, `expo-image`
- [ ] **0.4** Wrap root layout with `GestureHandlerRootView`:
  ```tsx
  // app/_layout.tsx
  import { GestureHandlerRootView } from 'react-native-gesture-handler';

  export default function RootLayout() {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* ... */}
      </GestureHandlerRootView>
    );
  }
  ```
- [ ] **0.5** Rebuild dev client: `npx expo prebuild --clean && npx expo run:ios`
- [ ] **0.6** Verify Skia renders with a test canvas
- [ ] **0.7** Verify Reanimated animations work (create a test animation)

### Phase 1: Visual Foundation (Days 2-3)

**Goal:** Replace basic components with premium alternatives.

- [ ] **1.1** Replace all `<Image>` with `expo-image` `<Image>` — add blur-up transitions and placeholders
- [ ] **1.2** Install Priority 2 libraries: `expo-blur`, `@gorhom/bottom-sheet`, `moti`, `react-native-mmkv`, `@shopify/flash-list`, `expo-symbols`
- [ ] **1.3** Replace `FlatList` with `FlashList` in inventory screens
- [ ] **1.4** Add `expo-blur` to navigation bars and modals
- [ ] **1.5** Add `moti` mount/unmount animations to screens:
  ```tsx
  import { MotiView } from 'moti';

  <MotiView
    from={{ opacity: 0, translateY: 20 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ type: 'timing', duration: 400 }}
  >
    {children}
  </MotiView>
  ```
- [ ] **1.6** Implement haptic feedback on all primary interactions (favorite, save, navigate)
- [ ] **1.7** Replace AsyncStorage with MMKV for UI state caching

### Phase 2: Skia Enhancement (Days 4-6)

**Goal:** Add the "wow" factor — particle effects, shader backgrounds, custom graphics.

- [ ] **2.1** Create a Skia particle system component for gold-dust effect on item detail screens:
  ```tsx
  // app/src/components/GoldDustParticles.tsx
  import { Canvas, Atlas, useRSXformBuffer, useRectBuffer, useImage } from "@shopify/react-native-skia";
  import { useSharedValue, useDerivedValue, withRepeat, withTiming } from "react-native-reanimated";
  ```
- [ ] **2.2** Create shader-based animated gradient backgrounds for the onboarding/splash:
  ```tsx
  // Use SkSL shader with iTime uniform driven by Reanimated
  // Warm Atelier colors: camel (#C19A6B), bronze (#CD7F32), gold (#C9A961)
  ```
- [ ] **2.3** Add Skia `BackdropBlur` frosted glass panels for item detail overlays
- [ ] **2.4** Implement gesture-driven image viewer with Skia + Gesture Handler (pinch to zoom, pan)
- [ ] **2.5** Add shader transition effects between items (swipe to reveal next item with a dissolve shader)
- [ ] **2.6** Create custom loading indicators using Skia path animations (shape morphing)

### Phase 3: Interaction Polish (Days 7-9)

**Goal:** Every interaction feels intentional and premium.

- [ ] **3.1** Implement `@gorhom/bottom-sheet` for item detail sheets with snap points
- [ ] **3.2** Add shared element transitions between list and detail views
- [ ] **3.3** Implement pull-to-refresh with custom Skia animation
- [ ] **3.4** Add custom scroll-driven animations (parallax headers, fade-on-scroll)
- [ ] **3.5** Implement swipe-to-delete / swipe-to-favorite with spring physics
- [ ] **3.6** Add `expo-symbols` for native iOS iconography throughout
- [ ] **3.7** Fine-tune all animation timings — luxury apps use slower, more deliberate transitions (400-600ms, not 200ms)

### Phase 4: Performance & Production (Days 10-12)

**Goal:** 60fps everywhere, production-ready build pipeline.

- [ ] **4.1** Profile with React Native DevTools — identify and fix any frame drops
- [ ] **4.2** Profile with Xcode Instruments — check GPU and memory usage
- [ ] **4.3** Migrate `app.json` → `app.config.ts` with environment-specific config
- [ ] **4.4** Set up EAS Update for OTA hotfixes
- [ ] **4.5** Optimize images with `npx expo-optimize`
- [ ] **4.6** Verify production build size is acceptable (Skia adds ~6MB)
- [ ] **4.7** Test on multiple device sizes (iPhone SE → iPhone 16 Pro Max)
- [ ] **4.8** Set up runtime version policy for OTA updates
- [ ] **4.9** Final QA pass — every screen, every interaction, every animation

### Phase 5: Future Enhancements

- [ ] **5.1** WebGPU exploration (when stable) — 3D item showcases, GPU compute for particle physics
- [ ] **5.2** `react-native-graph` for portfolio/value charts
- [ ] **5.3** `expo-video` for item showcase videos
- [ ] **5.4** React Compiler for automatic memoization
- [ ] **5.5** Dynamic app icons (seasonal luxury themes)

---

## Sources

1. [Expo SDK — @shopify/react-native-skia](https://docs.expo.dev/versions/latest/sdk/skia/) — Official Expo docs
2. [Skia Installation Guide](https://shopify.github.io/react-native-skia/docs/getting-started/installation) — Official Skia docs
3. [Skia Shaders Documentation](https://shopify.github.io/react-native-skia/docs/shaders/overview) — Official Skia docs
4. [Skia Gestures Documentation](https://shopify.github.io/react-native-skia/docs/animations/gestures) — Official Skia docs
5. [Skia Animations Documentation](https://shopify.github.io/react-native-skia/docs/animations/animations) — Official Skia docs
6. [Getting Started with React Native Skia](https://shopify.engineering/getting-started-with-react-native-skia) — Shopify Engineering Blog
7. [React Native Skia: Shaders, Uniforms & Reanimated](https://variantsystems.io/blog/react-native-skia) — Variant Systems
8. [How React Native improved from 2023 to 2025 — Animation stress testing](https://medium.com/@islamrustamov/how-react-native-improved-from-2023-to-2025-animation-stress-testing-and-a-little-bit-of-flutter-edd44297b815) — Islam Rustamov
9. [The Future of React Native Graphics: WebGPU, Skia, and Beyond](https://shopify.engineering/webgpu-skia-web-graphics) — Shopify Engineering
10. [Reanimated 4 Stable Release](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713) — Software Mansion
11. [Reanimated Getting Started](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started) — Official docs
12. [React Native's New Architecture in Production](https://procedure.tech/blogs/react-native-new-architecture-in-production) — Procedure Tech
13. [Using Hermes Engine — Expo Documentation](https://docs.expo.dev/guides/using-hermes) — Expo docs
14. [Migrating to React Native 0.82](https://dev.to/haider_mukhtar/migrating-to-react-native-082-unlocking-the-full-power-of-the-new-architecture-in-expo-apps-2ca7) — Haider Mukhtar
15. [Expo SDK 57 Changelog](https://expo.dev/changelog/sdk-57) — Expo
16. [What's New in Expo SDK 57](https://medium.com/@onix_react/whats-new-in-expo-sdk-57-c3133d32ba37) — Onix
17. [Expo Build Properties Configuration Guide](https://javascript.plainenglish.io/expo-build-properties-configuration-complete-guide-2025-38cd1ebf946c) — Medium
18. [Expo Linear Gradient Documentation](https://docs.expo.dev/versions/latest/sdk/linear-gradient) — Expo docs
19. [Expo Haptics Documentation](https://docs.expo.dev/versions/latest/sdk/haptics) — Expo docs
20. [Moti Documentation](https://moti.fyi) — Fernando Rojo
21. [Gorhom Bottom Sheet](https://gorhom.dev/react-native-bottom-sheet/) — Official docs
22. [React Native Skia vs SVG vs Canvas](https://www.pkgpulse.com/guides/react-native-skia-vs-react-native-svg-vs-react-native-2026) — PkgPulse
23. [Expo Development Client Guide](https://capgo.app/blog/expo-development-client) — Capgo

---

*This document is the authoritative reference for the Trésor graphics and animation strategy. It should be reviewed by all developers before beginning feature work on Skia-based components.*
