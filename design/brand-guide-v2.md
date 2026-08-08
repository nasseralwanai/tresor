# Trésor — Brand Identity Guide v2

**Author:** Muaath (Designer)
**Date:** August 8, 2026
**Status:** Proposed — for Nasser's review
**Companion files:** `design/full-app-mockup-v3.html` (all 15 screens, live imagery) · `design/logo-concepts.html` (mark exploration A · B · C)

---

## 0. The Idea — "The Provenance Ledger"

Trésor is not a shopping app and it is not a closet organizer. It is a **private archive
shared between friends** — every bag, bracelet, and watch is treated the way an auction
house treats a consignment: photographed beautifully, catalogued precisely, and passed
between hands with its history intact.

The whole identity flows from that one idea:

- Every item carries a **serial index** — `Nº 007` — set in letterspaced small caps.
- Borrow history is presented as **provenance**, a ledger of hands the piece has passed through.
- Structure is drawn with **hairline gold rules**, never boxes — like the rules of a ledger page.
- Section names borrow quiet French — *La Collection*, *Le Cercle* — earned by the name Trésor itself, never decorative Franglais on buttons or body copy.

The feeling: a Net-a-Porter product page crossed with a Christie's catalogue,
warmed up for a circle of friends in Dubai.

---

## 1. Logo & Wordmark

### 1.1 Primary wordmark — "The Golden Accent"

The word **TRÉSOR** set in Playfair Display Medium (500), uppercase, tracked wide:

```
T R É S O R
```

- **Face:** Playfair Display 500. The high-contrast Didone strokes are the luxury signal.
- **Case:** Uppercase. Tracking `0.32em` at display sizes, `0.24em` at small sizes.
- **The mark inside the mark:** every letter is set in ink (charcoal on cream, cream on
  charcoal) **except the accent aigu on the É, which is always gold `#C9A961`**. One
  gold stroke in a quiet wordmark — the single accessory Chanel would leave on.
- Never letterspace the tagline to match; the wordmark is the only tracked-out element
  at its size.

### 1.2 Monogram — for app icon, favicon, avatars, watermarks

A Playfair Display **italic capital T** with the gold acute accent floating above its
right shoulder (where the É would carry it):

```
   ´
  T
```

- App icon: charcoal `#1a1715` field, subtle radial warm glow, cream italic T, gold accent.
- Favicon / tiny sizes: drop the glow, keep T + accent only.
- The monogram may sit inside a hairline gold circle (1px) when used as a placeholder
  avatar or watermark — never inside a filled badge.

### 1.3 What the logo is not

- No treasure chest, no diamond glyph, no padlock, no key. The word is the treasure.
- No gradient fills on letterforms. Gold appears only as the accent stroke.
- No shadows, bevels, or outlines on the wordmark.

### 1.4 Clearspace & minimums

- Clearspace: the height of the R on all sides.
- Minimum width: 96px for the wordmark; below that, use the monogram.

### 1.5 Logo Mark — The Provenance Seal

The identity is a **three-part system with defined roles**: the *wordmark* (§1.1) for
headers and the welcome moment, the *monogram* (§1.2) for the app icon and avatars, and
the **Provenance Seal** — Concept C of the exploration in `design/logo-concepts.html` —
for ceremonial moments: ledger stamps, borrow certificates, photography watermarks,
printed circle invitations, and the brand mark inside the product itself.

**Why Concept C won.** Three marks were proofed in both mandatory colorways:

- **Concept A — The Vault Arch:** a single unbroken line drawing the doorway of a
  private vault. Quiet and architectural, but a spatial idea, not a personal one — it
  says *where*, never *whose* — and arches are common currency in boutique-hotel
  identities. Rejected: it would introduce a second primary symbol the system never
  asked for.
- **Concept B — The Ledger Monogram:** T and E interlocked on one shared crossbar.
  The ruled-line construction genuinely encodes the ledger idea, but it competes with
  the existing italic-T monogram for the same jobs (app icon, avatar) rather than
  adding a new register. Rejected for redundancy.
- **Concept C — The Provenance Seal (chosen):** extends the identity instead of
  replacing it. It takes the monogram we already own and gives it a ceremonial frame —
  a stamp, not a badge. It matches the wax-seal role circular marks play across current
  luxury identity systems (see §8, Behance luxury-identity canon) and makes the
  "Provenance Ledger" idea literally visible.

