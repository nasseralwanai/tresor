# ENRICHED BRIEF — Trésor Brand Identity & Full App Mockup v2

**From:** Dwight (Dev Lead)
**To:** Muaath (Designer)
**Priority:** CRITICAL — Nasser's final warning. "Else all of you will be deleted."
**Date:** August 8, 2026

---

## THE SITUATION

Nasser rejected `onboarding-v4.html`. His exact words:

> "Still not what I'm looking for. Muaath needs to use his research and references. Come up with a new concept for onboarding and branding now also for the application, do a full Mockup and design that needs to impress people not just be a basic empty no imagery icon looking ai slop like the one you shared with me."

**What was wrong with the rejected mockup:**
- 33KB — too small, too empty
- ZERO `<img>` tags — no real product imagery at all
- All CSS shapes and SVG icons — "icon looking ai slop"
- Only onboarding screens — no full app
- No brand identity document
- Did not visibly use Muaath's 16-source research

**What Nasser actually wants:**
- A NEW brand identity for the ENTIRE application (not just onboarding)
- A FULL app mockup with ALL key screens
- REAL luxury product imagery (bags, jewelry, watches) — actual photos, not icons
- Editorial magazine quality — Net-a-Porter, Farfetch, SSENSE product pages
- Rich, layered, textured — NOT minimal empty screens
- Muaath's research findings VISIBLE in the design

---

## YOUR RESEARCH — READ IT FIRST

File: `/Users/nasseralnuaimi/Projects/personal/tresor/design/research/onboarding-research.md`

You spent time on this. 243 lines, 16 sources. USE IT. The research contains:

### UAE Phone Input UX (Sources: Vitaly Friedman, UX Planet, Evil Martians, USWDS, CodeBridge)
- Fixed +971 prefix (UAE-only app)
- UAE flag as inline SVG (red/green/white/black — NO emoji)
- Single input for 9-digit local number, masked `5X XXX XXXX`
- "We'll send a verification code to confirm it's you" context text
- Group digits: `+971 50 123 4567`

