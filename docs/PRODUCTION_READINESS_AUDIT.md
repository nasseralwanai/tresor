# Trésor — Production Readiness Audit

**Auditor:** Nigel (System Architect)
**Date:** August 8, 2026
**Scope:** All 11 database migrations, all `src/lib/` API files, `app/(auth)/` auth flow, security review, UX gap analysis
**Status:** Pre-production, 35 PRs merged

---

## Executive Summary

The app is architecturally sound and well-structured for its scale (5–15 users). The database schema is comprehensive, RLS has been iteratively hardened, and the API layer follows consistent patterns. However, **three blockers** prevent production launch: the auth flow is email/password instead of phone-first (critical for UAE market), there is zero pagination on any query (the app will break past ~100 items), and the `create_co_owned_item` RPC has no authentication check (any authenticated user can create items as any other user). Beyond blockers, there are 11 should-fix issues and 9 nice-to-haves.

| Severity | Count |
|----------|-------|
| 🔴 Blocker | 3 |
| 🟡 Should-fix | 11 |
| 🔵 Nice-to-have | 9 |

---

## 1. Database Integrity

### 1.1 Missing Indexes

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 1 | Index on `circles.invite_code` | ✅ PASS | — | `0001_initial_schema.sql:59` | `invite_code` has `UNIQUE` constraint which auto-creates an index. ✅ |
| 2 | Index on `circle_members(circle_id, user_id)` | ✅ PASS | — | `0001_initial_schema.sql:72` | Unique constraint creates a composite index. ✅ |
| 3 | Index on `items.owner_id` | ✅ PASS | — | `0001_initial_schema.sql:192` | `idx_items_owner_id` exists. ✅ |
| 4 | Index on `borrow_transactions.circle_id` | ❌ FAIL | 🟡 Should-fix | `0001_initial_schema.sql:114-134` | No index on `circle_id`. `feed.ts:121-129` queries `borrow_transactions` by `circle_id`. At scale this becomes a sequential scan. **Fix:** `CREATE INDEX idx_borrow_circle_id ON public.borrow_transactions (circle_id);` |
| 5 | Index on `notifications.user_id` (all, not just unread) | ✅ PASS | — | `0008_notifications_and_nudges.sql:24-29` | Both unread and all indexes exist. ✅ |
| 6 | Index on `borrow_nudges.borrower_id` | ❌ FAIL | 🔵 Nice-to-have | `0008_notifications_and_nudges.sql:45-58` | No index on `borrower_id`. The nudge_borrower function queries by `borrow_id` and `lender_id` (both indexed), but the borrower's notification query could benefit. Low priority at current scale. |
| 7 | Index on `items.current_custodian_id` | ❌ FAIL | 🔵 Nice-to-have | `0009_co_ownership.sql:68` | No index on `current_custodian_id`. The custody transfer flow queries items by this column. **Fix:** `CREATE INDEX idx_items_custodian ON public.items (current_custodian_id) WHERE current_custodian_id IS NOT NULL;` |
| 8 | Index on `custody_transfers.circle_id` | ❌ FAIL | 🔵 Nice-to-have | `0009_co_ownership.sql:154-176` | No index on `circle_id`. Circle members query custody transfers. Low priority at current scale. |

### 1.2 Foreign Key Constraints

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 9 | All FKs use `ON DELETE` actions | ✅ PASS | — | All migrations | All foreign keys specify `CASCADE`, `SET NULL`, or appropriate action. ✅ |
| 10 | `item_owners.user_id` ON DELETE behavior | ⚠️ NOTE | 🔵 Nice-to-have | `0009_co_ownership.sql:108` | Uses `ON DELETE SET NULL` (not CASCADE). This preserves ownership history when a user is deleted, which is correct for an audit trail. However, `is_active` won't be set to false, leaving orphaned shares. **Fix:** Add a trigger to set `is_active = false` when `user_id` is set to NULL via delete. |
| 11 | `activity_feed.circle_id` allows NULL | ⚠️ NOTE | 🟡 Should-fix | `0001_initial_schema.sql:165` | `circle_id` is nullable with `ON DELETE CASCADE`. `activity.ts:23` queries by `circle_id`, but some activities (wishlist items for users not in a circle) insert with NULL `circle_id` (see `0002_wishlist_fixes.sql:237-240`). These entries are invisible to the circle feed query. **Fix:** Either ensure all activity entries have a `circle_id`, or handle NULL circle_id entries separately. |

