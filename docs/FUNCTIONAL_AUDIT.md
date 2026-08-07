# Trésor — Complete Functional Audit

**Date:** August 7, 2026
**Auditor:** Nasser (root orchestrator) + subagent code audit
**Verdict:** App launches but is functionally broken. 5 critical, 7 major, 11 minor issues.

---

## Root Cause

The app launches → AuthContext loads → no session → `loading=false` → Stack renders → initial route `/` → `(tabs)/index.tsx` (My Trésor) → `user` is null → `loadData` returns early → empty collection screen.

The user never sees a login screen. If they somehow navigate to `/welcome` → "Get Started" → `/phone-otp` → enter credentials → `signIn()` succeeds → session is set → but nothing redirects to tabs. The user is stuck on the login screen.

The app is a well-coded UI shell with real Supabase queries, but the navigation/auth wiring is fundamentally broken.

---

## CRITICAL Issues (5)

### C1. No auth guard — app never shows login, never redirects after login
**File:** `app/_layout.tsx`, lines 16–43

Root layout computes `isAuthenticated` but never uses it. Both `(auth)` and `(tabs)` groups are always declared as Stack children. No `router.replace()`, no `useEffect` redirect, no conditional rendering.

**Impact:** Unauthenticated users see empty tabs. Authenticated users who find the login screen are stuck after login.

### C2. Login screen doesn't navigate after successful authentication
**File:** `app/(auth)/phone-otp.tsx`, lines 36–61

After `signIn()`/`signUp()` succeeds, code says "Auth state listener will switch to tabs automatically" — but no such listener exists. `onAuthStateChange` in AuthContext updates session state but calls no navigation.

### C3. `profiles.phone` UNIQUE NOT NULL blocks second-user signup
**File:** `supabase/migrations/0001_initial_schema.sql`, line 46; `src/lib/profile.ts`, lines 28–41

Schema: `phone text unique not null`. Code passes `phone: ''` for email/password users. First user gets `phone = ''`. Second user also gets `phone = ''` → UNIQUE constraint violation → profile creation fails.

### C4. Onboarding flow is completely broken — circle membership never established
**Files:** `app/(auth)/welcome.tsx` line 32; `app/(auth)/invite-code.tsx` lines 53–55; `src/lib/invite.ts` lines 78–96

1. Welcome screen bypasses invite-code entirely — goes straight to login
2. Invite-code screen never calls `joinCircle()`
3. `joinCircle()` function exists but is never called anywhere

**Impact:** Users are not members of any circle. Circle screen, Activity screen, Wishlist social features, and item visibility all broken.

### C5. Sign out doesn't redirect, error unhandled
**File:** `app/profile.tsx`, lines 57–63

`signOut()` Promise not awaited. No redirect after sign-out. User stays on profile screen.

---

## MAJOR Issues (7)

### M1. `useMemo` used for data-loading side effects instead of `useEffect`
**Files (7 screens):**
- `app/(tabs)/index.tsx` line 48
- `app/(tabs)/circle.tsx` line 43
- `app/(tabs)/wishlist.tsx` line 45
- `app/(tabs)/activity.tsx` line 53
- `app/item/[id].tsx` lines 62–64
- `app/profile.tsx` lines 43–49
- `app/borrow/active.tsx` lines 41–43

Violates React rules. May fire multiple times, no cleanup, unreliable data loading.

### M2. No error handling on data loading — infinite loading on failure
All 7 screens: if Supabase call fails, `setLoading(false)` never executes. Screen stuck on loading spinner forever.

### M3. Route conflict: `/profile` exists in both `(tabs)/profile.tsx` and `app/profile.tsx`
Expo Router ambiguity — navigation inconsistencies.

### M4. Item detail "Request to Borrow" navigates to wrong screen with no params
Borrow is already created, then user sent to `/borrow/request` which expects `itemId` param but receives none. Returns early.

### M5. Manual Add Item form ignores privacy/lendable toggles
Toggles exist in UI but `createItem` call doesn't pass `is_private` or `is_lendable`.

### M6. Wishlist AddModal ignores privacy toggle
`isPrivate` state toggled in UI but never passed to `createWishlistItem()`.

### M7. `circle-preview.tsx` uses fragile FK relationship names
Relies on exact FK constraint name. If mismatch, query fails silently.

---

## MINOR Issues (11)

- m1. Hardcoded profile stats (Items Lent = 1, Borrow Streak = 3)
- m2. "Who Wore It Best" voting hardcoded, not persisted
- m3. Wishlist "Drop Hint" and "Edit" buttons are no-ops
- m4. Wishlist friend "React" and "Comment" are local-only, never saved
- m5. Home screen "Nudge" button is a no-op
- m6. Home screen bell icon is a no-op
- m7. `nudgeBorrower` is a no-op placeholder
- m8. Profile settings (Dark Mode, Notifications, Privacy, Help) are no-ops
- m9. Add screen "Photo" and "Link" options show "Coming Soon"
- m10. Bulk Import "Process" button just goes back
- m11. `getCollectionInsights` "least used" logic returns oldest available item

---

## What Actually Works

- Supabase client init and connection
- Tab bar navigator (6 tabs correctly configured)
- Auth context — signIn/signUp/signOut call Supabase correctly
- Login form — email/password inputs wired to state, submit calls real functions
- Data layer functions — real Supabase queries in items.ts, circle.ts, wishlist.ts, borrow.ts, activity.ts
- Seed data — test users, circle, items exist
- RLS policies — comprehensive and correctly scoped
- TypeScript compiles clean, bundle builds (2.6MB)

---

## Remediation Plan

### Phase 1: Fix Critical Issues (auth + onboarding)
1. **C1+C2: Add auth guard to root layout** — Use `<Redirect>` from expo-router based on `isAuthenticated`. When unauthenticated → redirect to `/(auth)/welcome`. When authenticated → redirect to `/(tabs)`. Add `useEffect` in AuthContext to trigger navigation on session change.
2. **C3: Fix profiles.phone constraint** — New migration: `alter table profiles alter column phone drop not null;` and drop the UNIQUE constraint (or make it nullable + unique only on non-null values).
3. **C4: Wire onboarding flow** — Welcome → Invite Code (validate + join circle) → Phone OTP (login/signup) → Profile Setup → Circle Preview → redirect to `(tabs)`. Call `joinCircle()` after invite code validation.
4. **C5: Fix sign-out** — Await `signOut()`, then `router.replace('/(auth)/welcome')`.

### Phase 2: Fix Major Issues (data loading + navigation)
5. **M1: Replace all `useMemo` with `useEffect`** — 7 screens.
6. **M2: Add try/catch to all data loaders** — Show error state, not infinite spinner.
7. **M3: Resolve profile route conflict** — Remove standalone `app/profile.tsx`, keep `(tabs)/profile.tsx` as the only profile route.
8. **M4: Fix borrow flow** — Don't create borrow before showing request screen. Pass `itemId` as search param.
9. **M5+M6: Wire toggles to createItem/createWishlistItem calls**.
10. **M7: Use explicit select instead of FK relationship name.**

### Phase 3: Fix Minor Issues (no-ops → real or labeled "Coming Soon")
11. Wire what's feasible (nudge, wishlist reactions/comments). Label the rest as "Coming Soon" honestly.

### Phase 4: End-to-End Verification
12. Test every user flow on device:
    - First-time user: welcome → invite code → login → profile setup → home
    - Returning user: auto-redirect to home
    - Add item (manual) → appears in collection
    - View item → request borrow → active borrow → mark returned
    - Wishlist: add item → visible to circle → react/comment
    - Profile: sign out → back to welcome
