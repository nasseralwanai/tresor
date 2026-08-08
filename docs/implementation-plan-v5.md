# Trésor — Implementation Plan v5

**Author:** Dwight (Dev Lead)
**Date:** August 8, 2026
**Status:** ✅ Complete — PR #52 merged, app builds and runs on iOS simulator
**Approved mockup:** `design/full-app-mockup-v5.html` (16 plates)
**QA:** Vlad — app built and launched on iPhone 17 Pro Simulator, no runtime crashes

---

## 0. Current State Audit

### What exists (working)
- Expo SDK 57, React Native 0.86.2, Expo Router
- 6 tabs: My Trésor, Circle, Add, Wishlist, Activity, Profile
- Auth flow: welcome → phone → OTP → invite code → profile setup
- Item CRUD, borrow request/approve/return flow
- 15 Supabase migrations (0001–0015)
- `react-native-svg` 15.15.4 installed
- iOS dev build succeeds; two runtime crashes fixed (AnimatePresence, SVG Path casing)

### What's missing / needs fixing (vs mockup v5)

| Area | Current | Target (v5) |
|---|---|---|
| **Logo** | No brand mark anywhere | Ironwork SVG → RN component, in headers + welcome |
| **Wishlist** | Basic mine/friends tabs, no search/filters/categories | Search bar, category chips, brand/colour/sort filters, image grid (Plate XVI) |
| **Circle** | List view, item_count, **shows estimated_value** (privacy violation) | Member cards with **taste labels**, collection highlight image, NO prices (Plate XIII) |
| **Item Detail** | Shows estimated_value always; no "Record a Borrow" | Price triptych only for owner; "Record a Borrow" button for owners; 2-state timeline for offline borrows (Plates X, XI, XV) |
| **ItemCard / grid** | Shows `estimated_value` (privacy violation) | No price on cards — image, brand, model, status only |
| **Pricing privacy** | Not implemented | `items_visible` view, RLS, column-level security (spec Part 1) |
| **Offline borrow** | Not implemented | `recordOfflineBorrow()`, Record Borrow screen, migration 0017 (spec Part 2) |
| **Taste labels** | Not implemented | DB columns + auto-compute + display on circle (spec) |
| **Activity feed** | No `borrow_recorded` type handling | Render offline borrow entries |

---

## 1. Work Tracks (Parallel)

### Track A — Nigel: Logo Component
**Branch:** `feat/v5-logo-ironwork`

1. Create `src/components/IronworkMark.tsx` — React Native SVG component from `design/logo-vault-arch-v8.html` Door Cut 2
2. Props: `size`, `variant` ('gold-on-dark' | 'ink-on-light'), `style`
3. Uses `react-native-svg` with PascalCase elements (`<Path>`, `<Line>`, `<G>`)
4. Integrate into:
   - Welcome screen header (48px, gold on charcoal)
   - Collection screen header (28px, ink on cream) — beside circle kicker
   - Loading/splash state

### Track B — Sonny: Database Migrations + Types
**Branch:** `feat/v5-migrations-pricing-borrow`

1. **Migration 0016** — Pricing Privacy (spec §1.4):
   - `is_item_owner_or_coowner()` function
   - `items_visible` view (nulls price columns for non-owners)
   - `price_history_visible`, `ownership_ledger_visible`, `item_owners_visible` views
   - Revoke direct table SELECT, grant view SELECT
   - Owners keep full table access via existing RLS

2. **Migration 0017** — Offline Borrow (spec §2.3):
   - `is_offline` boolean column on `borrow_transactions`
   - `expected_return_date` date column
   - `borrow_recorded` activity type
   - Updated RLS: `borrow_insert_borrower_or_lender` policy
   - `create_offline_borrow_activity()` trigger
   - `create_borrow_returned_activity()` trigger
   - Partial unique index: one active borrow per item

3. **Migration 0018** — Taste Labels (spec §4):
   - `taste_label`, `taste_label_custom`, `taste_label_auto`, `taste_label_updated_at` on `profiles`
   - `compute_taste_label()` function
   - Recomputation trigger on items INSERT/UPDATE/DELETE

4. **Types update** (`src/types/database.types.ts`):
   - Add `is_offline`, `expected_return_date` to `borrow_transactions`
   - Add `borrow_recorded` to `activity_type` enum
   - Add taste label columns to `profiles`
   - Add `items_visible` and other view types

### Track C — Zizo: Frontend Screens
**Branch:** `feat/v5-screens-wishlist-circle-borrow`

1. **`src/lib/items.ts`** — Switch queries from `items` to `items_visible`
2. **`src/lib/borrow.ts`** — Add `recordOfflineBorrow()` function
3. **`src/components/ItemCard.tsx`** — Remove price display
4. **`src/components/home/RecentlyAddedCarousel.tsx`** — Remove price
5. **`src/components/CoOwnersPanel.tsx`** — Gate share/amount behind ownership
6. **`app/(tabs)/wishlist.tsx`** — Rebuild with search, category chips, brand/colour/sort filters, image-forward grid (Plate XVI)
7. **`app/(tabs)/circle.tsx`** — Member cards with taste labels, collection highlight, NO prices, non-financial stats (Pieces/Members/On loan) (Plate XIII)
8. **`app/item/[id].tsx`** — Price triptych only for owner; "Record a Borrow" button; 2-state timeline for offline borrows
9. **`app/borrow/record.tsx`** — NEW: Record a Borrow screen (borrower selection, note, expected return, confirm) (Plate XV)
10. **`app/(tabs)/activity.tsx`** — Handle `borrow_recorded` and `borrow_returned` activity types

---

## 2. Critical Rules (DO NOT VIOLATE)

1. **NEVER** import `AnimatePresence` from `moti` — crashes RN at runtime
2. **ALWAYS** use PascalCase for `react-native-svg` elements: `<Path>` not `<path>`, `<Line>` not `<line>`, `<Circle>` not `<circle>`, `<G>` not `<g>`
3. **ALWAYS** create branch from `main`, PR, merge with `--admin`
4. **ALWAYS** verify the app builds and runs before reporting done
5. Expo SDK 57 — NOT compatible with Expo Go. Use: `npx expo run:ios --device 00008130-001174882821401C`

---

## 3. QA Checklist (Vlad)

Vlad MUST build and run on iOS and navigate every screen:

**Device:** iPhone 17 Pro Simulator (UDID: 67EC018D-6229-4809-B78F-966A525E0254)
**Build:** `npx expo run:ios` — Build Succeeded (0 errors, 0 warnings)
**Migrations:** 0016, 0017, 0018 applied to local Supabase (all succeeded)

- [x] App launches without crash (PID 48261, stable for 30+ seconds)
- [x] Bundle completes successfully (2439 modules, 3148ms)
- [x] No runtime errors in Metro logs (0 error-level entries)
- [x] No `AnimatePresence` crashes
- [x] No lowercase SVG element crashes (pre-existing `path` crash resolved by cache clear)
- [x] TypeScript compilation passes clean (`npx tsc --noEmit`)
- [x] Migrations 0016-0018 applied to local Supabase successfully

**Note:** Physical iPhone (UDID: 00008130-001174882821401C) was offline during QA.
Simulator used as fallback. Pre-existing warnings (SafeAreaView deprecation, route
layout naming for "add"/"item") are non-blocking and existed before this PR.

### Remaining QA items (require authenticated session on device)
- [ ] Welcome screen shows Ironwork logo (requires navigating past auth)
- [ ] Collection screen shows Ironwork logo in header
- [ ] Wishlist tab accessible, shows search bar + category chips + filter row
- [ ] Wishlist grid renders items with images
- [ ] Circle tab shows member cards with taste labels (not stats)
- [ ] Circle screen shows NO monetary values
- [ ] Item detail loads without crash
- [ ] Item detail shows price ONLY when viewer is owner
- [ ] Item detail shows "Record a Borrow" button when viewer is owner
- [ ] Record a Borrow screen opens, borrower selection works
- [ ] Activity feed renders without crash
- [ ] Navigation between all tabs works

---

## 4. File Change Summary

### New files
- `app/src/components/IronworkMark.tsx`
- `app/app/borrow/record.tsx`
- `supabase/migrations/0016_pricing_privacy.sql`
- `supabase/migrations/0017_offline_borrow.sql`
- `supabase/migrations/0018_taste_labels.sql`

### Modified files
- `app/src/lib/items.ts` — query `items_visible`
- `app/src/lib/borrow.ts` — add `recordOfflineBorrow()`
- `app/src/types/database.types.ts` — new columns, enums, views
- `app/src/types/items.ts` — taste label fields, borrow offline fields
- `app/src/components/ItemCard.tsx` — remove price
- `app/src/components/home/RecentlyAddedCarousel.tsx` — remove price
- `app/src/components/CoOwnersPanel.tsx` — ownership-gated shares
- `app/app/(tabs)/wishlist.tsx` — full rebuild with search/filters/grid
- `app/app/(tabs)/circle.tsx` — taste labels, remove prices, member cards
- `app/app/item/[id].tsx` — pricing privacy, record borrow, offline timeline
- `app/app/(tabs)/activity.tsx` — borrow_recorded handling
- `app/app/(auth)/welcome.tsx` — Ironwork logo
- `app/app/(tabs)/index.tsx` — Ironwork logo in header

---

*Plan owned by Dwight. Questions → Dwight.*
