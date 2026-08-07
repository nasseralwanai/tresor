# Trésor — Remediation Plan

> **Status:** DRAFT — Awaiting Nasser's approval before execution.
> **Author:** Dwight (Dev Lead)
> **Date:** August 7, 2026
> **Source audit:** `docs/FUNCTIONAL_AUDIT.md` (5 critical, 7 major, 11 minor)
> **Branch strategy:** All work on `fix/remediation-phase-{N}` branches → PR → `git merge --admin` (branch protection on `main`)

---

## Team Assignments

| Member | Role | Scope |
|--------|------|-------|
| **Sonny** | Backend | Supabase migrations, data-layer functions (`src/lib/*.ts`), RLS |
| **Zizo** | Frontend | React screens, navigation, UI wiring (`app/**/*.tsx`, `src/components/**`) |
| **Nigel** | Architect | Flow design, route structure, FK relationship strategy, cross-cutting patterns |
| **Vlad** | QA | Verification gates, on-device testing, reporting to Nasser |
| **Mauricio** | DevOps | Branch creation, PRs, merge --admin, Metro/Supabase restart, CI |

**Rule:** No task is "done" until Vlad issues a PASS from the verification gate. "It compiles" is not done.

---

## Complexity Legend

- **S** = Small (1 file, <30 lines changed, straightforward)
- **M** = Medium (2-3 files, 30-100 lines, some logic)
- **L** = Large (4+ files, 100+ lines, or cross-cutting architectural change)

---

## Phase 1: Critical Issues — Make the App Usable

**Goal:** A user can launch the app, see the login screen, authenticate, complete onboarding, and land on the home screen with data. Sign-out works and returns to login.

**Branch:** `fix/remediation-phase-1`

### Task 1.1: Add auth guard to root layout (C1)

**Issue:** `app/_layout.tsx` lines 16-43 — `isAuthenticated` is computed but never used. Both `(auth)` and `(tabs)` Stack screens are always declared. Unauthenticated users see empty tabs; no redirect logic exists.

**Assignee:** Zizo (frontend)
**Complexity:** M
**Dependencies:** None (this is the first task — everything else depends on it)

**Fix approach:**
1. In `app/_layout.tsx`, replace the `RootNavigator` function's return logic:
   - When `loading` is true → show the existing loading spinner (unchanged).
   - When `!loading && !isAuthenticated` → render `<Stack>` with only the `(auth)` group active. Use expo-router's `<Redirect>` component to redirect to `/(auth)/welcome` as the initial route. Alternatively, use `useEffect` + `router.replace()` — but `<Redirect>` is the idiomatic expo-router pattern.
   - When `!loading && isAuthenticated` → render `<Stack>` with `(tabs)` as the initial route. Redirect to `/(tabs)` if not already there.