### 1.3 NOT NULL Constraints

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 12 | `items.category` NOT NULL | ❌ FAIL | 🟡 Should-fix | `0001_initial_schema.sql:82` | `category` is nullable. `ItemInsert` type makes it optional. The UI uses category for filtering and display. **Fix:** Add `NOT NULL DEFAULT 'other'` and backfill existing NULLs. |
| 13 | `items.model_name` nullable | ⚠️ NOTE | 🔵 Nice-to-have | `0001_initial_schema.sql:81` | `model_name` is nullable. UI falls back to brand-only display. Acceptable but not ideal for a luxury inventory app. |
| 14 | `profiles.display_name` nullable | ⚠️ NOTE | 🟡 Should-fix | `0001_initial_schema.sql:47` | `display_name` is nullable. All UI code uses `?? 'Unknown'` fallback. The profile setup screen (`profile-setup.tsx:72`) requires a name, but `createProfile` (profile.ts:21-45) doesn't enforce it. **Fix:** Add `NOT NULL` after backfilling existing NULLs with phone number. |
| 15 | `circles.created_by` nullable (ON DELETE SET NULL) | ⚠️ NOTE | 🔵 Nice-to-have | `0001_initial_schema.sql:60` | If the creator deletes their account, `created_by` becomes NULL. The circle remains but has no admin reference. Acceptable for small scale. |

### 1.4 Data Integrity Issues

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 16 | `create_co_owned_item` RPC — no auth check | ❌ FAIL | 🔴 Blocker | `0009_co_ownership.sql:272-373` | The RPC is `SECURITY DEFINER` but does NOT verify that the caller (`auth.uid()`) is in the `p_owners` array. Any authenticated user could pass any user's UUID as the primary owner. The RLS policies on `items` are bypassed because the function runs as definer. **Fix:** Add `IF (p_owners->0->>'user_id')::uuid <> auth.uid() THEN RAISE EXCEPTION 'Only an owner can create a co-owned item'; END IF;` at the top of the function. |
| 17 | `process_buyout` RPC — no auth check | ❌ FAIL | 🔴 Blocker | `0009_co_ownership.sql:376-479` | Same issue: `SECURITY DEFINER` function that accepts `p_buyer_id` as a parameter without verifying `p_buyer_id = auth.uid()`. Any authenticated user could buy out shares on behalf of any other user. **Fix:** Add `IF p_buyer_id <> auth.uid() THEN RAISE EXCEPTION 'Buyer must be the authenticated user'; END IF;` |
| 18 | Ownership shares validation trigger | ✅ PASS | — | `0009_co_ownership.sql:197-237` | Statement-level trigger validates shares sum to 100 for co-owned items. Well-designed. ✅ |
| 19 | Borrow status transitions — no constraint | ⚠️ NOTE | 🟡 Should-fix | `0001_initial_schema.sql:120` | `borrow_transactions.status` is an enum but there's no CHECK or trigger enforcing valid state transitions (e.g., `declined` → `active`). The API layer (`borrow.ts`) handles this client-side, but the DB doesn't enforce it. **Fix:** Add a trigger that validates status transitions against an allowed-transition map. |
| 20 | `circles.invite_code` — no expiry or revocation | ⚠️ NOTE | 🟡 Should-fix | `0001_initial_schema.sql:59` | Invite codes never expire and can't be revoked. Once shared, anyone with the code can join forever. **Fix:** Add `expires_at` column and/or a `is_active` flag on circles, plus an admin "regenerate code" action. |

### 1.5 Updated_at Triggers

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 21 | `profiles.updated_at` trigger | ✅ PASS | — | `0001_initial_schema.sql:476-478` | ✅ |
| 22 | `circles.updated_at` trigger | ✅ PASS | — | `0001_initial_schema.sql:480-482` | ✅ |
| 23 | `items.updated_at` trigger | ✅ PASS | — | `0001_initial_schema.sql:484-486` | ✅ |
| 24 | `borrow_transactions.updated_at` trigger | ✅ PASS | — | `0001_initial_schema.sql:488-490` | ✅ |
| 25 | `wishlist_items.updated_at` trigger | ✅ PASS | — | `0002_wishlist_fixes.sql:458-462` | ✅ |
| 26 | `item_owners.updated_at` trigger | ✅ PASS | — | `0009_co_ownership.sql:183-186` | ✅ |
| 27 | `custody_transfers.updated_at` trigger | ✅ PASS | — | `0009_co_ownership.sql:189-192` | ✅ |
| 28 | `notifications.updated_at` — MISSING | ❌ FAIL | 🔵 Nice-to-have | `0008_notifications_and_nudges.sql:7-22` | `notifications` has no `updated_at` column at all. The `read_at` column tracks read state, which is sufficient. Low priority. |
| 29 | `wishlists.updated_at` — MISSING | ❌ FAIL | 🔵 Nice-to-have | `0001_initial_schema.sql:137-143` | `wishlists` table has no `updated_at` column. It's rarely updated (only name/privacy changes), so low impact. |
| 30 | `item_photos.updated_at` — MISSING | ❌ FAIL | 🔵 Nice-to-have | `0001_initial_schema.sql:104-111` | `item_photos` has no `updated_at` column. Photos are typically insert/delete only, so low impact. |
| 31 | `activity_feed.updated_at` — N/A | ✅ PASS | — | `0001_initial_schema.sql:163-174` | Append-only table, no updates expected. ✅ |
| 32 | `price_history.updated_at` — N/A | ✅ PASS | — | `0001_initial_schema.sql:177-187` | Append-only table. ✅ |
| 33 | `ownership_ledger.updated_at` — N/A | ✅ PASS | — | `0009_co_ownership.sql:129-142` | Immutable audit trail, no updates allowed (no UPDATE/DELETE RLS policies). ✅ |

