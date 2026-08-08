# Circle Redesign — Taste-Based Member Labels (Addendum)

**To:** Muaath
**From:** Dwight (Dev Lead)
**Re:** Addition to mockup v4 circle redesign (deleg_b10648f4)
**Status:** ADDITIVE — fold into the circle screen you're already redesigning. Do not block on this.

---

## Why

Nasser's feedback on the circle screen, verbatim:

> "Show different or label different people depending on what their collection, based on their tastes… Rather than just listing number of pieces and amounts, which who cares. Make the circle feature fun to manage."

The current Plate XIII member rows read:

```
Mariam Al Falasi   12 pieces · $84,600   Admin
Noor Haddad        24 pieces · $96,200
Layla Al Sayegh    31 pieces · $102,400
```

**That sub-line ("12 pieces · $84,600") is the problem.** It's a CRM stat, not a social signal. Replace it with a **taste-based personality label** that reflects what each member actually collects.

---

## What to design

### 1. Replace the stat sub-line with a taste label

Each member row (`.mrow .sub`) currently shows `{N} pieces · ${value}`. Change it to a **single fun label** derived from their collection taste. Examples for the existing demo members:

| Member | Old sub-line | New label |
|---|---|---|
| Mariam Al Falasi (Admin) | 12 pieces · $84,600 | **The Dior Devotee** |
| Noor Haddad | 24 pieces · $96,200 | **The Horologist** |
| Fatima Al Rashid | 18 pieces · $61,800 | **Hermès Loyalist** |
| Layla Al Sayegh | 31 pieces · $102,400 | **The Curator** |
| Sara Al Maktoum | 22 pieces · $48,900 | **The Risk Taker** |
| Farah Osman (New) | 21 pieces · $18,300 | **Eclectic Collector** |

The label is the **sub-line under the name** — same position, same visual weight (11px Jost 300, `var(--ink3)`), Playfair italic optional for a touch more personality. Do NOT keep the piece count or value visible on the row. The circle header can keep aggregate stats (128 pieces, $412k) — that's about the *circle*, not individuals.

### 2. Label styling — treat it as a name, not a stat

- Set the label in **Playfair Display italic** at ~12px to give it personality and distinguish it from a data field.
- Use `var(--gold-deep)` or `var(--ink2)` — warm, not clinical.
- No badges, no chips, no pill backgrounds. It's a descriptor, like a magazine byline. "Mariam Al Falasi" in Playfair regular, "The Dior Devotee" in Playfair italic beneath.
- Keep it to one line. If a label is long, it wraps to italic — never truncates with ellipsis.

### 3. Editable — show a "customize" affordance

On the **user's own row** (the logged-in member), show a subtle way to edit their label:
- A small gold pencil/edit icon to the right of the label, OR
- The label itself tappable with a faint underline
- Tapping opens a small sheet: *"Your taste label"* with the auto-suggested label pre-filled, a text field to override, and a one-line hint: *"We suggested this from your collection. Make it yours."*
- Provide 3-4 quick-pick suggestions based on their collection (chips), plus free-text.

For OTHER members' rows, the label is read-only — you see their taste, you can't change it.

### 4. Keep the "social club" tone

This is the whole point. The circle should feel like a private members' club roster, not a dashboard. The labels are the personality. A few rules:
- Labels are **fun, not corporate**. "The Horologist" not "Watch Collector (4 items)".
- They can be slightly cheeky but always affectionate — this is a circle of friends, not a leaderboard.
- Avoid anything that implies judgment of value or quantity. No "Big Spender", no "Top Collector".

---

## Don't do

- ❌ Do NOT show piece count or dollar value on individual member rows. Aggregate circle stats in the header are fine.
- ❌ Do NOT make labels look like status badges (no pills, no colored backgrounds). They're descriptors.
- ❌ Do NOT use real photos for member avatars (per the existing v4 brief — initials/monograms only).
- ❌ Do NOT gate this behind a settings screen. The edit affordance lives on the row itself.

---

## Dev spec reference

The full auto-generation rules, label library, DB storage, and privacy model are in:
`docs/TASTE_LABELS_SPEC.md`

For the mockup, you don't need to implement the algorithm — just hardcode the demo labels from the table above and design the edit affordance. The spec tells the dev team how to make it real.

---

**Questions?** Ping Dwight. This is a small addition to the circle screen — should slot into the existing redesign without changing scope of the other v4 items.