**Construction**

- A **double hairline ring** (outer ring r=46, inner ring r=32 on a 100-unit grid, both
  0.75-unit strokes; the inner ring at 70% opacity).
- A **letterspaced circumscription** running the channel between the rings, set in Jost
  500 small caps: `TRÉSOR · LE CERCLE · PROVENANCE`.
- The existing **italic-T monogram** (Playfair Display Italic 500) at center, with its
  **accent aigu floating above the right shoulder — always gold**, never ink.

**Color variants**

| Ground | Rings + T + circumscription | Accent aigu |
|---|---|---|
| Dark `#1a1715` | Gold `#C9A961` | Gold-bright `#E8D5A3` |
| Light `#FAF7F2` | Ink/charcoal `#1a1715` | Gold-deep `#9A7E4A` |

The aigu is **always gold** in every variant (bright on dark, deep on light per the
small-gold-on-light contrast rule in §2.1). The seal is never filled, never gradiented,
never boxed — hairlines only, at the same whisper volume as the ledger rules.

**Clearspace & minimum size**

- Clearspace: **the height of the seal's diameter on all sides** — the seal is
  ceremonial and must never crowd or be crowded.
- Minimum size: **64px** for the full seal with circumscription. Below 64px the
  circumscription becomes illegible: **retire the rings and fall back to the bare
  italic-T monogram** (§1.2), which holds down to **24px**. No new asset is needed at
  favicon scale.

**Where it appears**

| Placement | Size | Variant |
|---|---|---|
| Welcome screen (above the wordmark) | 48px* | Gold on dark |
| App header (Collection screen, beside the circle kicker) | 28px* | Ink on light |
| Loading screen | 96px | Gold on dark, slow fade |
| Favicon / app icon | 24px+ | Bare monogram fallback |
| Ledger stamps, borrow certificates, watermarks | ≥64px | Ground-appropriate |

\* The two in-app placements sit below the 64px threshold, so in the mockup they render
the seal at reduced size as a *brand gesture* in a controlled, high-DPI context; in
production these placements use the bare monogram fallback or a simplified seal without
circumscription — never illegible micro-text.

**Inline SVG (the canonical mark)**

```svg
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="mark-provenance-seal" viewBox="0 0 100 100">
      <defs>
        <path id="seal-arc" d="M50 50 m -39.5 0 a 39.5 39.5 0 1 1 79 0 a 39.5 39.5 0 1 1 -79 0"/>
      </defs>
      <!-- hairline double ring -->
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="0.75"/>
      <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" stroke-width="0.75" opacity="0.7"/>
      <!-- circumscription, letterspaced small caps -->
      <text font-family="Jost, sans-serif" font-size="6.4" font-weight="500" letter-spacing="2.6" fill="currentColor">
        <textPath href="#seal-arc" startOffset="0">TRÉSOR&#160;&#160;·&#160;&#160;LE CERCLE&#160;&#160;·&#160;&#160;PROVENANCE&#160;&#160;·&#160;&#160;</textPath>
      </text>
      <!-- emblem: the brand monogram — italic T with its floating aigu -->
      <text x="47" y="61" text-anchor="middle" font-family="'Playfair Display', serif"
            font-style="italic" font-weight="500" font-size="34" fill="currentColor">T</text>
      <line x1="56" y1="36" x2="61" y2="30"
            stroke="var(--aigu,#E8D5A3)" stroke-width="1.75" stroke-linecap="round"/>
    </symbol>
  </defs>
</svg>

<!-- Usage: main strokes ride on currentColor; the aigu on --aigu -->
<svg width="48" height="48" viewBox="0 0 100 100"
     style="color:#C9A961;--aigu:#E8D5A3" role="img"
     aria-label="Trésor — the Provenance Seal"><use href="#mark-provenance-seal"/></svg>
```

---

## 2. Color System — Warm Atelier, with Depth

### 2.1 Core palette