---

## 2. API Layer (`src/lib/`)

### 2.1 Error Handling Patterns

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 34 | Consistent error classification | ⚠️ PARTIAL | 🟡 Should-fix | Multiple | `errors.ts` provides `classifyError()` used by `(tabs)/index.tsx`, `(tabs)/profile.tsx`, `(tabs)/activity.tsx`. However, `co-ownership.ts` uses its own `toCoOwnershipError()` pattern, `nudge.ts` returns structured `{success, error}` objects, and `invite.ts` returns `{valid, error}` objects. Three different error patterns across the codebase. **Fix:** Unify on `classifyError()` for all API calls, with structured RPC results handled separately. |
| 35 | All API functions throw on error | ✅ PASS | — | All `src/lib/` files | Every function checks `if (error) throw error;` consistently. ✅ |
| 36 | API functions don't swallow errors silently | ⚠️ NOTE | 🟡 Should-fix | `storage.ts:113` | `deleteItemPhoto` logs storage deletion failure with `console.warn` but continues. If the storage file is orphaned, the DB row is still deleted. Acceptable but should be logged to an error tracking service in production. |
| 37 | `borrow.ts:248` — nudgeBorrower is a no-op | ❌ FAIL | 🟡 Should-fix | `borrow.ts:248-251` | The `nudgeBorrower` function in `borrow.ts` is a placeholder no-op, while `nudge.ts:64-84` has the real implementation calling the RPC. This is confusing and error-prone — if someone imports from `borrow.ts` instead of `nudge.ts`, nudges silently fail. **Fix:** Remove the stub from `borrow.ts` or re-export from `nudge.ts`. |

### 2.2 Input Validation

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 38 | `items.ts` — no input validation on createItem | ❌ FAIL | 🟡 Should-fix | `items.ts:59-70` | `createItem` accepts `ItemInsert` and passes it directly to Supabase. No validation of brand (required), price ranges, or string lengths. The DB enforces `NOT NULL` on `brand` but the error surfaces as a raw Postgres error. **Fix:** Validate required fields before insert and return user-friendly errors. |
| 39 | `borrow.ts` — no validation on requestBorrow | ❌ FAIL | 🟡 Should-fix | `borrow.ts:30-66` | `requestBorrow` doesn't validate that the item is lendable, that the borrower isn't the lender, or that there isn't already an active borrow. The DB has no constraint for self-borrow. **Fix:** Add client-side validation: `if (params.borrowerId === params.lenderId) throw new Error('Cannot borrow your own item');` and check `is_lendable` status. |
| 40 | `co-ownership.ts` — shares validation | ✅ PASS | — | `co-ownership.ts:214-224` | Validates shares sum to 100 before hitting the RPC. ✅ |
| 41 | `invite.ts` — invite code validation | ✅ PASS | — | `invite.ts:16-19` | Trims and uppercases the code, checks for empty. ✅ |
| 42 | `profile.ts` — no name length validation | ⚠️ NOTE | 🔵 Nice-to-have | `profile.ts:21-45` | `createProfile` accepts any `fullName` string. No min/max length check. **Fix:** Validate `fullName.length >= 1 && fullName.length <= 100`. |
| 43 | `wishlist.ts` — no price validation | ⚠️ NOTE | 🔵 Nice-to-have | `wishlist.ts:60-87` | `addToWishlist` doesn't validate that `max_price` or `target_price` are positive. **Fix:** Add `if (price < 0) throw new Error('Price must be positive');` |

