# Taste-Based Member Labels — Spec

**Status:** Draft (addendum to circle redesign, mockup v4)
**Owner:** Dwight (Dev Lead)
**Date:** 2026-08-08

Circle members get a fun, personality-driven **taste label** on their member card, auto-generated from their collection composition. Replaces the old "N pieces · $value" stat line. This is what makes the circle feel like a social club, not a CRM.

---

## 1. Auto-generation rules

The label is computed from the member's owned `items` (where `owner_id = user.id`, all statuses). Three signals, evaluated in priority order:

### Signal A — Dominant brand (≥40% of items by count)
If a single brand accounts for 40%+ of a member's items, they get a **brand-specific label**.
- Dior → "The Dior Devotee" / "Dior Connoisseur"
- Hermès → "Hermès Loyalist" / "The Saddle Keeper"
- Chanel → "The Chanel Devotee" / "Quilted Classicist"
- Louis Vuitton → "The Monogrammer"
- Bottega Veneta → "The Woven One"

Threshold rationale: 40% means the brand is a clear leaning, not a coincidence. Below 40%, fall through to category/diversity.

### Signal B — Dominant category (≥50% of items, no dominant brand)
No brand hits 40%, but one category dominates at 50%+.
- Watches → "The Horologist" / "Time Keeper"
- Handbags → "The Bag Lady" *(review — may be too casual; alt: "The Handbag Hunter")*
- Jewelry → "The Jeweler" / "The Gem Keeper"
- Shoes → "The Stiletto Collector" / "Footwear Obsessed"
- Scarves → "The Silk Curator"

### Signal C — Collection diversity score (fallback)
If neither brand nor category dominates, compute a **diversity score** = unique brands / total items.
- **Low diversity (≤0.3):** brand-loyal but spread across categories → brand label from Signal A anyway (lower threshold 30%).
- **High diversity (≥0.5):** genuinely eclectic → "The Curator" / "Eclectic Collector" / "The Connoisseur"
- **Mid (0.31–0.49):** focused but mixed → category label or "The Collector"

### Signal D — Aesthetic signals (enhancer, not standalone)
From `items.ai_metadata` (tags like `bold`, `minimalist`, `classic`, `experimental`, `vintage`):
- If ≥30% items tagged `bold`/`experimental` → "The Risk Taker" / "Avant-Garde"
- If ≥30% tagged `classic`/`timeless` → "The Classicist"
- If ≥30% tagged `vintage`/`heritage` → "The Archivist" / "Heritage Hunter"
- Aesthetic labels **override** category labels but not brand labels.

### Tie-breaking & precedence
1. Brand-dominant (40%+) wins.
2. Aesthetic enhancer (if it fires) beats category.
3. Category-dominant (50%+).
4. Diversity fallback.

### New member (≤2 items)
Don't label yet. Show "New to the Circle" until they have 3+ items. Avoids premature/awkward labels.

### Recomputation
- Recompute on: item add, item delete, item brand/category edit.
- If the user has a **custom override** set, do NOT overwrite it. Only recompute the *suggested* label (stored separately) and surface a subtle "Your collection has changed — new suggestion: X" nudge.

---

## 2. Label library (≥15)

| # | Label | Trigger |
|---|---|---|
| 1 | The Dior Devotee | Dior ≥40% |
| 2 | Hermès Loyalist | Hermès ≥40% |
| 3 | The Monogrammer | Louis Vuitton ≥40% |
| 4 | The Woven One | Bottega Veneta ≥40% |
| 5 | Quilted Classicist | Chanel ≥40% |
| 6 | The Horologist | Watches ≥50% |
| 7 | Time Keeper | Watches ≥50% (alt) |
| 8 | The Gem Keeper | Jewelry ≥50% |
| 9 | The Handbag Hunter | Handbags ≥50% |
| 10 | The Silk Curator | Scarves ≥50% |
| 11 | The Risk Taker | ≥30% bold/experimental |
| 12 | Avant-Garde | ≥30% bold/experimental (alt) |
| 13 | The Classicist | ≥30% classic/timeless |
| 14 | The Archivist | ≥30% vintage/heritage |
| 15 | The Curator | High diversity (≥0.5) |
| 16 | Eclectic Collector | High diversity (alt) |
| 17 | The Connoisseur | Mid diversity, mixed luxury |
| 18 | New to the Circle | ≤2 items |

Alts exist so two members with the same trigger don't get identical labels — pick deterministically by hashing user ID, or rotate. Keep the library extensible (future: seasonal labels, AI-generated).

---

## 3. Customization

- **Auto-suggested label** is computed and shown by default.
- User can **override** with free text (max 32 chars) or pick from 3-4 quick suggestions based on their collection.
- Override is stored per-user and takes precedence over auto-generation.
- User can **revert to auto** with a single tap ("Use suggested: X").
- Validation: no profanity filter needed (circle is invite-only, 5-15 trusted members), but cap length and strip emoji for label legibility. *(Revisit if circles grow.)*

**UX:** Edit affordance lives on the member's own row in the Circle screen — a subtle pencil icon or tappable label. Not buried in settings.

---

## 4. Database

**Store on the `users` table**, not computed on the fly:

```sql
ALTER TABLE users ADD COLUMN taste_label TEXT;          -- displayed label (custom override OR auto)
ALTER TABLE users ADD COLUMN taste_label_custom TEXT;    -- user's custom override, NULL if using auto
ALTER TABLE users ADD COLUMN taste_label_auto TEXT;      -- last computed auto-suggestion
ALTER TABLE users ADD COLUMN taste_label_updated_at TIMESTAMPTZ;
```

**Why store, not compute live:**
- Reading the circle roster is a hot path (every circle screen load). Don't aggregate all items per member on every read.
- The auto-label only changes when items change — recompute on item CUD events (trigger or app-layer), not on read.
- `taste_label` is the **resolved** value: equals `taste_label_custom` if set, else `taste_label_auto`. App reads only this column for display.

**Recomputation trigger:** Supabase function / app-layer hook on `items` INSERT/UPDATE(brand, category)/DELETE that recomputes `taste_label_auto` for the owning user and refreshes `taste_label` if no custom override exists.

---

## 5. Privacy

- Labels are **visible to circle members only** — same RLS scope as the existing circle roster (`is_circle_member()`).
- A member's label is NOT exposed outside their circle (no public profile, no cross-circle discovery).
- The label reveals taste, not value. It says "The Horologist" — not "owns 6 watches worth $340k". This is the privacy win: we replaced the dollar stat with a descriptor that communicates personality without exposing wealth.
- The auto-suggested label is computed from items the circle can already see (RLS already restricts item reads to circle members). No new data exposure.
- A user's own label is visible to themselves everywhere (profile, circle, edit sheet).

---

## 6. Out of scope (future)

- AI-generated labels (LLM crafts a bespoke label from collection narrative) — v2.
- Label-based circle filtering ("show me all the watch collectors") — v2.
- Leaderboard / gamification — explicitly NOT wanted (Nasser: "who cares" about the stats).
- Cross-circle label portability — out of scope until multi-circle ships.

---

*Concise by design. This is an addendum to the circle redesign, not a standalone architecture doc. Questions → Dwight.*