| Token | Hex | Role |
|---|---|---|
| `--cream` | `#FAF7F2` | Light background (the atelier wall) |
| `--paper` | `#FFFFFF` | Card / surface on cream |
| `--linen` | `#F3EDE3` | Sub-surface: input fills, segmented control track, chips |
| `--charcoal` | `#1a1715` | Dark background (welcome, photography frames, dark mode) |
| `--charcoal-soft` | `#221e1c` | Dark-mode surface / elevated card on charcoal |
| `--ink` | `#2B2622` | Primary text on light |
| `--ink-2` | `#6F655B` | Secondary text on light |
| `--ink-3` | `#A2968A` | Tertiary text, placeholders, disabled |
| `--cream-text` | `#F5F0E8` | Primary text on dark |
| `--gold` | `#C9A961` | The accent. Actions, active states, the É accent |
| `--gold-bright` | `#E8D5A3` | Gradient high, focus glows, fine highlights on dark |
| `--gold-deep` | `#9A7E4A` | Gradient low, pressed states, gold text on light when small |

**Contrast rule:** gold text on cream passes only at ≥18px; below that use `--gold-deep`
for legibility. Body text is always ink/cream-text, never gold.

### 2.2 Gradients

Gold is never flat on a primary action — it is lit like metal:

```css
/* The Vermeil — primary buttons, active tab pip, progress fills */
--grad-gold: linear-gradient(135deg, #E8D5A3 0%, #C9A961 42%, #9A7E4A 100%);

/* The Atelier Wall — light screen backgrounds, barely-there warmth */
--grad-cream: linear-gradient(180deg, #FAF7F2 0%, #F4EEE4 100%);

/* The Vault — dark screens (welcome, photo frames) */
--grad-charcoal: radial-gradient(120% 90% at 50% 0%, #2A2420 0%, #1a1715 60%);

/* The Scrim — laid over photography that carries text */
--grad-scrim: linear-gradient(180deg, rgba(26,23,21,0.10) 0%,
              rgba(26,23,21,0.35) 55%, rgba(26,23,21,0.88) 100%);

/* Card sheen — cards are not flat white */
--grad-card: linear-gradient(160deg, #FFFFFF 0%, #FBF8F2 100%);

/* Avatar placeholder — initials sit on warm metal */
--grad-avatar: linear-gradient(135deg, #E8D5A3, #C9A961 55%, #9A7E4A);
```

### 2.3 Texture

One texture, used everywhere at whisper volume: **paper grain** — an SVG
`feTurbulence` noise layer (fractal, baseFrequency ≈ 0.8) rendered as a data-URI overlay.

- Light screens: `opacity: 0.035`, blend `multiply`.
- Dark screens: `opacity: 0.06`, blend `overlay`.
- Never animate the grain. Never use canvas. It is the tooth of the paper, not an effect.

### 2.4 Semantic colors — luxury tones, not traffic lights

| Token | Hex | Meaning |
|---|---|---|
| `--sage` / success | `#5C7A5E` | Available, returned, confirmed |
| `--sage-tint` | `#E9EFE7` | Success chip fill on light |
| `--amber` / pending | `#B37E3C` | Borrowed, requested, awaiting |
| `--amber-tint` | `#F5EADB` | Pending chip fill |
| `--garnet` / error | `#9C3B31` | Errors, declines, destructive |
| `--garnet-tint` | `#F5E4E1` | Error field tint |

Status is shown as a **6px dot + small-caps label** (`AVAILABLE`, `BORROWED`), never as
a loud filled pill.

### 2.5 Layering model (light mode)

1. **Wall** — `--grad-cream` + grain
2. **Card** — `--grad-card`, hairline border `rgba(43,38,34,0.08)`, shadow `--sh-1`
3. **Sub-surface** — `--linen` (inputs, chip tracks) — inset, no shadow
4. **Overlay/modal** — paper card over `rgba(26,23,21,0.5)` scrim, shadow `--sh-3`

Shadows are warm, never gray-blue:

```css
--sh-1: 0 1px 2px rgba(43,38,34,0.05), 0 4px 16px rgba(43,38,34,0.06);
--sh-2: 0 2px 4px rgba(43,38,34,0.06), 0 10px 30px rgba(43,38,34,0.10);
--sh-3: 0 8px 40px rgba(26,23,21,0.22);
--glow-gold: 0 0 0 3px rgba(201,169,97,0.28);  /* focus rings, active OTP box */
```

---

## 3. Typography — Playfair Display + Jost

**Playfair Display** speaks (headlines, brand names, values, editorial accents).
**Jost** works (body, labels, buttons, data). Never the reverse.

