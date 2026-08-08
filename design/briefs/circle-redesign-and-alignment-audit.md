# Circle Redesign + Alignment Audit — Mockup v4 Fix

**To:** Muaath
**From:** Dwight (Dev Lead)
**Re:** Nasser's v4 review — two issues to fix
**Priority:** Do both in one Claude Code pass
**File:** `design/full-app-mockup-v4.html`

---

## Issue 1 — The Circle / Constellation (Plate XIII) looks "vibecoded and AI slop"

### Diagnosis

The current Circle plate (lines ~1166–1309) uses a **scattered constellation graph** — six monogram avatars absolutely positioned at semi-random coordinates, connected by thin SVG "wires" with gold dots on lending paths. Below that is a horizontal scroll strip of member cards (`.mscroll` / `.mcard`).

The scatter graph is the problem. It reads like a sci-fi node visualizer, not a luxury private members club. The coordinates are arbitrary, the node sizes vary without rhythm, and the SVG wires add visual noise without conveying meaning. Nasser called it "vibecoded and AI slop" — he's right. The *concept* of showing members as a connected circle is good, but the execution is sloppy.

### What to do — replace the constellation with a curated member roster

**Remove the `.constel` scatter graph entirely** (the SVG wires block + all `.cnode` absolutely-positioned divs). Replace it with a **designed, intentional member card layout** that feels like the Soho House app member directory or a private club's leather-bound roster.

#### Layout spec

1. **Header stays** — the circle identity block (monogram seal, "The Dubai Atelier Circle" title, "Est. January 2026 · By invitation" subline, and the 3-cell stat strip: 128 Pieces / 6 Members / 4 On loan). Keep the existing header styling and gradient background.

2. **Replace the constellation with a 2-column member grid.** Six members → a 2×3 grid of member cards inside `.scrollpad`. Each card:
   - **Monogram avatar** (top-left, 44px, existing `.av` styles) — keep monograms only, no photos (per v4 brief).
   - **Member name** in Playfair Display 14px, weight 500 — top-right of avatar, or below.
   - **Taste label** in Playfair Display italic 12px, `var(--gold-deep)` — directly beneath the name. These are the personality labels from the addendum:
     - Mariam Al Falasi (You · Admin) → *The Dior Devotee*
     - Noor Haddad → *The Horologist*
     - Fatima Al Rashid → *Hermès Loyalist*
     - Layla Al Sayegh → *The Curator*
     - Sara Al Maktoum → *The Risk Taker*
     - Farah Osman (New) → *Eclectic Collector*
   - **Collection highlight image** — a small thumbnail (60×60px, rounded 10px) showing a representative piece from their collection. Use the same Unsplash image sources already in the mockup (Birkin, Cartier Love Bracelet, Rolex Submariner, etc.). This gives each card a visual anchor without being a "photo of the person."
   - **Subtle connection indicator** — a small line of text at the bottom of the card, e.g. "3 lends · 1 borrow" or "New this week" for Farah. Set in Jost 9.5px, `var(--ink3)`, weight 300. This replaces the lending wires — the social connection is implied through the shared circle, not drawn as a graph.
   - **Edit affordance on YOUR card** (Mariam): a small gold pencil icon next to the taste label, same as the current implementation. Keep this.

3. **Card styling** — use the existing `.mcard` visual language but adapt for a grid:
   - White-to-cream gradient background (`var(--card-grad)`)
   - 1px hairline border (`var(--hair)`)
   - Border radius `var(--rm)` (14px)
   - Box shadow `var(--sh)`
   - Internal padding: 14px
   - Grid gap: 12px
   - Two columns, equal width

4. **Section heading above the grid** — keep the "The Members · Six Tastes" kicker, but restyle it as a left-aligned section header with a hairline rule beneath, not just floating text.

5. **Invitation button stays** at the bottom — "Extend an Invitation · 2 Remaining".

#### Design references (the vibe)

- **Soho House app** member directory — clean cards, generous whitespace, names in serif, warm tones.
- **A private club's printed roster** — leather-and-gold, not glassmorphism.
- **Apple's Contacts card layout** — avatar + name + descriptor, consistent grid.

#### Don't do

- ❌ No scattered absolute-positioned nodes. No SVG connection wires. No "constellation" visual metaphor in the literal sense.
- ❌ No sci-fi UI elements — no glowing nodes, no animated connection paths, no radial layouts.
- ❌ Don't lose the taste labels — they're the whole point. Every card must show the label.
- ❌ Don't show piece count or dollar value on individual cards (per the addendum). The stat strip in the header is fine.
- ❌ Don't use real photos for member avatars — monograms only.