### 2.3 Pagination

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 44 | `getItems()` — no pagination | ❌ FAIL | 🔴 Blocker | `items.ts:27-38` | Fetches ALL items in a circle with no `.limit()` or `.range()`. With 100+ items (realistic for luxury collections), this will load everything into memory at once. **Fix:** Add `limit` and `offset` parameters, implement cursor-based pagination using `created_at` as the cursor. |
| 45 | `getMyItems()` — no pagination | ❌ FAIL | 🟡 Should-fix | `items.ts:100-111` | Same issue — fetches all items for a user with no limit. **Fix:** Same as above. |
| 46 | `getActiveBorrows()` — no pagination | ❌ FAIL | 🟡 Should-fix | `borrow.ts:192-214` | Fetches all active borrows with no limit. At scale this could return hundreds of rows. **Fix:** Add `.limit(50)` at minimum, or implement pagination. |
| 47 | `getBorrowHistory()` — no pagination | ❌ FAIL | 🟡 Should-fix | `borrow.ts:220-241` | Fetches complete borrow history for an item. Over time this grows unbounded. **Fix:** Add `.limit(50)` and pagination. |
| 48 | `getActivityFeed()` — has limit | ✅ PASS | — | `activity.ts:16-34` | Uses `.limit(50)`. ✅ But no pagination for loading more. |
| 49 | `getCircleWishlists()` — no pagination | ❌ FAIL | 🟡 Should-fix | `wishlist.ts:163-186` | Fetches all wishlist items for all circle members. Could return 100+ rows with a large circle. **Fix:** Add `.limit(50)`. |
| 50 | `getNotifications()` — has limit | ✅ PASS | — | `nudge.ts:90-100` | Uses `.limit(50)`. ✅ |
| 51 | `getCollectionInsights()` — fetches all items | ⚠️ NOTE | 🟡 Should-fix | `profile.ts:160-220` | Fetches ALL items for a user (no limit) then also fetches ALL borrow transactions (no limit). At scale this is two large queries + client-side aggregation. **Fix:** Use a Supabase RPC or Postgres view for server-side aggregation. |
| 52 | `getFeedData()` — fetches everything in parallel | ⚠️ NOTE | 🟡 Should-fix | `feed.ts:86-115` | Calls 5 parallel queries, several of which have no limits (getItems, getCircleWishlists, getCircleActiveBorrows). **Fix:** Add limits to each sub-query. |

### 2.4 Loading States in UI

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 53 | Home tab — Skeleton loading | ✅ PASS | — | `(tabs)/index.tsx:26` | Uses `Skeleton` component for loading state. ✅ |
| 54 | Activity tab — Skeleton loading | ✅ PASS | — | `(tabs)/activity.tsx:25` | Imports and uses `Skeleton`. ✅ |
| 55 | Wishlist tab — Skeleton loading | ✅ PASS | — | `(tabs)/wishlist.tsx:78` | Uses `Skeleton` inside `ListEmptyComponent` when loading. ✅ |
| 56 | Circle tab — ActivityIndicator | ⚠️ PARTIAL | 🔵 Nice-to-have | `(tabs)/circle.tsx` | Uses `ActivityIndicator` (spinner), not skeletons. Inconsistent with other tabs. |
| 57 | Profile tab — NO loading state | ❌ FAIL | 🟡 Should-fix | `(tabs)/profile.tsx:63` | Comment on line 63: `// No loading state in this component currently`. Shows empty data while loading. **Fix:** Add a loading state or skeleton. |
| 58 | Item detail — ActivityIndicator | ⚠️ PARTIAL | 🔵 Nice-to-have | `item/[id].tsx:143` | Uses `ActivityIndicator`, not skeleton. Acceptable for a detail screen. |
| 59 | Borrow active — ActivityIndicator | ⚠️ PARTIAL | 🔵 Nice-to-have | `borrow/active.tsx:141` | Uses `ActivityIndicator`. Acceptable. |
| 60 | Borrow request — inline ActivityIndicator | ✅ PASS | — | `borrow/request.tsx:84` | Shows spinner on submit button. ✅ |
| 61 | Auth screens — button loading state | ✅ PASS | — | `(auth)/phone-otp.tsx:131` | `PrimaryButton` has `loading` prop. ✅ |

---

## 3. Auth Flow

### 3.1 Phone-First Auth (UAE Market)

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 62 | Phone OTP auth implemented | ❌ FAIL | 🔴 Blocker | `AuthContext.tsx:3-7`, `(auth)/phone-otp.tsx:1-7` | **The auth flow uses email/password, NOT phone OTP.** The `phone-otp.tsx` screen's header comment says: "Originally a phone OTP screen, repurposed for email/password auth since phone OTP requires Twilio (not available in local dev)." The `AuthContext` has `signInWithPhone` and `verifyOtp` methods that ARE implemented (lines 135-155), but the UI doesn't use them. The phone-otp screen collects email + password. **This is a fundamental mismatch with the UAE market requirement.** **Fix:** Rewrite `phone-otp.tsx` to collect a phone number (`+971...`), call `signInWithPhone()`, then show an OTP input screen that calls `verifyOtp()`. Configure Twilio in production Supabase. The `AuthContext` already has the methods — only the UI needs changing. |
| 63 | Phone number format validation | ❌ FAIL | 🟡 Should-fix | `AuthContext.tsx:135-141` | `signInWithPhone` passes the phone string directly to Supabase with no validation. UAE numbers should be `+971` prefixed. **Fix:** Add phone format validation before calling `signInWithOtp`. |
| 64 | Twilio configured in supabase config | ✅ PASS | — | `supabase/config.toml:289-294` | Twilio is configured with env variable substitution. ✅ (Needs real credentials in production.) |

