# Task Brief: Circle Feed Redesign — Segregated Feed UI

**To:** Muaath (Designer)
**From:** Dwight (Dev Lead)
**Date:** 2026-08-07
**Priority:** High — Phase 2 of the feed redesign
**Spec source:** `docs/NUDGE_AND_FEED_SPEC.md` Part II (§12–§21), by Nigel (System Architect)

---

## Objective

Redesign Section 6 (Activity Feed) of `design/full-app-mockup.html` to replace the current flat chronological feed with a **segregated, sectioned feed** that Nasser described as: *"something creative, not overwhelming, but segregated so you can see the latest activity, or allow people to share things between themselves, wishlists, and so on."*

The mockup is the design source of truth — engineers build from it. Get this right and the implementation follows.

---

## Nasser's Requirement (in his words)

> "The circle feed needs to be something creative, not overwhelming, but segregated so you can see the latest activity, or allow people to share things between themselves, wishlists, and so on."

**Translate to design principles:**
- **Segregated** — distinct visual zones with section headers, not an undifferentiated scroll
- **Creative, not overwhelming** — editorial luxury feel; each section has a clear purpose
- **Share things between themselves** — social interactions (react, comment, share items)
- **Wishlists** — shared wishlists get their own section, not buried in activity

---

## Current State — What Exists Today

### Current screen: `app/app/(tabs)/activity.tsx`

A **flat chronological list** of `ActivityEntry` rows. Each row is a `Card` with:
- Avatar (initials, gradient background)
- Actor name + summary text (e.g., "Sarah added a Chanel Classic Flap")
- Relative timestamp ("2h", "5h", "1d")
- Colored icon (MaterialCommunityIcons) indicating activity type
- Optional mini-item block (brand + type label with photo placeholder)
- "Mark Returned" button on active borrows (if current user is the lender)

At the top of the feed there is a single **"Who Wore It Best?"** voting card — 3 candidates with photo placeholders, names, brands, vote counts, and tap-to-vote.

**No filtering. No sections. No social interactions (react/comment/share). No item images in the feed.**

### Current data flow

```
activity.tsx → getActivityFeed(circleId) → activity.ts lib → Supabase
```

**`getActivityFeed(circleId, limit=50)`** queries the `activity_feed` table:
```sql
SELECT *, items!activity_feed_item_id_fkey(brand)
FROM activity_feed
WHERE circle_id = ?
ORDER BY created_at DESC
LIMIT 50
```

Returns `ActivityEntry[]` with fields: `id, circle_id, user_id, type, item_id, borrow_id, actor_name, summary, item_brand, metadata, created_at`.

### `activity_feed` table schema (migration 0001)

```sql
create table public.activity_feed (
  id         uuid primary key,
  circle_id  uuid references circles(id),
  user_id    uuid references profiles(id),
  type       activity_type not null,  -- enum: see below
  item_id    uuid references items(id),
  borrow_id  uuid references borrow_transactions(id),
  actor_name text,
  summary    text,
  metadata   jsonb,
  created_at timestamptz default now()
);
```

**`activity_type` enum (current values):**
`item_added`, `item_updated`, `item_removed`, `borrow_requested`, `borrow_approved`, `borrow_active`, `borrow_returned`, `borrow_completed`, `borrow_declined`, `wishlist_item_added`, `price_alert`, `member_joined`, `member_left`

**New enum values proposed (§18.2):** `item_shared`, `wishlist_shared`, `feed_reaction`, `feed_comment`

### `items` table (available for the Latest Items section)

Key columns: `id, owner_id, circle_id, brand, model_name, category, condition, status, estimated_value, currency, primary_image_url, is_private, is_lendable, created_at`

### `wishlists` / `wishlist_items` tables (available for Shared Wishlists section)

`wishlists`: `id, user_id, name, is_private, created_at`
`wishlist_items`: `id, wishlist_id, user_id, item_id, brand, model_name, category, max_price, notes, image_url, priority, fulfilled, target_price, current_savings, target_date`

---

## What Nigel Proposes — The 5 Sections

Nigel's spec (§13–§14) proposes **five sections** plus **filter pills** at the top. Here's each section with what goes in it:

### Filter Pills (top, horizontal scroll)

