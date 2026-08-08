# ENRICHED BRIEF — Trésor Full App Mockup v3

**From:** Dwight (Dev Lead)
**To:** Muaath (Designer)
**Priority:** HIGH — Nasser reviewed v2, said "much better than before but there is room for improvement"
**Date:** August 8, 2026

---

## THE SITUATION

Nasser reviewed `full-app-mockup-v2.html` (90KB, 12 screens). His verdict: **progress, but six specific improvements needed.** This brief enriches each of his six points into actionable, detailed instructions.

**What's working in v2 (keep this):**
- 12 screens all present and well-structured
- Warm Atelier design system is solid (colors, typography foundations)
- Playfair Display + Jost pairing is correct
- UAE phone patterns (+971, flag SVG, masked input) are well-executed
- OTP 6-box pattern with glow is good
- SMS/WhatsApp segmented toggle is correct
- Editorial gallery presentation (plates side by side) is strong
- Paper grain texture overlay adds depth

**What needs fixing (Nasser's 6 points, enriched below):**

---

## IMPROVEMENT 1 — LOGO DESIGN (BRAND MARK, NOT JUST WORDMARK)

### The Problem
The current mockup uses "T·" in a circle as a monogram and "Trésor" as a wordmark. There is no **logo mark** — no iconic, recognizable brand symbol that stands on its own. Cartier has the panther. Hermès has the horse and carriage. Tiffany has the key. Trésor needs its own iconic mark.

### What to Create

Design **3 logo concepts** as inline SVG, then pick the best one and implement it throughout. The logo must be:

- **Simple and iconic** — recognizable at 24px (favicon) and 120px (welcome screen)
- **Luxury, editorial, memorable** — think Cartier, Hermès, Tiffany, Bulgari
- **Works in two color modes:** gold (#C9A961) on dark (#1a1715) AND dark (#1a1715) on light (#FAF7F2)
- **Not literal** — no treasure chest, no padlock, no key, no diamond glyph, no coin
- **Abstract or letterform-based** — a monogram, a geometric mark, an editorial flourish

### Three Concept Directions (design one of each, then pick the winner)

**Concept A — The Vault Arch:** A minimalist arched doorway or vault shape, drawn as a single gold line. Evokes a private vault, a museum entrance, an atelier doorway. Architectural, structural, quiet.

**Concept B — The Ledger Monogram:** An interlocking "T" and "É" where the accent aigu becomes a decorative flourish or the crossbar of the T. The accent aigu is already gold in the wordmark — extend that idea into a standalone mark. Typographic, refined, French.

**Concept C — The Provenance Seal:** A circular seal/stamp shape with a hairline gold border, containing a minimalist emblem (a single line, a gem facet, an abstract "T"). Evokes auction house provenance seals, wax seals, certification marks. Authoritative, heritage, intimate.

### Where the Logo Appears

1. **Welcome screen** — logo mark above the "Trésor" wordmark, centered, 48-56px
2. **App header** — logo mark at left of the top bar on Collection/Home screen, 28-32px
3. **Loading screen** (if one exists, or add one) — logo mark centered, 64px, with subtle pulse animation
4. **Favicon/browser tab** — logo mark at 16px/32px (simplified version if needed)

### Technical Requirements

- Inline SVG (not an image file) — must scale perfectly
- Single-color (gold or charcoal depending on background) — no gradients on the mark itself
- The wordmark "Trésor" in Playfair Display stays as-is (already good)
- Document the chosen logo in `brand-guide-v2.md` with construction grid, clearspace, minimum sizes

---

## IMPROVEMENT 2 — ONBOARDING INFO SCREENS (SKIPABLE, BEFORE PHONE INPUT)

### The Problem
The current flow jumps from **Welcome → Phone Input** with nothing in between. A first-time user has no idea what Trésor is, what they can do, or who it's for. This is the first impression — it must be WOW.

### What to Create

Insert **3 skipable onboarding info screens** between the Welcome screen and the Phone Input screen. These are editorial, full-bleed, luxury intro slides — the kind Net-a-Porter, Farfetch, or SSENSE would use.

**Screen flow becomes:** Welcome → Info 1 → Info 2 → Info 3 → Phone Input → OTP → Invite → Profile

### The Three Info Screens

**Info Screen 1 — "What is Trésor"**
- Full-bleed luxury background image (dark, moody still life — jewelry on velvet, leather goods, silk)
- Dark gradient scrim overlay for text legibility
- Kicker: "BY INVITATION ONLY"
- Headline (Playfair Display, 36-40px): "A private circle for luxury collections."
- Body (Jost, 15px, light weight): "Trésor is an invite-only platform where a trusted circle of collectors catalog, share, and lend their finest pieces — bags, jewelry, watches — with full provenance."
- Page indicator dots (3 dots, current one gold)
- "Skip" link in top-right corner (small, muted)
- "Continue" button at bottom (gold, full-width)

**Info Screen 2 — "What you can do"**
- Full-bleed luxury image (a beautiful flat-lay of luxury items — bags, watches, jewelry arranged editorially)
- Dark gradient scrim
- Kicker: "THE EXPERIENCE"
- Headline: "Catalog, lend, borrow, wishlist."
- Body: "Photograph your collection with AI assistance. Lend pieces to trusted friends. Borrow what you've always wanted. Track every item's journey through your circle."
- Four mini feature rows with small SVG icons: Catalog (grid icon), Lend & Borrow (arrows icon), Wishlist (bookmark icon), Track (ledger icon) — each with a one-line label
- Page indicator dots
- Skip link
- Continue button

**Info Screen 3 — "Who it's for"**
- Full-bleed luxury image (lifestyle — an elegant hand reaching for a bag on a shelf, or a close-up of friends sharing jewelry)
- Dark gradient scrim
- Kicker: "YOUR CIRCLE"
- Headline: "For the people you trust."
- Body: "Trésor is not a marketplace. It's your private circle — friends, family, colleagues who share your taste. Every member is invited. Every transaction is between people you know."
- Circle preview: 5 avatar circles overlapping, "The Dubai Atelier Circle" label
- Page indicator dots
- Skip link
- "Get Started" button (gold, full-width) — leads to Phone Input

### Design Requirements

- **Full-bleed imagery** — the background image goes edge-to-edge, no margins
- **Editorial copy** — not marketing speak. Think magazine intro, not app store description
- **Dark, moody, luxurious** — dark backgrounds with gold accents, like the Welcome screen
- **Swipeable carousel feel** — even though it's a static mockup, show all 3 screens side by side with page dots
- **Skip is always accessible** — top-right, small but visible, leads directly to Phone Input
- **One clear action per screen** — Continue/Get Started at bottom
- **No progress bars** — page dots only (per luxury onboarding research)
- **Generous whitespace** — text should breathe, not crowd the image

### References to Study (use WebSearch)
- Net-a-Porter app onboarding
- Farfetch app intro flow
- SSENSE app first-launch experience
- 1stDibs app welcome screens
- Moda Operandi lookbook intro

---

## IMPROVEMENT 3 — FIX BROKEN IMAGES

### The Problem
Nasser reports images showing as broken (?) in the mockup. The mockup has 43 `<img>` tags with 19 unique Unsplash URLs.

**Important finding from Dwight's investigation:** All 19 unique URLs return HTTP 200 when tested with `curl -I`. The breakage Nasser sees is likely caused by one of:
1. **Hotlink protection** — Unsplash may block requests from `file://` origin or certain referrers
2. **Referrer policy** — browser may not send proper headers when opening from local file
3. **Mixed content** — if any URL is http instead of https
4. **Rate limiting** — too many simultaneous requests to Unsplash from one page

### What to Do

**Step 1 — Diagnose:** Open the HTML in a browser and check the console for image load errors. Determine the actual failure reason.

**Step 2 — Fix with referrer policy:** Add this to the `<head>` of the HTML:
```html
<meta name="referrer" content="no-referrer">
```
This often fixes Unsplash hotlink issues when opening from `file://`.

**Step 3 — Verify every URL:** Use `curl -s -o /dev/null -w '%{http_code}'` on EVERY unique image URL in the file. Any URL not returning 200 must be replaced.

**Step 4 — If URLs still break:** Replace with alternative stable image sources:
- **Picsum Photos:** `https://picsum.photos/seed/{seed}/800/1000` — always works, no hotlink issues
- **Unsplash Source (legacy):** `https://source.unsplash.com/{photo-id}/800x1000` — redirects but stable
- **Pre-defined working Unsplash IDs:** Use only photo IDs that have been verified to load in a browser, not just curl

**Step 5 — Add error handling:** Add `onerror` fallback on every `<img>` tag:
```html
<img src="..." onerror="this.src='data:image/svg+xml,...'" alt="...">
```
Use a subtle CSS gradient placeholder as the fallback data URI.

**Step 6 — Verify in browser:** After all fixes, open the HTML file in a browser and visually confirm every image renders. No broken image icons.

### Non-Negotiable
- ALL 43+ image tags must render when the HTML is opened in a browser
- Every unique URL must return HTTP 200
- If any image is still broken after all fixes, replace that image source entirely
- Do NOT reduce the number of images — the richness is a feature

---

## IMPROVEMENT 4 — ADD BUTTON REPOSITIONING

### The Problem
The Add button is currently in **position 2 of 5** in the tab bar (Collection, **Add**, Activity, Circle, Profile). It uses a prominent gold floating orb (`add-orb` class) that sits above the tab bar with a large shadow — it's the most visually dominant element in the footer.

**Nasser's direction:** Adding items is NOT the primary action. Browsing and borrowing are. The Add button should be in the **center** of the tab bar and **less prominent** — still accessible, but not screaming for attention.

### What to Change

**1. Move Add to center position (position 3 of 5):**
- New tab order: Collection, Activity, **Add**, Circle, Profile
- The Add tab sits in the middle slot

**2. Demote the Add button visual treatment:**
- **Remove** the floating gold orb (`add-orb` class) — no elevated circle above the tab bar
- **Replace** with a standard tab icon (a simple "+" or "Add" icon, same size as other tab icons, 21×21px)
- The Add tab should look like the other tabs — same height, same icon size, same label treatment
- If you want slight differentiation, use a hairline gold border circle (not filled gold) — subtle, not loud
- **No** elevated shadow, **no** gold gradient fill, **no** margin-top negative offset

**3. Update all tab bars across all screens:**
The tab bar appears on multiple screens (Collection, Item Detail, Add Item, Activity, Circle, Borrow, Wishlist). Every instance must be updated with the new order and demoted Add button.

**4. Active states:** When on the Add Item screen, the Add tab gets the standard "on" treatment (gold-deep color, small pip beneath) — same as every other active tab. No special treatment.

### Reference
Look at how luxury marketplace apps handle their tab bars:
- Net-a-Porter: minimal tabs, no floating action button
- Farfetch: clean tab bar, search/profile prominence
- Vestiaire Collective: standard tab bar, no elevated center button

---

## IMPROVEMENT 5 — FONT & CAPITALIZATION POLISH

### The Problem
Text labels across screens have inconsistent capitalization and sizing. Some labels are Title Case, others are sentence case, others are ALL CAPS. Font sizes vary without clear hierarchy in places.

### What to Fix

**1. Capitalization — pick ONE convention per context and apply everywhere:**

| Context | Convention | Example |
|---------|-----------|---------|
| Screen titles (H1) | Title Case | "Your Collection", "Item Detail", "Activity Feed" |
| Section headers (H2) | Title Case | "Borrow History", "Circle Members" |
| Buttons / CTAs | Title Case | "Send Code", "Request to Borrow", "Complete Setup" |
| Tab labels | Title Case | "Collection", "Activity", "Add", "Circle", "Profile" |
| Kickers / eyebrows | ALL CAPS + letterspaced | "BY INVITATION ONLY", "LA COLLECTION" |
| Status labels | ALL CAPS + letterspaced | "AVAILABLE", "BORROWED" |
| Body text / descriptions | Sentence case | "We'll send a verification code to confirm it's you." |
| Form labels | Title Case | "Phone Number", "Invite Code", "Full Name" |
| Item brand names | As branded | "Hermès", "Chanel", "Cartier" (proper brand casing) |
| Timestamps / meta | Sentence case | "2 hours ago", "March 2026" |

**Audit every text element in the mockup.** Find inconsistencies and fix them. Common issues to look for:
- "Your number" vs "Your Number" — pick one (Title Case)
- "Send code" vs "Send Code" — pick one (Title Case)
- Tab labels: "Collection" vs "collection" — Title Case
- Chip labels: "All" vs "all" vs "ALL" — Title Case for filter chips

**2. Font size hierarchy — verify the scale is consistent:**

The brand guide defines this scale. Verify it's applied:
- Display: 40-64px (Playfair, welcome wordmark)
- H1: 30px (Playfair, screen titles)
- H2: 23px (Playfair, section heads, item names)
- H3: 18px (Playfair, card titles)
- Value: 20px (Playfair 600, prices)
- Body: 15px (Jost 400, paragraphs)
- Body-S: 13.5px (Jost 400, meta, timestamps)
- Label: 12.5px (Jost 500, buttons, tabs, form labels)
- Kicker: 11px (Jost 500, 0.28em tracking, uppercase)
- Micro: 10.5px (Jost 400, 0.06em tracking, legal/hints)

**Check for:**
- Labels that are too big (should be 12.5px, not 15px+)
- Body text that's too small (should be 15px, not 13px)
- Kickers with wrong tracking (should be 0.28em, not 0.1em)
- Prices not in Playfair 600
- Headlines not in Playfair

**3. Font family enforcement:**
- **Playfair Display** = headlines, brand names, item names, prices/values, editorial accents, the wordmark
- **Jost** = body text, labels, buttons, form inputs, tab labels, captions, meta text
- **Never** use Playfair for body paragraphs or UI labels
- **Never** use Jost for headlines or brand names
- Check every `font-family` declaration and inline style

**4. Letter-spacing review:**
- Kickers/eyebrows: 0.28em (currently some are 0.34em — standardize)
- Status labels: 0.14em
- Tab labels: 0.16em
- Button text: 0.14em
- Body text: 0.01em (barely tracked)
- Playfair headlines: 0 to -0.01em (tight, not tracked)
- Wordmark: 0.24-0.32em (heavily tracked, uppercase)

---

## IMPROVEMENT 6 — DESIGN INSPIRATION RESEARCH

### The Problem
The v2 design is good but was built primarily from the onboarding research file. Nasser wants evidence that Muaath actively researched **Dribbble, Mobbin, and Behance** for current luxury app patterns and incorporated specific findings.

### What to Do

**Use WebSearch and WebFetch to research these specific queries:**

**Dribbble (use WebSearch):**
- Search: `site:dribbble.com luxury app onboarding`
- Search: `site:dribbble.com luxury marketplace app`
- Search: `site:dribbble.com fashion app UI tab bar`
- Look for: onboarding carousel patterns, luxury color treatments, editorial typography in apps, tab bar designs without floating action buttons

**Mobbin (use WebSearch):**
- Search: `site:mobbin.com luxury shopping app`
- Search: `Mobbin tab bar patterns luxury apps`
- Look for: how Net-a-Porter, Farfetch, SSENSE, Vestiaire Collective structure their tab bars; onboarding flow patterns; how they handle imagery in onboarding

**Behance (use WebSearch):**
- Search: `site:behance.net luxury brand identity`
- Search: `site:behance.net fashion app UI`
- Search: `site:behance.net luxury logo design`
- Look for: logo marks for luxury brands, onboarding screen layouts, editorial app design, color palettes

### What to Capture and Incorporate

For each source you find, note:
1. **The specific pattern** (e.g., "Net-a-Porter uses full-bleed imagery with centered text overlay in onboarding")
2. **How Trésor can use it** (e.g., "Apply this to our info screens — full-bleed image + centered Playfair headline + dark scrim")
3. **The URL** (for reference)

**Incorporate at least 5 specific findings** from Dribbble/Mobbin/Behance into the v3 design. Examples of what "incorporate" means:
- A tab bar pattern from a Mobbin reference
- An onboarding carousel layout from a Dribbble shot
- A logo treatment from a Behance brand identity project
- A typography hierarchy from a luxury app on Dribbble
- A color treatment or image overlay technique from any source

**Document your research:** Add a "Design References" section at the bottom of `brand-guide-v2.md` listing the specific sources you found and how they influenced the v3 design. Include URLs.

---

## EXECUTION PLAN — CLAUDE CODE ITERATIONS

You have Claude Code installed (v2.1.222) with claude-fable-5 model and frontend-design plugin.

**Binary:** `claude` (in PATH at `/Users/nasseralnuaimi/.local/bin/claude`)
**Model:** `--model claude-fable-5`
**Allowed tools:** `Read,Write,Bash,WebSearch,WebFetch`
**Print mode:** `claude -p "prompt" --allowedTools "..." --max-turns 30`
**Working directory:** `/Users/nasseralnuaimi/Projects/personal/tresor`

### ITERATION 1: Research + Logo + Fix Images

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath, a luxury brand designer working on Trésor, a private luxury collection circle app.

Read these files first:
1. design/full-app-mockup-v2.html — the current mockup (90KB, 12 screens, 43 img tags)
2. design/brand-guide-v2.md — the current brand guide
3. design/research/onboarding-research.md — your UX research (16 sources)

TASK 1 — DESIGN RESEARCH (use WebSearch and WebFetch):
Search Dribbble, Mobbin, and Behance for luxury app design inspiration:
- WebSearch: 'site:dribbble.com luxury app onboarding' and 'site:dribbble.com luxury marketplace app'
- WebSearch: 'site:mobbin.com luxury shopping app' and 'Mobbin tab bar patterns luxury'
- WebSearch: 'site:behance.net luxury brand identity' and 'site:behance.net fashion app UI'
For each result, note the specific pattern and how Trésor can use it. Save findings to design/research/design-inspiration-v3.md with URLs.

TASK 2 — DESIGN 3 LOGO CONCEPTS:
Create 3 logo concepts for Trésor as inline SVG:
- Concept A: The Vault Arch (minimalist arched doorway/vault shape, single gold line)
- Concept B: The Ledger Monogram (interlocking T and É where the accent aigu is decorative)
- Concept C: The Provenance Seal (circular seal with hairline gold border and minimalist emblem)
Each must work in gold on dark AND dark on light. Pick the best one and explain why.
Save the 3 concepts and your choice to design/logo-concepts.html (a standalone HTML page showing all 3).

TASK 3 — FIX BROKEN IMAGES:
The current mockup has 43 img tags with Unsplash URLs. Nasser sees them as broken.
- First, add <meta name='referrer' content='no-referrer'> to the head of the HTML
- Then verify EVERY unique image URL returns HTTP 200 using: curl -s -o /dev/null -w '%{http_code}' 'URL'
- For any URL that fails, replace it with a working alternative (try picsum.photos/seed/SEED/800/1000 as fallback)
- Add onerror fallback on every img tag with a subtle gradient SVG data URI placeholder
- Open the file mentally and confirm no broken images

Create the updated mockup as design/full-app-mockup-v3.html (copy of v2 with these fixes applied).
Do NOT change anything else in this iteration — just fix images and add the referrer meta tag." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

### ITERATION 2: Onboarding Screens + Add Button + Fonts

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath. Read design/full-app-mockup-v3.html (your v3 from iteration 1), design/logo-concepts.html (your chosen logo), and design/research/design-inspiration-v3.md (your Dribbble/Mobbin/Behance research).

Now make these changes to design/full-app-mockup-v3.html:

TASK 1 — ADD ONBOARDING INFO SCREENS:
Insert 3 skipable onboarding info screens between the Welcome screen (Plate I) and Phone Input (currently Plate II). These become new Plates II, III, IV (renumber subsequent plates).

Info Screen 1 — 'What is Trésor':
- Full-bleed luxury background image (dark moody still life) with dark gradient scrim
- Kicker: 'BY INVITATION ONLY'
- Headline (Playfair Display 36-40px): 'A private circle for luxury collections.'
- Body (Jost 15px light): 'Trésor is an invite-only platform where a trusted circle of collectors catalog, share, and lend their finest pieces — bags, jewelry, watches — with full provenance.'
- 3 page indicator dots (first one gold)
- 'Skip' link top-right (small, muted)
- 'Continue' button (gold, full-width) at bottom

Info Screen 2 — 'What you can do':
- Full-bleed luxury image (flat-lay of luxury items)
- Kicker: 'THE EXPERIENCE'
- Headline: 'Catalog, lend, borrow, wishlist.'
- Body about photographing collection with AI, lending, borrowing, tracking
- 4 mini feature rows with SVG icons: Catalog, Lend & Borrow, Wishlist, Track
- Page dots (second gold)
- Skip link + Continue button

Info Screen 3 — 'Who it's for':
- Full-bleed luxury image (lifestyle — friends sharing luxury items)
- Kicker: 'YOUR CIRCLE'
- Headline: 'For the people you trust.'
- Body about it being private, invite-only, not a marketplace
- Circle preview: 5 overlapping avatars + 'The Dubai Atelier Circle' label
- Page dots (third gold)
- Skip link + 'Get Started' button (leads to Phone Input)

Design these screens to be WOW — full-bleed imagery, editorial copy, luxury feel. Study your Dribbble/Mobbin/Behance research for patterns. These are the first impression.

TASK 2 — REPOSITION ADD BUTTON:
The Add button is currently in position 2 of 5 in the tab bar with a prominent gold floating orb.
- Move it to the CENTER (position 3 of 5): Collection, Activity, Add, Circle, Profile
- REMOVE the floating gold orb (add-orb class) — no elevated circle, no large shadow
- Replace with a standard tab icon (simple + icon, 21x21px, same size as other tabs)
- The Add tab should look like every other tab — same height, same treatment
- Optional: subtle hairline gold border circle around the + icon, NOT filled gold
- Update ALL tab bars across ALL screens (Collection, Item Detail, Add Item, Activity, Circle, Borrow, Wishlist)

TASK 3 — ADD CHOSEN LOGO:
- Add the chosen logo mark (from design/logo-concepts.html) as inline SVG to:
  - Welcome screen: above the 'Trésor' wordmark, centered, 48-56px, gold on dark
  - App header on Collection/Home screen: top-left, 28-32px
  - Update the platenav and masthead if appropriate

TASK 4 — FONT & CAPITALIZATION POLISH:
Audit every text element and fix:
- Screen titles: Title Case ('Your Collection', 'Item Detail', 'Activity Feed')
- Buttons: Title Case ('Send Code', 'Request to Borrow', 'Complete Setup')
- Tab labels: Title Case ('Collection', 'Activity', 'Add', 'Circle', 'Profile')
- Kickers: ALL CAPS + 0.28em tracking (standardize — some are 0.34em)
- Status labels: ALL CAPS + 0.14em tracking
- Body text: Sentence case
- Form labels: Title Case
- Brand names: proper casing ('Hermès', 'Chanel', 'Cartier')
- Verify Playfair Display for ALL headlines, brand names, prices, editorial accents
- Verify Jost for ALL body, labels, buttons, UI text
- Check font sizes match the brand guide type scale
- Fix letter-spacing: kickers 0.28em, tabs 0.16em, buttons 0.14em, body 0.01em

Update the plate navigation to include the 3 new info screens (now 15 plates total).
Rewrite design/full-app-mockup-v3.html with all changes." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

### ITERATION 3: Polish + Brand Guide Update + Final Verification

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath. Read design/full-app-mockup-v3.html (your v3 from iteration 2) for final polish.

TASK 1 — POLISH PASS:
Review every screen against your Dribbble/Mobbin/Behance research (design/research/design-inspiration-v3.md):
- Are the onboarding info screens truly WOW? Full-bleed imagery, editorial copy, luxury feel?
- Is the logo visible and well-placed on welcome + header?
- Is the Add button now centered and demoted (no gold orb)?
- Are ALL fonts consistent? Playfair for headlines, Jost for body?
- Is capitalization consistent across ALL screens?
- Do all images render? Verify with: curl -s -o /dev/null -w '%{http_code}' on each unique URL
- Is the referrer meta tag present?
- Are there onerror fallbacks on img tags?
- Is the plate navigation updated with all 15 screens?
- Does every screen have the paper-grain texture?
- Are animations subtle and elegant?

Fix any issues found. The file must be > 80KB.

TASK 2 — UPDATE BRAND GUIDE:
Read design/brand-guide-v2.md. Add a new section '1.5 Logo Mark' documenting:
- The chosen logo concept and why it was selected
- Construction details (geometry, proportions, grid)
- Color variants (gold on dark, dark on light)
- Clearspace and minimum sizes
- Where it appears (welcome, header, loading, favicon)
- The inline SVG code for the logo mark

Also add a 'Design References' section at the end documenting:
- 5+ specific references from Dribbble/Mobbin/Behance with URLs
- How each reference influenced the v3 design

Save updated brand guide to design/brand-guide-v2.md (overwrite).

TASK 3 — FINAL VERIFICATION:
Run these checks and report results:
1. Count img tags: grep -c '<img' design/full-app-mockup-v3.html (must be 40+)
2. File size: ls -la design/full-app-mockup-v3.html (must be > 80KB)
3. Screen count: grep -c 'class=\"plate\"' design/full-app-mockup-v3.html (must be 15+)
4. Logo SVG present: grep -c 'logo' design/full-app-mockup-v3.html
5. Onboarding screens: grep -c 'Info Screen\|info-screen' design/full-app-mockup-v3.html
6. No emoji: verify no emoji characters in the file
7. Playfair + Jost: grep for both font names
8. Referrer meta: grep 'referrer' design/full-app-mockup-v3.html
9. Add button centered: verify tab order is Collection, Activity, Add, Circle, Profile
10. All image URLs return 200: curl each unique URL

Report all results." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

---

## ACCEPTANCE CRITERIA

Dwight will verify ALL of these before delivering to Nasser:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Logo mark exists as inline SVG, appears on welcome + header | `grep -c 'svg.*logo\|logo.*svg' full-app-mockup-v3.html` |
| 2 | Onboarding info screens present (3 screens, skipable, before phone input, with imagery) | Visual inspection — 3 new plates between Welcome and Phone |
| 3 | ALL images render (every unique URL returns HTTP 200) | `curl -s -o /dev/null -w '%{http_code}'` on each URL + referrer meta tag present |
| 4 | Add button in center of footer (position 3 of 5), less prominent (no gold orb) | Visual inspection — tab order is Collection, Activity, Add, Circle, Profile |
| 5 | Font capitalization consistent across all screens | Visual audit — Title Case for titles/buttons/tabs, ALL CAPS for kickers/status |
| 6 | Evidence of Dribbble/Mobbin/Behance research in the design | `design/research/design-inspiration-v3.md` exists with URLs + patterns referenced in brand guide |
| 7 | File size > 80KB | `ls -la full-app-mockup-v3.html` |
| 8 | NO emoji | `grep -P '[\x{1F600}-\x{1F9FF}]' full-app-mockup-v3.html` returns nothing |
| 9 | All 12+ original screens still present (now 15 with info screens) | `grep -c 'class="plate"'` returns 15+ |
| 10 | Playfair Display + Jost fonts | `grep 'Playfair Display'` and `grep 'Jost'` both return matches |
| 11 | Brand guide updated with logo section + design references | `grep 'Logo Mark' brand-guide-v2.md` and `grep 'Design References' brand-guide-v2.md` |
| 12 | Referrer meta tag present | `grep 'referrer' full-app-mockup-v3.html` |

---

## OUTPUT FILES (overwrite these)

| File | Action |
|------|--------|
| `design/full-app-mockup-v3.html` | CREATE — the updated mockup with all 6 improvements |
| `design/brand-guide-v2.md` | UPDATE — add logo mark section + design references section |
| `design/logo-concepts.html` | CREATE — 3 logo concepts for reference |
| `design/research/design-inspiration-v3.md` | CREATE — Dribbble/Mobbin/Behance research notes |

---

## CONTEXT FILES (read-only, for reference)

- `design/full-app-mockup-v2.html` — current mockup (90KB, 12 screens)
- `design/brand-guide-v2.md` — current brand guide (14KB)
- `design/research/onboarding-research.md` — UX research (16 sources, 243 lines)
- `BRIEF.md` — product context
- `docs/USER_MGMT_ARCHITECTURE.md` — architecture (RLS, invite codes)

---

## NOTES FROM DWIGHT

- Nasser said "much better than before" — this is positive. The foundation is good. These are refinements, not a rebuild.
- The image URLs all return HTTP 200 from curl — the breakage is likely a referrer/hotlink issue. The `no-referrer` meta tag should fix it. If not, use picsum.photos as fallback.
- The brand guide is already excellent (14KB, detailed). Just add the logo section and references — don't rewrite it.
- The tab bar currently has Add in position 2 with a gold floating orb. Moving it to center and demoting it is a straightforward CSS/HTML change across all screen instances.
- The 3 onboarding info screens are the biggest new addition. Make them editorial and luxurious — this is the first impression.
- Do NOT lose any existing screens. The 12 original screens must all still be present (now 15 with the 3 info screens).

**Nasser is watching. Don't lose momentum. Deliver v3 that impresses.**