### 3.2 OTP Flow

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 65 | OTP verification flow | ❌ FAIL | 🔴 Blocker | `(auth)/phone-otp.tsx` | No OTP input UI exists. The screen collects email/password. The `verifyOtp` method exists in `AuthContext` (lines 143-155) but is never called from any UI. **Fix:** Create a two-step flow: phone input → OTP code input → verify. |
| 66 | OTP retry/resend | ❌ FAIL | 🟡 Should-fix | N/A | No resend OTP functionality. Supabase config has `max_frequency = "5s"` for SMS, but there's no UI to resend. **Fix:** Add a "Resend code" button with a countdown timer. |

### 3.3 Session Persistence

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 67 | Session persistence | ✅ PASS | — | `supabase.ts:14-21` | `persistSession: true` with `AsyncStorage` as storage. ✅ |
| 68 | Auto refresh token | ✅ PASS | — | `supabase.ts:17` | `autoRefreshToken: true`. ✅ |
| 69 | Auth state change listener | ✅ PASS | — | `AuthContext.tsx:97-106` | Subscribes to `onAuthStateChange` and updates session/profile. ✅ |
| 70 | Initial session check | ✅ PASS | — | `AuthContext.tsx:84-94` | Calls `getSession()` on mount. ✅ |
| 71 | Profile loaded after auth | ✅ PASS | — | `AuthContext.tsx:87-90, 101-103` | Profile fetched when session is established. ✅ |

### 3.4 Logout Flow

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 72 | Logout implementation | ✅ PASS | — | `AuthContext.tsx:128-132` | Clears profile, calls `supabase.auth.signOut()`. ✅ |
| 73 | Logout UI | ✅ PASS | — | `(tabs)/profile.tsx:74-91` | Confirmation alert with destructive style. ✅ |
| 74 | Post-logout navigation | ✅ PASS | — | `(tabs)/profile.tsx:84` | `router.replace('/(auth)/welcome')`. ✅ |
| 75 | Haptic feedback on logout | ✅ PASS | — | `(tabs)/profile.tsx:75` | `hapticSuccess()` called. ✅ |

### 3.5 Protected Route Guards

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 76 | Root route guard | ✅ PASS | — | `_layout.tsx:16-46` | Checks `loading` and `session` states, redirects to `(auth)/welcome` if unauthenticated. ✅ |
| 77 | Redirect after auth check | ✅ PASS | — | `_layout.tsx:43` | `<Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/welcome'} />`. ✅ |
| 78 | Loading state during auth check | ✅ PASS | — | `_layout.tsx:21-27` | Shows `ActivityIndicator` while checking session. ✅ |
| 79 | No profile check after auth | ⚠️ NOTE | 🟡 Should-fix | `_layout.tsx:16-46` | The root layout checks if a session exists but NOT if a profile exists. A user could authenticate (have a session) but have no profile row (e.g., if profile creation failed). They'd be sent to `(tabs)` with no profile data. **Fix:** Check `profile` state in the redirect logic — if session exists but profile is null, redirect to `profile-setup`. |

---

## 4. Security

### 4.1 Hardcoded API Keys / Secrets

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 80 | No hardcoded secrets in source | ✅ PASS | — | All `src/` files | Searched for api_key, secret, password, token, anon_key, service_key patterns. No hardcoded secrets found. ✅ |
| 81 | `.env.local` gitignored | ✅ PASS | — | `.gitignore:34` | `.env*.local` in gitignore. ✅ |
| 82 | `.env.example` has placeholders | ✅ PASS | — | `.env.example:1-5` | Uses placeholder values, not real keys. ✅ |
| 83 | Supabase config uses env vars | ✅ PASS | — | `supabase/config.toml:291-294` | Twilio credentials use `env()` substitution. ✅ |
| 84 | Seed data has test credentials | ⚠️ NOTE | 🔵 Nice-to-have | `supabase/seed.sql:17` | Seed creates users with `crypt('password123', ...)`. These are dev-only and won't exist in production. ✅ But the login screen (`phone-otp.tsx:123`) displays the demo credentials: `Demo: sarah@test.local / password123`. **Fix:** Remove the demo credentials hint from the production build. |

