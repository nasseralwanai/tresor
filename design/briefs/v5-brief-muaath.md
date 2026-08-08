# Brief: Mockup v5 — Three Fixes from Nasser's Review

**From:** Dwight (Dev Lead)
**To:** Muaath (Designer)
**Date:** August 8, 2026
**Input:** `design/full-app-mockup-v4.html` (133KB, 16 plates)
**Output:** `design/full-app-mockup-v5.html`

Nasser reviewed v4. Three issues. Fix all three. Keep everything else from v4 intact (no people, pricing privacy on item detail and wishlist only, taste labels on circle members, offline record-a-borrow, circle redesign with member cards, alignment fixes).

---

## 1. WISHLIST ACCESSIBILITY — Add a clear navigation entry point

**The problem:** The wishlist (Plate XVI) exists but there is no way to get to it. The bottom tab bar has five tabs — Collection, Activity, Add, Circle, Profile — none of which is Wishlist. The wishlist plate itself has "Collection" marked as active, which is wrong. A user has no path to their wishlist.

**The fix:** Replace "Profile" in the bottom tab bar with "Wishlist" across ALL tab bar instances (6 instances: Collection, Item Detail, Add Item, Activity, Circle, Wishlist plates). Profile is accessible from the avatar in the Collection header, so demoting it from the tab bar is fine. The five tabs become:

1. Collection
2. Activity
3. Add
4. Circle
5. **Wishlist** (new — with a bookmark/heart-line icon, gold-deep active state)

The wishlist plate's tab bar should mark Wishlist as active, not Collection.

Use this SVG icon for the Wishlist tab (1.5px stroke, round caps, consistent with existing tab icons):
```
<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
```
(This is the bookmark icon — already used in the onboarding feature list for "Wishlist / Save items you admire".)

---

## 2. IMAGE QUALITY — Replace ALL images with high-resolution, relevant, people-free photography

**The problem:** All 18 images use `w=800&q=80` — thumbnail quality. Some may contain people. Relevance to the specific product/screen is not verified.

**The requirements for EVERY image:**
- High resolution: use `w=1200` or higher (minimum 1200px wide), `q=85` or better
- Relevant to the screen: luxury product photography for items (bags, watches, jewellery, shoes), architectural/texture images for onboarding backgrounds, destination photography for place screens
- NO people in ANY image — verify by checking the Unsplash page or using known people-free photo IDs
- Every image URL must return HTTP 200 — verify with curl before finalizing
- Keep the existing `onerror` fallback gradient SVG

**Image assignments by plate:**

| Plate | Screen | Image type | Alt text context |
|-------|--------|-----------|-----------------|
| I | Welcome | Luxury still life — watch/jewellery on dark surface, no people | "A gold watch resting on dark leather" |
| II | What Is Trésor | Luxury jewellery on dark velvet, no people | "Gold jewellery resting on dark velvet" |
| III | What You Can Do | Luxury handbags/editorial display, no people | "Editorial display of luxury handbags" |
| IV | Who It Is For | Dubai architecture/skyline, no people | "Dubai architecture at golden hour" |
| IX | Collection | 8 product cards: Birkin, Chanel Flap, Cartier Love Bracelet, Rolex Submariner, Van Cleef Alhambra, Cartier Tank, Louboutin pumps, + one more | Each alt = brand + model |
| X | Item Detail | Hero product image (Birkin 30 or similar luxury bag) | "Hermès Birkin 30 in Togo leather" |
| XI | Add Item | Camera/photography setup or flat-lay of luxury items, no people | "Photographing a luxury handbag" |
| XII | Activity | Small thumbnails — reuse collection product images | Various |
| XIII | Circle | Member highlight images — luxury items, no people | Various |
| XVI | Wishlist | 6 wishlist product cards: Kelly 25, Cartier Ballon Bleu, Bulgari Serpenti, Louboutin Pigalle, + 2 more | Each alt = brand + model |

**Verification step:** After replacing all images, run `curl -sI <url> | head -1` on every unique URL and confirm HTTP 200. If any fail, replace with a working alternative.

---

## 3. LOGO INCORPORATION — Replace Provenance Seal with "The Ironwork" (Door Cut 2)

**The source:** `design/logo-vault-arch-v8.html`, Section II, Door Cut 2 — "The Ironwork"
- Concept: Vault Door, heavy cut — frame thickness 3, reveals tightened to 6, Vermeil wash
- Radii 28 / 22 / 16, constant 6 reveal, one springline (y 46)
- Stroke hierarchy 3 / 1.5 / 0.75

**The SVG:** Define as a reusable `<symbol>` in the SVG defs block at the top of the file (replace the existing `mark-provenance-seal` symbol). The Vermeil gradient def is already present in the file.