### 3.1 Type scale

| Style | Face | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| Display | Playfair | 40 / 46 | 500 | -0.01em | Welcome wordmark support, hero moments |
| H1 | Playfair | 30 / 36 | 500 | 0 | Screen titles ("Your Collection") |
| H2 | Playfair | 23 / 29 | 500 | 0 | Item names, section heads |
| H3 | Playfair | 18 / 24 | 500 | 0 | Card titles, member names in detail |
| Value | Playfair | 20 / 24 | 600 | 0 | Prices — `AED 62,000` |
| Body | Jost | 15 / 23 | 400 | 0.01em | Paragraphs, descriptions |
| Body-S | Jost | 13.5 / 20 | 400 | 0.01em | Meta, notes, timestamps |
| Label | Jost | 12.5 / 16 | 500 | 0.04em | Buttons, tabs, form labels |
| Kicker | Jost | 11 / 14 | 500 | **0.28em**, uppercase | Eyebrows: `LA COLLECTION` |
| Micro | Jost | 10.5 / 14 | 400 | 0.06em | Legal, hints, serial `Nº 007` |

Weights loaded: Playfair 400/500/600 + italics; Jost 300/400/500/600.

### 3.2 Rules of use

- **Kickers before headlines.** Nearly every screen opens kicker → Playfair H1 →
  one line of Jost context. The kicker is the ledger's column heading.
- **Numbers.** Prices and values in Playfair 600 with `font-variant-numeric: lining-nums`;
  data-dense numbers (phone, OTP, counts) in Jost with `tabular-nums`.
