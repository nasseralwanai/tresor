# Trésor — Technical Architecture Review

**Author:** Nigel, System Architect
**Date:** 2026-08-05
**For:** Dwight (Dev Lead) and the Trésor team
**Status:** Final — actionable

This document reviews the database schema, Expo app structure, and design mockup against the project brief (`BRIEF.md`). Each section includes findings, severity ratings, and concrete fixes (including SQL where applicable). The final section is a prioritized action list for the team.

---

## Table of Contents

1. [Database Schema Review](#1-database-schema-review)
2. [Expo App Structure Review](#2-expo-app-structure-review)
3. [Design Coverage Audit](#3-design-coverage-audit)
4. [Recommended Next Steps (Prioritized)](#4-recommended-next-steps-prioritized)

---

## 1. Database Schema Review

**File:** `supabase/migrations/0001_initial_schema.sql` (530 lines)

### 1.1 Overall Assessment

The schema is well-structured. Table relationships are correct, UUID PKs everywhere, `TIMESTAMPTZ` defaults, RLS enabled on all tables, and the normalization is generally sound. The borrow transaction lifecycle is more sophisticated than the brief requires (good — `returned_pending` + `completed` is better than the brief's simpler model). However, there are **critical gaps in the wishlist schema, missing indexes for RLS performance, an overly permissive activity_feed insert policy, and insufficient activity triggers**.

### 1.2 Tables & Relationships

| Finding | Severity | Detail |
|---|---|---|
| **Wishlist items missing savings-goal columns** | 🔴 Critical | The brief requires `target_price`, `current_savings`, `target_date`, `url`, `image_url` on wishlist items. The `wishlist_items` table has `max_price` and `source_url` but is **missing `current_savings`, `target_date`, and `image_url`**. The design mockup (Screen 7) shows savings progress bars — these cannot be backed without schema changes. |
| **`primary_image_url` on `items` is redundant with `item_photos.is_primary`** | 🟡 Medium | Two sources of truth for the primary image. Can lead to inconsistency. Recommend removing `primary_image_url` and using a view or app-level query to resolve from `item_photos`. |
| **No ownership-transfer mechanism** | 🟢 Low | `borrow_transactions.lender_id` is a snapshot of `items.owner_id` at request time (good design). But if an item changes owner, there's no mechanism. Not required by brief, just noting. |
| **No `circles.max_members` constraint** | 🟢 Low | Brief says 5-15 women. Could add a CHECK or app-level validation. Not a schema blocker. |

### 1.3 RLS Policy Gaps

| Finding | Severity | Detail |
|---|---|---|
| **`activity_feed` insert policy is `with check (true)`** | 🔴 Critical | Any authenticated user can insert arbitrary activity entries — impersonation risk, spam, misleading feed entries. Should be restricted to the `service_role` (for triggers/Edge Functions) or to inserts where `user_id = auth.uid()`. |
| **`circles_insert_any` is `with check (true)`** | 🟡 Medium | Any user can create unlimited circles. Probably acceptable for the app (anyone can start a circle), but should be documented and rate-limited at the API layer. |
| **`wishlist_items` has no circle-visibility select policy** | 🟡 Medium | `wishlists` has a `wishlists_circle_members_select_nonprivate` policy, but `wishlist_items` does not. If a wishlist is shared (non-private), circle members can see the wishlist row but NOT its items. Inconsistent. |
| **No `profiles` delete policy** | 🟢 Low | Users can insert and update their own profile but cannot delete it. Account deletion would need to go through `auth.users` cascade. Acceptable if deletion is handled at the auth layer. |
| **No `item_photos` delete policy** | 🟢 Low | `item_photos_owner_all` uses `for all` which includes delete, so this is actually covered. ✓ No issue. |
| **`price_history` insert limited to item owner only** | 🟡 Medium | Price tracking runs via scheduled Edge Functions (service role, bypasses RLS). If any client-side price submission is needed, this policy blocks it. Acceptable if all price tracking is server-side. |

### 1.4 Missing Indexes

The RLS helper functions `is_circle_member()` and `is_circle_admin()` run `SELECT 1 FROM circle_members WHERE circle_id = _ AND user_id = auth.uid()` on **every RLS check**. Without an index on `user_id`, this is a sequential scan.

```sql
-- ========================================================================
-- CRITICAL: Add these indexes to migration 0002
-- ========================================================================

-- RLS helper performance: every is_circle_member() / is_circle_admin() call
-- filters by user_id. Without this, RLS checks do sequential scans.
create index if not exists idx_circle_members_user_id
  on public.circle_members (user_id);

-- Composite: "browse available items in my circle, filtered by category"
create index if not exists idx_items_circle_category
  on public.items (circle_id, category)
  where circle_id is not null;

-- Composite: "browse available items in my circle"
create index if not exists idx_items_circle_status
  on public.items (circle_id, status)
  where circle_id is not null;

-- "My active borrows" / "items I've lent" — common dashboard queries
create index if not exists idx_borrow_borrower_status
  on public.borrow_transactions (borrower_id, status);

create index if not exists idx_borrow_lender_status
  on public.borrow_transactions (lender_id, status);

-- Filtered activity feed (e.g., "show only borrow events in my circle")
create index if not exists idx_activity_circle_type_created
  on public.activity_feed (circle_id, type, created_at desc);

-- Wishlist item lookups by wishlist
create index if not exists idx_wishlist_items_wishlist_id
  on public.wishlist_items (wishlist_id);

-- "Latest price for an item" — most common price_history query
create index if not exists idx_price_history_item_recorded
  on public.price_history (item_id, recorded_at desc);
```

### 1.5 Enum Type Issues

| Finding | Severity | Detail |
|---|---|---|
| **`item_category` enum insufficient** | 🟡 Medium | The `category-taxonomy.md` research file defines 8 primary categories. The enum has 7 (`bag, jewelry, watch, shoes, clothing, accessories, other`) — missing `fragrance` and `home`. Also, `bag` should be `handbag` for clarity. However, changing enums in Postgres is painful (can't remove values). Consider whether `other` is sufficient or whether a `categories` lookup table with a `parent_id` self-reference would be more flexible for the subcategory taxonomy. |
| **No `material` / `hardware` enum or tags** | 🟡 Medium | The category taxonomy research file emphasizes materials/hardware as critical for luxury valuation and search. No schema support for this. Consider a `item_tags` table or a `materials` array column. |
| **`activity_type` enum incomplete** | 🟡 Medium | Missing: `wishlist_item_updated`, `wishlist_item_removed`, `item_photo_added`. The trigger only fires on `item_added`; borrow and wishlist events have no triggers. |
| **`borrow_status` enum is well-designed** | 🟢 Good | `returned_pending` + `completed` separation is better than the brief's model. No change needed. |
| **`item_condition` enum mismatch with taxonomy** | 🟡 Low | Taxonomy file defines grades as: Pristine, Excellent, Very Good, Good, Fair, Vintage. Enum has: `new, like_new, good, fair, poor`. Missing "vintage" and "excellent" distinction. |

### 1.6 Activity Feed Triggers

**Only one trigger exists** (`trg_items_create_activity` on `items` AFTER INSERT). The brief requires activity entries for:
- ✅ New items added — covered
- ❌ Borrow requests — no trigger on `borrow_transactions` insert
- ❌ Borrow approvals/activations/returns — no trigger on `borrow_transactions` update
- ❌ Wishlist items added — no trigger on `wishlist_items` insert
- ❌ Price alerts — no trigger (would come from Edge Functions)
- ❌ Member joined/left — no trigger on `circle_members` insert/delete

```sql
-- ========================================================================
-- RECOMMENDED: Add activity triggers for borrow lifecycle
-- ========================================================================

create or replace function public.create_borrow_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name   text;
  _circle_id    uuid;
  _item_display text;
  _activity_type activity_type;
  _summary      text;
begin
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = new.borrower_id;

  _circle_id := new.circle_id;

  select concat_ws(' ', brand, model_name) into _item_display
  from public.items where id = new.item_id;

  -- Map borrow status to activity type
  _activity_type := case new.status
    when 'requested'  then 'borrow_requested'::activity_type
    when 'approved'   then 'borrow_approved'::activity_type
    when 'active'     then 'borrow_active'::activity_type
    when 'returned_pending' then 'borrow_returned'::activity_type
    when 'completed'  then 'borrow_completed'::activity_type
    when 'declined'   then 'borrow_declined'::activity_type
    else null
  end;

  if _activity_type is null then
    return new;
  end if;

  _summary := case new.status
    when 'requested'  then concat(_actor_name, ' requested to borrow ', _item_display)
    when 'approved'   then concat('Borrow request approved for ', _item_display)
    when 'active'     then concat(_actor_name, ' is now borrowing ', _item_display)
    when 'returned_pending' then concat(_item_display, ' has been returned (pending confirmation)')
    when 'completed'  then concat(_item_display, ' borrow completed')
    when 'declined'   then concat('Borrow request declined for ', _item_display)
    else null
  end;

  insert into public.activity_feed (circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata)
  values (
    _circle_id, new.borrower_id, _activity_type, new.item_id, new.id,
    _actor_name, _summary,
    jsonb_build_object('status', new.status, 'item_display', _item_display)
  );

  return new;
end;
$$;

-- Fire on both insert (request) and update (status changes)
create trigger trg_borrow_create_activity_insert
  after insert on public.borrow_transactions
  for each row execute function public.create_borrow_activity();

create trigger trg_borrow_create_activity_update
  after update of status on public.borrow_transactions
  for each row
  when (old.status is distinct from new.status)
  execute function public.create_borrow_activity();
```

### 1.7 Wishlist Schema Fix

```sql
-- ========================================================================
-- CRITICAL: Add missing savings-goal columns to wishlist_items
-- ========================================================================

alter table public.wishlist_items
  add column if not exists target_price   decimal(10,2),
  add column if not exists current_savings decimal(10,2) not null default 0,
  add column if not exists target_date    date,
  add column if not exists image_url      text,
  add column if not exists ai_metadata    jsonb;

-- RLS: allow circle members to view non-private wishlist items
create policy "wishlist_items_circle_members_select_nonprivate"
  on public.wishlist_items for select
  using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from public.wishlists w
        where w.id = wishlist_items.wishlist_id
          and not w.is_private
      )
      and exists (
        select 1 from public.circle_members cm1
        where cm1.user_id = auth.uid()
          and cm1.circle_id in (
            select cm2.circle_id from public.circle_members cm2
            where cm2.user_id = wishlist_items.user_id
          )
      )
    )
  );

-- Fix the overly permissive activity_feed insert policy
drop policy if exists "activity_feed_insert_any" on public.activity_feed;

create policy "activity_feed_insert_own"
  on public.activity_feed for insert
  with check (user_id = auth.uid() or user_id is null);
  -- user_id is null allows service_role / triggers to insert system events
```

---

## 2. Expo App Structure Review

**Directory:** `app/` (Expo SDK 57, React Native 0.86, Expo Router)

### 2.1 Overall Assessment

The Phase 1 scaffold is solid. File-based routing is correct, the tab layout matches the brief's 5-tab spec, the theme system has dark/light support, and the Supabase client is properly configured with AsyncStorage. However, there is **one blocking bug** (`main` field points to a nonexistent file), a **missing Theme provider** in the root layout, and several **missing config files** that will cause issues as development progresses.

### 2.2 Blocking Issues

| Finding | Severity | Detail |
|---|---|---|
| **`package.json` `"main": "index.ts"` — file doesn't exist** | 🔴 Blocker | `index.ts` is not in the project root. Expo Router apps should either omit `main` (SDK 57 auto-detects `expo-router/entry`) or set it to `"expo-router/entry"`. **The app will not boot in its current state.** |
| **`_layout.tsx` doesn't apply React Navigation theme** | 🔴 Blocker | `TresorDarkTheme` / `TresorLightTheme` are exported from `colors.ts` but never used. The root layout renders `<Tabs>` without wrapping in `<ThemeProvider>` or passing `theme` prop. React Navigation's built-in components (headers, tab bar backgrounds) won't receive brand colors. |

### 2.3 Structure & Config Issues

| Finding | Severity | Detail |
|---|---|---|
| **Missing `metro.config.js`** | 🟡 Medium | Not strictly required for SDK 57 but recommended for monorepo support, custom resolvers, and stable SVG/font handling. |
| **Missing `.env.example`** | 🟡 Medium | `supabase.ts` references `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` but no `.env.example` template exists. New developers have to guess variable names. |
| **Supabase client has fake fallback key** | 🟡 Medium | `supabase.ts` line 8: fallback `'eyJhbG...fqgM'` is a truncated/redacted JWT. If env vars are missing, the client silently initializes with a broken key instead of throwing. The throw on line 10-12 will never trigger because the `||` fallback always provides a truthy string. |
| **`app.json` references nonexistent `adaptive-icon.png`** | 🟡 Medium | `android.adaptiveIcon.foregroundImage` points to `./assets/adaptive-icon.png` but the file doesn't exist. Assets are named `android-icon-foreground.png` etc. |
| **Typography `'SF Pro Text'` may not resolve** | 🟡 Low | In React Native on iOS, the system font is SF Pro, but specifying `fontFamily: 'SF Pro Text'` is unreliable. Use `undefined` (system default) or `Platform.select({ ios: undefined, default: 'system' })`. |
| **No Supabase generated types** | 🟡 Medium | No `src/types/database.types.ts`. Should run `supabase gen types typescript --local > src/types/database.types.ts` and wire into the Supabase client for type-safe queries. |

### 2.4 Missing Dependencies for Upcoming Phases

These aren't Phase 1 blockers but should be tracked:

| Dependency | Phase | Purpose |
|---|---|---|
| `expo-camera` or `expo-image-picker` | 3, 4 | Photo capture for item add |
| `expo-image-manipulator` | 3 | Image compression to WebP |
| `expo-haptics` | 7 | 11 haptic interaction mappings |
| `expo-local-authentication` | 7 | Face ID app lock |
| `expo-notifications` | 5 | Push notifications for borrow events |
| `react-native-reanimated` | 7 | 60fps animations, skeleton shimmer |
| `react-native-gesture-handler` | 7 | Swipe actions on borrow cards |
| `expo-secure-store` | 2, 7 | Secure token storage (Face ID, sensitive data) |
| `expo-av` | 4 | Voice search (audio recording) |

### 2.5 Recommended Fixes

```typescript
// === FIX 1: package.json — remove or fix "main" field ===
// Remove this line:
//   "main": "index.ts"
// Replace with:
//   "main": "expo-router/entry"

// === FIX 2: app/_layout.tsx — add Theme provider ===
import { ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { TresorDarkTheme, TresorLightTheme } from '@/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = useThemeColors();

  return (
    <ThemeProvider value={scheme === 'dark' ? TresorDarkTheme : TresorLightTheme}>
      <Tabs screenOptions={{/* ...existing... */}}>
        {/* ...existing tabs... */}
      </Tabs>
    </ThemeProvider>
  );
}

// === FIX 3: src/lib/supabase.ts — remove fake fallback ===
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in values.'
  );
}

// === FIX 4: Create .env.example ===
// EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key-here
```

### 2.6 Project Structure Assessment

```
app/
├── app/                    # Expo Router routes ✓
│   ├── _layout.tsx         # Tab layout ✓ (needs ThemeProvider)
│   ├── index.tsx           # My Trésor ✓
│   ├── circle.tsx          # Circle ✓
│   ├── add.tsx             # Add item ✓
│   ├── wishlist.tsx        # Wishlist ✓
│   └── activity.tsx        # Activity ✓
├── src/
│   ├── components/         # EmptyState.tsx ✓
│   ├── hooks/              # (empty — expected Phase 1)
│   ├── lib/
│   │   └── supabase.ts     # ✓ (needs fix)
│   └── theme/
│       ├── colors.ts       # ✓ (well done)
│       └── index.ts        # ✓ (typography, spacing, radius)
├── assets/                 # Icons ✓ (adaptive-icon.png missing)
├── app.json                # ✓ (adaptive-icon path wrong)
├── babel.config.js         # ✓ (module-resolver for @/ alias)
├── tsconfig.json           # ✓ (strict, path aliases)
├── eas.json                # ✓ (dev/preview/production profiles)
└── package.json            # ⚠️ ("main" field broken)
```

**Missing directories to create for Phase 2+:**
- `app/(auth)/` — onboarding flow screens (invite code, OTP, profile setup)
- `app/item/[id].tsx` — item detail screen (dynamic route)
- `app/member/[id].tsx` — member collection detail
- `src/components/` — needs ItemCard, MemberRow, BorrowCard, etc.
- `src/hooks/` — useAuth, useItems, useBorrows, useWishlist
- `src/types/` — database.types.ts (generated)
- `src/utils/` — formatters, validators
- `supabase/functions/` — Edge Functions directory

---

## 3. Design Coverage Audit

**File:** `design/full-app-mockup.html` (2,684 lines, 9 screen sections, 13 phone frames)

### 3.1 Screens in Mockup

| # | Screen | Phone Frames | Notes |
|---|---|---|---|
| 1 | Onboarding / Invite Code | 1 | Velvet rope entry, invite code input, circle preview avatars |
| 2 | My Trésor (Home) | 1 | Featured carousel + category shelves + tab bar |
| 3 | Circle | 2 | Overview with stats + member collection grid |
| 4 | Add Item — AI Photo Flow | 3 | Camera → AI analyzing → AI results/confirm |
| 5 | Item Detail | 1 | Parallax photo, tabbed sections, borrow CTA |
| 6 | Borrow Flow | 3 | Request modal → approval → active borrow with countdown |
| 7 | Wishlist | 1 | Savings progress bars, price alerts, priority tags |
| 8 | Activity Feed | 1 | Timeline with icons, timestamps, item thumbnails |
| 9 | Profile | 1 | Avatar, stats, circle card, settings list with toggles |

### 3.2 Brief Feature → Screen Coverage

| Brief Feature | Covered? | Screen | Gap |
|---|---|---|---|
| **Onboarding: invite code** | ✅ | 1 | |
| **Onboarding: phone OTP verification** | ❌ | — | **Missing screen** — brief specifies 5-screen onboarding flow |
| **Onboarding: profile setup (name, photo)** | ❌ | — | **Missing screen** |
| **Onboarding: add first item (time-to-value)** | ❌ | — | **Missing screen** — brief says "Add first item via photo by screen 4" |
| **Onboarding: circle preview** | ⚠️ Partial | 1 | Small avatar row at bottom, not a full preview screen |
| **AI Photo Add** | ✅ | 4 | Full 3-state flow |
| **Link Add** | ❌ | — | **Missing** — brief specifies URL → AI extracts product info |
| **Manual Add** | ❌ | — | **Missing** — brief specifies fallback form |
| **Inventory browse: 2-col grid** | ⚠️ Partial | 2 | Mockup uses horizontal shelves/carousels. Brief says "2-column grid (default), list toggle" |
| **Filter (category/brand/availability/owner/color)** | ❌ | — | **Missing** — no filter bottom sheet in mockup |
| **List view toggle** | ❌ | — | **Missing** |
| **Item detail** | ✅ | 5 | Parallax, tabs, borrow CTA |
| **Browse members' inventories** | ✅ | 3 | Member list + collection grid |
| **Activity feed** | ✅ | 8 | Timeline with event types |
| **Borrow: request** | ✅ | 6 | Date picker, note field |
| **Borrow: approval** | ✅ | 6 | |
| **Borrow: active tracking** | ✅ | 6 | Countdown, progress bar |
| **Borrow: return action** | ❌ | — | **Missing** — no return confirmation screen |
| **Wishlist: savings goals** | ✅ | 7 | Progress bars, target prices |
| **Wishlist: price drop alerts** | ✅ | 7 | |
| **Wishlist: priority tags** | ✅ | 7 | |
| **AI similar item suggestions** | ❌ | — | **Missing** — brief Phase 6 feature |
| **Voice search** | ❌ | — | **Missing** — brief Phase 4 feature |
| **Bottom tab: 5 tabs** | ✅ | 2, 3, 7, 8 | My Trésor, Circle, Add (elevated), Wishlist, Activity |
| **Dark mode** | ✅ | All | Toggle button in mockup header |
| **Face ID app lock** | ❌ | — | **Missing** — brief Phase 7 feature |
| **Live Activities (borrow countdown)** | ❌ | — | **Missing** — brief Phase 7 feature (lock screen widget) |
| **Skeleton shimmer loaders** | ❌ | — | **Missing** — brief Phase 7 feature |
| **Profile / settings** | ✅ | 9 | |
| **Admin: generate invite codes** | ❌ | — | **Missing** — brief specifies admin role |
| **Admin: remove members** | ❌ | — | **Missing** |
| **Admin: edit circle settings** | ❌ | — | **Missing** |
| **Push notifications** | ❌ | — | **Missing** — mentioned in brief but no notification screen |
| **Haptics** | N/A | — | Not a visual screen, but no documentation of mappings |

### 3.3 Design Coverage Summary

**9 screens present, but 7 brief-required screens are missing:**

1. **Phone OTP verification screen** — onboarding step 3
2. **Profile setup screen** — onboarding step 4
3. **Add first item screen** — onboarding step 5 (time-to-value)
4. **Link add flow** — AI link parsing
5. **Manual add form** — fallback item entry
6. **Filter/sort bottom sheet** — inventory filtering
7. **Return confirmation screen** — borrow return flow

**Design system quality:** The "Boutique Shelf" variant (Warm Atelier palette, Playfair Display + Jost) is well-executed. Dark mode is properly designed. The phone frames are accurate (375×812 iPhone dimensions). The AI photo flow (Screen 4) is particularly strong — shows the 3-state progression with scan animation and confidence percentages.

**Note on app vs. mockup theme mismatch:** The mockup uses a warm cream/espresso/camel palette (`#FAF7F2` bg, `#9B7B5A` accent). The app's theme system uses a cooler gold/charcoal palette (`#F5F2ED` cream, `#C9A961` gold). These should be aligned before Phase 3 UI work. The mockup's palette is warmer and more "luxury atelier"; the app's is more "tech gold." Nasser should approve which direction to use.

---

## 4. Recommended Next Steps (Prioritized)

### P0 — Blocking (do before any other development)

| # | Task | Owner | Effort |
|---|---|---|---|
| 1 | **Fix `package.json` `main` field** — change `"main": "index.ts"` to `"main": "expo-router/entry"` or remove the field entirely | Mauricio | 5 min |
| 2 | **Wrap root layout in ThemeProvider** — apply `TresorDarkTheme`/`TresorLightTheme` so React Navigation components get brand colors | Mauricio | 15 min |
| 3 | **Fix Supabase client fallback** — remove fake JWT string so the env-var check actually works | Mauricio | 5 min |
| 4 | **Create `.env.example`** — document required env vars | Mauricio | 5 min |

### P1 — Critical (do before Phase 2 starts)

| # | Task | Owner | Effort |
|---|---|---|---|
| 5 | **Create migration `0002_wishlist_savings_goals.sql`** — add `current_savings`, `target_date`, `image_url`, `ai_metadata` to `wishlist_items`; add `wishlist_items_circle_members_select_nonprivate` RLS policy | Nigel + Mauricio | 1 hr |
| 6 | **Create migration `0003_indexes_and_rls_fixes.sql`** — add all indexes from §1.4; fix `activity_feed` insert policy; add borrow activity triggers from §1.6 | Nigel + Mauricio | 2 hr |
| 7 | **Fix `app.json` adaptive icon path** — rename assets or update config | Mauricio | 10 min |
| 8 | **Generate Supabase TypeScript types** — `supabase gen types typescript --local > src/types/database.types.ts` and wire into client | Mauricio | 30 min |
| 9 | **Align theme palettes** — decide whether the app uses the mockup's Warm Atelier palette or the current gold/charcoal palette. Nasser must approve. | Muaath + Nasser | 1 hr |

### P2 — Important (do during Phase 2)

| # | Task | Owner | Effort |
|---|---|---|---|
| 10 | **Create missing onboarding mockup screens** — phone OTP, profile setup, add-first-item | Muaath | 4 hr |
| 11 | **Create filter/sort bottom sheet mockup** | Muaath | 2 hr |
| 12 | **Create link-add and manual-add flow mockups** | Muaath | 3 hr |
| 13 | **Set up auth context/provider** — session management, auth-guarded navigation, redirect to onboarding | Sonny | 4 hr |
| 14 | **Create `supabase/functions/` directory** — scaffold Edge Function structure for AI vision, link parsing | Mauricio | 1 hr |
| 15 | **Add `metro.config.js`** | Mauricio | 30 min |

### P3 — Backlog (Phase 3+)

| # | Task | Owner | Phase |
|---|---|---|---|
| 16 | Consider `categories` lookup table instead of enum (for subcategory taxonomy from research) | Nigel | 3 |
| 17 | Add `materials`/`hardware` tagging support (item_tags table or array column) | Nigel | 3 |
| 18 | Add activity triggers for wishlist and member join/leave events | Nigel | 5 |
| 19 | Create admin screens mockup (invite code generation, member management) | Muaath | 5 |
| 20 | Install Phase-appropriate dependencies as each phase begins (see §2.4 table) | Mauricio | ongoing |
| 21 | Configure `expo-secure-store` for Face ID / sensitive data | Muaath | 7 |
| 22 | Create return-confirmation screen mockup | Muaath | 5 |
| 23 | Set up ESLint + Prettier (remove `continue-on-error` from CI) | Mauricio | 2 |

---

## Appendix: File Inventory Reviewed

| File | Lines | Purpose |
|---|---|---|
| `BRIEF.md` | 245 | Project requirements |
| `supabase/migrations/0001_initial_schema.sql` | 530 | Database schema, RLS, triggers |
| `supabase/seed.sql` | 50 | Local dev test data |
| `supabase/config.toml` | 414 | Local Supabase config |
| `app/package.json` | 40 | Dependencies, scripts |
| `app/app/_layout.tsx` | 126 | Root tab layout |
| `app/app/index.tsx` | 25 | My Trésor (empty state) |
| `app/app/circle.tsx` | 25 | Circle (empty state) |
| `app/app/add.tsx` | 70 | Add item options |
| `app/app/wishlist.tsx` | 25 | Wishlist (empty state) |
| `app/app/activity.tsx` | 25 | Activity (empty state) |
| `app/src/lib/supabase.ts` | 21 | Supabase client |
| `app/src/theme/colors.ts` | 77 | Brand colors, RN themes |
| `app/src/theme/index.ts` | 63 | Typography, spacing, radius |
| `app/src/components/EmptyState.tsx` | 49 | Reusable empty state |
| `app/app.json` | 1 | Expo config |
| `app/tsconfig.json` | 1 | TypeScript config |
| `app/babel.config.js` | 16 | Babel + module-resolver |
| `app/eas.json` | 1 | EAS build profiles |
| `design/full-app-mockup.html` | 2,684 | Full app design (9 screens) |
| `design/category-taxonomy.md` | 215 | Luxury category research |
| `.github/workflows/ci.yml` | 40 | CI pipeline |

---

*End of document. Questions → Nigel.*