### 4.2 SQL Injection Risks

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 85 | No raw SQL string interpolation | ✅ PASS | — | All `src/lib/` files | All queries use the Supabase JS client's parameterized query builder. No raw SQL strings. ✅ |
| 86 | `.or()` with string interpolation | ⚠️ NOTE | 🟡 Should-fix | `borrow.ts:202` | `.or(\`borrower_id.eq.${userId},lender_id.eq.${userId}\`)` interpolates `userId` directly into the filter string. `userId` comes from `auth.uid()` via the AuthContext, so it's not user-input — it's a UUID from the JWT. **However**, this is still a bad pattern. If `userId` were ever user-controllable, it would be a PostgREST filter injection. **Fix:** Use the Supabase client's `.or()` with properly escaped parameters, or use two separate queries. |
| 87 | RPC calls use parameterized arguments | ✅ PASS | — | `co-ownership.ts:226-243`, `nudge.ts:73-76` | All `.rpc()` calls pass arguments as objects. ✅ |

### 4.3 Rate Limiting on User-Facing RPCs

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 88 | `nudge_borrower()` — rate limited | ✅ PASS | — | `0008_notifications_and_nudges.sql:76-222` | Comprehensive rate limiting: 48h grace, 24h cooldown, max 3 per borrow, max 5 per lender/day. ✅ |
| 89 | `create_co_owned_item()` — NOT rate limited | ❌ FAIL | 🟡 Should-fix | `0009_co_ownership.sql:272-373` | No rate limiting. A malicious user could create thousands of co-owned items. **Fix:** Add a check like `SELECT COUNT(*) FROM items WHERE owner_id = auth.uid() AND created_at > now() - interval '1 hour'` and reject if > 10. |
| 90 | `process_buyout()` — NOT rate limited | ❌ FAIL | 🟡 Should-fix | `0009_co_ownership.sql:376-479` | No rate limiting. A user could spam buyout requests. **Fix:** Add a daily limit on buyout operations per user. |
| 91 | `borrow_transactions` insert — NOT rate limited | ❌ FAIL | 🟡 Should-fix | `borrow.ts:30-66`, `0001_initial_schema.sql:348-350` | RLS allows `borrower_id = auth.uid()` to insert. No limit on how many borrow requests a user can make. A user could spam borrow requests to every item in the circle. **Fix:** Add a trigger or RPC that limits pending borrow requests per user (e.g., max 5 active requests). |
| 92 | Invite code validation — NOT rate limited | ❌ FAIL | 🟡 Should-fix | `invite.ts:15-72` | `validateInviteCode` queries circles by invite_code with no rate limit. A user could brute-force invite codes. With 8-character codes and the current uppercase format, brute force is feasible. **Fix:** Add a rate limit on circle lookups (e.g., max 10 attempts per 5 minutes per IP/user). |
| 93 | Auth-level rate limiting (Supabase config) | ✅ PASS | — | `supabase/config.toml:197-211` | Supabase auth rate limits configured: 30 sign-in/sign-up per 5 min, 30 token verifications per 5 min. ✅ |

### 4.4 File Upload Security

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 94 | Avatar upload — file type validation | ❌ FAIL | 🟡 Should-fix | `profile.ts:91-114` | `uploadAvatar` compresses with `expo-image-manipulator` (converting to JPEG), which provides implicit type validation. However, there's no MIME type check on the original file, no file size check before compression, and the bucket has no `allowed_mime_types` configured. **Fix:** Add `allowed_mime_types = ["image/jpeg", "image/png"]` to the avatars bucket config in `supabase/config.toml`. |
| 95 | Avatar upload — path traversal protection | ✅ PASS | — | `profile.ts:104` | Uses `${userId}/avatar.jpeg` — fixed path, no user-controllable filename. ✅ |
| 96 | Item photo upload — file type validation | ❌ FAIL | 🟡 Should-fix | `storage.ts:22-70` | `uploadItemPhoto` extracts file extension from the URI (`fileUri.split('.').pop()`) and uses it as-is. No MIME type validation. A user could potentially upload a non-image file with a `.jpg` extension. **Fix:** Validate `blob.type` starts with `image/` before uploading, and configure `allowed_mime_types` on the items bucket. |
| 97 | Item photo upload — file size limit | ⚠️ NOTE | 🔵 Nice-to-have | `storage.ts:22-70` | No client-side file size check. The Supabase storage config has `file_size_limit = "50MiB"` (`config.toml:118`), which provides a server-side limit. **Fix:** Add a client-side check (e.g., max 10MB) for better UX. |
| 98 | Storage bucket policies — avatars | ✅ PASS | — | `0004_avatars_bucket.sql:13-43` | Users can only upload to their own path (`<uid>/...`). Public read. ✅ |
| 99 | Storage bucket policies — items | ✅ PASS | — | `0001_initial_schema.sql:500-530` | Owners manage their own photos, circle members can read. ✅ |

---

## 5. UX Gaps

