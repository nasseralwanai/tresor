# From Nasser — Additional Resource for Muaath

## Expo's Design Principles Blog Post

**Source:** @expo on X — https://x.com/expo/status/2069411835439431911
**Blog:** https://expo.dev/blog/how-to-apply-professional-design-principles-in-ai-app-development
**Author:** Nicolas Solerieu (Expo's designer)

Expo published a guide on professional design principles for app development. The 8 principles:

1. **Contrast** — visual differentiation between elements
2. **Hierarchy** — clear order of importance
3. **Alignment** — deliberate spatial relationships
4. **Proximity** — grouping related elements together
5. **Repetition** — consistent patterns across the app
6. **Balance** — visual weight distribution
7. **White space** — breathing room, luxury feel
8. **Unity** — cohesive whole

The article is specifically about steering AI-generated designs away from "vibe-coded" sameness toward unique, balanced, polished output.

**Nasser's note:** This is directly relevant to Trésor — the app must NOT look AI-generated. Apply these 8 principles to the Home tab redesign. The @expo X account is a resource to follow for ongoing design/Expo best practices.

**Also follow:** @expo on X for ongoing Expo design patterns, library updates, and best practices.

---

## Second Resource from Nasser — Expo Observe + Bottom Sheet Warning

**Source:** @expo on X — https://x.com/expo/status/2085738023862558997

### Expo Observe
Expo is about to GA "Observe" — a new debugging/monitoring tool. Requires SDK 55+. We're on SDK 57, so we're ready.

### Bottom Sheet — USE EXPO NATIVE, NOT @gorhom
A developer reported "@gorhom/bottom-sheet doesn't work well with SDK 57." This is a known issue pattern since SDK 52.

**Solution already applied:** Removed @gorhom/bottom-sheet, installed `@expo/ui` (v57.0.9) which includes `BottomSheet` — a native component using SwiftUI on iOS and Jetpack Compose on Android. API-compatible with @gorhom. No Reanimated dependency, no gesture handler conflicts.

Import: `import { BottomSheet } from '@expo/ui/community/bottom-sheet'`

Reference: https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet
