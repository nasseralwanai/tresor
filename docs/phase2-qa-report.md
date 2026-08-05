# Phase 2 QA Report

**Date:** 2025-08-05
**QA Engineer:** Vlad
**Branch:** `qa/phase2-qa-pass`
**TSC Result:** PASS (zero errors)

## Summary

Full QA pass of the Trésor app. Found and fixed 14 issues across 6 screens, 5 lib modules, 2 type files, 1 migration, and package.json. All `mockApi`/`mockData` references have been removed and replaced with real Supabase-backed queries. TypeScript compiles with zero errors.

## Issues Found and Fixed

### 1. Six screens imported from `@/lib/mockApi` instead of real Supabase lib functions

**Severity:** Critical — screens were displaying mock data, not real data from Supabase.

**Files affected:**
- `app/(tabs)/index.tsx` — imported `getMyItems`, `getCollectionInsights` from mockApi
- `app/(tabs)/wishlist.tsx` — imported `getMyWishlist`, `getFriendsWishlist`, `createWishlistItem` from mockApi
- `app/(tabs)/circle.tsx` — imported `getCircleMembers`, `getUserItems` from mockApi; also imported `MockMember` type from mockData
- `app/(tabs)/activity.tsx` — imported `getActivityFeed`, `markReturned`, `getCurrentUser` from mockApi
- `app/borrow/request.tsx` — imported `requestBorrow` from mockApi
- `app/borrow/active.tsx` — imported `getMyActiveBorrows`, `markReturned`, `nudgeBorrower`, `getCurrentUser` from mockApi
- `app/item/[id].tsx` — imported `getItem`, `updateItem`, `getActiveBorrowForItem`, `getItemBorrowHistory`, `markReturned`, `requestBorrow`, `getCurrentUser` from mockApi
- `app/profile.tsx` — imported `getCurrentUser`, `getMyCircle`, `getMyItems` from mockApi

**Fix:** Updated all screens to import from the real Supabase-backed lib modules (`@/lib/items`, `@/lib/borrow`, `@/lib/activity`, `@/lib/wishlist`, `@/lib/circle`, `@/lib/profile`). Updated function call signatures to pass `userId` and `circleId` parameters.

### 2. `src/lib/circle.ts` used mock data instead of real Supabase queries

**Severity:** Critical — the circle screen showed hardcoded mock members.

**Fix:** Rewrote `circle.ts` to query `circle_members` and `profiles` tables via Supabase. Added `getCircleMembers(userId)` that fetches real members with item counts, and `getMyCircle(userId)` that fetches the user's actual circle.

### 3. `src/lib/mockApi.ts` and `src/lib/mockData.ts` still present

**Severity:** Medium — dead code that could cause confusion.

**Fix:** Deleted both files. No screens reference them after the fixes above.

### 4. Missing `is_private` and `is_lendable` columns in `items` table

**Severity:** Critical — the UI types (`@/types/items.ts`) expected these fields, but the database schema didn't have them. The `manual.tsx` add screen sets these fields, and the item detail screen reads them.

**Fix:** Created migration `0005_items_visibility_columns.sql` that adds `is_private` (boolean, default false) and `is_lendable` (boolean, default true) columns to the `items` table, plus an RLS policy for circle members to view non-private items.

### 5. Real lib functions returned raw DB types, not UI-enriched types

**Severity:** Critical — `items.ts` returned the raw DB `Item` type (from `@/types`) which lacks `owner_name`, `is_private`, `is_lendable`. `borrow.ts` returned raw `BorrowTransaction` without `item_brand`, `item_model`, `borrower_name`, `lender_name`.

**Fix:** 
- Updated `items.ts` to join with `profiles` table and return enriched `ItemUI` type with `owner_name`.
- Updated `borrow.ts` to join with `items` and `profiles` tables, returning `BorrowTransactionEnriched` with item and party names.
- Updated `activity.ts` to join with `items` table and return `item_brand`.
- Updated `wishlist.ts` to enrich return types with `owner_name` and `currency`.

### 6. Missing lib functions needed by screens

**Severity:** High — screens called functions that didn't exist in the real lib layer.

**Fix:** Added the following functions:
- `getCollectionInsights(userId)` in `profile.ts` — computes total value, item count, most valuable, least used, items lent.
- `getCurrentUserInfo(userId)` in `profile.ts` — returns UI-friendly profile data.
- `getUserItems(userId, onlyLendable)` in `items.ts` — fetches items by owner with optional lendable filter.
- `getActiveBorrowForItem(itemId)` in `items.ts` — fetches active borrow for an item.
- `getItemBorrowHistory(itemId)` in `items.ts` — fetches borrow history for an item.
- `getMyWishlist(userId)` in `wishlist.ts` — wrapper around `getWishlist` with enrichment.
- `getFriendsWishlist(userId, circleId)` in `wishlist.ts` — fetches non-private wishlist items from circle members.
- `createWishlistItem(input)` in `wishlist.ts` — creates a new wishlist item.
- `nudgeBorrower(transactionId)` in `borrow.ts` — placeholder for push notifications.
- `markReturned(borrowId)` in `activity.ts` — delegates to `borrow.ts`.

### 7. `@react-navigation/native` and `@react-navigation/bottom-tabs` in devDependencies

**Severity:** Medium — these packages are not needed in SDK 57 (Expo Router handles navigation) and were flagged for removal.

**Fix:** Removed `@react-navigation/bottom-tabs`, `@react-navigation/native`, and `@types/react-navigation` from `devDependencies` in `package.json`.

### 8. Duplicate import in `activity.tsx`

**Severity:** Low — `TouchableOpacity` was imported twice (once in the main import block, once at line 106).

**Fix:** Removed the duplicate import and consolidated into the main import.

### 9. `BorrowTransaction` UI type missing DB fields

**Severity:** Medium — the UI `BorrowTransaction` type in `@/types/items.ts` was missing `return_condition_note`, `condition_before`, `condition_after`, `circle_id`, `due_date`, `created_at`, `updated_at` fields that exist in the DB schema.

**Fix:** Updated the `BorrowTransaction` interface to include all DB fields.

### 10. `WishlistItem` UI type not matching DB schema

**Severity:** Medium — the UI `WishlistItem` type was missing `wishlist_id`, `item_id`, `max_price`, `source_url`, `target_date`, `ai_metadata`, `updated_at` fields from the DB, and had `is_private` which is on the `wishlists` table (not `wishlist_items`).

**Fix:** Updated the `WishlistItem` interface to match the DB row type, keeping `owner_name` and `currency` as UI-enriched fields.

### 11. `ActivityEntry` UI type not matching DB schema

**Severity:** Medium — the UI `ActivityEntry` type was missing `circle_id` from the DB schema.

**Fix:** Updated the `ActivityEntry` interface to include all DB fields.

### 12. `Item` UI type missing DB fields

**Severity:** Medium — the UI `Item` type was missing `purchase_date`, `serial_number`, `ai_brand_confidence`, `ai_identification`, `source_url` fields from the DB.

**Fix:** Updated the `Item` interface to include all DB columns.

### 13. Profile screen sign-out was a no-op

**Severity:** Medium — the sign-out button showed an alert but didn't actually call `signOut()`.

**Fix:** Wired the sign-out button to call `signOut()` from the `useAuth()` hook.

### 14. Borrow request screen passed empty string as itemId

**Severity:** High — `requestBorrow('', note)` was called with an empty item ID, which would always fail.

**Fix:** Updated the screen to read `itemId` from URL params, fetch the item to get the lender ID and circle ID, and pass all required parameters to `requestBorrow()`.

## Verification

- **TSC:** `npx tsc --noEmit` passes with zero errors.
- **No mockApi references:** No file imports from `@/lib/mockApi` or `@/lib/mockData`.
- **No `@react-navigation/native` references:** No source file imports from `@react-navigation/native` or `@react-navigation/bottom-tabs`.
- **No emoji:** No emoji characters found in any `.ts` or `.tsx` file.
- **MaterialCommunityIcons:** All icon names used are valid Material Design icons.

## Remaining Issues

1. **Activity feed `item_brand` enrichment:** The activity feed joins with `items` to get `item_brand`, but only for entries that have an `item_id`. Entries without an `item_id` (e.g., `member_joined`) will have `item_brand: null`, which is expected.

2. **Nudge borrower is a no-op:** `nudgeBorrower()` in `borrow.ts` is a placeholder. It doesn't send push notifications yet (requires expo-notifications setup). The UI shows a success alert regardless.

3. **Profile screen stats hardcoded:** "Items Lent" (1) and "Borrow Streak" (3) in the profile stats are hardcoded values. These should be computed from real data in a future phase.

4. **Who Wore It Best voting:** The voting card on the activity screen uses hardcoded data (Sarah/Chanel, Mona/Dior, Lina/Gucci). This is a placeholder for a future feature.

5. **Supabase env URL:** `.env.local` uses `http://localhost:54321` — this works on the simulator but not on a physical device. For device testing, the URL should be changed to the machine's LAN IP.

6. **Migration not yet applied:** The new migration `0005_items_visibility_columns.sql` needs to be applied to the local Supabase instance via `supabase db reset` or `supabase migration up`.
