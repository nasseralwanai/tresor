# Trésor — End-to-End User Flow QA Report

**QA Lead:** Vlad  
**Date:** August 8, 2026  
**Scope:** Trace every critical user flow from button → function → API → DB → render → navigation  
**Method:** Static code analysis + live DB schema inspection (no device testing)  
**Verdict:** 3 blockers, 2 broken flows, 3 stubs, 2 working flows

---

## Executive Summary

| Flow | Status | Severity |
|------|--------|----------|
| 1. Onboarding | 🔴 BROKEN — phone path skips invite code entirely | **BLOCKER** |
| 2. Home tab | 🟡 WORKS with issues — loads data, but Add button navigates to wrong screen | **MAJOR** |
| 3. Add item | 🟡 WORKS — form submits to Supabase, but item status never updates to 'borrowed' | **MINOR** |
| 4. Borrow flow | 🟢 WORKS — full lifecycle functional (with caveats) | OK |
| 5. Circle feed | 🟡 WORKS with stubs — loads real data, nudge/comment are stubs | **MINOR** |

**Key findings:**
- The phone-OTP onboarding path **bypasses invite code entirely**, routing phone-otp → profile-setup → circle-preview without ever showing invite-code.tsx. Users joining via phone will never join a circle.
- The Home screen's bell/Add icon navigates to `/(tabs)/activity` instead of the Add screen.
- The `nudgeBorrower()` function in `lib/borrow.ts` is a **silent no-op** (line 279), but the `NudgeButton` component uses a **different, working implementation** from `lib/nudge.ts`. Two conflicting implementations exist.
- Items with active borrows show `status = 'available'` in the DB — the `update_custodian_on_borrow` trigger updates `current_custodian_id` but never updates `items.status` to `'borrowed'`.

---

## Flow 1: Onboarding

**Status: 🔴 BROKEN — BLOCKER**

### 1a. Welcome → Phone-OTP routing
- **File:** `app/(auth)/welcome.tsx`, line 87
- **Code:** `onPress={() => router.push('/(auth)/phone-otp')}`
- **Verdict:** ✅ WORKS — welcome correctly routes to phone-otp. (Previously broken, now fixed.)

### 1b. Phone-OTP → auth call
- **File:** `app/(auth)/phone-otp.tsx`, line 156
- **Code:** `await signInWithPhone(buildE164(phoneLocal));`
- **File:** `src/context/AuthContext.tsx`, lines 135-141
- **Code:** `const { error } = await supabase.auth.signInWithOtp({ phone });`
- **Verdict:** ✅ WORKS — phone-otp calls `supabase.auth.signInWithOtp({ phone })` via the `signInWithPhone` context method. This is a real Supabase call, not a stub.

**⚠️ CAVEAT:** The AuthContext JSDoc comment (lines 44-50) says `signInWithPhone` is "a no-op stub" and `verifyOtp` "always returns true" — but the actual implementation (lines 135-155) makes real Supabase calls. The comments are stale/misleading. The code itself works.

**⚠️ LOCAL DEV ISSUE:** Supabase local dev uses email auth for seed users (all 6 users have emails like `sarah@test.local`, no phone numbers in auth.users). Phone OTP requires Twilio SMS provider configured in Supabase. The seed data phones (`+971****1111` etc.) are in the `profiles` table but NOT in `auth.users`. Phone OTP will likely fail in local dev without Twilio.

### 1c. Phone-OTP → invite-code → profile-setup (THE BLOCKER)
- **File:** `app/(auth)/phone-otp.tsx`, lines 182-186
- **Code:**
  ```typescript
  router.replace({
    pathname: '/(auth)/profile-setup',
    params: circleId ? { circleId } : {},
  });
  ```
- **Verdict:** 🔴 **BROKEN — BLOCKER**