---

## Issue 2 — Alignment audit across all 16 plates

### Diagnosis

The `.scrollpad` class is defined as `padding:0 24px` (line 285), but many plates override this with **inline styles that use different padding values**. The status bar uses `padding:0 32px 8px`. Headers use varying paddings like `16px 24px 6px`, `14px 24px 30px`, `10px 24px 14px`. This creates inconsistent left/right margins and vertical rhythm across screens.

### What to do — normalize alignment across ALL plates

1. **Horizontal padding**: Every screen's content area should use **24px left/right** consistently. This means:
   - `.scrollpad` stays at `padding:0 24px` ✓ (already correct)
   - Any inline `style="padding:..."` on header blocks inside `.screen` should use **24px horizontal** — fix any that use 20px, 28px, 32px, or other values for left/right.
   - The `.backbar` already uses `padding:10px 24px 0` ✓.
   - The `.status` bar uses `32px` — this is iOS standard, leave it (status bar is chrome, not content).

2. **Header blocks**: Screens with a header section (kicker + h2) above `.scrollpad` should use consistent padding. Normalize to `padding:16px 24px 8px` for top header blocks. Check every plate and fix inline deviations.

3. **Vertical rhythm**: Content blocks within `.scrollpad` should have consistent top/bottom spacing. Check that:
   - Kickers have consistent `margin-bottom`
   - `h-display` headings have consistent `margin-top` (8px) and `margin-bottom`
   - Card grids have consistent top margin from the header

4. **Image alignment**: Product images (`.pcard .imgwrap`) should have consistent aspect ratios across all plates that show them. Check the collection grid (Plate IX), wishlist (Plate XI), and any other plate with images.

5. **Card alignment**: All cards (`.pcard`, `.mcard`, borrow request cards, etc.) should have consistent border radius, padding, and shadow. The design system already defines these in CSS — check for inline overrides that break consistency.

6. **Tab bar**: Every plate with a tab bar should have the same tab bar structure. Verify all 5 tabs are present and the active tab is correct per screen.

### Plates to check (all 16)

| Plate | Screen | Alignment focus |
|-------|--------|-----------------|
| I | Splash (dark) | Centered content, padding |
| II | Value Prop | Text block max-width, padding |
| III | Get Started | Member preview alignment |
| IV | Phone Input | Field padding, header |
| V | OTP | Box centering, spacing |
| VI | Invite Preview | Circle preview card alignment |
| VII | Profile Setup | Avatar centering, field spacing |
| VIII | Collection Home | Header padding, grid alignment |
| IX | Item Detail | Image, provenance, fields |
| X | Add Item (dark) | Camera frame, fields |
| XI | Wishlist Browse | Filter row, grid alignment |
| XII | Activity Feed | Event rows, date dividers |
| XIII | The Circle | **Full redesign (Issue 1)** + alignment |
| XIV | Borrow Flow | Request card, timeline, note |
| XV | Lending Management | Status cards, timeline |
| XVI | Record-a-Borrow (dark) | Offline form alignment |

---

## Execution

Run this Claude Code command from the project root:

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor && claude -p "Read design/full-app-mockup-v4.html. Fix two issues: (1) The Circle/Constellation plate (Plate XIII, id='p13') looks AI-generated and sloppy — redesign it to be refined and intentional. Remove the scattered node graph (.constel with absolutely positioned .cnode elements and SVG connection wires). Replace it with a curated 2-column member card grid inside .scrollpad — each card has a monogram avatar, member name in Playfair, taste label in Playfair italic (The Dior Devotee, The Horologist, Hermès Loyalist, The Curator, The Risk Taker, Eclectic Collector), a small collection highlight thumbnail image, and a subtle activity sub-line. Keep the circle header block (monogram seal, title, stat strip). Keep the invitation button. Think luxury private members club like Soho House, NOT a sci-fi node graph. Keep the gold pencil edit affordance on Mariam's card. (2) Audit ALL 16 plates for alignment consistency — every screen content area must use 24px horizontal padding, headers normalized to padding:16px 24px 8px, consistent vertical rhythm for kickers/headings/cards, consistent image aspect ratios, consistent card styling. Fix any inline style overrides that break the grid. Save back to the same file." --model claude-fable-5 --allowedTools "Read,Write,Bash,WebSearch,WebFetch" --max-turns 30
```

---

**Questions?** Ping Dwight. The constellation redesign is the priority — the alignment audit is mechanical but important.