### Gold on Charcoal (for dark screens — onboarding, welcome)
**Large (48-128px):**
```svg
<svg viewBox="0 0 100 100" role="img" aria-label="Trésor — The Ironwork">
  <path d="M22 88 L22 46 A28 28 0 0 1 78 46 L78 88"
        fill="none" stroke="#C9A961" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 88 L28 46 A22 22 0 0 1 72 46 L72 88"
        fill="url(#grad-vermeil)" fill-opacity="0.15"
        stroke="#C9A961" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M34 88 L34 46 A16 16 0 0 1 66 46 L66 88"
        fill="none" stroke="#C9A961" stroke-width="0.75" opacity="0.45"/>
  <line x1="50" y1="24" x2="50" y2="88"
        stroke="#C9A961" stroke-width="1" opacity="0.3"/>
  <line x1="16" y1="88" x2="84" y2="88"
        stroke="#E8D5A3" stroke-width="1.75" stroke-linecap="round"/>
</svg>
```

**Small/favicon (under 48px):**
```svg
<svg viewBox="0 0 100 100" role="img" aria-label="Trésor — The Ironwork">
  <path d="M22 88 L22 46 A28 28 0 0 1 78 46 L78 88"
        fill="none" stroke="#C9A961" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 88 L28 46 A22 22 0 0 1 72 46 L72 88"
        fill="url(#grad-vermeil)" fill-opacity="0.18"
        stroke="#C9A961" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="14" y1="88" x2="86" y2="88"
        stroke="#E8D5A3" stroke-width="2.25" stroke-linecap="round"/>
</svg>
```

### Ink on Cream (for light screens — Collection header, app chrome)
**Large:**
```svg
<svg viewBox="0 0 100 100" role="img" aria-label="Trésor — The Ironwork">
  <path d="M22 88 L22 46 A28 28 0 0 1 78 46 L78 88"
        fill="none" stroke="#1A1715" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 88 L28 46 A22 22 0 0 1 72 46 L72 88"
        fill="#1A1715" fill-opacity="0.06"
        stroke="#1A1715" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M34 88 L34 46 A16 16 0 0 1 66 46 L66 88"
        fill="none" stroke="#1A1715" stroke-width="0.75" opacity="0.45"/>
  <line x1="50" y1="24" x2="50" y2="88"
        stroke="#1A1715" stroke-width="1" opacity="0.3"/>
  <line x1="16" y1="88" x2="84" y2="88"
        stroke="#9A7E4A" stroke-width="1.75" stroke-linecap="round"/>
</svg>
```

**Small/favicon:**
```svg
<svg viewBox="0 0 100 100" role="img" aria-label="Trésor — The Ironwork">
  <path d="M22 88 L22 46 A28 28 0 0 1 78 46 L78 88"
        fill="none" stroke="#1A1715" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 88 L28 46 A22 22 0 0 1 72 46 L72 88"
        fill="#1A1715" fill-opacity="0.07"
        stroke="#1A1715" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="14" y1="88" x2="86" y2="88"
        stroke="#9A7E4A" stroke-width="2.25" stroke-linecap="round"/>
</svg>
```

### Placement map

| Plate | Screen | Background | Variant | Size |
|-------|--------|-----------|---------|------|
| I | Welcome | Dark (charcoal) | Gold on charcoal | 48px |
| II | What Is Trésor | Dark | Gold on charcoal | 32px (top-left brand mark) |
| III | What You Can Do | Dark | Gold on charcoal | 32px |
| IV | Who It Is For | Dark | Gold on charcoal | 32px |
| IX | Collection | Light (cream) | Ink on cream | 28px (beside circle kicker) |
| X | Item Detail | Light | Ink on cream | 24px (nav bar) |
| All tab bars | — | Light/Dark | Ink/gold small | 20px (left of "Trésor" if wordmark present) |

**Implementation:** Define a `<symbol id="mark-ironwork" viewBox="0 0 100 100">` containing the large variant paths with `currentColor` for the main strokes (so it can be recolored). Use `<use href="#mark-ironwork"/>` with inline `style="color:#C9A961"` for gold-on-charcoal and `style="color:#1A1715"` for ink-on-cream. The Vermeil fill and gold-bright sill line stay as fixed colors within the symbol, or use CSS variables.

Keep the `grad-vermeil` gradient definition that already exists in the file.

---

## What NOT to change

- Keep all v4 improvements: no people in images, pricing privacy (prices only on item detail and wishlist), taste labels on circle members, offline record-a-borrow plate, circle redesign with member cards, alignment fixes
- Keep the gallery presentation format (catalogue plates, captions, platenav)
- Keep all 16 plates
- Keep the Warm Atelier design system (colors, typography, spacing)
- NO emoji anywhere
- NO people in any image
- NO markdown in the HTML output

---

## Verification checklist (before delivering)

- [ ] Wishlist tab appears in ALL 6 tab bar instances, marked active on Plate XVI
- [ ] Profile removed from tab bar (accessible via avatar in Collection header)
- [ ] All image URLs return HTTP 200 (verify with curl)
- [ ] All images are w=1200+ (not w=800)
- [ ] No image contains people
- [ ] Ironwork SVG symbol defined and used via `<use>` 
- [ ] Ironwork logo appears on: Welcome (gold/charcoal), Collection header (ink/cream), all onboarding plates
- [ ] No emoji anywhere in the file
- [ ] All v4 improvements preserved