### 5.1 Loading Skeletons

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 100 | Skeleton component exists | ✅ PASS | — | `src/components/Skeleton.tsx` | Reusable animated skeleton component. ✅ |
| 101 | Home tab uses skeletons | ✅ PASS | — | `(tabs)/index.tsx:26` | ✅ |
| 102 | Activity tab uses skeletons | ✅ PASS | — | `(tabs)/activity.tsx:25` | ✅ |
| 103 | Wishlist tab uses skeletons | ✅ PASS | — | `(tabs)/wishlist.tsx:78` | ✅ |
| 104 | Circle tab uses spinners, not skeletons | ❌ FAIL | 🔵 Nice-to-have | `(tabs)/circle.tsx` | Uses `ActivityIndicator` instead of `Skeleton`. **Fix:** Replace with skeleton loading. |
| 105 | Profile tab has no loading state | ❌ FAIL | 🟡 Should-fix | `(tabs)/profile.tsx:63` | No loading indicator at all. Shows empty data fields while loading. **Fix:** Add skeleton or spinner. |
| 106 | Item detail uses spinner | ⚠️ ACCEPTABLE | — | `item/[id].tsx:143` | `ActivityIndicator` for a detail screen is acceptable. |

### 5.2 Pull-to-Refresh

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 107 | Home tab — pull-to-refresh | ✅ PASS | — | `(tabs)/index.tsx:329-333` | `RefreshControl` with haptic feedback. ✅ |
| 108 | Activity tab — pull-to-refresh | ✅ PASS | — | `(tabs)/activity.tsx:212-216` | ✅ |
| 109 | Circle tab — pull-to-refresh | ✅ PASS | — | `(tabs)/circle.tsx:143,194` | ✅ (both views) |
| 110 | Wishlist tab — pull-to-refresh | ✅ PASS | — | `(tabs)/wishlist.tsx:77` | ✅ |
| 111 | Profile tab — NO pull-to-refresh | ❌ FAIL | 🟡 Should-fix | `(tabs)/profile.tsx:110` | `ScrollView` with no `RefreshControl`. **Fix:** Add `RefreshControl` to the profile ScrollView. |
| 112 | Item detail — NO pull-to-refresh | ⚠️ NOTE | 🔵 Nice-to-have | `item/[id].tsx` | No pull-to-refresh on item detail. Less critical since the screen loads fresh on mount. |

### 5.3 Offline Handling

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 113 | Network error classification | ✅ PASS | — | `errors.ts:72-91` | `isNetworkError()` detects offline patterns and returns user-friendly message. ✅ |
| 114 | ErrorView component for network errors | ✅ PASS | — | `src/components/ErrorView.tsx` | Renders retry button for network errors. ✅ |
| 115 | Proactive offline detection | ❌ FAIL | 🟡 Should-fix | N/A | No `@react-native-community/netinfo` integration. The app only detects offline when a network request fails (reactive). There's no banner, no offline mode, no cached data display. **Fix:** Add `NetInfo` to detect connectivity changes and show an offline banner. Consider caching last-known data in AsyncStorage for offline viewing. |
| 116 | No offline data caching | ❌ FAIL | 🟡 Should-fix | All `src/lib/` files | No data caching strategy. When offline, all screens show error states. For a luxury app used in shopping malls (potentially poor signal), this is a poor experience. **Fix:** Implement AsyncStorage caching of last-known data for key screens (Home, Circle). |

### 5.4 Haptic Feedback

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 117 | Haptic helpers centralized | ✅ PASS | — | `src/lib/haptics.ts` | Four helpers: light, medium, success, error. ✅ |
| 118 | Haptics on key actions | ✅ PASS | — | Multiple files | Haptics on: invite validation, auth sign-in/up, profile setup, item card press, toggle, nudge, sign out, pull-to-refresh, reactions, comments. 189 references across the codebase. ✅ |
| 119 | Haptics on borrow actions | ⚠️ PARTIAL | 🔵 Nice-to-have | `borrow/active.tsx`, `borrow/request.tsx` | Borrow request submission, accept, decline, and return actions do NOT call haptic functions. **Fix:** Add `hapticSuccess()` on successful borrow actions, `hapticError()` on failures. |

### 5.5 Deep Linking Support

