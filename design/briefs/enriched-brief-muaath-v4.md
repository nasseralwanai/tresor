# ENRICHED BRIEF — Trésor Full App Mockup v4

**From:** Dwight (Dev Lead)
**To:** Muaath (Designer)
**Priority:** HIGH — Nasser reviewed v3, gave six specific refinements
**Date:** August 8, 2026
**Input file:** `design/full-app-mockup-v3.html` (127KB, 15 plates, 46 img tags, 22 unique Unsplash URLs)
**Output file:** `design/full-app-mockup-v4.html`

---

## THE SITUATION

Nasser reviewed v3 on his laptop. His verdict: **the direction is right — these are refinements, not a redesign.** Six specific improvements needed. This brief enriches each of his six points into actionable, detailed instructions.

**What's working in v3 (keep all of this):**
- 15 plates presented as catalogue plates side by side — the gallery format is strong
- Warm Atelier design system (cream, charcoal, gold) — solid foundations
- Playfair Display + Jost pairing — correct and well-applied
- The Provenance Seal (Concept C) — Nasser approved this; keep it
- UAE phone patterns (+971, flag SVG, masked input, SMS/WhatsApp toggle) — excellent
- OTP 6-box pattern with gold glow — good
- Add button centered in tab bar with hairline gold ring — correct
- Editorial gallery presentation with paper-grain texture — keep
- Borrow flow with 4-state timeline (Requested, Accepted, Active, Returned) — keep
- AI capture screen with gold corner brackets — keep