**The problem:** After OTP verification, phone-otp.tsx routes **directly to profile-setup**, completely skipping the invite-code screen. The `circleId` param is only passed if it was already present (it won't be — nothing passes it to phone-otp from welcome).

**The intended flow** (per `app/(auth)/_layout.tsx` comment, lines 5-6):
```
Welcome → Phone-OTP → [Invite Code] → Profile Setup → Circle Preview → App
```

**The actual flow:**
```
Welcome → Phone-OTP → Profile Setup → Circle Preview → App
                          ↑ (skips invite-code entirely)
```

**Consequence:** A new user authenticating via phone will:
1. ✅ Verify their phone
2. ❌ Never see the invite code screen
3. ✅ Create a profile
4. ❌ Never join a circle (because `circleId` is undefined, so `joinCircle()` at profile-setup.tsx line 101 is skipped)
5. ✅ See circle-preview (but with empty circle data — "Your Circle" with no members)
6. ✅ Enter the app — but with no circle membership, so home shows empty collection, activity feed won't load, etc.

**Fix needed:** phone-otp.tsx should route to `/(auth)/invite-code` after OTP verification, not `/(auth)/profile-setup`. Only the invite-code screen should route to profile-setup (passing the validated `circleId`).

### 1d. Invite-code validation (when reached via email path)
- **File:** `app/(auth)/invite-code.tsx`, line 45
- **Code:** `const result = await validateInviteCode(code);`
- **File:** `src/lib/invite.ts`, lines 15-77
- **Verdict:** ✅ WORKS (when the screen is actually shown)

The validation queries `circles` table by `invite_code`. The RLS policy `circles_select_by_invite_code` allows SELECT for any circle where `invite_code IS NOT NULL` — this works for authenticated users. The circle "The Vault" with code `VAULT2026` exists and has `expires_at = 2026-08-14` (still valid as of Aug 8).

**Note:** The invite-code screen is only reachable via the email-signin flow (email-signin → profile-setup doesn't pass circleId either, but the invite-code screen is in the auth stack and can be navigated to). The screen itself works correctly when shown.

### 1e. Profile-setup → create profile + join circle
- **File:** `app/(auth)/profile-setup.tsx`, lines 93-107
- **Code:**
  ```typescript
  await createProfile({ userId, fullName: name.trim(), avatarUrl, phone: user?.phone ?? null });
  if (circleId) {
    try { await joinCircle(circleId, userId); } catch (e) { console.warn(...); }
  }
  ```
- **File:** `src/lib/profile.ts`, lines 21-45 — `createProfile()` upserts to `profiles` table
- **File:** `src/lib/invite.ts`, lines 83-101 — `joinCircle()` inserts into `circle_members`
- **Verdict:** ✅ WORKS — but only if `circleId` is passed (which it won't be via the phone path)

**RLS check:** 
- `profiles_insert_own` policy: `WITH CHECK (id = auth.uid())` — ✅ allows self-insert
- `circle_members_insert_self_or_admin` policy: `WITH CHECK (user_id = auth.uid())` — ✅ allows self-insert

### 1f. Profile-setup → circle-preview → app
- **File:** `app/(auth)/profile-setup.tsx`, line 109
- **Code:** `router.push('/(auth)/circle-preview');`
- **File:** `app/(auth)/circle-preview.tsx`, line 75
- **Code:** `router.replace('/(tabs)');`
- **Verdict:** ✅ WORKS — navigation chain is correct from profile-setup onward.

---

## Flow 2: Home Tab

**Status: 🟡 WORKS with issues**

### 2a. Home screen loads data on mount
- **File:** `app/(tabs)/index.tsx`, lines 104-137
- **Code:** `loadData()` calls `getMyItems(user.id)`, `getCollectionInsights(user.id)`, `getActiveBorrows(user.id)` in parallel, then `getCircleMembers()` and `getActivityFeed()` if `circleId` exists.
- **File:** `src/lib/items.ts`, lines 101-113 — `getMyItems()` queries `items` where `owner_id = userId`
- **Verdict:** ✅ WORKS — loads user's items, insights, borrows, circle members, and activity.

**⚠️ ISSUE:** The home screen only shows **the user's own items** (`getMyItems` filters by `owner_id`). It does NOT show circle members' items. The `getItems(circleId)` function exists but isn't used on the home screen. This may be intentional (personal collection view) but means the home screen is empty for any user who hasn't added items — all 15 seed items are owned by Sarah (11111111).

### 2b. Tap item → see details
- **File:** `app/(tabs)/index.tsx`, line 155
- **Code:** `router.push(\`/item/${item.id}\` as any);`
- **File:** `app/item/[id].tsx` — full detail screen with parallax header, tabs (Details/History/Lending)
- **Verdict:** ✅ WORKS — item detail route exists and renders. Loads item data, borrow history, and active borrow via `getItem()`, `getItemBorrowHistory()`, `getActiveBorrowForItem()`.

### 2c. Nudge borrower button
- **File:** `app/item/[id].tsx`, lines 496-499
- **Code:** `<NudgeButton borrowId={activeBorrow.id} borrowerName={activeBorrow.borrower_name} />`
- **File:** `src/components/NudgeButton.tsx`, lines 81-113
- **Code:** `const result = await nudgeBorrower(borrowId);` (from `src/lib/nudge.ts`)
- **File:** `src/lib/nudge.ts`, lines 63-91 — calls `supabase.rpc('nudge_borrower', { _borrow_id, _lender_id })`
- **DB:** `nudge_borrower(uuid, uuid)` RPC function exists ✅
- **Verdict:** ✅ WORKS — the NudgeButton in item detail uses the real `lib/nudge.ts` implementation which calls the `nudge_borrower` RPC.

**⚠️ CONFLICT:** There are TWO `nudgeBorrower` functions:
1. `src/lib/borrow.ts` line 279 — **STUB** (silent no-op, `TODO(phase3)`)
2. `src/lib/nudge.ts` line 63 — **REAL** (calls `nudge_borrower` RPC)

The NudgeButton component correctly imports from `lib/nudge.ts`. The stub in `lib/borrow.ts` is dead code but confusing.

### 2d. Home screen Add/bell button — WRONG NAVIGATION
- **File:** `app/(tabs)/index.tsx`, lines 158-161
- **Code:**
  ```typescript
  const handleAddItem = useCallback(() => {
    hapticLight();
    router.push('/(tabs)/activity' as any);  // ← WRONG: goes to activity, not add
  }, []);
  ```
- **Verdict:** 🔴 **BUG** — The bell icon in the home header navigates to the Activity tab, not the Add screen. The function is named `handleAddItem` and the accessibility label says "View activity feed", which is also confusing. The actual Add tab is in the bottom tab bar and works correctly.

---

## Flow 3: Add Item

**Status: 🟡 WORKS**

### 3a. Add tab → options screen
- **File:** `app/(tabs)/add/index.tsx` — shows 4 options: Photo, Link, Manual, Bulk Import
- **Verdict:** ✅ WORKS — Photo and Link show "Coming Soon" alerts. Manual routes to `/add/manual`. Bulk Import routes to `/add/bulk-import`.

### 3b. Manual entry form → Supabase
- **File:** `app/add/manual.tsx`, lines 252-263
- **Code:**
  ```typescript
  await createItem({
    owner_id: user.id, circle_id: circleId,
    brand: brand.trim(), model_name: modelName.trim() || null,
    category, color: color.trim() || null, condition, status: 'available',
    estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
    currency: 'AED', notes: notes.trim() || null,
    primary_image_url: photoUri,
    is_private: isPrivate, is_lendable: isLendable,
  });
  ```
- **File:** `src/lib/items.ts`, lines 60-71 — `createItem()` inserts into `items` table
- **Verdict:** ✅ WORKS — form submits to Supabase `items` table with all required fields.

**RLS check:** `items_owner_all` policy: `USING (owner_id = auth.uid())` `WITH CHECK (owner_id = auth.uid())` — ✅ allows self-insert.

### 3c. New item appears in collection after adding
- **File:** `app/add/manual.tsx`, line 265 — `router.back()` after save
- **File:** `app/(tabs)/index.tsx` — home screen calls `loadData()` on mount via `useEffect`
- **Verdict:** 🟡 PARTIALLY WORKS — `router.back()` returns to the previous screen (the Add tab). But the home screen's `loadData()` only runs on mount/refresh, so the new item won't appear until the user pulls to refresh or re-enters the Home tab. There's no `useFocusEffect` to reload data when the tab regains focus.

**⚠️ ISSUE:** The `circle_id` is set from `useCircleId()` hook. If the user hasn't joined a circle (see Flow 1 blocker), `circleId` will be `null` and the item won't be associated with any circle, making it invisible to circle feed queries.

---

## Flow 4: Borrow Flow

**Status: 🟢 WORKS (with caveats)**

### 4a. Request to borrow
- **File:** `app/item/[id].tsx`, line 112 — `router.push({ pathname: '/borrow/request', params: { itemId: item.id } })`
- **File:** `app/borrow/request.tsx`, lines 29-41 — fetches item, calls `requestBorrow()`
- **File:** `src/lib/borrow.ts`, lines 30-66 — inserts into `borrow_transactions` with `status: 'requested'`
- **DB trigger:** `trg_borrow_insert_activity` creates activity entry ✅
- **RLS:** `borrow_insert_borrower` policy: `WITH CHECK (borrower_id = auth.uid())` ✅
- **Verdict:** ✅ WORKS

### 4b. Approve/Decline borrow request
- **File:** `app/borrow/active.tsx`, lines 75-101
- **Code:** `acceptBorrow(borrowId)` → updates status to `'active'`, sets `approved_at` and `borrowed_at`
- **File:** `src/lib/borrow.ts`, lines 71-97
- **DB trigger:** `validate_borrow_status_transition` allows `requested → active` ✅
- **DB trigger:** `update_custodian_on_borrow` sets `current_custodian_id = borrower_id` when status becomes `active` ✅
- **DB trigger:** `trg_borrow_update_activity` creates activity entry ✅
- **RLS:** `borrow_update_parties` policy: borrower or lender can update ✅
- **Verdict:** ✅ WORKS

### 4c. Mark returned
- **File:** `app/borrow/active.tsx`, lines 103-115 — `markReturned(borrowId)` 
- **File:** `src/lib/borrow.ts`, lines 103-128 — updates status to `'returned_pending'`, sets `returned_at`
- **DB trigger:** `validate_borrow_status_transition` allows `active → returned_pending` ✅
- **DB trigger:** `update_custodian_on_borrow` sets `current_custodian_id = lender_id` ✅
- **Verdict:** ✅ WORKS

### 4d. Confirm received
- **File:** `app/borrow/active.tsx`, lines 117-129 — `confirmReceived(borrowId)`
- **File:** `src/lib/borrow.ts`, lines 134-159 — updates status to `'completed'`, sets `completed_at`
- **DB trigger:** `validate_borrow_status_transition` allows `returned_pending → completed` ✅
- **Verdict:** ✅ WORKS

### 4e. Nudge in active borrows screen — STUB
- **File:** `app/borrow/active.tsx`, lines 131-134
- **Code:**
  ```typescript
  const handleNudge = async (_borrowId: string) => {
    hapticLight();
    Alert.alert('Coming Soon', 'Push notifications for nudges will be available in a future update.', [{ text: 'OK' }]);
  };
  ```
- **Verdict:** 🟡 **STUB** — The nudge button in the active borrows list shows a "Coming Soon" alert. This conflicts with the NudgeButton component in the item detail screen which actually calls the `nudge_borrower` RPC. Two different behaviors for the same feature depending on which screen you're on.

### 4f. Item status never updates to 'borrowed'
- **DB finding:** Items with active borrows still show `status = 'available'`:
  ```
  Cartier item: status = available, but has active borrow (borrower: Mona)
  Van Cleef item: status = available, but has active borrow (borrower: Layla)
  ```
- **Root cause:** The `update_custodian_on_borrow` trigger only updates `current_custodian_id`, NOT `items.status`. No trigger or application code sets `items.status = 'borrowed'` when a borrow becomes active.
- **Consequence:** The home screen's "Currently Shared" section filters borrows by `status === 'active'` (line 254), so it works. But the item detail screen shows "Available" badge (line 199) even when the item is actively borrowed. The `getCollectionInsights` function counts `itemsLent` by checking `item.status === 'borrowed'` (profile.ts line 178) — this will always return 0.
- **Verdict:** 🔴 **BUG** — Item status is never updated to 'borrowed' during active borrows.

---

## Flow 5: Circle Feed / Activity Tab

**Status: 🟡 WORKS with stubs**

### 5a. Activity tab loads real data
- **File:** `app/(tabs)/activity.tsx`, lines 57-73
- **Code:** `getFeedData(circleId, user.id)` fetches items, activities, wishlists, borrows, and members
- **File:** `src/lib/feed.ts`, lines 86-115 — parallel queries to `getItems()`, `getActivityFeed()`, `getCircleWishlists()`, circle borrows, and circle members
- **RLS:** `activity_feed_circle_members_select` policy: `USING (is_circle_member(circle_id))` ✅
- **Verdict:** ✅ WORKS — loads real data from the DB.

**⚠️ ISSUE:** Requires `circleId` from `useCircleId()` hook. If user has no circle membership (see Flow 1 blocker), `loadData()` returns early (line 58-60) and the screen shows nothing.

### 5b. Filter pills
- **File:** `app/(tabs)/activity.tsx`, lines 89-91, 98-128
- **Code:** `handleFilterChange()` sets `activeFilter`, `filteredActivities` useMemo filters by type
- **Verdict:** ✅ WORKS — filters by All/Borrows/Items/Wishlists/Shares, controls section visibility.

### 5c. Comments — STUB
- **File:** `app/(tabs)/activity.tsx`, line 254
- **Code:** `<CommentSheet share={commentShare} onDismiss={handleDismissComment} />`
- **File:** `src/lib/feed.ts`, lines 202-240 — `buildShareCards()` creates share cards with `comments: []` (hardcoded empty array)
- **Verdict:** 🟡 **STUB** — Share cards always have empty comments. The `CommentSheet` component opens but there's no backend for posting/loading comments. `likeCount`, `saveCount`, `verifiedCount`, `starCount` are all hardcoded to 0.

### 5d. "Who Wore It Best" voting — STUB
- **File:** `src/lib/feed.ts`, lines 243-255 — `buildVoteCandidates()` creates candidates with `voteCount: 0`
- **Verdict:** 🟡 **STUB** — Vote candidates are shown but `voteCount` is always 0. No voting backend exists.

---

## DB Schema Verification

### items table
- ✅ Schema matches code expectations (owner_id, circle_id, brand, status, is_private, is_lendable, etc.)
- ✅ RLS policies allow owner full access, circle members SELECT on non-private items
- ✅ `createItem()` insert fields match the table columns
- 🔴 No trigger updates `items.status` to `'borrowed'` when a borrow becomes active

### borrow_transactions table
- ✅ Schema matches code (item_id, borrower_id, lender_id, circle_id, status, notes, timestamps)
- ✅ `borrow_status` enum: requested, approved, active, returned_pending, completed, declined, cancelled
- ✅ `validate_borrow_status_transition` trigger enforces valid transitions
- ✅ RLS allows borrower insert, parties can read/update
- ✅ `nudge_count` and `last_nudged_at` columns exist for nudge rate-limiting

### circle_members table
- ✅ Schema: id, circle_id, user_id, role, joined_at
- ✅ Unique constraint on (circle_id, user_id) — prevents duplicate joins
- ✅ RLS allows self-insert and self-delete, circle members can SELECT
- ✅ Triggers create activity entries on join/leave

### circles table
- ✅ Schema: id, name, description, invite_code, created_by, expires_at
- ✅ RLS: `circles_select_by_invite_code` allows SELECT for any circle with invite_code (works for validation)
- ✅ `circles_select_members` allows SELECT for circle members
- ⚠️ `expires_at` for "The Vault" is `2026-08-14` — will expire in 6 days

### profiles table
- ✅ Schema: id, phone, display_name, avatar_url, push_token, bio, created_at
- ✅ RLS: self-insert, self-update, SELECT for self or circle members
- ✅ `createProfile()` upsert maps `fullName` → `display_name` correctly

### activity_feed table
- ✅ Schema: id, circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata, created_at
- ✅ RLS: circle members can SELECT, users can INSERT own entries
- ✅ Triggers auto-create entries on item insert, borrow insert, and borrow status changes

### nudge_borrower RPC
- ✅ Function exists: `nudge_borrower(_borrow_id uuid, _lender_id uuid) RETURNS jsonb`
- ✅ Called correctly by `src/lib/nudge.ts` line 73
- ✅ Returns structured result with success/error/push data

---

## Summary of Issues by Priority

### 🔴 BLOCKERS (must fix before user opens app)

1. **Onboarding phone path skips invite-code**  
   `app/(auth)/phone-otp.tsx:183` routes to `/(auth)/profile-setup` instead of `/(auth)/invite-code`. Users joining via phone will never join a circle, making the entire app useless for them (empty collection, no activity, no circle data).

### 🟠 MAJOR (broken functionality)

2. **Item status never updates to 'borrowed'**  
   No trigger or code sets `items.status = 'borrowed'` when a borrow becomes active. Item detail shows "Available" badge for actively borrowed items. `getCollectionInsights().itemsLent` always returns 0.

3. **Home screen Add button navigates to Activity**  
   `app/(tabs)/index.tsx:160` — `handleAddItem` routes to `/(tabs)/activity` instead of Add screen.

### 🟡 MINOR (stubs and incomplete features)

4. **Nudge in active borrows list is a stub**  
   `app/borrow/active.tsx:131-134` shows "Coming Soon" alert. Conflicts with the working NudgeButton in item detail.

5. **Dead `nudgeBorrower` stub in `lib/borrow.ts`**  
   `src/lib/borrow.ts:279` is a no-op. The real implementation is in `src/lib/nudge.ts`. Confusing dual implementation.

6. **Comments, likes, and voting are stubs**  
   `src/lib/feed.ts` hardcodes `comments: []`, `likeCount: 0`, `voteCount: 0`. No backend for social interactions.

7. **Home screen doesn't refresh on tab focus**  
   After adding an item, the new item won't appear on Home until manual pull-to-refresh. No `useFocusEffect`.

8. **Stale AuthContext comments**  
   `src/context/AuthContext.tsx:44-50` claims `signInWithPhone` and `verifyOtp` are stubs, but the implementation makes real Supabase calls.

### ℹ️ NOTES

- Phone OTP requires Twilio configured in Supabase. Local dev uses email auth for all 6 seed users. The `sarah@test.local` / password flow via email-signin works.
- The invite code `VAULT2026` expires on `2026-08-14` — 6 days from now.
- The home screen shows only the user's own items (`getMyItems`), not circle members' items. All 15 seed items are owned by Sarah, so other users see an empty home screen.
- The `circles_select_by_invite_code` RLS policy allows ANY authenticated user to look up ANY circle by invite code — this is by design (needed for validation) but means invite codes are not secret at the DB level.