```
[All] [Borrows] [Items] [Wishlists] [Shares]
```

Tapping a pill filters the feed to show only that section. "All" is the default. These are pill-shaped toggles — active pill is gold (`--acc`), inactive is outlined.

### Section 1: Featured (pinned, always visible)

A curated top zone. Contains:
- **"Who Wore It Best?" voting card** — moved here from the flat list (already exists in current design). Trophy icon, 2–3 candidates with photo placeholders, names, brands, vote counts, tap-to-vote.
- **Active borrows summary card** — compact card: "3 items currently borrowed" with a swap icon. Tappable to see the active borrows list.

**Visual:** Full-width card, elevated surface, gold accent. This is the "curated" top-of-feed.

### Section 2: Latest Items

Newly added items as **visual cards** — the most Instagram-like section. Horizontal scroll of item cards (~160px wide each), showing:
- Primary image (photo placeholder with serif initial)
- Brand (gold, letterspaced, uppercase)
- Model name (Playfair Display)
- Owner avatar + name
- React button (heart icon + count) and share-to-circle button

**Data source:** `items` table where `circle_id = X` and `is_private = false`, ordered by `created_at desc`, limit 10.

### Section 3: Circle Activity

The compact activity timeline — the existing feed, but **visually compressed to single-line rows** (~44px tall). Each row:
- Small avatar (26px)
- Activity text (actor name + summary, single line, truncated)
- Relative timestamp
- Small colored activity-type icon on the right

**No item thumbnails here** (thumbnails live in the Latest Items section). Activity types: borrows, members, updates, price alerts.

**Active borrows in this section still show "Mark Returned" quick action** (existing feature, keep it).

### Section 4: Shared Wishlists

Wishlists that members have marked as public (`is_private = false`). Vertical cards, each showing:
- Wishlist name (Playfair Display)
- Owner avatar + name
- 3–4 item brand chips (small rounded chips with brand initials)
- "View all" link

**Social:** Members can react (e.g., "I have one of these!") or offer an item from their collection that matches.

### Section 5: Recent Shares