- **Playfair Italic** is reserved for three things: the monogram T, placeholder text in
  editorial inputs (*"Your invite code"*), and provenance lines (*"carried by Layla,
  March 2026"*). Nowhere else — scarcity keeps it precious.
- **The `Nº` device**: Jost 500, 10.5px, tracked 0.18em, `--gold-deep`. Appears on item
  cards, detail pages, and the ledger. It is the brand's fingerprint at small scale.
- No bold Jost above 600. No Playfair below 16px (it collapses at micro sizes).
- Phone numbers always LTR, grouped UAE-style: `+971 50 123 4567`.

### 3.3 Editorial patterns

- **Pull line:** a single Playfair italic sentence between hairlines, used at most once
  per screen (e.g., the circle's motto on the members screen).
- **Byline pattern:** `avatar · name · role` in Jost Body-S, the standard attribution row.
- **Drop caps:** permitted only in long-form editorial content (release notes,
  onboarding letter) — 3-line Playfair 500 drop cap with gold accent color. Not in UI.

---

## 4. Visual Language

### 4.1 Photography

Photography is the product. The UI is the passe-partout around it.

- **Style:** soft natural light, warm neutral or deep charcoal backgrounds, single
  object, generous negative space. Editorial still-life over e-commerce packshot.
- **Treatment:** every image gets `filter: saturate(0.96) contrast(1.02)` and sits on
  `--linen` while loading (no gray boxes). A 4% warm overlay (`#C9A961` at
  `mix-blend-mode: soft-light`) unifies mixed sources.
- **Aspect ratios:** collection grid `4:5` portrait; detail hero `4:5`; activity and
  ledger thumbnails `1:1`; wishlist `1:1`. Never free-crop.
- **Text on photos** only over `--grad-scrim`. Minimum contrast preserved at all times.

### 4.2 Borders, rules, dividers

- Hairlines only: `1px rgba(43,38,34,0.08)` on light, `1px rgba(245,240,232,0.10)` on dark.
- **Gold hairline** `1px rgba(201,169,97,0.55)` is promotional — it marks the one
  emphasized element per screen (active card, circle preview, hero rule under H1).
- Dividers are lines, never boxed sections. A centered 24px gold rule under a screen
  title is the "chapter mark."

### 4.3 Cards

- Radius scale: 10px (chips, inputs), 14px (cards), 18px (sheets), 22px (hero images).
- Card = `--grad-card` + hairline + `--sh-1`. Hover/press lifts to `--sh-2` and
  translates up 2px.
- Item cards: image bleeds to card edge top, text block below with `Nº`, brand
  (Playfair H3), model (Jost Body-S), value (Playfair Value 16px), status dot.

### 4.4 Iconography

- Geometric line SVGs, **1.5px stroke**, round caps, 20×20 viewBox, `currentColor`.
- Filled shapes only for the active tab state (a 4px gold pip beneath, icon stays line).
- **No emoji, ever** — including flags: the UAE flag is an inline SVG (red hoist bar;
  green, white, black bands).
- Icons never carry meaning alone; they escort a label except in the tab bar and
  standard glyphs (back, close, share).

### 4.5 Spacing

- Base unit 4px. Standard rhythm: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Screen gutters: 24px. Section gaps: 32–48px. Grid gap: 14px.
- **The luxury margin:** above the fold of every onboarding screen, at least 96px of
  unoccupied space. One action per screen; the whitespace is what says "we're not
  in a hurry, and neither are you."

---

## 5. Motion Principles

Motion is a maître d' — it guides, then disappears.

| Moment | Behavior | Spec |
|---|---|---|
| Screen entrance | Fade + rise | `opacity 0→1, translateY 12px→0`, 400ms `cubic-bezier(0.22,1,0.36,1)` |
| Content stagger | Cards follow the header | 60ms per card, max 6 staggered |
| Page transition | Crossfade | 300ms ease-out, no slides between routes |
| Button press | Settle | `scale(0.98)` + opacity 0.9, 120ms |
| Card press | Lift | shadow `--sh-1 → --sh-2`, translateY -2px, 200ms |
| OTP active box | Gold breath | border + `--glow-gold` pulsing 1.8s ease-in-out infinite |
| Progress fill | Pour | width transition 600ms `cubic-bezier(0.22,1,0.36,1)` |
| Loading | Skeleton shimmer | linen base, warm gradient sweep 1.6s — never spinners in content |

**Never:** particles, canvas effects, floating dots, parallax depth stacks, bouncing
easing, animated grain. `prefers-reduced-motion` collapses everything to instant
opacity changes.

---

## 6. Applied Patterns (from research → product)

These decisions come directly from `design/research/onboarding-research.md` and are
canon for implementation:

1. **Phone input:** fixed `+971` prefix with UAE flag SVG, single 9-digit field masked
   `5X XXX XXXX`, context line "We'll send a verification code to confirm it's you."
2. **Channel choice:** segmented `[SMS] [WhatsApp]` on a `--linen` track; active segment
   paper-white with `--sh-1` and gold-deep text; SVG icons (speech bubble / WhatsApp path).
3. **OTP:** six boxes 36×44px, auto-focus advance, auto-submit on the 6th digit (no
   Verify button), active box gold + glow, "Code sent to +971 50 123 4567", resend with
   5s countdown, "Change number" link.
4. **Invite code:** after auth (per Nigel's RLS fix). Editorial input, gold underline,
   Playfair italic placeholder, circle preview card showing members before commitment.
5. **Profile:** avatar on `--grad-avatar` with initials, name field, one CTA. Nothing else.
6. **No progress bars in onboarding.** Each screen is a complete, calm room.
7. **Status language:** `AVAILABLE` sage / `BORROWED · LAYLA` amber, dot + small caps.
8. **Borrow journey:** four-stop provenance line — Requested → Accepted → Active →
   Returned — rendered as a vertical ledger with gold nodes for completed states.

---

## 7. Voice

- Plain verbs, sentence case everywhere except kickers and status labels.
- Buttons say what happens: **Send Code**, **Request to Borrow**, **Complete Setup**.
- Warm, unhurried, never salesy: "Your number, please." not "Unlock your account!"
- French only where it belongs to the brand's structure (*La Collection*, *Le Cercle*,
  *Nº*) — never in actions, errors, or body copy.
- Errors are concierge-calm: "That code didn't match. A new one is on its way."
- Spelling is British throughout in-app copy — *catalogue, jewellery, organise,
  centre* — matching the UAE market and the house's editorial register.

---

## 8. Design References

The v3 design decisions are grounded in the research file
`design/research/design-inspiration-v3.md` (Dribbble, Mobbin, Behance — August 2026).
The references below are the ones that directly shaped what shipped in
`design/full-app-mockup-v3.html`.

### 8.1 Ounass — Onboarding Luxury Experience (Dribbble, Manuj G)
**URL:** https://dribbble.com/shots/10881486-Onboarding-Luxury-Experience-for-Ounass
**Influence:** Our closest regional comp (Al Tayer's luxury house, Dubai). Validated
the "each screen is a complete calm room" rule — no progress bars anywhere in
onboarding (§6.6) — and the one-Playfair-line value statement on the welcome plate
instead of a wordy carousel. When we did add three arrival plates in v3, each was
kept skippable, single-statement, and self-contained rather than a forced tour.

### 8.2 Luxury Car App — Onboarding & Login (Dribbble, Sk Nahid Hasan)
**URL:** https://dribbble.com/shots/25443745-Luxury-Car-App-Onboarding-Login-Pages
**Influence:** The template for all four dark arrival plates (Welcome, What Is Trésor,
What You Can Do, Who It Is For): full-bleed hero photography under a charcoal scrim,
minimal editorial copy, controls floated in the bottom third — and the deliberate
"vault → atelier" transition from dark photographic onboarding into quiet cream forms.

### 8.3 UNXD — Digital Luxury & Culture Marketplace (Dribbble, Exo Ape)
**URL:** https://dribbble.com/shots/16629248-UNXD-Digital-Luxury-and-Culture-NFT-Marketplace
**Influence:** The strongest conceptual comp for the Provenance Ledger. UNXD proves
"ownership + authenticity + history" can be an entire visual identity: dark ground,
hairline rules, serial numbering, certificate-like layouts. It underwrites our `Nº 007`
serial device, the borrow-history-as-provenance timeline, and ultimately the
circumscribed Provenance Seal itself. We stole the confidence, not the crypto.

### 8.4 POSHHAUS — Luxury Bag Marketplace (Dribbble, Odama)
**URL:** https://dribbble.com/shots/21416191-POSHHAUS-Luxury-Bag-Marketplace-Website
**Influence:** "Curated collection" framing — large portrait product imagery with tiny
meta text instead of dense commerce grids. Reinforced our 4:5 portrait item card
(brand in Playfair, spec line in light Jost) and pushed us from curation language
("handpicked") to provenance language ("carried by Layla, March 2026").

### 8.5 Mobbin — Tab Bar Element Gallery & Glossary
**URLs:** https://mobbin.com/explore/mobile/ui-elements/tab-bar ·
https://mobbin.com/glossary/tab-bar
**Influence:** Mobbin's study of 3,200+ real tab bars set the rules for our navigation:
five destinations maximum, labels retained (small-caps 9px — "Circle" is not a
universally understood glyph), active state as a colour shift on a line icon rather
than a filled glyph. This is also what justified **demoting the Add action** from a
raised gold orb to a standard centred tab (position 3 of 5) with a hairline gold ring
— restrained where a floating action button reads consumer.

### 8.6 Mobbin — Shop / Storefront Screen Patterns
**URL:** https://mobbin.com/explore/mobile/screens/shop-storefront
**Influence:** The Net-a-Porter / SSENSE-class storefronts in Mobbin's 400k-screen
gallery share edge-to-edge imagery, editorial modules over inventory grids, and top
navigation held to a wordmark plus at most two glyphs. Our Collection header (seal +
circle kicker + Playfair title + avatar, nothing else) and the two-up editorial grid
follow this pattern directly.

### 8.7 Behance — Luxury Brand Identity Canon (AURELIA, NOARÉ, AUREXIA, HOOMIA)
**URL:** https://www.behance.net/search/projects/luxury%20brand%20identity
**Influence:** The consistent vocabulary across the top luxury identity projects —
high-contrast serif wordmarks with wide tracking, exactly one metallic accent against
cream/charcoal, hairline geometric emblems rather than filled marks, and a
**wordmark + monogram + seal three-part logo system** where the seal serves stamps and
packaging — is precisely the system Trésor adopted. The Provenance Seal (§1.5) is our
seal register in that canon: hairline, circumscribed, ceremonial.

### 8.8 Behance — "Vault" eCommerce App Case Study (fashion app UI family)
**URL:** https://www.behance.net/search/projects/fashion%20app%20ui
**Influence:** The strongest fashion-app case studies reserve one moment per screen
for pure photography rather than filling every screen with cards. Our item detail hero
— full-bleed image dissolving into cream with no box around it — is that one
"pure photography" moment, kept sacred on every screen that carries an image.