### OTP Verification UX (Sources: Authgear, UX Good Patterns, Design Studio, Designary, Twilio)
- 6 individual digit boxes (36px × 44px each)
- Auto-focus next box after each digit
- Auto-submit on 6th digit — NO "Verify" button
- "Code sent to +971 50 123 4567" context text
- "Resend code" with countdown (5s rate limit per Nigel's config)
- "Change number" link
- Active box: gold border + subtle glow (`box-shadow: 0 0 0 3px`)
- SMS autofill support

### SMS/WhatsApp Toggle (Sources: Mobbin, Meta/WhatsApp, Twilio, 360dialog)
- Segmented control: [SMS] [WhatsApp]
- SMS default (90%+ per Nigel's arch), WhatsApp secondary
- SMS segment: speech bubble SVG + "SMS" label
- WhatsApp segment: WhatsApp logo SVG path + "WhatsApp" label
- Active segment: surface background + shadow, accent text
- Inactive: transparent, muted text

### Luxury Onboarding Patterns (Sources: Zigpoll, SSENSE, Mobbin, Eleken, Arounda)
- Minimal friction, maximum elegance
- Editorial typography as brand expression (Playfair Display serifs)
- One clear action per screen
- Show value before asking for effort
- Profile setup is lightweight (name + avatar only)
- Avatar as circular gradient placeholder with initials
- NO progress bars or step indicators in luxury onboarding
- Generous, editorial whitespace

### UAE-Specific
- WhatsApp dominance — offering WhatsApp OTP is expected
- Phone format: +971 5X XXX XXXX (all mobile starts with 5)
- Carrier filtering (Etisalat/Du) — registered "TRESOR" Sender ID
- Phone numbers always LTR even in RTL contexts

---

## WHAT TO CREATE

### DELIVERABLE 1: Brand Guide v2
**Output:** `/Users/nasseralnuaimi/Projects/personal/tresor/design/brand-guide-v2.md`

Document the COMPLETE brand identity for Trésor. Not just onboarding — the entire application.

#### 1. Logo / Wordmark Concept
- Luxury, editorial, NOT a treasure chest or generic icon
- Think: monogram, letterform, abstract luxury mark
- The word "Trésor" itself as the primary mark — how is it set? What weight? What spacing?
- Consider an accompanying monogram (T. or Tr.) for app icon / favicon
- Describe the concept, the feeling, the execution

#### 2. Color System — Warm Atelier with Depth
Base palette (from existing system):
- Background: Cream #FAF7F2 / Charcoal #1a1715 (dark mode)
- Surface: White #FFFFFF / Charcoal-soft #221e1c
- Gold accent: #C9A961 (primary), #E8D5A3 (bright), #9A7E4A (deep)
- Cream text: #F5F0E8

What's missing (ADD THIS):
- Gradient definitions (gold gradients, background gradients, card gradients)
- Texture treatments (subtle noise, paper grain, fabric texture overlays)
- Color depth per surface (hover states, active states, shadows)
- Semantic colors (success green, pending amber, error red) with luxury tones
- How colors layer — backgrounds, cards, overlays, modals

#### 3. Typography System — Playfair Display + Jost
Base fonts are set. Document HOW they're used:
- Complete type scale (H1-H6, body, caption, micro) with exact sizes, line heights, letter spacing
- When to use serif vs sans (headlines = Playfair, body/UI = Jost)
- Editorial patterns: drop caps, pull quotes, kickers, bylines
- Numeric formatting (values, prices — tabular figures)
- Weight usage (Playfair 400/500/600, Jost 300/400/500/600)
- Italic usage (Playfair italic for accent phrases, invite code placeholder)

#### 4. Visual Language
- Photography style: luxury product photography, soft natural light, neutral backgrounds, editorial composition
- Imagery treatment: subtle warm overlay, consistent aspect ratios, rounded corners
- Borders: hairline 1px, never thick. Gold hairlines for emphasis.
- Dividers: thin gold or cream lines, not boxes
- Card styles: surface with subtle shadow, rounded corners, hairline border
- Icon style: geometric SVG, 1.5px stroke, not filled. No emoji ever.
- Spacing system: 4px base unit, generous whitespace

#### 5. Motion Principles
- Subtle, elegant, NOT particles or canvas effects
- Entrance: fade in + slide up (0.4s ease-out)
- Page transitions: crossfade (0.3s)
- Button press: scale 0.98 + opacity
- OTP fill: box border glow pulse
- Card hover/press: lift shadow
- Loading: skeleton screens, not spinners
- NO floating dots, NO particle systems, NO canvas animations

---

### DELIVERABLE 2: Full App Mockup v2
**Output:** `/Users/nasseralnuaimi/Projects/personal/tresor/design/full-app-mockup-v2.html`

A single HTML file showing ALL key screens. NOT just onboarding.

#### SCREENS REQUIRED (12 total):

**Onboarding Flow (5 screens):**

1. **Welcome** — Full-screen brand moment
   - "Trésor" in large Playfair Display
   - Tagline: "Your private circle for luxury collections."
   - Single CTA: "Begin"
   - Dark charcoal background, gold accents
   - MUST have a background image: luxury still life (silk fabric, jewelry on velvet, leather goods) from Unsplash
   - Image with dark gradient overlay for text legibility

2. **Phone Input (UAE)** — From your research
   - UAE flag SVG (NOT emoji)
   - Fixed +971 prefix
   - Single masked input `5X XXX XXXX`
   - Segmented toggle [SMS] [WhatsApp] with SVG icons
   - "Send Code" button
   - "Use email instead" small link
   - Context: "We'll send a verification code to confirm it's you"

3. **OTP Verification** — From your research
   - 6 individual digit boxes (36px × 44px)
   - Show 3 digits filled to demonstrate the interaction
   - Active box: gold border + glow
   - "Code sent to +971 50 123 4567"
   - "Resend code" + "Change number" links
   - SMS/WhatsApp indicator

4. **Invite Code** — After auth (fixes RLS bug)
   - Large editorial input with gold underline
   - Seric italic placeholder: "Enter your invite code"
   - Circle preview card: "The Dubai Atelier Circle", 5 member avatars, description

5. **Profile Setup**
   - Large circular avatar with gold border (gradient placeholder with initials "M")
   - Camera icon to add photo
   - Name input
   - "Complete Setup" button

**App Screens (7 screens):**

6. **Home / Collection** — The main screen
   - Header: "Your Collection" in Playfair, item count
   - 2-column grid of REAL luxury items (bags, jewelry, watches) with photos
   - Each item card: product photo, brand name, model, value, availability badge
   - Filter chips: All / Bags / Jewelry / Watches / Available / Borrowed
   - Bottom tab bar (Collection, Add, Activity, Circle, Profile)
   - REAL IMAGES: use Unsplash URLs for designer bags, jewelry, watches

7. **Item Detail** — Full item view
   - Large hero product image (real photo from Unsplash)
   - Brand name (Playfair), model name, category
   - Value, purchase price, condition
   - Owner avatar + name
   - Status badge (Available / Borrowed by [name])
   - "Request to Borrow" button (if available) or "Currently Borrowed" state
   - Item notes, AI metadata
   - Borrow history timeline

8. **Add Item** — AI photo capture
   - Camera viewfinder area (show a luxury bag photo being captured)
   - "Capture" button
   - Alternative: "Paste Link" / "Manual Entry" tabs
   - Recent additions preview

9. **Activity Feed** — Social timeline
   - Timeline of events with avatars and item thumbnails
   - Event types: "Added a new item", "Requested to borrow", "Returned", "Joined the circle"
   - Each event: avatar, name, action, item thumbnail (real image), timestamp
   - Date dividers

10. **Circle Members** — Social group
    - Circle name header: "The Dubai Atelier Circle"
    - Member list: avatar, name, item count, role badge (Admin/Member)
    - Each member tappable to see their collection
    - Circle stats: total items, total value, active borrows

11. **Borrow Flow** — Request to borrow
    - Item being borrowed (real product image)
    - Borrower info, owner info
    - Request message field
    - Duration picker
    - "Send Request" button
    - Status timeline: Requested → Accepted → Active → Returned

12. **Wishlist** (bonus, if time permits)
    - Saved items with photos
    - Savings progress bars
    - Price drop alerts

#### IMAGERY REQUIREMENTS — THIS IS NON-NEGOTIABLE:

Use REAL Unsplash images for luxury products. Use these URL patterns:
```
https://images.unsplash.com/photo-{ID}?w=800&q=80&auto=format&fit=crop
```

Search for and use actual luxury product photos:
- Designer handbags (Hermès, Chanel, Louis Vuitton style)
- Fine jewelry (rings, necklaces, earrings)
- Luxury watches (Rolex, Cartier style)
- Silk scarves, leather goods
- Luxury still life for welcome screen

The mockup MUST contain at least 15 `<img>` tags with real Unsplash URLs. If it doesn't, it's rejected.

#### TECHNICAL REQUIREMENTS:

- Phone frame: **390×844px** (iPhone 15) — NOT 320×680
- Fonts: Playfair Display + Jost (Google Fonts)
- Colors: Gold #C9A961 + Warm Atelier palette
- NO emoji — SVG icons only
- NO particle systems, NO canvas effects
- Subtle CSS animations only (fade, slide)
- All screens visible in one HTML file, laid out side by side
- Demo navigation: buttons or links to scroll between screens
- File size > 50KB (indicates actual content)
- Responsive: works on desktop preview

---

## EXECUTION PLAN — USE CLAUDE CODE / FABLE 5

You have Claude Code installed with claude-fable-5 model and frontend-design plugin.

**Binary:** `claude` (in PATH)
**Model:** `--model claude-fable-5`
**Auth:** logged in as nasseralwan@gmail.com
**Allowed tools:** `Read,Write,Bash,WebSearch,WebFetch`
**Print mode:** `claude -p "prompt" --allowedTools "..." --max-turns 30`

### ITERATION 1: Generate Initial Concept

**Command:**
```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath, a luxury brand designer. Read these files first:
1. design/research/onboarding-research.md (your own research — 16 sources on luxury UX, UAE phone patterns, OTP best practices)
2. design/briefs/enriched-brief-muaath-v2.md (your full brief)
3. BRIEF.md (product context)

Then CREATE TWO FILES:

FILE 1: design/brand-guide-v2.md
A complete brand identity guide for Trésor covering:
- Logo/wordmark concept (editorial luxury, NOT a treasure chest)
- Color system with gradients, textures, semantic colors (Warm Atelier base: cream #FAF7F2, charcoal #1a1715, gold #C9A961/#E8D5A3/#9A7E4A)
- Typography system (Playfair Display + Jost) with full type scale, hierarchy, editorial patterns
- Visual language (photography style, borders, cards, icons, spacing)
- Motion principles (subtle, elegant, no particles)

FILE 2: design/full-app-mockup-v2.html
A full HTML mockup showing ALL 12 screens:
- Onboarding: Welcome, Phone Input (UAE +971), OTP (6 boxes), Invite Code, Profile Setup
- App: Home/Collection, Item Detail, Add Item, Activity Feed, Circle Members, Borrow Flow, Wishlist

CRITICAL REQUIREMENTS:
1. Use REAL Unsplash images for luxury products. Search for designer bags, jewelry, watches. Use <img> tags with real URLs like https://images.unsplash.com/photo-{id}?w=800&q=80&auto=format&fit=crop
2. You MUST include at least 15 <img> tags with real product photos
3. Phone frame: 390x844px (iPhone 15)
4. Fonts: Playfair Display + Jost from Google Fonts
5. NO emoji — SVG icons only
6. NO particle systems or canvas effects
7. Gold accent #C9A961, Warm Atelier palette
8. Apply your research findings: UAE flag SVG, +971 prefix, 6 OTP boxes with auto-focus, SMS/WhatsApp segmented toggle, editorial whitespace, one action per screen
9. The design must be RICH and LAYERED — not minimal empty screens. Think Net-a-Porter, Farfetch, SSENSE product pages.
10. Show real data in context: items with photos, brand names (Hermès, Chanel, Cartier), values, borrow status
11. File must be > 50KB

Use WebSearch to find real Unsplash photo IDs for luxury products. Use WebFetch to verify image URLs work.

Layout all screens side by side in the HTML for preview. Include screen labels." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

### ITERATION 2: Review Against Research and Refine

After iteration 1, review the output. Then run:

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath. Read design/full-app-mockup-v2.html and design/brand-guide-v2.md that you created.

Now REVIEW and REFINE against your research (design/research/onboarding-research.md):

CHECK THESE:
1. Are there at least 15 <img> tags with real Unsplash luxury product photos? If not, ADD MORE. Search for: Hermès Birkin bag, Chanel classic flap, Cartier love bracelet, Rolex watch, diamond ring, silk scarf, pearl necklace.
2. Is the UAE flag an inline SVG (not emoji)? Does phone input show +971 prefix with masked 5X XXX XXXX?
3. Are there exactly 6 OTP digit boxes (36x44px) with 3 filled to show interaction state? Is there 'Code sent to +971 50 123 4567' context text?
4. Is there a segmented [SMS] [WhatsApp] toggle with SVG icons?
5. Are ALL 12 screens present? (Welcome, Phone, OTP, Invite, Profile, Home/Collection, Item Detail, Add Item, Activity, Circle, Borrow, Wishlist)
6. Is phone frame 390x844px?
7. Is it rich and editorial — NOT minimal empty screens?
8. Are real brand names shown? (Hermès, Chanel, Cartier, Rolex, etc.)
9. Are there real values, borrow status badges, member avatars?
10. Is the welcome screen using a luxury background image with dark overlay?

FIX any issues. Add more imagery where screens are empty. Make the Collection screen a rich 2-column grid with at least 8 real product photos. Make Item Detail show a large hero image. Make Activity Feed show item thumbnails.

Rewrite both files with improvements. File size must be > 50KB." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

### ITERATION 3: Polish — Typography, Spacing, Motion, Final Imagery

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor

claude -p "You are Muaath. Read design/full-app-mockup-v2.html for final polish.

POLISH PASS — make this magazine quality:

1. TYPOGRAPHY: Ensure Playfair Display is used for ALL headlines, brand names, item names, and editorial accents. Jost for body, labels, buttons, UI. Add letter-spacing to kickers/labels (0.2em+). Add italic Playfair for the invite code placeholder and accent phrases.

2. SPACING: Increase whitespace between sections. Cards should breathe. Don't cram. Luxury = generous space.

3. IMAGERY: Ensure every product card has a real photo. The Home/Collection grid should have at least 8 items with photos. Item Detail should have a large hero image. Activity feed events should have item thumbnails. If any screen still has placeholder icons instead of photos, fix it.

4. COLOR DEPTH: Add subtle gradients to cards (not flat backgrounds). Gold gradients on accent elements. Dark gradient overlays on images with text. Subtle shadows for depth.

5. MOTION: Add subtle CSS animations — fade-in on load, slide-up for cards, gold glow pulse on active OTP box. Keep it elegant, not flashy.

6. TEXTURE: Add a subtle paper-grain or noise texture overlay to backgrounds using CSS. This adds the 'expensive' feel.

7. BORROW FLOW: Make sure the borrow flow screen shows: item image, borrower avatar, owner avatar, request message field, duration, status timeline with all 4 states.

8. CIRCLE MEMBERS: Show real member names (Arabic/international mix for Dubai), avatars with initials, item counts, role badges.

Final file must be > 50KB with at least 15 real <img> tags. Rewrite design/full-app-mockup-v2.html." \
  --model claude-fable-5 \
  --allowedTools "Read,Write,Bash,WebSearch,WebFetch" \
  --max-turns 30
```

---

## ACCEPTANCE CRITERIA

Before delivering to Dwight, verify ALL of these:

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 1 | Real product imagery (≥15 `<img>` tags with Unsplash URLs) | |
| 2 | All 12 screens present (5 onboarding + 7 app) | |
| 3 | Brand identity documented (logo, colors, typography, motion) | |
| 4 | UAE phone patterns visible (+971, flag SVG, masked input) | |
| 5 | OTP UX from research (6 boxes, auto-focus, context text) | |
| 6 | SMS/WhatsApp segmented toggle with SVG icons | |
| 7 | Luxury references visible (editorial layout, whitespace) | |
| 8 | NO emoji — SVG only | |
| 9 | Playfair Display + Jost fonts | |
| 10 | Gold #C9A961 + Warm Atelier palette | |
| 11 | Phone frame 390×844px | |
| 12 | NOT minimal/empty — rich, layered, editorial | |
| 13 | File size > 50KB | |
| 14 | Real brand names in data (Hermès, Chanel, Cartier, etc.) | |
| 15 | Borrow status badges, member avatars, item values | |

---

## REFERENCES

- Muaath's research: `design/research/onboarding-research.md`
- Design brief: `design/briefs/onboarding-redesign-brief.md`
- Rejected mockup: `design/onboarding-v4.html` (33KB, no images — DO NOT replicate this)
- Previous mockup: `design/full-app-mockup.html` (141KB, but 320×680px wrong size, check for image usage)
- Product brief: `BRIEF.md`
- Architecture: `docs/USER_MGMT_ARCHITECTURE.md`

## LUXURY REFERENCES TO STUDY (use WebSearch/WebFetch)
- Net-a-Porter product pages
- Farfetch editorial layouts
- SSENSE minimalist editorial
- 1stDibs luxury marketplace
- Moda Operandi lookbook layouts

---

**This is the final warning. Nasser said "else all of you will be deleted." Deliver something that impresses.**