**What needs fixing (Nasser's 6 points, enriched below):**

---

## REFINEMENT 1 — IMAGES: NO PEOPLE, EVER

### The Problem

The current mockup uses photographs of people in several places:

1. **Plate IV — "Who It Is For"** (full-bleed background): `photo-1469334031218-e382a71b716b` — "An elegant collector in golden evening light" — a person portrait
2. **Plate X — Item Detail** (avatar): `photo-1494790108377-be9c29b29330` — "Mariam Al Falasi" — a woman's face
3. **Plate XII — Activity Feed** (avatars): `photo-1438761681033-6461ffad8d80` — "Noor Haddad", `photo-1544005313-94ddf0286df2` — "Fatima Al Rashid", `photo-1508214751196-bcfd4ca60f91` — "Layla Al Sayegh", `photo-1531123897727-8f129e1688ce` — "Sara Al Maktoum" — all face portraits
4. **Plate XIII — Circle Members** (avatars): same 5 portrait URLs reused — all faces
5. **Plate XIV — Borrow Flow** (avatars): same 2 portrait URLs reused — faces

**Nasser's rule: NO PEOPLE EVER.** No faces, no models, no portraits, no full-body shots, no hands, no silhouettes. This is absolute.

### What to Do

Replace ALL people images with ONLY these four categories of imagery:

**Category A — Luxury Product Photography:**
- Handbags (Birkin, Kelly, Chanel flap, Lady Dior — on stands, in dust bags, on marble shelves)
- Jewellery (rings, bracelets, necklaces, earrings — on velvet, in boxes, on silk)
- Watches (Rolex, Cartier, Patek — on leather pads, in cases, macro dials)
- Shoes (Louboutin, Manolo Blahnik — on pedestals, in boxes)
- Scarves (Hermès carre — folded, draped, in flat-lays)

**Category B — Aesthetic Textures:**
- Marble (white Calacatta, green veining, close-up slabs)
- Silk (folded, draped, flowing — neutral tones, jewel tones)
- Leather (smooth calfskin, pebbled, patina close-ups, stitching detail)
- Gold leaf (gilded surfaces, gold foil textures, gold leaf on paper)
- Velvet (deep piles in jewel tones — for dark backgrounds)

**Category C — Nature:**
- Flowers (orchids, peonies, roses — editorial still-life, not garden shots)
- Landscapes relevant to luxury (a misty Alpine valley, a Mediterranean coastline at golden hour, a desert dune at dusk)

**Category D — Place Imagery (luxury destinations):**
- Dubai (skyline at dusk, Burj Al Arab, DIFC, the Marina)
- Paris (rue Saint-Honoré, Place Vendome, a Haussmann boulevard)
- Milan (Via Montenapoleone, Galleria Vittorio Emanuele II, a boutique window)
- London (Mayfair, Bond Street, Mount Street)
- Geneva (the lakefront, watchmaking ateliers)

### Avatar Replacement Strategy

Avatars currently show human faces. Replace ALL avatars with **monogram initials on the gold gradient** (the `.av` class already has `background:linear-gradient(135deg,#C9A961,#8B6F3E)`). Simply remove the `<img>` tag inside `.av` elements and keep the letter. This is already done for "Farah Osman" (shown as "F" on gradient). Do this for ALL members:

- Mariam Al Falasi — show "M" on gold gradient (remove img)
- Noor Haddad — show "N" on v2 gradient (remove img)
- Fatima Al Rashid — show "F" on v3 gradient (remove img)
- Layla Al Sayegh — show "L" on v4 gradient (remove img)
- Sara Al Maktoum — show "S" on v5 gradient (remove img)

### Full-Bleed Background Replacement Strategy

For the onboarding plates (I, II, III, IV) that use full-bleed background images, replace the people images:

| Plate | Current Image | Problem | Replace With |
|-------|--------------|---------|-------------|
| I — Welcome | `photo-1521575107034-e0fa0b594529` | Leather/gold on dark — **verify if person is visible**. If clean product, keep. If person, replace. | Luxury still life: leather handbag on dark linen, or gold jewellery on dark velvet |
| II — What Is Trésor | `photo-1617038220319-276d3cfab638` | Gold jewellery on dark velvet — likely OK (product). **Verify no hands.** | Keep if clean product; otherwise replace with jewellery on velvet |
| III — What You Can Do | `photo-1445205170230-053b83016050` | "Editorial rail of luxury garments" — **verify if models visible**. If garments only, keep. If models, replace. | Luxury flat-lay: bags, watches, jewellery arranged editorially on marble |
| IV — Who It Is For | `photo-1469334031218-e382a71b716b` | "An elegant collector in golden evening light" — **PERSON, MUST REPLACE** | Dubai skyline at dusk, OR Place Vendome Paris, OR marble texture with gold leaf |

### Verification Protocol

After replacing images, you MUST verify each new URL:

```bash
# For each unique image URL in the file:
curl -s -o /dev/null -w '%{http_code}' 'URL'
# Must return 200
```

Also run this grep to verify NO people-related alt text remains:

```bash
grep -iE 'portrait|face|model|person|people|woman|man|collector|girl|guy' design/full-app-mockup-v4.html
# Must return nothing
```

### Non-Negotiable

- ZERO images containing people, faces, models, portraits, or silhouettes
- ALL avatars become monogram initials on gold gradient (no img tags in avatars)
- Every new image URL must return HTTP 200
- Keep the `onerror` fallback SVG on every `<img>` tag
- Keep `<meta name="referrer" content="no-referrer">` in the head
- Do not reduce the total image count below 40 — the richness is a feature

---

## REFINEMENT 2 — PRICING PRIVACY

### The Problem

Prices currently appear in places they should not:

1. **Plate XII — Activity Feed**: Shows `$6,300` on "Fatima added the Cartier Love Bracelet", `$13,000` on "Sara added the Rolex Submariner", `$9,400` on "Fatima added a 1.2 ct Solitaire Ring" — **MUST REMOVE**
2. **Plate XIII — Circle Members**: Shows `$412k` curated value in the stat triptych, and per-member values like `$84,600`, `$96,200`, `$61,800`, `$102,400`, `$48,900`, `$18,300` — **MUST REMOVE ALL**
3. **Plate XIV — Borrow Flow**: Shows `$24,000` in the item summary card — **MUST REMOVE** (this is a shared borrow context, not an owner viewing their own item)
4. **Plate XV — Wishlist**: Shows prices, savings amounts, and price-drop percentages — this is the owner's own wishlist so prices are acceptable here, but see note below

### Pricing Visibility Rules (for the mockup)

**Prices VISIBLE only on:**
- **Plate X — Item Detail** when viewed by the OWNER: show purchase price, current market value, and co-owner splits. This is the only screen where the full value triptych appears.
- **Plate XV — Wishlist**: the owner is browsing their own wishlist, so target prices and savings progress are acceptable (it is a personal financial planning tool).

**Prices MUST NOT appear on:**
- **Activity Feed** (Plate XII) — remove all `$` amounts and `price` spans. Activity shows actions only: "Fatima Al Rashid added the Cartier Love Bracelet." No value.
- **Circle Members** (Plate XIII) — remove the "Curated value $412k" stat. Remove all per-member `$` values. Replace with non-financial stats (see Refinement 5 below).
- **Borrow Flow** (Plate XIV) — remove `$24,000` from the item summary card. The borrower does not need to see the owner's purchase price.
- **Collection grid** (Plate IX) — if any item cards show prices on the grid, remove them. Item cards show brand, model, and status only. Price appears only when you tap into the item detail.

### What to Change in the Mockup

**Activity Feed (Plate XII):**
- Line ~1076: Remove `— <span class="price" style="font-size:13px">$6,300</span>` from "Fatima added the Cartier Love Bracelet"
- Line ~1089: Remove `— <span class="price" style="font-size:13px">$13,000</span>` from "Sara added the Rolex Submariner"
- Line ~1103: Remove `— <span class="price" style="font-size:13px">$9,400</span>` from "Fatima added a 1.2 ct Solitaire Ring"
- The activity text should read: "Fatima Al Rashid added the Cartier Love Bracelet." Full stop. No price.

**Circle Members (Plate XIII):**
- Line ~1162: Replace `$412k` / "Curated value" stat with a non-financial stat. See Refinement 5 for the full circle redesign.
- Lines ~1176, 1182, 1187, 1192, 1197, 1202: Remove all per-member dollar values (e.g., "12 pieces · $84,600" becomes "12 pieces · 3 active lends")

**Borrow Flow (Plate XIV):**
- Line ~1261: Remove `$24,000` from the item summary. The line should read: "Togo · Gold HW" without the price.

**Item Detail (Plate X) — KEEP prices here:**
- The value triptych (purchase price, current market value) stays. This is the owner viewing their own item.
- If the item has co-owners, show the split (e.g., "Mariam 60% · Noor 40%").
- This is the ONLY screen where prices appear in the full app.

---

## REFINEMENT 3 — WISHLIST REDESIGN

### The Problem

The current wishlist (Plate XV) is a flat vertical list of 4 cards. Each card has a thumbnail, brand name, model, price, and either a savings progress bar or a price-drop badge. It reads like a checklist, not a luxury shopping experience. There are no categories, no filters, no search, no browsing by brand or color.

### What to Create

Redesign the wishlist into a **luxury shopping discovery experience**. Think Net-a-Porter's category browse, Farfetch's filter system, SSENSE's editorial grid — not a to-do list.

#### Layout Structure

**Header:**
- Kicker: "SOMEDAY, CERTAINLY"
- Title: "Wishlist" (Playfair, 32px)
- Search bar: a `.field`-style input with a search icon and placeholder "Search your wishlist" (Jost, light weight, 15px)
- Result count: "12 pieces" in small caps

**Filter Bar (horizontal scrollable chips):**
- Category chips: All / Bags / Jewellery / Watches / Shoes / Accessories (the `.chip` class, with `.on` for active)
- These scroll horizontally if they overflow

**Secondary Filters (a row of small dropdown-style labels or chips):**
- "Brand" (tappable, shows a brand list)
- "Color" (tappable, shows color swatches)
- "Sort" (tappable: Recent / Price / Brand A-Z)

**Visual Grid:**
- 2-column grid (using the existing `.pgrid` class) with imagery-forward cards
- Each card: product image (1:1 or 4:5), brand name (Playfair), model (Jost Body-S), status indicators
- Cards are tappable to see detail
- Below the image on each card, show:
  - Brand + model name
  - A small badge if there is a savings goal in progress (e.g., "SAVING 65%" in small caps)
  - A small badge if there is a price alert (e.g., "PRICE DOWN 8%" in gold)
  - "Drop Hint" and "Pledge" actions accessible via a small icon or long-press

**Retained Features (must still work):**
- "Drop Hint" — a user can hint to their circle that they want this item (for birthdays, anniversaries). Show a small gift icon or "Drop Hint" link on each card.
- "Pledge Toward Group Gift" — circle members can pledge money toward a wishlist item. Show a progress bar on items with active pledges. The progress bar uses the existing `.prog` class.

**At least 8 wishlist items** in the grid (up from 4), spanning all categories:
1. Hermès Kelly 25 (Bags) — savings progress 65%
2. Cartier Ballon Bleu (Watches) — price drop 8%
3. Bulgari Serpenti Ring (Jewellery) — savings progress 32%
4. Christian Louboutin Pigalle (Shoes) — new addition
5. Hermès Carre 90 Scarf (Accessories) — drop hint sent
6. Chanel Classic Flap (Bags) — group gift pledge 45%
7. Patek Philippe Nautilus (Watches) — savings progress 12%
8. Van Cleef Alhambra Bracelet (Jewellery) — price drop 5%

#### Design Requirements

- **Visual grid, not a list** — 2 columns, image-forward cards
- **Category filters** — chip row at the top, horizontally scrollable
- **Search** — a real search input field in the header
- **Browse by brand** — accessible via a filter
- **Browse by color** — accessible via a filter
- **Imagery is primary** — each card leads with the product photo
- **Feel like luxury shopping** — the cards should feel like Net-a-Porter product tiles, not task list items
- **Keep savings progress and price alerts** — but present them as subtle badges, not the dominant element
- **"Drop Hint" and "Pledge" must be accessible** — small icons or links on each card

#### References to Study

- Net-a-Porter app: category browse, 2-column grid, filter chips
- Farfetch app: filter system with brand, size, color, category
- SSENSE app: editorial grid, minimal chrome, image-forward
- Vestiaire Collective: wishlist with savings tracking

---

## REFINEMENT 4 — OFFLINE BORROW FLOW

### The Problem

The current borrow flow (Plate XIV) only shows the **request + approval** path: borrower requests, owner approves, item is active, item is returned. But Nasser wants a SECOND borrowing mode: **offline borrow**. The owner hands over the item in person (at a dinner, a majlis, a coffee) and then records it in the app afterward as a record/reminder. No request needed, no approval step.

### What to Create

Add a **"Record a Borrow" flow** as a new plate (Plate XVI, or integrate into the borrow section). Show both flows side by side so it is clear there are two modes.

#### The Two Borrow Modes

**Mode 1 — Request + Approval (existing, keep as-is):**
- Borrower opens item detail, taps "Request to Borrow"
- Writes a note, selects duration
- Owner receives request, approves or declines
- Item becomes active, then returned
- This is the existing Plate XIV flow — keep it

**Mode 2 — Record a Borrow (NEW):**
- Owner opens their item detail (or a dedicated "Record Borrow" entry point)
- Taps "Record a Borrow" (a secondary button, not the primary CTA)
- Selects which circle member is borrowing (from the circle member list)
- Optionally adds a note ("For the Atlantis gala" or "Handed over at dinner")
- Optionally selects expected return date
- Confirms — the borrow is recorded immediately, no approval step
- Item status changes to "Borrowed" immediately
- Shows in activity feed as: "Maya borrowed the Cartier Love Bracelet" (owner's perspective: "You recorded that Maya borrowed the Cartier Love Bracelet")
- Owner can mark as "Returned" later from the item detail or activity feed

#### Mockup Layout for the New Plate

Create a new plate showing the "Record a Borrow" confirmation screen:

**Header:**
- Back bar with "Item" label
- Kicker: "RECORD A BORROW"
- Title: "The Cartier Love Bracelet" (Playfair, with the item name in italic gold)

**Item Summary Card:**
- Item thumbnail, brand, model — NO PRICE (per pricing privacy rules)
- Status badge: "Available" (about to change to "Borrowed")

**Borrower Selection:**
- "Who is borrowing?" kicker
- A horizontal scroll of circle member avatars (monogram initials on gold gradient — no face photos)
- One is selected (highlighted with gold ring)
- Selected member's name shown below

**Optional Note:**
- "A note (optional)" kicker
- A text field with placeholder: "For the gala, handed over at dinner..."

**Expected Return:**
- "Expected return" kicker
- Duration chips: "No set date" / "3 days" / "1 week" / "2 weeks" / "Custom"

**Confirmation:**
- Primary button: "Record Borrow" (btn-dark)
- Helper text below: "The piece will be marked as borrowed immediately. You can mark it returned at any time."

**How a Borrow Unfolds (modified timeline):**
Show a 2-state timeline (not the 4-state one from the request flow):
1. **Active** (gold node) — "The piece is in Maya's care"
2. **Returned** (outline node) — "Condition confirmed, history recorded"

A small note below: "No approval needed — this is an offline lend you are recording for your records."

#### Also Update the Borrow Section Navigation

The borrow section should now have **two plates**:
- Plate XIV — Request Flow (existing, keep as-is, just remove the price from the item card)
- Plate XV (new) — Record a Borrow Flow (the new offline flow)

This means the total plate count goes to 16. Update the plate navigation, the masthead, and the colophon accordingly.

#### Activity Feed Integration

The activity feed (Plate XII) should include an example of an offline borrow:

Add an activity event:
- Avatar: borrower's monogram (e.g., "M" on gold gradient)
- Text: "Maya borrowed the Cartier Love Bracelet" — no price, no "requested", just the action
- When: "1 hour ago"
- Thumbnail: the item image

This is distinct from the request flow events which say "requested to borrow."

---

## REFINEMENT 5 — CIRCLE REPRESENTATION REDESIGN

### The Problem

The current Circle screen (Plate XIII) is a flat member list: a header with circle name and stats, then 6 member rows, each with avatar + name + "X pieces · $Y value" + a chevron. It reads like a CRM dashboard, not a social luxury club. And it shows dollar values per member, which violates the pricing privacy rules.

**Nasser's direction:** "Just listing members is not creative. This is meant to be FUN, not a CRM. Think of a different approach."

### What to Create

Redesign the Circle screen into a **visual, social, interactive-feeling community view**. Think Soho House's member app, private members club digital experience, a luxury social club — not a contact list.

#### Design Direction: "The Constellation"

Create a **visual constellation/graph** showing the circle as a living network:

**Top Section — Circle Identity:**
- The Provenance Seal (the existing italic-T monogram in a hairline gold circle) centered
- Circle name: "The Dubai Atelier Circle" (Playfair, 26px)
- Subtitle: "Est. January 2026 · By invitation" (small caps, ink3)
- **Stat triptych** (REPLACED — no prices):
  - "128" / "Pieces in the Circle" (was: Pieces)
  - "6" / "Members" (was: Curated value $412k — NOW: member count)
  - "4" / "On Loan" (was: On loan — keep)
  - **NO dollar values anywhere in the circle screen**

**Middle Section — The Constellation Map:**

A visual SVG/CSS graph showing members as nodes connected by hairline gold lines. Each member is a circular monogram avatar (initials on gold gradient — NO face photos). The owner (Mariam) is at the center or top. Lines connect members who have lent/borrowed from each other.

Design it as an inline SVG or CSS-positioned divs:
- Each member node: 56px circle, monogram initials, gold gradient background, hairline border
- Connection lines: 1px gold hairlines (rgba(201,169,97,.3)) between nodes
- Active borrows shown as slightly thicker gold lines with a small dot
- The graph is visually centered and fills the middle section
- It should feel organic, like a constellation, not a rigid org chart

Example layout (approximate positions within a 340px wide area):
```
        [M]                    (Mariam — center top)
       / | \
      /  |  \
   [N]--[F]--[L]              (Noor, Fatima, Layla — middle row)
      \  |  /
       \ | /
        [S]                    (Sara — bottom center)
         |
        [F]                    (Farah — newest, slightly off to side)
```

Lines between nodes indicate lending relationships. Gold dots on active lend lines.

**Bottom Section — Member Cards (horizontal scroll):**

Below the constellation, show **member cards** as a horizontal scrollable row (like stories). Each card is a compact 140px-wide card showing:
- Monogram avatar (48px, initials on gradient — NO photos)
- Member name (Playfair, 14px)
- Collection highlights: "12 pieces" (Jost Body-S)
- Activity stats: "3 active lends · 8 borrows" (Jost Body-S, ink3) — **NO prices**
- A small color dot indicating their "collection personality" (e.g., gold for jewellery collector, sage for bags, amber for watches)

**Optional: "Who Has What" Mini-Map:**

Below the member cards, a compact "Who Has What" section:
- A small grid showing which members currently have which items on loan
- Each row: borrower monogram → item thumbnail → owner monogram
- Example: "[M] → [Birkin thumbnail] → [N]" meaning Maya has Noor's Birkin
- 2-3 rows max, with a "See all" link

#### Research Directives

Before designing, use WebSearch to research:
- "Soho House member app UI"
- "private members club app design"
- "luxury social club digital experience"
- "community visualization app UI"
- "social graph visualization mobile app"

Look at how these apps present community: not as lists, but as visual networks, member spotlights, and relationship maps. Incorporate at least 2 specific patterns from this research.

#### Design Requirements

- **NOT a flat list** — must be a visual, graph-based, or card-based layout
- **NO prices anywhere** — no per-member values, no circle total value
- **Monogram avatars only** — no face photos (consistent with Refinement 1)
- **Stats per member are non-financial** — item counts, borrow counts, active lends
- **Fun and social** — this is a club, not a dashboard
- **The constellation graph is the hero** — it should be the first thing you see
- **Hairline gold aesthetic** — consistent with the Warm Atelier system
- **Keep the "Extend an Invitation" button** at the bottom

---

## REFINEMENT 6 — GENERAL: KEEP THE DIRECTION

### What NOT to Change

- The overall 15-plate gallery presentation format — keep it
- The Warm Atelier design system (colors, typography, shadows, spacing) — keep
- The Provenance Seal logo mark — keep
- The phone frame (390x844) — keep
- The tab bar (Collection, Activity, Add, Circle, Profile) — keep
- The onboarding flow structure (Welcome + 3 info + Phone + OTP + Invite + Profile) — keep
- The AI capture screen — keep
- The item detail hero (full-bleed image dissolving to cream) — keep
- The borrow timeline visual language — keep
- The paper-grain texture — keep
- All animations (fade, rise, glow, card stagger) — keep

### What IS Changing (Summary)

1. All people images replaced (products, textures, nature, places)
2. All avatars become monogram initials (no face photos)
3. All prices removed from activity feed, circle, and borrow flow
4. Prices remain only on item detail (owner view) and wishlist (owner view)
5. Wishlist redesigned from flat list to category-filtered visual grid
6. New "Record a Borrow" plate added (offline borrow flow)
7. Circle screen redesigned from list to constellation graph + member cards
8. Total plates: 16 (was 15)

---

## EXECUTION PLAN — CLAUDE CODE ITERATIONS

You have Claude Code with the claude-fable-5 model.

**Binary:** `claude` (at `/Users/nasseralnuaimi/.local/bin/claude`)
**Model:** `--model claude-fable-5`
**Allowed tools:** `Read,Write,Bash,WebSearch,WebFetch`
**Print mode:** `claude -p "prompt" --allowedTools "..." --max-turns 30`
**Working directory:** `/Users/nasseralnuaimi/Projects/personal/tresor`

### ITERATION 1: Fix All Images + Remove Prices from Shared Views

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath, a luxury brand designer working on Trésor, a private luxury collection circle app.

Read design/full-app-mockup-v3.html (the current mockup, 127KB, 15 plates, 46 img tags).

TASK 1 — REPLACE ALL PEOPLE IMAGES:
Nasser's rule: NO PEOPLE EVER. No faces, no models, no portraits, no hands, no silhouettes.

Step 1: Remove ALL img tags inside .av (avatar) elements. Replace with monogram initials on the gold gradient. Every avatar should show a letter (M, N, F, L, S) on the gradient background — no img tags, no face photos. The .av class already has the gradient background.

Step 2: Replace the full-bleed background image on Plate IV (Who It Is For). The current image (photo-1469334031218-e382a71b716b) is a person portrait. Replace with a Dubai skyline at dusk image from Unsplash, or a luxury place image (Paris, Milan, London). Search Unsplash for: 'dubai skyline dusk', 'paris street luxury', 'milan boutique'. Use a URL like https://images.unsplash.com/photo-XXXX?w=800&q=80&auto=format&fit=crop.

Step 3: Check Plate I (photo-1521575107034-e0fa0b594529), Plate II (photo-1617038220319-276d3cfab638), Plate III (photo-1445205170230-053b83016050) full-bleed backgrounds. If any contain people, replace with luxury product photography, textures (marble, silk, leather, gold leaf), nature (orchids, peonies), or place imagery (Dubai, Paris, Milan, London). Use WebSearch to find appropriate Unsplash photo IDs.

Step 4: Verify every new image URL returns HTTP 200:
  curl -s -o /dev/null -w '%{http_code}' 'URL'
If any URL fails, find a replacement.

Step 5: Verify no people-related alt text remains:
  grep -iE 'portrait|face|model|person|people|woman|man|collector|girl|guy' design/full-app-mockup-v4.html
Must return nothing.

TASK 2 — REMOVE PRICES FROM SHARED VIEWS:
Prices must ONLY appear on the Item Detail screen (Plate X) and the Wishlist (Plate XV). Remove ALL prices from:

1. Activity Feed (Plate XII): Remove all span.price elements and dollar amounts. The text should show actions only: 'Fatima Al Rashid added the Cartier Love Bracelet.' with no price.

2. Circle Members (Plate XIII): Remove the dollar value stat (replace with member count: '6' / 'Members'). Remove all per-member dollar values (e.g., '12 pieces · \$84,600' becomes '12 pieces · 3 active lends'). NO dollar signs anywhere on this screen.

3. Borrow Flow (Plate XIV): Remove the price from the item summary card. The line 'Togo · Gold HW · \$24,000' becomes 'Togo · Gold HW'. No price.

Keep prices on:
- Item Detail (Plate X): the value triptych stays — this is the owner viewing their own item
- Wishlist (Plate XV): target prices and savings progress stay — this is the owner's personal wishlist

Save the result as design/full-app-mockup-v4.html. Do NOT change anything else in this iteration — just fix images and remove prices from shared views." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

### ITERATION 2: Redesign Wishlist + Redesign Circle Representation

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath. Read design/full-app-mockup-v4.html (your v4 from iteration 1).

TASK 1 — REDESIGN THE WISHLIST (currently Plate XV):
The current wishlist is a flat vertical list of 4 cards. Redesign it into a luxury shopping discovery experience.

New layout:
1. Header: kicker 'SOMEDAY, CERTAINLY', title 'Wishlist' (Playfair 32px), a search input field (.field style with search icon, placeholder 'Search your wishlist'), result count '12 pieces'.

2. Filter bar — horizontally scrollable chips: All / Bags / Jewellery / Watches / Shoes / Accessories. Use the .chip class with .on for active. Below the category chips, add secondary filter labels: 'Brand', 'Color', 'Sort' as small tappable text.

3. Visual grid — 2-column grid using the .pgrid class. At least 8 items spanning all categories:
   - Hermès Kelly 25 (Bags) — savings progress 65%
   - Cartier Ballon Bleu (Watches) — price drop 8%
   - Bulgari Serpenti Ring (Jewellery) — savings progress 32%
   - Christian Louboutin Pigalle (Shoes) — new addition
   - Hermès Carre 90 Scarf (Accessories) — drop hint sent
   - Chanel Classic Flap (Bags) — group gift pledge 45%
   - Patek Philippe Nautilus (Watches) — savings progress 12%
   - Van Cleef Alhambra Bracelet (Jewellery) — price drop 5%
   Each card: product image (use existing Unsplash product photos), brand name (Playfair), model (Jost Body-S), small badge for savings/price-drop status. Keep 'Drop Hint' and 'Pledge Toward Group Gift' as small icon links on each card.

Make it feel like Net-a-Porter or Farfetch browse, not a checklist. Image-forward cards, not text-forward.

TASK 2 — REDESIGN THE CIRCLE (currently Plate XIII):
The current circle screen is a flat member list with dollar values per member. Redesign it completely.

First, use WebSearch to research: 'Soho House member app UI', 'private members club app design', 'luxury social club digital experience', 'community visualization app UI'. Note 2-3 patterns you find.

New layout:
1. Top section — Circle identity: the Provenance Seal (italic T in hairline gold circle) centered, circle name 'The Dubai Atelier Circle' (Playfair 26px), subtitle 'Est. January 2026 · By invitation'. Stat triptych: '128' / 'Pieces', '6' / 'Members', '4' / 'On Loan'. NO dollar values.

2. Middle section — The Constellation: a visual SVG graph showing members as nodes (56px monogram circles on gold gradient — NO face photos, just initials M, N, F, L, S, F) connected by 1px hairline gold lines. Active borrows shown as slightly thicker lines with a gold dot. Mariam at center, others arranged around her. It should feel like a constellation, not an org chart. Build this as inline SVG or absolutely-positioned divs within the phone frame.

3. Bottom section — Member cards: a horizontal scrollable row of compact member cards (140px each). Each card: 48px monogram avatar, member name (Playfair 14px), '12 pieces' (Jost Body-S), '3 active lends · 8 borrows' (Jost Body-S, ink3). NO prices. A small color dot indicating their collection personality (gold for jewellery, sage for bags, amber for watches).

4. Keep the 'Extend an Invitation · 2 Remaining' button at the bottom.

NO prices anywhere on this screen. NO face photos. Monogram avatars only. Make it FUN and social — a luxury club, not a CRM.

Update design/full-app-mockup-v4.html with both redesigns." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

### ITERATION 3: Add Offline Borrow Flow + Polish All Screens

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath. Read design/full-app-mockup-v4.html (your v4 from iteration 2).

TASK 1 — ADD OFFLINE BORROW FLOW (NEW PLATE):
Add a new plate after the existing Borrow Flow plate. This becomes the 'Record a Borrow' screen — a second borrowing mode where the owner records a lend that happened offline (in person, no request needed).

New plate layout:
1. Back bar with 'Item' label. Kicker: 'RECORD A BORROW'. Title: 'The Cartier Love Bracelet' (Playfair, item name in italic gold).

2. Item summary card: item thumbnail, brand, model. NO PRICE (pricing privacy). Status badge: 'Available'.

3. Borrower selection: 'Who is borrowing?' kicker. A horizontal scroll of circle member monogram avatars (initials on gold gradient, NO face photos). One is selected with a gold ring. Selected member name shown below.

4. Optional note: 'A note (optional)' kicker. A text field with placeholder 'For the gala, handed over at dinner...'

5. Expected return: 'Expected return' kicker. Duration chips: 'No set date' / '3 days' / '1 week' / '2 weeks' / 'Custom'.

6. Confirmation: primary button 'Record Borrow' (btn-dark). Helper text: 'The piece will be marked as borrowed immediately. You can mark it returned at any time.'

7. Modified timeline showing 2 states (not 4): 'Active' (gold node, 'The piece is in their care') and 'Returned' (outline node, 'Condition confirmed, history recorded'). A note: 'No approval needed — this is an offline lend you are recording for your records.'

TASK 2 — UPDATE ACTIVITY FEED:
Add an offline borrow event to the Activity Feed plate. Add a new event at the top of 'Today':
- Avatar: borrower monogram 'M' on gold gradient
- Text: 'Maya borrowed the Cartier Love Bracelet' — no price, no 'requested', just the action
- When: '1 hour ago'
- Thumbnail: the item image
This is distinct from request-flow events which say 'requested to borrow'.

TASK 3 — UPDATE NAVIGATION AND META:
- Update the plate navigation to include the new plate (now 16 plates total)
- Update the masthead to say 'Sixteen screens' instead of 'Fifteen screens'
- Update the colophon to say 'Sixteen plates'
- Renumber the plates if needed

TASK 4 — FINAL POLISH AND VERIFICATION:
Run these checks and fix any issues:

1. NO PEOPLE IMAGES: grep for face/portrait/model/person alt text — must be empty
   grep -iE 'portrait|face|model|person|people|woman|man|collector|girl|guy' design/full-app-mockup-v4.html

2. NO AVATAR IMG TAGS: verify no img tags inside .av elements
   grep -B2 -A2 'class=\"av' design/full-app-mockup-v4.html | grep '<img'
   Must return nothing.

3. NO PRICES IN ACTIVITY OR CIRCLE: 
   grep -n '\$' design/full-app-mockup-v4.html | grep -i 'activity\|circle\|evt\|mrow\|constellation'
   Must return nothing (prices should only appear in item detail and wishlist sections).

4. ALL IMAGE URLs RETURN 200: curl each unique URL in the file.

5. WISHLIST HAS CATEGORIES: verify .chip elements with category names (Bags, Jewellery, Watches, Shoes, Accessories) exist.

6. CIRCLE IS NOT A LIST: verify no .mrow elements remain (the old member row class). The new circle should use constellation/member card layout.

7. OFFLINE BORROW PLATE EXISTS: verify 'Record a Borrow' text exists.

8. NO EMOJI: run python3 check for emoji characters.

9. FILE SIZE > 100KB: ls -la design/full-app-mockup-v4.html

10. ALL 15+ SCREENS PRESENT: grep -c 'class=\"plate\"' design/full-app-mockup-v4.html (must be 16).

11. No emoji anywhere. No dollar signs in activity or circle sections. All images return 200.

Save the final file as design/full-app-mockup-v4.html." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

---

## ACCEPTANCE CRITERIA

When Muaath is done, the following must be true:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | ZERO people images | `grep -iE 'portrait\|face\|model\|person\|people\|woman\|man\|collector\|girl\|guy' design/full-app-mockup-v4.html` returns nothing |
| 2 | NO prices in activity feed or circle views | Manual inspection of Plates XII, XIII, XIV — no `$` signs |
| 3 | Wishlist has categories/filters/search | `.chip` elements with Bags, Jewellery, Watches, Shoes, Accessories; a search input field |
| 4 | Offline borrow flow shown in mockup | A plate with "Record a Borrow" text and the 2-state timeline |
| 5 | Circle screen redesigned (not a list) | No `.mrow` elements; constellation graph or visual layout present |
| 6 | All image URLs return HTTP 200 | `curl -s -o /dev/null -w '%{http_code}'` on every unique URL |
| 7 | File > 100KB | `ls -la design/full-app-mockup-v4.html` |
| 8 | NO emoji | Python regex check returns 0 matches |
| 9 | All screens still present (16+) | `grep -c 'class="plate"' design/full-app-mockup-v4.html` returns 16 |
| 10 | Feature spec written for dev team | `docs/PRICING_PRIVACY_AND_OFFLINE_BORROW_SPEC.md` exists (Dwight is writing this separately) |

---

## NOTES FOR MUAAATH

- The dev team spec for pricing privacy and offline borrow is being written separately by Dwight at `docs/PRICING_PRIVACY_AND_OFFLINE_BORROW_SPEC.md`. You do not need to write the spec — just implement the mockup changes described above.
- If you cannot find a suitable Unsplash image for a replacement, use a texture (marble, silk, leather) as a safe default — textures never contain people.
- The constellation graph on the Circle screen can be inline SVG or CSS-positioned divs. Keep it within the 390px phone width. It does not need to be interactive — it is a static mockup.
- Remember: British spelling throughout (jewellery, catalogue, organise, centre).
- The Provenance Seal stays. The tab bar stays. The phone frame stays. These are refinements, not a redesign.