| # | Check | Status | Severity | File / Line | Details & Fix |
|---|-------|--------|----------|-------------|---------------|
| 120 | URL scheme registered | ✅ PASS | — | `app.json:8` | `"scheme": "tresor"`. ✅ |
| 121 | `expo-linking` dependency | ✅ PASS | — | `package.json:23` | `expo-linking` installed. ✅ |
| 122 | Deep link to item detail | ❌ FAIL | 🟡 Should-fix | `app/item/[id].tsx` | No `Linking` configuration or deep link handling. The `tresor://item/[id]` pattern would work with expo-router's file-based routing, but there's no handling for incoming links (e.g., from a share button or push notification). **Fix:** Add a `useDeepLinking` hook that parses incoming links and navigates. Add share functionality that generates `tresor://item/{id}` links. |
| 123 | Push notification deep linking | ❌ FAIL | 🟡 Should-fix | N/A | The nudge RPC returns push notification data (`push_title`, `push_body`, `push_data` with `borrow_id`), but there's no push notification handler that would deep-link to the relevant borrow transaction when tapped. **Fix:** Add `expo-notifications` with a notification response handler that navigates to the borrow detail. |
| 124 | Universal links (iOS) | ❌ FAIL | 🔵 Nice-to-have | `app.json:11-13` | No `associatedDomains` configured in `app.json`. For production, `tresor.app/item/{id}` universal links would provide a better experience than custom URL schemes. **Fix:** Configure `associatedDomains` in `app.json` and set up Apple App Site Association. |

---

## Summary by Priority

### 🔴 Blockers (3) — Must fix before production

1. **Auth flow uses email/password, not phone OTP** (#62, #65) — The UAE market requires phone-first auth. The `AuthContext` already has `signInWithPhone()` and `verifyOtp()` methods, but the UI (`phone-otp.tsx`) collects email/password instead. Rewrite the auth screen to use phone input → OTP verification.

2. **`create_co_owned_item` and `process_buyout` RPCs have no authentication checks** (#16, #17) — These `SECURITY DEFINER` functions accept user IDs as parameters without verifying the caller is who they claim to be. Any authenticated user can create items or buy out shares as any other user. Add `auth.uid()` checks at the top of both functions.

3. **No pagination on any query** (#44) — `getItems()`, `getMyItems()`, `getActiveBorrows()`, `getBorrowHistory()`, `getCircleWishlists()` all fetch unbounded result sets. The app will degrade and potentially crash with 100+ items. Add `.limit()` and cursor-based pagination.

### 🟡 Should-fix (11) — Fix before or shortly after launch

4. Missing index on `borrow_transactions.circle_id` (#4)
5. Borrow status transitions not enforced in DB (#19)
6. Invite codes never expire (#20)
7. Inconsistent error handling patterns across lib files (#34)
8. `borrow.ts` nudgeBorrower stub shadows real implementation (#37)
9. No input validation on `createItem` and `requestBorrow` (#38, #39)
10. No pagination on `getActiveBorrows`, `getBorrowHistory`, `getCircleWishlists` (#46, #47, #49)
11. Profile tab has no loading state (#57)
12. No profile check in route guard — authenticated users without profiles bypass onboarding (#79)
13. `.or()` filter with string interpolation in borrow.ts (#86)
14. No rate limiting on `create_co_owned_item`, `process_buyout`, borrow requests, or invite code validation (#89-92)
15. No file type validation on avatar or item photo uploads (#94, #96)
16. No proactive offline detection or data caching (#115, #116)
17. No deep linking to item details or push notification handling (#122, #123)
18. Profile tab has no pull-to-refresh (#111)
19. `getCollectionInsights` and `getFeedData` fetch unbounded data (#51, #52)
20. `activity_feed.circle_id` allows NULL, making some activities invisible (#11)
21. `items.category` is nullable (#12)
22. `profiles.display_name` is nullable (#14)

### 🔵 Nice-to-have (9) — Polish for v1.1

23. Missing indexes on `borrow_nudges.borrower_id`, `items.current_custodian_id`, `custody_transfers.circle_id` (#6, #7, #8)
24. `item_owners.user_id` ON DELETE SET NULL leaves orphaned shares (#10)
25. Missing `updated_at` on `notifications`, `wishlists`, `item_photos` (#28, #29, #30)
26. Demo credentials displayed on login screen (#84)
27. Circle tab uses spinners instead of skeletons (#104)
28. No file size check on uploads (client-side) (#97)
29. No haptics on borrow actions (#119)
30. Universal links not configured (#124)
31. No name length validation on profile creation (#42)
32. No price validation on wishlist items (#43)

---

## Architecture Observations (Non-blocking)

- **RLS is well-hardened:** Migrations 0010 and 0011 fixed recursion bugs and data leaks. The iterative approach (test → find → fix) has produced a solid security posture.
- **Trigger design is excellent:** Activity feed triggers, share validation triggers, and custodian update triggers are well-structured with `SECURITY DEFINER` and proper `search_path` settings.
- **The `co-ownership` module is the most complex part of the codebase** and has the most security concerns (RPC auth checks, rate limiting, input validation).
- **The `errors.ts` module is a strong foundation** but needs to be adopted consistently across all API modules.
- **The Supabase config is production-ready** with rate limiting, token rotation, and env-based secrets properly configured.
- **CI pipeline exists** but lint and test steps are `continue-on-error: true` — they don't gate merges.

---

*End of audit. No fixes have been applied. Awaiting review and fix dispatch.*
