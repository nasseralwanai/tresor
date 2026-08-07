# QA Report — Trésor Home Tab + Circle Feed (PRs #31, #32, #33)

**QA Engineer:** Vlad  
**Date:** 2026-08-08  
**Branch reviewed:** `main` (commit `9ae5286`)  
**PRs in scope:** #31 (Home tab rebuild), #32 (Home cleanup), #33 (Circle Feed)  
**Test credentials:** sarah@test.local / password123  
**Supabase:** http://127.0.0.1:54321  

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 Major | 8 |
| 🟡 Minor | 12 |
| **Total** | **22** |

---

## Check Category Results

| Category | Result | Notes |
|----------|--------|-------|
| Unused imports / void hacks | ⚠️ FAIL | 6 files still use `void` hack pattern (PR #32 was supposed to remove these) |
| Missing error handling (Supabase null/empty) | ⚠️ PARTIAL | Some functions handle nulls; many assume data exists |
| Hardcoded values | ⚠️ FAIL | Multiple hardcoded values in feed.ts and index.tsx |
| Navigation bugs | ✅ PASS | Routes look correct |
| Accessibility issues | ⚠️ FAIL | No accessibilityLabel or hitSlop on any tappable element |
| Performance issues | ⚠️ FAIL | Inline functions, missing React.memo, N+1 queries |
| Memory leaks / cleanup | ⚠️ PARTIAL | Missing AbortController/cancellation |
| Race conditions | ⚠️ FAIL | Fire-and-forget Promise in index.tsx |
| Loading states | ✅ PASS | Both screens have skeleton/loading states |
| Empty states | ✅ PASS | Both screens have empty states |
| SQL injection risks | ✅ PASS | No raw string interpolation; all queries use Supabase query builder |
| Supabase error handling (lib) | ✅ PASS | All lib functions throw on error |
| Type safety | ⚠️ PARTIAL | Extensive `as any` casts in lib and components |
| RLS / DB queries | 🔴 FAIL | item_owners RLS recursion breaks items + borrows queries |

---

## 🔴 Critical Bugs

### C1. `item_owners` RLS infinite recursion — breaks ALL items & borrow queries

- **File:** `supabase/migrations/0009_co_ownership.sql`, lines 124–140  
- **Severity:** Critical  
- **Description:** The `item_owners_select_co_owners_or_circle` policy contains a self-referential subquery: `select 1 from public.item_owners io2 where io2.item_id = item_owners.item_id`. PostgreSQL detects this as infinite recursion and returns error `42P17`. Migration 0009 also added `items_co_owner_all` policy on `items` that references `item_owners`, and `borrow_select_co_owners` on `borrow_transactions` that also references `item_owners`. As a result, **every query that touches the `items` table or `borrow_transactions` table fails with a 500 error** — including `getMyItems()`, `getItems()`, `getActiveBorrows()`, `getCollectionInsights()`, `getFeedData()`, and any query with a FK join to items.  
- **DB Test Evidence:** Logged in as sarah@test.local; all items/borrows queries return `{"code":"42P17","message":"infinite recursion detected in policy for relation \"item_owners\""}`. Activity feed, circle_members, and wishlist_items queries work fine (they don't reference item_owners).  
- **Note:** Migration 0009 is from the unmerged `feat/co-ownership-db` branch, not from PRs #31/#32/#33. However, it is applied to the running local Supabase instance, making the app non-functional for testing. A `supabase db reset` (without 0009) would fix the local instance.  
- **Suggested fix:** In the `item_owners_select_co_owners_or_circle` policy, remove the self-referential subquery. Use a SECURITY DEFINER function to check co-ownership without triggering RLS recursion, or restructure the policy to avoid querying `item_owners` from within its own RLS policy.

### C2. `getCollectionInsights()` calls Supabase without awaiting the second query — silent failure

- **File:** `src/lib/profile.ts`, line 187  
- **Severity:** Critical  
- **Description:** The function calls `await supabase.from('items')...` for the first query (line 168), then calls `const { data: borrowCounts } = await supabase.from('borrow_transactions')...` (line 187) **without checking for an error**. If the borrow_counts query fails (e.g., due to the item_owners RLS recursion, which affects borrow_transactions via FK), `borrowCounts` will be `null`, and the `?? []` fallback on line 193 silently produces an empty array. The function returns "successful" data with `leastUsedItem` computed from an empty borrow count map — meaning every available item appears "least used" with 0 borrows, even if it has borrows.  
- **Suggested fix:** Add error checking: `if (borrowCountsError) throw borrowCountsError;` after the second query.

---

## 🟠 Major Bugs

### M1. `void` hack pattern persists in 6 home components (PR #32 incomplete)

- **Files & Lines:**
  - `src/components/home/CircleActivityPreview.tsx`, lines 142–144 (`void Pressable; void radius;`)
  - `src/components/home/CollectionValueCard.tsx`, line 115 (`void spacing;`)
  - `src/components/home/CurrentlyShared.tsx`, lines 174–176 (`void Alert; void typography;`)
  - `src/components/home/GentleNudgeCard.tsx`, line 110 (`void spacing;`)
  - `src/components/home/RecentlyAddedCarousel.tsx`, line 200 (`void typography;`)
  - `src/components/home/StyleOfTheWeek.tsx`, line 146 (`void spacing;`)
- **Severity:** Major  
- **Description:** PR #32 was titled "Home tab cleanup (removed void hacks)" but 6 of 10 home components still have `void ImportName;` statements to silence unused import warnings. These are dead code — the imports should simply be removed from the import statements.  
- **Suggested fix:** Remove the unused imports from each file's import block and delete the `void` lines.

### M2. Hardcoded mock data in `feed.ts` — share cards, vote counts, comments, reactions

- **File:** `src/lib/feed.ts`, lines 231–276  
- **Severity:** Major  
- **Description:** `buildShareCards()` generates fake engagement metrics: `likeCount: 3 + (idx % 6)`, `saveCount: 1 + (idx % 3)`, `verifiedCount: 2 + (idx % 3)`, `starCount: idx % 5`. `buildMockComments()` generates fake comments with hardcoded names ('Mona A.', 'Lina K.', etc.) and hardcoded text. `buildVoteCandidates()` uses `voteCount: 8 - idx * 3`. `groupWishlists()` uses `reactionCount: Math.floor(Math.random() * 3) + 1` — random data that changes on every fetch. None of this comes from the database.  
- **Suggested fix:** Either create database tables for shares/comments/votes/reactions and query them, or clearly mark these as placeholder constants in a config file. At minimum, `Math.random()` should not be used in data that's supposed to be stable across renders.

### M3. Hardcoded nudge text in `index.tsx`

- **File:** `app/(tabs)/index.tsx`, lines 486–495  
- **Severity:** Major  
- **Description:** `getNudgeTitle()` returns the hardcoded string `"Maya's birthday is in 6 days"` and `getNudgeSubtitle()` returns `"Consider lending her a piece she's admired"`. These should come from the database (user's circle member birthdays, upcoming events, etc.) or at minimum be configurable. The "6 days" is always the same regardless of when the app is opened.  
- **Suggested fix:** Query upcoming events/birthdays from the database, or remove the nudge card until the data source exists.

### M4. Hardcoded quarterly change calculation in `index.tsx`

- **File:** `app/(tabs)/index.tsx`, line 420  
- **Severity:** Major  
- **Description:** `quarterlyChange` is computed as `+AED ${Math.round(insights.totalValue * 0.05 / 1000)}k` — a fixed 5% increase that doesn't reflect actual value changes. The sparkline data (line 211–217) is also derived from mock percentage arrays `[60, 65, 62, 70, 68, 75, 78, 82, 90, 100]` rather than historical data.  
- **Suggested fix:** Store historical item valuations in the database and compute actual quarterly change. Or label the card as "illustrative" rather than presenting fabricated data as real.

### M5. N+1 query in `getCircleMembers()` — one query per member

- **File:** `src/lib/circle.ts`, lines 59–76  
- **Severity:** Major  
- **Description:** After fetching all circle members, the function loops through each member and makes a separate `supabase.from('items').select('*', { count: 'exact', head: true })` query per member. For a circle of 6 members, this is 7 queries (1 for members + 6 for counts). This will be slow with larger circles.  
- **Suggested fix:** Use a single query with a join or subquery: `select=owner_id,id&circle_id=eq.{circleId}&is_private=eq.false` then count client-side, or use a Postgres RPC function with `count(*) GROUP BY owner_id`.

### M6. `CommentSheet` doesn't persist comments to the database

- **File:** `src/components/feed/CommentSheet.tsx`, lines 42–53  
- **Severity:** Major  
- **Description:** `handleSubmit()` creates a local comment object with `id: local-${Date.now()}` and `authorName: 'You'` and adds it to `localComments` state. The comment is never sent to Supabase. When the sheet is dismissed (`handleDismiss`), `localComments` is cleared, losing all new comments. There is no comments table in the database and no API call.  
- **Suggested fix:** Create a `share_comments` table and a `addComment()` function in the lib layer. Call it in `handleSubmit()` and show a loading state. If the DB table doesn't exist yet, at minimum show a "Comments coming soon" message instead of letting users type comments that silently disappear.

### M7. Fire-and-forget Promise in `index.tsx` — no error propagation, race condition

- **File:** `app/(tabs)/index.tsx`, lines 99–111  
- **Severity:** Major  
- **Description:** Inside `loadData()`, after the main `Promise.all` completes, a second `Promise.all([getCircleMembers, getActivityFeed])` is fired **without being awaited**. If the user navigates away or pulls to refresh while this is in flight, the `.then()` callback will still execute and call `setCircleMemberCount` / `setActivities` on an unmounted or stale component — a potential crash (state update on unmounted component) and race condition (stale data overwrites fresh data from a new fetch).  
- **Suggested fix:** Either await this promise within the main try/catch, or use an AbortController / `isMounted` flag to guard the `.then()` callback. At minimum, track this as a separate loading state.

### M8. `LatestItemsSection` uses `estimated_value` as fake like count

- **File:** `src/components/feed/LatestItemsSection.tsx`, line 89  
- **Severity:** Major  
- **Description:** The heart/like count is computed as `Math.floor(item.estimated_value ? item.estimated_value / 1000 : 3)`. This means a 45,000 AED item shows "45 likes" — the estimated value divided by 1000 is displayed as a like count. This is misleading and presents financial data as social engagement.  
- **Suggested fix:** Remove the like count display until a real likes/reactions system exists, or use a separate field.

---

## 🟡 Minor Bugs

### m1. `SparklineChart` crashes on empty `data` array

- **File:** `src/components/home/SparklineChart.tsx`, line 20  
- **Severity:** Minor  
- **Description:** `Math.max(...data, 1)` with an empty array returns `-Infinity` on some JS engines (though the `1` argument saves it here). However, `lastIdx` becomes `-1`, and the `data.map` produces no bars, leaving an empty chart with no fallback.  
- **Suggested fix:** Add a guard: `if (data.length === 0) return null;` at the top of the component.

### m2. No `accessibilityLabel` on ANY tappable element across all components

- **Files:** All components in `src/components/home/` and `src/components/feed/`  
- **Severity:** Minor  
- **Description:** None of the `Pressable`, `TouchableOpacity`, or `TextInput` elements have `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` props. Small buttons (28×28px heart icon, 30×30 bell button, 6×6px status dots) also lack `hitSlop`. VoiceOver users cannot navigate the app.  
- **Suggested fix:** Add `accessibilityLabel` to all interactive elements. Add `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` to small buttons.

### m3. No `React.memo` on any home or feed component

- **Files:** All components in `src/components/home/` and `src/components/feed/`  
- **Severity:** Minor  
- **Description:** None of the 19 components are wrapped in `React.memo`. Since the parent screens (`index.tsx`, `activity.tsx`) hold significant state (loading, refreshing, filter, commentShare), every state change re-renders all child components even if their props haven't changed.  
- **Suggested fix:** Wrap pure components (e.g., `CollectionSummary`, `SparklineChart`, `SectionHeader`, `FilterPills`) in `React.memo`.

### m4. Inline arrow functions in render across multiple components

- **Files:** Multiple (e.g., `CategoryShelf.tsx` line 58, `CircleActivityPreview.tsx` line 65, `FilterPills.tsx` lines 42/63, `FeaturedSection.tsx` line 158)  
- **Severity:** Minor  
- **Description:** onPress handlers are defined as inline arrow functions `() => { hapticLight(); onPressItem?.(item); }` in `.map()` callbacks. These create new function references on every render, defeating `React.memo` even if it were applied.  
- **Suggested fix:** Use `useCallback` for handlers at the parent level and pass stable references.

### m5. `useCircleId` hook has no cleanup / cancellation

- **File:** `src/hooks/useCircleId.ts`, lines 15–40  
- **Severity:** Minor  
- **Description:** The `useEffect` calls `fetchCircleId()` which does an async Supabase query. If the user logs out or the component unmounts before the query completes, `setCircleId` will be called on an unmounted component. No `isMounted` flag or AbortController.  
- **Suggested fix:** Add a `let cancelled = false;` flag in the effect and check it before calling `setCircleId` / `setLoading`.

### m6. `getCircleWishlists()` doesn't filter `is_private` despite docstring saying it does

- **File:** `src/lib/wishlist.ts`, lines 163–186  
- **Severity:** Minor  
- **Description:** The function's JSDoc says "Only returns non-private wishlist items" but the query has no `.eq('is_private', false)` filter. RLS may currently handle this, but relying on RLS for application-level filtering is fragile — if RLS policies change, private wishlist items would leak.  
- **Suggested fix:** Add `.eq('is_private', false)` to the query, or remove the misleading docstring.

### m7. `CircleActivitySection` "Mark Returned" shows for activities with null `borrow_id`

- **File:** `src/components/feed/CircleActivitySection.tsx`, lines 87–90  
- **Severity:** Minor  
- **Description:** The `showMarkReturned` check is `activity.type === 'borrow_active' && activity.borrow_id && currentUserId !== activity.user_id`. This correctly guards against null `borrow_id`. However, DB testing revealed that 2 out of 4 `borrow_active` activities have `borrow_id = null` in the seed data. These activities will show the borrow_active icon but no "Mark Returned" button, which is correct behavior — but the underlying data issue (missing borrow_id on borrow_active activities) means the "Mark Returned" feature is unavailable for 50% of active borrows in the feed.  
- **Suggested fix:** Fix the seed data to ensure all `borrow_active` activities have a valid `borrow_id`. Also consider showing a different UI for activities missing `borrow_id`.

### m8. `RecentSharesSection` hardcoded comment count `+ 3`

- **File:** `src/components/feed/RecentSharesSection.tsx`, line 104  
- **Severity:** Minor  
- **Description:** `totalCommentCount = share.comments.length + 3` always adds 3 to the actual comment count. The "View all X comments" text will always show at least 3 more than reality.  
- **Suggested fix:** Use `share.comments.length` directly, or remove the magic number.

### m9. `formatActivityTail()` in `CircleActivityPreview` returns plain string, not styled text

- **File:** `src/components/home/CircleActivityPreview.tsx`, lines 88–94  
- **Severity:** Minor  
- **Description:** The JSDoc says "italicize item brand" but the function just returns a plain string. The `<Text>` component on line 54 renders it without any italic styling. The comment mentions italic serif for item names but this is not implemented.  
- **Suggested fix:** Either implement the styled text rendering (split the tail and wrap brand names in `<Text style={{ fontStyle: 'italic' }}>`) or remove the misleading comment.

### m10. `PieceOfTheDay` "Style It" and "View Details" buttons navigate to the same route

- **File:** `src/components/home/PieceOfTheDay.tsx`, lines 36–43  
- **Severity:** Minor  
- **Description:** Both `handleStyleIt()` and `handleViewDetails()` call `router.push('/item/${item.id}')`. The "Style It" button implies a styling/matching feature, but it just opens the item detail page.  
- **Suggested fix:** Either route "Style It" to a separate styling screen, or rename the button to "View Item" to match its actual behavior.

### m11. `FeaturedSection` vote is local-only, no persistence

- **File:** `src/components/feed/FeaturedSection.tsx`, lines 31–34  
- **Severity:** Minor  
- **Description:** `handleVote()` only sets local state `setVoteSelected(idx)`. The vote is never sent to the database. After a refresh, the vote is lost. The vote percentages shown (`pct`) are based on `voteCount` from `buildVoteCandidates()` which is hardcoded (`8 - idx * 3`).  
- **Suggested fix:** Create a votes table in the database and persist votes. Until then, show a "Voting coming soon" label.

### m12. `activity.tsx` "shares" filter shows `item_added` activities with `item_brand` — overlaps with "items" filter

- **File:** `app/(tabs)/activity.tsx`, line 102  
- **Severity:** Minor  
- **Description:** The `shares` filter condition is `a.type === 'item_added' && a.item_brand`. The `items` filter includes `item_added` in its types array. This means `item_added` activities appear under both "Items" and "Shares" filters, which is confusing.  
- **Suggested fix:** Define separate activity types for shares vs. item additions, or exclude `item_added` from the "items" filter when it has `item_brand`.

---

## DB Query Test Results

| Query | Function | Result | Notes |
|-------|----------|--------|-------|
| `getMyItems` | items.ts:100 | 🔴 500 error | item_owners RLS recursion |
| `getItems` | items.ts:27 | 🔴 500 error | item_owners RLS recursion |
| `getCollectionInsights` | profile.ts:160 | 🔴 500 error | item_owners RLS recursion (items query) |
| `getActiveBorrows` | borrow.ts:192 | 🔴 500 error | item_owners RLS recursion (FK to items) |
| `getActivityFeed` | activity.ts:16 | ✅ 37 entries | Works correctly |
| `getCircleMembers` | circle.ts:35 | ✅ 6 members | Works (but N+1 queries for item counts would fail) |
| `getCircleWishlists` | wishlist.ts:163 | ✅ 3 items | Works correctly; no private filter in code |
| `getFeedData` | feed.ts:86 | 🔴 Fails | Calls getItems + getCircleActiveBorrows internally |
| Circle membership lookup | useCircleId.ts | ✅ Works | Returns circle_id aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa |
| Login (sarah@test.local) | auth | ✅ Works | User ID: 11111111-1111-1111-1111-111111111111 |

### RLS Policy Verification

| Check | Result | Notes |
|-------|--------|-------|
| Sarah can see her own items | 🔴 Cannot test | RLS recursion blocks all items queries |
| Sarah cannot see other users' private items | 🔴 Cannot test | RLS recursion blocks all items queries |
| Sarah can see circle activity feed | ✅ Pass | 37 activities returned |
| Sarah can see circle members | ✅ Pass | 6 members returned |
| Sarah can see circle wishlists | ✅ Pass | 3 items returned (all non-private) |
| Private wishlist items filtered by RLS | ✅ Pass | No private items visible (RLS handles it) |

---

## Performance Notes

1. **`getCircleMembers()` (circle.ts:35)** — N+1 query pattern: 1 query for members + 1 query per member for item count = N+1 queries. With 6 members = 7 queries. Should be a single query with aggregation.

2. **`getFeedData()` (feed.ts:86)** — Fires 5 parallel queries via `Promise.all`, which is good. However, `getItems()` and `getCircleActiveBorrows()` both touch the items table and will fail due to the RLS recursion.

3. **No `React.memo` on any component** — All 19 components in `home/` and `feed/` re-render on every parent state change. The `activity.tsx` screen has 7 state variables (`feedData`, `loading`, `refreshing`, `error`, `activeFilter`, `commentShare`, `currentUserId`), so changing the filter pill re-renders all sections even if their data didn't change.

4. **`SparklineChart` animates on every render** — Moti animations re-trigger if the parent re-renders and the component isn't memoized.

---

## Files Reviewed

### Home Components (10 files)
- `src/components/home/CategoryShelf.tsx` ✅
- `src/components/home/CircleActivityPreview.tsx` ✅
- `src/components/home/CollectionSummary.tsx` ✅
- `src/components/home/CollectionValueCard.tsx` ✅
- `src/components/home/CurrentlyShared.tsx` ✅
- `src/components/home/GentleNudgeCard.tsx` ✅
- `src/components/home/PieceOfTheDay.tsx` ✅
- `src/components/home/RecentlyAddedCarousel.tsx` ✅
- `src/components/home/SparklineChart.tsx` ✅
- `src/components/home/StyleOfTheWeek.tsx` ✅

### Feed Components (9 files)
- `src/components/feed/CircleActivitySection.tsx` ✅
- `src/components/feed/CommentSheet.tsx` ✅
- `src/components/feed/FeaturedSection.tsx` ✅
- `src/components/feed/FilterPills.tsx` ✅
- `src/components/feed/LatestItemsSection.tsx` ✅
- `src/components/feed/RecentSharesSection.tsx` ✅
- `src/components/feed/SectionHeader.tsx` ✅
- `src/components/feed/SharedWishlistsSection.tsx` ✅
- `src/components/feed/index.ts` ✅

### Tab Screens (2 files)
- `app/(tabs)/index.tsx` ✅
- `app/(tabs)/activity.tsx` ✅

### Lib Files (4 primary + 4 supporting)
- `src/lib/items.ts` ✅
- `src/lib/borrow.ts` ✅
- `src/lib/activity.ts` ✅
- `src/lib/feed.ts` ✅
- `src/lib/wishlist.ts` ✅ (supporting — used by feed.ts)
- `src/lib/profile.ts` ✅ (supporting — used by index.tsx)
- `src/lib/circle.ts` ✅ (supporting — used by index.tsx)
- `src/lib/format.ts` ✅ (supporting — used by components)
- `src/lib/supabase.ts` ✅ (supporting — client setup)
- `src/lib/haptics.ts` ✅ (supporting — used by components)

### Hooks (2 files)
- `src/hooks/useAuth.ts` ✅
- `src/hooks/useCircleId.ts` ✅

---

## Recommendations (Priority Order)

1. **Fix the item_owners RLS recursion** (C1) — run `supabase db reset` to remove migration 0009 from the local instance, or fix the policy before merging the co-ownership branch.
2. **Add error checking to `getCollectionInsights` second query** (C2).
3. **Remove remaining `void` hacks** (M1) — 6 files still have them despite PR #32.
4. **Replace mock data in `feed.ts`** (M2) with real DB queries or clearly-labeled placeholders.
5. **Fix fire-and-forget Promise in `index.tsx`** (M7) — add cancellation.
6. **Persist comments** (M6) or show "coming soon" instead of silently dropping them.
7. **Add accessibility labels and hitSlop** (m2) — required for App Store accessibility compliance.
8. **Add `React.memo` to pure components** (m3) — performance improvement.