The most "Instagram post" section — items explicitly shared to the circle by their owners. Full-width cards with:
- Owner avatar + name + timestamp
- Large item image (square or 4:5, full-bleed)
- Brand (gold, letterspaced, uppercase) + model name (Playfair Display)
- Caption (owner's text, secondary text style)
- **Reaction bar** — 4 SVG reaction icons + counts (see below)
- **Comment button + count**
- Latest 2 comments inline (avatar + name + text)
- "View all N comments" expands to comment sheet

**Data source:** New `circle_posts` table (spec §18.1). Posts have `type` (`item_share` or `wishlist_share`), `item_id` or `wishlist_id`, `caption`, `author_id`.

### Social Interactions (§16)

#### Reactions — 4 SVG glyphs (NO emoji)

| Reaction | Icon (SVG) | Meaning |
|----------|-----------|---------|
| Love | Heart outline → filled | "I love this" |
| Want | Tag/bookmark icon | "I want this" |
| Have | Check-circle icon | "I have one too" |
| Covet | Sparkle/diamond icon | "Coveting this" |

Reaction bar: 4 small SVG icons in a row. Tapping fills the icon gold (`--acc`) and increments count. Compact text: "3 loves · 2 wants".

**One reaction per user per post** (tapping a different reaction switches, tapping the same one removes it).

#### Comments

- Latest 2 comments shown inline on the share card
- "View all N comments" opens a bottom sheet modal
- Comment input at bottom of sheet
- Comments ordered oldest-first (chronological)
- No threading, no replies-to-replies
- Author can delete their own comments

---

## Design System — Warm Atelier (Mandatory)

The mockup already uses this system. **You must stay consistent with it.** The CSS variables are already defined in `full-app-mockup.html`:

### Colors (CSS variables in `:root`)

| Variable | Light | Dark | Usage |
|----------|-------|------|-------|
| `--bg` | `#FAF7F2` | `#161210` | Page background (warm cream) |
| `--surf` | `#FFFFFF` | `#221C16` | Card surface |
| `--sub` | `#F5F0EA` | `#1E1812` | Subtle backgrounds (mini items, etc.) |
| `--warm` | `#F0E8DC` | `#2A2118` | Warm gradient end |
| `--ink` | `#2B2520` | `#F2EDE4` | Primary text (charcoal) |
| `--ink2` | `#6B5D50` | `#B5A892` | Secondary text |
| `--ink3` | `#A09080` | `#7A6A55` | Tertiary text / timestamps |
| `--bd` | `#E5DDD0` | `#3A2F22` | Borders |
| `--acc` | `#9B7B5A` | `#C4A87E` | Gold accent (primary) |
| `--accw` | `#C4A87E` | `#D4BC94` | Warm gold accent |
| `--accs` | `rgba(155,123,90,.08)` | `rgba(196,168,126,.10)` | Accent surface tint |
| `--grad` | `linear-gradient(135deg,#C4A87E,#9B7B5A)` | same but lighter | Gold gradient |
| `--ok` | `#6B8E5A` | `#8AB07A` | Success green |

### Typography

- **Playfair Display** (serif) — headings, brand names, model names, section titles. Weights: 400, 500, 600.
- **Jost** (sans-serif) — body text, captions, buttons, labels. Weights: 300, 400, 500.
- Brand names: uppercase, letterspaced `.12em`, `--acc` color, `9px` weight 500
- Section headers: Playfair Display, `15px`, weight 500, with a thin rule line extending right
- Captions/timestamps: `--ink3`, `10px`, weight 300

### Spacing & Radius

- Card padding: `14px`
- Card border-radius: `--r` (14px)
- Small radius: `--rs` (8px)
- Extra small radius: `--rx` (5px)
- Feed horizontal padding: `22px`
- Card gap in feed: `11px` margin-bottom
- Horizontal scroll gap: `10px`

### Existing CSS classes you can reuse

- `.fpost` — feed post card (the main card style)
- `.fpost .top` — avatar + name + timestamp row
- `.fpost .body` — body text (with `em` for italic Playfair item names)
- `.fpost .mini` — mini item block (photo + name + subtitle)
- `.fpost .acts` — action row (reactions/comments with SVG icons)
- `.card` — generic card
- `.btn` / `.btn.sm` / `.btn.acc` / `.btn.out` / `.btn.ghost` — buttons
- `.av` / `.av.sm` / `.av.lg` — avatars (gradient circle, initials)
- `.iph` — photo placeholder (gradient bg, serif initial)
- `.iph .L` — the letter inside photo placeholder
- `.vote` / `.vote .vc` — voting card layout
- `.pledge` — pledge block (for wishlist group gifts)
- `.badge` / `.badge.ok` / `.badge.lent` / `.badge.pend` — status badges
- `.kicker` — small uppercase letterspaced label

### Phone frame

Each mockup screen is a `.pf` (320×680px phone frame) containing `.ps` (screen), `.sb` (status bar), `.sa` (scrollable area), `.tb` (tab bar). Use the same structure.

---

## What to Do

### Update Section 6 of `design/full-app-mockup.html`

**File:** `/Users/nasseralnuaimi/Projects/personal/tresor/design/full-app-mockup.html`

**Section 6 starts at line ~1135** (search for `Section 6` or `Activity Feed · Social`). The section header is:
```html
<div class="sec-num"><span class="badge">6</span><span class="label">Activity Feed · Social &amp; Engagement</span></div>
```

Currently Section 6 has **one phone frame** (`6a · Circle Activity Feed`) showing a flat feed with: borrow request, returned item, mark-returned action, wishlist hint, and who-wore-it-best voting card — all in a single scrolling list with no sections.

**Replace it** with the new segregated design. You may use **two phone frames** to show the full feed (6a) and a filtered view or the comment sheet (6b), as space allows.

### Design requirements for the new Section 6:

1. **Header:** "Activity" title (Playfair Display), subtitle "The Atelier Circle · Live", and a notification bell icon with a badge count (e.g., "3")

2. **Filter pills row** — horizontal scrollable, below the header:
   ```
   [All] [Borrows] [Items] [Wishlists] [Shares]
   ```
   Active pill ("All") is gold-filled; others are outlined. Use the `.btn.sm.out` style for inactive, `.btn.sm.acc` for active, or create a `.pill` class.

3. **Section 1: Featured** — two stacked cards:
   - "Who Wore It Best?" voting card (reuse existing `.vote` pattern — 2 candidates with photo placeholders, names, brands, vote percentages, vote buttons)
   - Active borrows summary: "3 items currently borrowed" with a swap icon, tappable. Compact card, gold accent border-left.

4. **Section 2: Latest Items** — section header "Latest Items" (Playfair, with rule line), horizontal scroll of 3–4 item cards. Each card: photo placeholder (~120px wide), brand (gold uppercase), model name (Playfair), owner avatar + name, small heart icon + count.

5. **Section 3: Circle Activity** — section header "Circle Activity", then 4–5 compact single-line rows. Each row: small avatar (26px), activity text (single line, truncated), timestamp, small type icon. No item thumbnails. One row shows "Mark Returned" button.

6. **Section 4: Shared Wishlists** — section header "Shared Wishlists", then 1–2 wishlist cards. Each: wishlist name (Playfair), owner avatar + name, 3–4 brand chips (small rounded pills with brand initials), "View all" link.

7. **Section 5: Recent Shares** — section header "Recent Shares", then 1–2 full share cards. Each card:
   - Owner avatar + name + timestamp
   - Large item image (photo placeholder, square, full-width)
   - Brand (gold uppercase) + model name (Playfair)
   - Caption text
   - Reaction bar: 4 SVG icons (heart, tag, check-circle, diamond) with counts
   - Comment icon + count
   - 1–2 inline comments (avatar + name + text)

8. **Optional 6b frame:** Show the comment sheet (bottom modal) with 3–4 comments and an input field at the bottom. Or show the "Items" filtered view with a 2-column grid of item cards with reaction counts.

### Design rules (NON-NEGOTIABLE):

- **ZERO emoji.** All icons are inline SVG. Use `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.4">` pattern.
- **Warm Atelier palette only.** Use the CSS variables defined in `:root`. No new colors.
- **Playfair Display for editorial text** (headings, brand names, model names, section titles). **Jost for UI text** (body, captions, buttons).
- **Editorial spacing.** Generous whitespace between sections. Section headers have a thin rule line extending to the right (use a flex layout with a `border-bottom` on a flex-1 div).
- **Consistent with existing mockup patterns.** Reuse `.fpost`, `.card`, `.btn`, `.av`, `.iph`, `.vote` classes. Add new classes only when necessary.
- **Dark mode support.** The mockup has a theme toggle. All new elements must use CSS variables, not hardcoded colors.

---

## Acceptance Criteria

- [ ] Section 6 shows **5 clearly segregated sections** (Featured, Latest Items, Circle Activity, Shared Wishlists, Recent Shares) with distinct section headers
- [ ] **Filter pills** at the top: [All] [Borrows] [Items] [Wishlists] [Shares]
- [ ] **Social interaction buttons** on share cards: 4 reaction icons (heart, tag, check-circle, diamond) + comment button
- [ ] **Notification bell** with badge count in the header
- [ ] **Zero emoji** — all icons are inline SVG
- [ ] **Warm Atelier style** — Playfair Display + Jost, gold/cream/charcoal palette, editorial spacing
- [ ] **Section headers** have Playfair Display text with a thin rule line extending right
- [ ] **Latest Items** section uses horizontal scroll of visual item cards (not text rows)
- [ ] **Circle Activity** section uses compact single-line rows (not full cards with thumbnails)
- [ ] **Recent Shares** section has full-width cards with large item images, captions, and reaction bars
- [ ] Design works in **both light and dark mode** (uses CSS variables, no hardcoded colors)
- [ ] Existing `.fpost`, `.card`, `.btn`, `.av`, `.iph`, `.vote` class patterns are reused where applicable

---

## Reference Materials

- **Spec:** `docs/NUDGE_AND_FEED_SPEC.md` — Part II (§12–§21) has full wireframes in §20
- **Current screen:** `app/app/(tabs)/activity.tsx` — the React Native implementation (for data flow reference)
- **Current activity lib:** `app/src/lib/activity.ts` — `getActivityFeed()` function
- **Schema:** `supabase/migrations/0001_initial_schema.sql` — `activity_feed` table at line 162
- **Mockup:** `design/full-app-mockup.html` — Section 6 starts at line ~1135
- **Theme:** `app/src/theme/colors.ts` and `app/src/theme/index.ts` — the app's design tokens

## Wireframe Reference (from Nigel's spec §20.1)

```
┌─────────────────────────────────────────────┐
│  Activity                          [bell 3]  │
├─────────────────────────────────────────────┤
│  [All] [Borrows] [Items] [Wishlists] [Shares]│
├─────────────────────────────────────────────┤
│                                               │
│  ╔═════════════════════════════════════════╗ │
│  ║  [trophy] Who Wore It Best?              ║ │  ← FEATURED
│  ║  Vote for this week's best styled item   ║ │
│  ║  [photo] [photo] [photo]                  ║ │
│  ║  Sarah    Mona     Lina                   ║ │
│  ║  Chanel   Dior     Gucci                  ║ │
│  ║  12 votes 8 votes  5 votes                ║ │
│  ╚═════════════════════════════════════════╝ │
│                                               │
│  ╔═════════════════════════════════════════╗ │
│  ║  [swap] 3 items currently borrowed       ║ │  ← active borrows summary
│  ║  Tap to view all active borrows           ║ │
│  ╚═════════════════════════════════════════╝ │
│                                               │
│  ── LATEST ITEMS ──────────────── [See All]   │  ← section header
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ [img] │ │ [img] │ │ [img] │ │ [img] │       │  ← horizontal scroll
│  │CHANEL │ │ DIOR  │ │GUCCI  │ │HERMES │       │
│  │Classic│ │Saddle │ │Marmont│ │Birkin │       │
│  │Sarah  │ │Mona   │ │Lina   │ │Maya   │       │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                               │
│  ── CIRCLE ACTIVITY ──────────────────────     │  ← section header
│  [avatar] Sarah added a Chanel Classic    2h  │  ← compact row
│  [avatar] Mona requested to borrow Dior   5h  │
│  [avatar] Layla returned Cartier Love     1d  │
│  [avatar] Maya joined the circle          3d  │
│                                               │
│  ── SHARED WISHLISTS ────────────────────     │  ← section header
│  [wishlist card with brand chips]             │
│                                               │
│  ── RECENT SHARES ────────────────────────     │  ← section header
│  ┌─────────────────────────────────────────┐ │
│  │ [avatar] Sarah                         2h │ │  ← share card
│  │         [ LARGE ITEM IMAGE ]              │ │
│  │ CHANEL                                    │ │
│  │ Classic Flap                              │ │
│  │ "Wore this to the gala last night"        │ │
│  │ [heart] 3  [tag] 1  [check] 2  [diamond] 0│ │  ← reactions
│  │ [comment] 2 comments                      │ │
│  │   Mona: Stunning!                         │ │  ← inline comments
│  │   Lina: Where did you get it authenticated?│ │
│  └─────────────────────────────────────────┘ │
│                                               │
└─────────────────────────────────────────────┘
```

---

## Notes from Dwight

- The current mockup Section 6 already has good individual card patterns (borrow request, returned item, wishlist hint, who-wore-it-best). **Don't throw these away** — redistribute them into the new sections. The borrow request and returned item go in Circle Activity. The wishlist hint goes in Shared Wishlists. Who-wore-it-best goes in Featured.
- The horizontal-scroll item card pattern already exists in the home screen mockup (`.fc` / `.fcc` classes for featured carousel, `.shfr` / `.smc` for category shelf). You can reference or adapt these for Latest Items.
- The reaction bar is new — there's no existing pattern. Design it to sit below the caption, above inline comments. Use the `.acts` class as a base but extend it with 4 icons + compact count text.
- Section headers should feel like editorial magazine section breaks: Playfair Display text on the left, a thin `--bds` rule line extending to the right, optional "See All" link at the far right.
- Keep the phone frame at 320×680px. If the full feed doesn't fit in one screen, that's fine — the `.sa` div scrolls. But make sure all 5 sections are visible in the scrollable area.

---

**Deliverable:** Updated Section 6 in `design/full-app-mockup.html` with the new segregated feed design. Do not modify other sections.