2. Do NOT conditionally render `<Stack>` children based on auth state (that breaks expo-router's route registration). Instead, use `<Redirect>` inside the Stack to control which route is shown. The Stack should always declare all routes; the redirect determines the entry point.
3. Verify: cold-launch with no session → lands on Welcome screen. Cold-launch with valid session → lands on My Trésor tab.

**Files to modify:**
- `app/_layout.tsx` (lines 16-43, rewrite `RootNavigator`)

**Pitfall:** Do not remove any `<Stack.Screen>` declarations. Expo Router needs all routes registered at all times. Only the redirect target changes.

---

### Task 1.2: Navigate to tabs after successful login (C2)

**Issue:** `app/(auth)/phone-otp.tsx` lines 36-61 — after `signIn()`/`signUp()` succeeds, line 47 comment says "Auth state listener will switch to tabs automatically" but no such listener/navigation exists. `AuthContext.onAuthStateChange` (line 99) only calls `setSession()` — no navigation.

**Assignee:** Zizo (frontend)
**Complexity:** S
**Dependencies:** Task 1.1 (auth guard must be in place so the redirect target exists)

**Fix approach — two options, pick Option A:**

**Option A (preferred — explicit navigation in the screen):**
1. In `app/(auth)/phone-otp.tsx`, after `await signIn(...)` or `await signUp(...)` succeeds (inside the `try` block, after line 45), add `router.replace('/(tabs)')`.
2. This is the simplest and most predictable approach. The auth guard from Task 1.1 will also catch the session change, but explicit navigation gives immediate feedback.

**Option B (alternative — add navigation to AuthContext):**
1. In `src/context/AuthContext.tsx`, add a `useEffect` that watches `session` and calls `router.replace()` when session transitions from null to non-null. This requires importing `router` from expo-router into the context, which couples auth state to navigation — generally an anti-pattern.

**Recommendation:** Option A. Keep AuthContext pure (state only), put navigation in the screen.

**Files to modify:**
- `app/(auth)/phone-otp.tsx` (add `router.replace('/(tabs)')` after line 45, inside the `try` block)

---

### Task 1.3: Fix `profiles.phone` UNIQUE NOT NULL constraint (C3)

**Issue:** `supabase/migrations/0001_initial_schema.sql` line 46 — `phone text unique not null`. `src/lib/profile.ts` line 35 — `createProfile` passes `phone: params.phone ?? ''`. First email/password user gets `phone = ''`. Second user also gets `phone = ''` → UNIQUE constraint violation → profile creation fails → user can sign up in Supabase Auth but has no profile row → app breaks.

**Assignee:** Sonny (backend)
**Complexity:** S
**Dependencies:** None (independent of frontend tasks)

**Fix approach:**
1. Create new migration: `supabase/migrations/0006_fix_phone_constraint.sql`
2. Contents:
   ```sql
   -- Make phone nullable (email/password users don't have a phone)
   ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

   -- Drop the blanket UNIQUE constraint
   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

   -- Add a partial unique index: phone must be unique only when non-null
   CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_not_null
     ON public.profiles (phone)
     WHERE phone IS NOT NULL;
   ```
3. Update `src/lib/profile.ts` line 35: change `phone: params.phone ?? ''` to `phone: params.phone ?? null`. This way email/password users get `NULL` (not `''`), which bypasses the partial unique index entirely.
4. Run migration against local Supabase: `supabase db reset` (or apply migration manually).
5. Verify: can create two users with email/password without constraint violation. Can create a user with a phone number. Cannot create two users with the same phone number.

**Files to create:**
- `supabase/migrations/0006_fix_phone_constraint.sql`

**Files to modify:**
- `src/lib/profile.ts` (line 35: `''` → `null`)

**Pitfall:** `supabase db reset` will wipe local data. Mauricio must re-seed after. Coordinate with Vlad for re-seeding before testing.

---

### Task 1.4: Wire the onboarding flow — welcome → invite code → login → profile setup → circle preview → tabs (C4)

**Issue:** Three broken links in the onboarding chain:
1. `app/(auth)/welcome.tsx` line 32 — "Get Started" navigates directly to `/(auth)/phone-otp`, bypassing invite-code entirely.
2. `app/(auth)/invite-code.tsx` lines 53-55 — `handleContinue` navigates to `/(auth)/phone-otp` but never calls `joinCircle()`.
3. `src/lib/invite.ts` lines 78-96 — `joinCircle()` function exists but is never called anywhere in the codebase.

**Impact:** Users are never added to `circle_members`. Circle screen, Activity screen, Wishlist social features, and item visibility (RLS scoped to circle members) all broken.

**Assignee:** Zizo (frontend, screens) + Sonny (backend, joinCircle timing)
**Complexity:** L
**Dependencies:**
- Task 1.3 (phone constraint must be fixed before new users can sign up)
- Task 1.1 (auth guard must work for redirect after onboarding)
- Nigel to define the intended flow before implementation

**Nigel's architectural decision (define before implementation):**

The correct onboarding flow for a NEW user:
```
Welcome → Invite Code (validate + preview circle) → Phone OTP (sign up) → Profile Setup → Circle Preview → (tabs)
```

The correct flow for a RETURNING user (already has session):
```
(splash) → (tabs)  [handled by auth guard in Task 1.1]
```

The `joinCircle()` call must happen AFTER the user is authenticated (needs `auth.uid()` for the `user_id` column and RLS). Two options:

- **Option A (recommended):** Call `joinCircle()` inside the Profile Setup screen (`app/(auth)/profile-setup.tsx`) after the profile is created. Pass the `circleId` and `userId` from the validated invite code and the new session. This requires passing the circle ID forward through navigation params.
- **Option B:** Call `joinCircle()` in the Circle Preview screen before `router.replace('/(tabs)')`. Also valid, but if the user closes the app before reaching circle preview, they won't be a member.

**Recommendation:** Option A. Join the circle as early as possible after auth.

**Implementation steps:**

1. **`app/(auth)/welcome.tsx` line 32:** Change `router.push('/(auth)/phone-otp')` to `router.push('/(auth)/invite-code')`.

2. **`app/(auth)/invite-code.tsx`:**
   - Store the validated `circleId` in component state (already available from `validation.circle.id` after `validateInviteCode` succeeds, line 38-39).
   - In `handleContinue` (line 53-55), pass the circle ID as a search param: `router.push({ pathname: '/(auth)/phone-otp', params: { circleId: validation.circle.id } })`.
   - Alternatively, use a React context or AsyncStorage to persist the circle ID across the auth flow. Nigel to decide — AsyncStorage is simpler, context is cleaner.

3. **`app/(auth)/phone-otp.tsx`:**
   - Read the `circleId` from search params: `const { circleId } = useLocalSearchParams<{ circleId?: string }>();`
   - After successful `signUp()`, navigate to profile setup: `router.push({ pathname: '/(auth)/profile-setup', params: { circleId } })`.
   - After successful `signIn()` (returning user), navigate to tabs: `router.replace('/(tabs)')` (they're already a circle member).

4. **`app/(auth)/profile-setup.tsx`:**
   - After `createProfile()` succeeds, call `joinCircle(circleId, user.id)`.
   - Import `joinCircle` from `@/lib/invite`.
   - Then navigate to `/(auth)/circle-preview` or directly to `/(tabs)`.
   - Add try/catch around `joinCircle` — if it fails (23505 = already member), continue gracefully.

5. **`src/lib/invite.ts`:** No changes needed to the function itself — it's correctly implemented. It just needs to be called.

**Files to modify:**
- `app/(auth)/welcome.tsx` (line 32: change navigation target)
- `app/(auth)/invite-code.tsx` (lines 53-55: pass circleId forward)
- `app/(auth)/phone-otp.tsx` (read circleId param, navigate to profile-setup after signup, to tabs after signin)
- `app/(auth)/profile-setup.tsx` (call joinCircle after profile creation)

**Pitfall:** The existing seed user `sarah@test.local` is already a circle member. The onboarding flow only applies to NEW users. Returning users should skip straight to tabs. Make sure `signIn()` path doesn't force users through onboarding again.

---

### Task 1.5: Fix sign-out — await promise, redirect to welcome (C5)

**Issue:** `app/profile.tsx` lines 57-63 — `signOut()` is called inside an `Alert.alert` callback but not awaited. No redirect after sign-out. User stays on profile screen with a cleared session.

**Assignee:** Zizo (frontend)
**Complexity:** S
**Dependencies:** Task 1.1 (auth guard will catch the session change, but explicit redirect is still needed for immediate UX)

**Fix approach:**
1. In `app/profile.tsx`, change `handleSignOut` (lines 57-63):
   ```tsx
   const handleSignOut = () => {
     hapticSuccess();
     Alert.alert('Sign Out', 'This will sign you out of Trésor.', [
       { text: 'Cancel', style: 'cancel' },
       {
         text: 'Sign Out',
         style: 'destructive',
         onPress: async () => {
           try {
             await signOut();
             router.replace('/(auth)/welcome');
           } catch (e: any) {
             Alert.alert('Error', e?.message ?? 'Could not sign out.');
           }
         },
       },
     ]);
   };
   ```
2. The auth guard from Task 1.1 will also catch the session change and redirect, but the explicit `router.replace` gives immediate feedback without waiting for the next render cycle.

**Files to modify:**
- `app/profile.tsx` (lines 57-63: rewrite `handleSignOut`)

---

### Phase 1 Acceptance Criteria

A user must be able to complete this full flow on device:

1. **Cold launch (no session):** App shows Welcome screen (not empty tabs).
2. **New user onboarding:** Welcome → "Get Started" → Invite Code screen → enter valid code → circle preview shows → Continue → Phone OTP screen → sign up with email/password → Profile Setup → enter name → Circle Preview → "Start Adding Items" → lands on My Trésor tab.
3. **Returning user:** Cold launch with valid session → lands directly on My Trésor tab.
4. **Sign out:** Profile tab → Sign Out → confirm → returns to Welcome screen.
5. **Second user signup:** After the phone constraint fix, a second email/password user can sign up without a `profiles.phone` UNIQUE violation.
6. **Circle membership:** After onboarding, the new user appears in `circle_members` table. Circle tab shows members. Activity tab loads.

### Phase 1 Verification Gate (Vlad must check before reporting to Nasser)

Vlad must verify ALL of the following and issue a formal PASS/HOLD/BLOCK:

| # | Check | Method | PASS condition |
|---|-------|--------|----------------|
| V1.1 | Auth guard redirects unauthenticated users | Cold-launch app with no session | Lands on Welcome screen, not empty tabs |
| V1.2 | Auth guard redirects authenticated users | Cold-launch with valid session (sarah@test.local) | Lands on My Trésor tab |
| V1.3 | Login navigates to tabs | Sign in as sarah@test.local / password123 | Lands on My Trésor tab within 2s |
| V1.4 | Sign-up creates profile + circle membership | Sign up a NEW user (e.g. test2@test.local) | Profile row exists in `profiles`, row exists in `circle_members` |
| V1.5 | Phone constraint allows multiple email users | After V1.4, sign up test3@test.local | No UNIQUE violation, profile created successfully |
| V1.6 | Onboarding flow is sequential | Walk through welcome → invite → signup → profile setup → circle preview | Each screen appears in order, no skipped steps |
| V1.7 | Sign-out redirects | Sign out from Profile tab | Returns to Welcome screen |
| V1.8 | TypeScript compiles clean | `npx tsc --noEmit` in `app/` | Zero errors |
| V1.9 | No console errors during flows | Check Metro console during all above flows | No red errors, no unhandled promise rejections |

**Gate verdict:** If any check fails → HOLD. Report the specific failure to Dwight. Do NOT report Phase 1 complete to Nasser.

---

## Phase 2: Major Issues — Make the App Reliable

**Goal:** Data loads correctly with proper error handling. No infinite spinners. Navigation routes are unambiguous. Form toggles actually persist. No silent query failures.

**Branch:** `fix/remediation-phase-2` (branched from `main` after Phase 1 merge)

### Task 2.1: Replace `useMemo` with `useEffect` for data loading on all 7 screens (M1)

**Issue:** Seven screens use `useMemo(() => { loadData(); }, [])` to trigger data-loading side effects. `useMemo` is for computing derived values, not side effects. React may call the memo function multiple times (e.g., during concurrent rendering), leading to duplicate API calls, no cleanup, and unreliable execution.

**Assignee:** Zizo (frontend)
**Complexity:** M (mechanical change across 7 files, but must verify each)

**Dependencies:** None (can start immediately after Phase 1 merge)

**Fix approach:**
For each of the 7 files, replace the `useMemo(() => { loadData(); }, [])` pattern with `useEffect(() => { loadData(); }, [loadData])`.

The `loadData` function is already wrapped in `useCallback` with the correct dependency array on most screens, so passing it to `useEffect`'s dependency array is correct.

**Files to modify (7 files):**

| File | Line | Current | Replace with |
|------|------|---------|--------------|
| `app/(tabs)/index.tsx` | 48 | `useMemo(() => { loadData(); }, [])` | `useEffect(() => { loadData(); }, [loadData])` |
| `app/(tabs)/circle.tsx` | 43 | `useMemo(() => { loadData(); }, [])` | `useEffect(() => { loadData(); }, [loadData])` |
| `app/(tabs)/wishlist.tsx` | 45 | `useMemo(() => { loadData(); }, [])` | `useEffect(() => { loadData(); }, [loadData])` |
| `app/(tabs)/activity.tsx` | 53 | `useMemo(() => { loadData(); }, [])` | `useEffect(() => { loadData(); }, [loadData])` |
| `app/item/[id].tsx` | 62-64 | `useMemo(() => { loadData(); }, [])` | `useEffect(() => { loadData(); }, [loadData])` |
| `app/profile.tsx` | 43-49 | `useMemo(() => { ... }, [user?.id])` | `useEffect(() => { ... }, [user?.id])` |
| `app/borrow/active.tsx` | 41-43 | `useMemo(() => { loadData(); }, [])` | `useEffect(() => { loadData(); }, [loadData])` |

**Also:** Add `useEffect` to the imports if not already imported. Most files import `useMemo` but not `useEffect`.

**Pitfall:** On `app/profile.tsx`, the `useMemo` block (lines 43-49) contains inline async calls (`.then()` chains), not a `useCallback`-wrapped function. Convert to a proper `useCallback` + `useEffect` pattern or inline the calls in a `useEffect` body.

---

### Task 2.2: Add error handling to all data-loading screens (M2)

**Issue:** All 7 screens — if a Supabase call fails (network error, RLS denial, etc.), `setLoading(false)` is never reached because there's no `try/catch`. The screen shows a loading spinner forever.

**Assignee:** Zizo (frontend) + Sonny (backend — verify error shapes from Supabase)
**Complexity:** M

**Dependencies:** Task 2.1 (do the `useEffect` conversion first, then add error handling in the same pass)

**Fix approach:**
For each of the 7 screens:

1. Add an `error` state: `const [error, setError] = useState<string | null>(null);`
2. Wrap the `loadData` body in `try/catch`:
   ```tsx
   const loadData = useCallback(async () => {
     if (!user?.id) { setLoading(false); return; }
     try {
       setError(null);
       // ... existing fetch calls ...
     } catch (e: any) {
       console.error('[screen-name] loadData error:', e);
       setError(e?.message ?? 'Something went wrong. Pull to retry.');
     } finally {
       setLoading(false);
       setRefreshing(false);
     }
   }, [user?.id]);
   ```
3. Add an error UI state — when `error` is non-null and not loading, show a simple error card with a retry button (call `loadData` again). Reuse the existing `EmptyState` component or add inline error UI.
4. Ensure `setLoading(false)` is in the `finally` block so it always executes.

**Files to modify (7 files):** Same list as Task 2.1.

**Pitfall:** Some screens call multiple Supabase functions with `Promise.all`. If any one fails, the whole `Promise.all` rejects. That's fine — the catch block handles it. But make sure partial data isn't set. Use `const [itemsData, insightsData] = await Promise.all([...])` inside the try — if it throws, neither `setItems` nor `setInsights` is called.

---

### Task 2.3: Resolve profile route conflict (M3)

**Issue:** `/profile` exists as both:
- `app/profile.tsx` (standalone route, registered as `<Stack.Screen name="profile" />` in root layout)
- `app/(tabs)/profile.tsx` (tab route, re-exports `../profile`)

Expo Router cannot resolve which route `/profile` refers to. Navigation may be inconsistent.

**Assignee:** Nigel (architect) + Zizo (frontend, implementation)
**Complexity:** S

**Dependencies:** None

**Fix approach:**
1. **Nigel decides:** The profile should live ONLY in the tab bar. There's no need for a standalone `/profile` route — profile is always accessed via the Profile tab.
2. **Zizo implements:**
   - Move the profile screen content from `app/profile.tsx` into `app/(tabs)/profile.tsx` (replace the re-export with the actual component).
   - Delete `app/profile.tsx`.
   - Remove `<Stack.Screen name="profile" />` from `app/_layout.tsx` line 39.
   - Update any navigation calls that push to `/profile` — they should push to `/(tabs)/profile` instead (or just use the tab navigator). Search the codebase for `router.push('/profile')` or `router.replace('/profile')` and update.
3. Verify: Profile tab works. No "ambiguous route" warnings in Metro console.

**Files to modify:**
- `app/(tabs)/profile.tsx` (replace re-export with actual profile screen component)
- `app/profile.tsx` (DELETE this file)
- `app/_layout.tsx` (remove line 39: `<Stack.Screen name="profile" />`)

**Pitfall:** The C5 fix (Task 1.5) modifies `app/profile.tsx`. If Phase 2 runs after Phase 1, the C5 fix is in `app/profile.tsx` which is being deleted. Make sure the sign-out fix moves to `app/(tabs)/profile.tsx` along with the rest of the component. Alternatively, do this route consolidation as part of Phase 1. **Dwight's call:** Do the route consolidation in Phase 2 — Phase 1 fixes the sign-out logic, Phase 2 moves the file. The logic travels with the file.

---

### Task 2.4: Fix borrow flow — don't create borrow before showing request screen, pass itemId (M4)

**Issue:** `app/item/[id].tsx` lines 80-91 — `handleRequestBorrow` calls `await requestBorrow(...)` (creating the borrow transaction immediately), THEN navigates to `/borrow/request` without passing `itemId`. The request screen (`app/borrow/request.tsx` line 20) reads `itemId` from `useLocalSearchParams` but receives nothing → returns early at line 25. The borrow is created twice (once in item detail, once would-be in request screen), and the user sees a broken request screen.

**Assignee:** Zizo (frontend)
**Complexity:** M

**Dependencies:** None

**Fix approach:**
1. In `app/item/[id].tsx` `handleRequestBorrow` (lines 80-91):
   - Remove the `await requestBorrow(...)` call. The item detail screen should NOT create the borrow.
   - Instead, navigate to the request screen with the itemId: `router.push({ pathname: '/borrow/request', params: { itemId: item.id } })`.
   - The request screen already has the logic to fetch the item and call `requestBorrow` (lines 28-41). It just needs the `itemId` param, which we're now passing.
2. In `app/borrow/request.tsx`:
   - After successful `requestBorrow` (line 42), navigate to `/borrow/active` or back to the item detail with a success state. Currently it just calls `router.back()` (line 48) which is acceptable but could show a confirmation.
   - Add error feedback: if `requestBorrow` fails, show an Alert (currently the catch block at line 43 just calls `hapticError()` silently).
3. Verify: Item detail → "Request to Borrow" → request screen shows with note field → "Send Request" → borrow created → returns to item detail or active borrows.

**Files to modify:**
- `app/item/[id].tsx` (lines 80-91: remove requestBorrow call, add router.push with itemId param)
- `app/borrow/request.tsx` (lines 43-48: add error alert, consider success navigation)

---

### Task 2.5: Wire privacy/lendable toggles in Manual Add Item form (M5)

**Issue:** `app/add/manual.tsx` lines 51-52 — `isPrivate` and `isLendable` state exist. Lines 137-154 — toggles are in the UI. But lines 75-82 — the `createItem()` call doesn't pass `is_private` or `is_lendable`. They default to whatever the database defaults are.

**Assignee:** Zizo (frontend)
**Complexity:** S

**Dependencies:** None

**Fix approach:**
1. In `app/add/manual.tsx` `handleSave` (lines 75-82), add the two fields to the `createItem` payload:
   ```tsx
   await createItem({
     owner_id: user.id, circle_id: circleId,
     brand: brand.trim(), model_name: modelName.trim() || null,
     category, color: color.trim() || null, condition, status: 'available',
     estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
     currency: 'AED', notes: notes.trim() || null,
     primary_image_url: photoUri,
     is_private: isPrivate,      // ADD
     is_lendable: isLendable,     // ADD
   });
   ```
2. Verify: Add an item with "Private" toggle ON → check Supabase that `is_private = true` in the `items` table. Add another with "Lendable" OFF → check `is_lendable = false`.

**Files to modify:**
- `app/add/manual.tsx` (lines 75-82: add `is_private` and `is_lendable` to createItem call)

**Pitfall:** Verify that `createItem` in `src/lib/items.ts` accepts and passes these fields. If the function signature doesn't include them, Sonny must update it. Dwight to verify `src/lib/items.ts` before assigning — if the type already includes them (likely, since the schema has the columns), this is purely a frontend fix.

---

### Task 2.6: Wire privacy toggle in Wishlist AddModal (M6)

**Issue:** `app/(tabs)/wishlist.tsx` line 119 — `isPrivate` state exists. Line 136 — privacy toggle is in the UI. But line 123 — `createWishlistItem()` call doesn't pass `isPrivate`.

**Assignee:** Zizo (frontend)
**Complexity:** S

**Dependencies:** None

**Fix approach:**
1. In `app/(tabs)/wishlist.tsx` `handleSubmit` (lines 120-126), add `is_private` to the `createWishlistItem` call:
   ```tsx
   await createWishlistItem({
     userId: user.id,
     brand: brand.trim(),
     model_name: model.trim() || null,
     target_price: targetPrice ? parseFloat(targetPrice) : null,
     notes: notes.trim() || null,
     is_private: isPrivate,  // ADD
   });
   ```
2. Verify: Add a wishlist item with "Private" ON → check Supabase that the row has `is_private = true`. Add one with it OFF → `is_private = false`.

**Files to modify:**
- `app/(tabs)/wishlist.tsx` (line 123: add `is_private: isPrivate` to createWishlistItem call)

**Pitfall:** Same as M5 — verify `createWishlistItem` in `src/lib/wishlist.ts` accepts `is_private`. If not, Sonny updates the function.

---

### Task 2.7: Replace fragile FK relationship names in circle-preview with explicit queries (M7)

**Issue:** `app/(auth)/circle-preview.tsx` lines 37 and 50 — uses PostgREST embedded resource syntax with explicit FK constraint names: `circles!circle_members_circle_id_fkey(name)` and `profiles!circle_members_user_id_fkey(id, display_name, avatar_url)`. If the FK constraint name in the database doesn't exactly match, the query fails silently (PostgREST returns an error, but the `try/catch` only logs a warning — line 66 — and the screen shows "Your Circle" with no members).

The same pattern appears in `src/lib/invite.ts` line 39: `profiles!circle_members_user_id_fkey(id, display_name, avatar_url)`.

**Assignee:** Nigel (architect — decide approach) + Zizo (frontend — implement)
**Complexity:** M

**Dependencies:** None

**Fix approach — two options, Nigel decides:**

**Option A (recommended — use table-name-only FK hint):**
PostgREST supports specifying just the table name without the constraint name: `circles(name)` instead of `circles!circle_members_circle_id_fkey(name)`. This works when there's only one FK between the two tables, which is the case here.

1. In `app/(auth)/circle-preview.tsx`:
   - Line 37: Change `circles!circle_members_circle_id_fkey(name)` to `circles(name)`.
   - Line 50: Change `profiles!circle_members_user_id_fkey(id, display_name, avatar_url)` to `profiles(id, display_name, avatar_url)`.
2. In `src/lib/invite.ts`:
   - Line 39: Change `profiles!circle_members_user_id_fkey(id, display_name, avatar_url)` to `profiles(id, display_name, avatar_url)`.

**Option B (alternative — explicit two-step queries):**
Instead of embedded joins, fetch `circle_members` first, then fetch `circles` and `profiles` separately. More queries but zero FK-name dependency.

1. Fetch the user's `circle_id` from `circle_members`.
2. Fetch the circle name from `circles` by ID.
3. Fetch members from `circle_members` by `circle_id`.
4. Fetch profiles by member `user_id`s.

**Recommendation:** Option A. Simpler, fewer round-trips, and the table-name-only hint is stable.

**Files to modify:**
- `app/(auth)/circle-preview.tsx` (lines 37, 50: simplify FK hints)
- `src/lib/invite.ts` (line 39: simplify FK hint)

---

### Phase 2 Acceptance Criteria

1. **No infinite spinners:** If Supabase is stopped or a query fails, every screen shows an error state with a retry option — not a perpetual loading spinner.
2. **Data loads once:** Each screen's `loadData` fires exactly once on mount (verified via console logs or network tab). No duplicate API calls from `useMemo` re-execution.
3. **Profile route is unambiguous:** Navigating to profile always goes to the tab. No Expo Router warnings about ambiguous routes.
4. **Borrow flow is correct:** Item detail → "Request to Borrow" → request screen with note field → "Send Request" → one borrow transaction created (not two). Item detail does NOT create a borrow.
5. **Form toggles persist:** Add Item with "Private" ON → item is private in DB. Add Item with "Lendable" OFF → item is not lendable in DB. Same for Wishlist privacy toggle.
6. **Circle preview loads:** Circle preview screen shows actual circle name and member avatars (not "Your Circle" with empty members).

### Phase 2 Verification Gate (Vlad must check before reporting to Nasser)

| # | Check | Method | PASS condition |
|---|-------|--------|----------------|
| V2.1 | Data loads on all 7 screens | Navigate to each tab + item detail + borrow active + profile | Content appears within 3s, no perpetual spinner |
| V2.2 | Error state on failure | Stop Supabase (`supabase stop`), navigate to each screen | Error message appears, not infinite spinner. Restart Supabase, pull-to-refresh → data loads |
| V2.3 | No duplicate API calls | Open Metro console, navigate to Home tab | `getMyItems` and `getCollectionInsights` called exactly once |
| V2.4 | Profile route resolves | Tap Profile tab | Profile screen shows, no route ambiguity warning in console |
| V2.5 | Borrow flow creates one transaction | Item detail → Request to Borrow → Send Request → check `borrow_transactions` table | Exactly 1 row created per request, with correct `item_id`, `borrower_id`, `lender_id` |
| V2.6 | Privacy toggle persists on items | Add item with Private=ON, then check DB | `is_private = true` in `items` table |
| V2.7 | Lendable toggle persists on items | Add item with Lendable=OFF, then check DB | `is_lendable = false` in `items` table |
| V2.8 | Privacy toggle persists on wishlist | Add wishlist item with Private=ON, then check DB | `is_private = true` in `wishlist_items` table |
| V2.9 | Circle preview shows real data | Navigate to circle-preview (via onboarding or directly) | Shows actual circle name and member list, not defaults |
| V2.10 | TypeScript compiles clean | `npx tsc --noEmit` in `app/` | Zero errors |
| V2.11 | No console errors | Check Metro console during all Phase 2 flows | No red errors, no unhandled rejections |

**Gate verdict:** If any check fails → HOLD. Report specific failure to Dwight. Do NOT report Phase 2 complete to Nasser.

---

## Phase 3: Minor Issues — Polish and Honesty

**Goal:** Wire what's feasible. Label the rest honestly as "Coming Soon" instead of silently doing nothing. No dead buttons.

**Branch:** `fix/remediation-phase-3` (branched from `main` after Phase 2 merge)

### Task 3.1: Wire or label no-op buttons and placeholders (m1-m11)

**Assignee:** Zizo (frontend) + Sonny (backend for any new API functions)
**Complexity:** M (many small changes, but each is straightforward)

**Dependencies:** Phase 2 complete (screens must be loading data before polishing UI)

**Approach:** For each minor issue, either implement the feature (if small) or replace the no-op with an honest "Coming Soon" label/alert. The goal is: no button does nothing silently.

| Issue | Location | Fix | Complexity |
|-------|----------|-----|------------|
| m1 | `app/profile.tsx` lines 53-54 | Replace hardcoded `Items Lent = 1, Borrow Streak = 3` with real data from `getCollectionInsights()` (already has `itemsLent`) or a new count query | S |
| m2 | Wishlist "Who Wore It Best" | If the voting UI exists, either persist votes to a new table (Sonny) or label as "Coming Soon" (Zizo). Dwight's call: label as Coming Soon — voting is a Phase 4 feature. | S |
| m3 | `app/(tabs)/wishlist.tsx` lines 88-89 | "Drop Hint" and "Edit" buttons → show Alert "Coming Soon" on tap instead of silent haptic | S |
| m4 | `app/(tabs)/wishlist.tsx` lines 106-107 | Friend "React" and "Comment" → currently local-only. Either persist to a `wishlist_reactions` table (Sonny designs) or label "Coming Soon". Dwight's call: Coming Soon for now. | S |
| m5 | `app/(tabs)/index.tsx` line 111 | "Nudge" button → show Alert "Coming Soon" | S |
| m6 | `app/(tabs)/index.tsx` line 74 | Bell icon → show Alert "Coming Soon" or navigate to Activity tab | S |
| m7 | `nudgeBorrower` function | If exists as a placeholder, either implement (push notification) or remove and label UI as Coming Soon | S |
| m8 | `app/profile.tsx` settings rows | Dark Mode, Notifications, Privacy, Help → show Alert "Coming Soon" on tap | S |
| m9 | Add screen "Photo" and "Link" options | Already show "Coming Soon" — verify this is actually displayed, not just logged | S |
| m10 | `app/add/bulk-import.tsx` | "Process" button just goes back → show Alert "Coming Soon" or implement basic CSV parsing. Dwight's call: Coming Soon. | S |
| m11 | `src/lib/profile.ts` `getCollectionInsights` | "Least used" logic returns oldest available item (sorted by `created_at` ascending, line 190-192). This is wrong — "least used" should be based on borrow history (fewest borrows). Sonny to fix the query to count borrow transactions per item and return the one with the fewest. | M |

**Files to modify:**
- `app/profile.tsx` (or `app/(tabs)/profile.tsx` after M3 consolidation) — m1, m8
- `app/(tabs)/wishlist.tsx` — m2, m3, m4
- `app/(tabs)/index.tsx` — m5, m6
- `app/add/bulk-import.tsx` — m10
- `src/lib/profile.ts` — m11
- Wherever `nudgeBorrower` lives — m7

---

### Phase 3 Acceptance Criteria

1. **No silent no-ops:** Every tappable button either does something real or shows a "Coming Soon" alert. No button silently fires a haptic and does nothing.
2. **Profile stats are real:** "Items Lent" shows the actual count from the database, not hardcoded `1`. "Borrow Streak" either shows real data or is removed/relabeled.
3. **"Least Used" insight is correct:** Returns the item with the fewest borrow transactions, not the oldest item.
4. **"Coming Soon" labels are honest:** Buttons that aren't implemented show a clear alert. The user knows the feature isn't available yet.

### Phase 3 Verification Gate (Vlad must check before reporting to Nasser)

| # | Check | Method | PASS condition |
|---|-------|--------|----------------|
| V3.1 | No silent no-ops | Tap every button on every screen | Every button either does something or shows "Coming Soon" alert |
| V3.2 | Profile stats real | Sign in as sarah@test.local, check Profile tab | "Items Lent" matches actual count in `borrow_transactions` |
| V3.3 | Least Used correct | Check Home screen "Least Used" insight | Shows item with fewest borrows, not oldest item |
| V3.4 | TypeScript compiles | `npx tsc --noEmit` | Zero errors |
| V3.5 | No console errors | Metro console during Phase 3 flows | No red errors |

**Gate verdict:** If any check fails → HOLD. Report specific failure to Dwight. Do NOT report Phase 3 complete to Nasser.

---

## Dependency Graph

```
Phase 1:
  Task 1.1 (auth guard) ──────────────────────┐
  Task 1.2 (login redirect) ──────────────────┤
  Task 1.3 (phone constraint) ────────────────┤
  Task 1.4 (onboarding flow) ─────────────────┤
  Task 1.5 (sign-out fix) ────────────────────┤
                                               ▼
                                    [Phase 1 Verification Gate]
                                               │
Phase 2:                                       ▼
  Task 2.1 (useMemo → useEffect) ──┐
  Task 2.2 (error handling) ───────┤ (2.2 depends on 2.1)
  Task 2.3 (route conflict) ───────┤
  Task 2.4 (borrow flow) ──────────┤
  Task 2.5 (item toggles) ─────────┤
  Task 2.6 (wishlist toggle) ──────┤
  Task 2.7 (FK names) ─────────────┤
                                   ▼
                        [Phase 2 Verification Gate]
                                   │
Phase 3:                           ▼
  Task 3.1 (minor issues batch) ──► [Phase 3 Verification Gate]
```

**Key dependencies:**
- Task 1.2 depends on Task 1.1 (auth guard must exist for redirect target)
- Task 1.4 depends on Task 1.3 (phone constraint fixed before new users sign up) and Task 1.1
- Task 2.2 depends on Task 2.1 (useEffect conversion before error handling)
- Task 2.3 (route consolidation) moves the file that Task 1.5 modified — coordinate
- All Phase 2 tasks are independent of each other (can be parallelized)
- Phase 3 depends on Phase 2 (screens must load data before polishing UI)

---

## Parallelization Opportunities

**Phase 1:**
- Tasks 1.1, 1.3, and 1.5 can run in parallel (no dependencies between them).
- Task 1.2 starts after 1.1.
- Task 1.4 starts after 1.1 and 1.3.

**Phase 2:**
- All 7 tasks are independent and can run in parallel after Phase 1 merges.
- Task 2.2 should be done by the same person doing 2.1 (same files).

**Phase 3:**
- Single batch task. Can be split among Zizo (frontend no-ops) and Sonny (backend m1, m11) in parallel.

---

## DevOps Notes (Mauricio)

1. **Branch creation:** Create `fix/remediation-phase-1`, `fix/remediation-phase-2`, `fix/remediation-phase-3` from `main`.
2. **PR + merge:** After each phase passes Vlad's verification gate, open PR → `git merge --admin` (branch protection prevents direct merge).
3. **Supabase reset:** After Task 1.3 (migration 0006), run `supabase db reset` then re-seed. Vlad must verify seed data is intact before testing.
4. **Metro restart:** After merging each phase, restart Metro to clear cache: `npx expo start --clear` (port 8081).
5. **Local Supabase:** Ensure `http://192.168.1.101:54321` is running and accessible before each testing session.

---

## What Not to Repeat

This audit exists because the previous build phase produced a UI shell without functional wiring. To prevent recurrence:

1. **Every navigation call must be tested on-device.** "The button exists" is not "the button works."
2. **Every Supabase call must have error handling.** No bare `await` without try/catch in a screen component.
3. **Side effects go in `useEffect`, not `useMemo`.** This is a React rule, not a preference.
4. **Schema constraints must be tested with multiple users.** A single-user test won't catch UNIQUE constraint violations.
5. **Onboarding flows must be walked end-to-end.** Each screen must transition to the next with real data.
6. **No function is "done" until Vlad's verification gate passes.** "It compiles" is not done. "It works on device" is done.

---

## Sign-off

| Role | Name | Status |
|------|------|--------|
| Dev Lead | Dwight | ✅ Author |
| QA | Vlad | ⏳ Pending review |
| Product | Nasser | ⏳ Pending approval |

**This plan does not execute until Nasser approves.**
