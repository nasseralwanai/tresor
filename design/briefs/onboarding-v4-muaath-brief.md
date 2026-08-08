# Brief for Muaath: Trésor Onboarding v4 via Claude Code (Fable 5)

**From:** Dwight (Dev Lead)
**To:** Muaath (Designer)
**Date:** August 8, 2026
**Status:** Ready to dispatch — existing v4 found and evaluated (see §5)

---

## 0. TL;DR

A background Claude Code (Fable 5) process already generated `design/onboarding-v4.html` and it **passes all acceptance criteria** with genuine luxury quality. Your job is to **review it visually**, and if you want changes, re-run the command in §3 with an edited prompt. The command below has the full design brief + your research baked in so Claude Code has complete context without needing to find any files.

---

## 1. Why Claude Code / Fable 5

GLM-5.2 produces AI slop for creative tasks — generic gradients, emoji icons, tech-demo energy. From now on, **all design work goes through Claude Code with `--model claude-fable-5`**. Fable 5 has the frontend-design plugin and produces editorial-quality output.

**Local setup (already done):**
- Binary: `/Users/nasseralnuaimi/.local/bin/claude`
- Auth: logged in as nasseralwan@gmail.com
- Model: `claude-fable-5`
- Plugins: `frontend-design` + `figma` enabled

---

## 2. The Exact Command to Run

Run this from the project root (`/Users/nasseralnuaimi/Projects/personal/tresor`):

```bash
cd /Users/nasseralnuaimi/Projects/personal/tresor && \
claude -p "You are a senior luxury-brand digital designer. Create a single HTML file at design/onboarding-v4.html — a 5-screen onboarding mockup for Trésor, a private luxury item inventory app for a circle of 5-15 women in Dubai who catalog designer bags, jewelry, and luxury goods, lend/borrow within their trusted circle, and collaborate on wishlists and group gifts.

DESIGN SYSTEM — WARM ATELIER (dark mode):
- Background: Charcoal #1a1715. Surface: #221e1c. Deep: #100e0d
- Gold accent: #C9A961 (primary), #E8D5A3 (bright), #9A7E4A (deep)
- Cream text: #F5F0E8, with 60% and 40% opacity variants for secondary text
- Hairline borders: 1px, rgba(245,240,232,0.14). Gold hairline: rgba(201,169,97,0.35)
- Typography: Playfair Display (headings, serif, weights 400-600 + italic), Jost (body, sans-serif, weights 300-600). Load from Google Fonts.
- Aesthetic: Editorial luxury — Net-a-Porter, Farfetch, SSENSE. Generous whitespace. Calm. One action per screen. NO progress bars. NO emoji. NO particles. NO canvas. NO floating dots. Subtle entrance animations only (fade, slide up) — not dramatic.

THE 5 SCREENS (in order):

1. WELCOME: Full-screen brand moment. An elegant SVG monogram/crest logo (NOT a treasure chest — think abstract luxury mark, circle + diamond + serif initial). 'Trésor' in large Playfair Display with the é accented in gold. Tagline: 'Your private circle for luxury collections.' Single CTA button: 'Begin' with a right-arrow SVG. 'By invitation only' note below. Dark charcoal background with faint warm radial glow at top (a candle, not a spotlight).

2. PHONE INPUT (UAE): Eyebrow label 'Verification'. Title 'Your number'. Context: 'We'll send a verification code to confirm it's you.' Field label 'Mobile · United Arab Emirates'. Phone field with fixed +971 prefix (non-editable) preceded by UAE flag as inline SVG (green/white/black horizontal bands + red vertical stripe on left — NOT emoji). Single input for 9-digit local number with input mask showing '50 123 4567' format (groups of 2-3-4). Segmented toggle below: [SMS] [WhatsApp] — each segment has an SVG icon (speech bubble for SMS, WhatsApp logo path for WhatsApp) + text label. SMS is default-selected. Active segment: surface background + shadow + gold text. Inactive: transparent, muted text. Footer: 'Send code' button + 'Use email instead' small ghost link.

3. OTP VERIFICATION: Back link 'Change number' (left arrow SVG) at top. Eyebrow 'Verification'. Title 'Enter the code'. Context: 'Code sent to +971 50 123 4567. It arrives within a few seconds.' Six individual digit boxes, each 36px wide × 44px tall, centered in a row. Active/focused box: gold border + subtle glow (box-shadow 0 0 0 3px rgba(201,169,97,0.35)). Filled boxes: gold hairline border. Below: a 'Verifying' state with a thin loading bar that appears after all 6 digits entered (auto-submit — NO verify button). Below that: 'Resend code · 30s' countdown button (disabled during countdown, enabled when it hits 0). JS: auto-focus next box on input, auto-submit when all 6 filled, support paste (fill all boxes), backspace to go back.

4. INVITE CODE (AFTER auth): Eyebrow 'Membership'. Title 'You've been invited' (line break before 'invited'). Context: 'Trésor circles are private. Enter the code shared by the woman who invited you.' Large editorial input with gold underline (not a full border — just a bottom gold line). Placeholder in serif italic: 'Enter your invite code'. On validation (6+ chars): a circle preview card appears with corner accents, eyebrow 'Your circle', circle name 'The Marquise Circle', description 'Eight collectors in Dubai sharing bags, jewellery, and the occasional secret.', and an avatar stack (4 initial-avatars + '+4' count). 'Join circle' button (disabled until valid).

5. PROFILE SETUP: Eyebrow 'Last step'. Title 'Introduce yourself'. Context: 'This is how The Marquise Circle will see you.' Large circular avatar placeholder with gold ring border, containing a simple person SVG (circle head + shoulders path) in gold stroke. Camera button (SVG camera icon) overlapping bottom-right of avatar. Name field with label 'Your name', placeholder 'How should we address you?'. Hint text: 'First name is enough — this circle knows you.' 'Complete setup' button.

PHONE FRAME: 390×844px (iPhone 15). Rounded corners 54px. Dynamic Island notch (122×34px, centered, 14px from top). Status bar (58px) with time '9:41' left and SVG signal/wifi/battery icons right. Layered box-shadow: 1px gold ring, 12px black bezel, subtle cream edge highlight, large drop shadow.

DEMO NAVIGATION: Below the phone, a horizontal row of 5 buttons to switch between screens, each with a number (01-05) and label (Welcome, Phone, Code, Invite, Profile). Highlight the current screen. This nav is for preview only — style it subtly, not part of the luxury design.

TECHNICAL: Single self-contained HTML file. CSS in <style> tag, JS in <script> tag. Google Fonts via <link>. All icons as inline SVG. CSS custom properties for all design tokens. Entrance animations via CSS with staggered delays using --d custom property. Screen switching via JS adding/removing 'active' class, with animation replay on re-entry.

OUTPUT: Write the complete file to design/onboarding-v4.html. Make it genuinely beautiful — something a luxury brand creative director would approve. This is NOT a tech demo. It should feel calm, editorial, and expensive." \
  --model claude-fable-5 \
  --allowedTools "Read,Write" \
  --max-turns 20
```

**Flags explained:**
- `--model claude-fable-5` — the creative-quality model (required)
- `--allowedTools "Read,Write"` — can read existing files + write the output (no shell, no bash — safe)
- `--max-turns 20` — bumped from 15 to 20; the existing run used 15 and produced a complete file, but 20 gives headroom for iteration on a complex 5-screen layout
- `-p` — non-interactive / print mode (returns when done, no conversation loop)

---

## 3. Acceptance Criteria (verify before approving)

| # | Criterion | How to check |
|---|-----------|--------------|
| 1 | **No emoji** anywhere | `grep -P '[\x{1F300}-\x{1F9FF}]' design/onboarding-v4.html` → 0 results |
| 2 | **SVG only** for all icons/flags | All `<svg>` tags inline; no emoji unicode, no icon font classes |
| 3 | **Playfair Display + Jost** | Both loaded via Google Fonts `<link>` and referenced in CSS |
| 4 | **Gold on charcoal** | `#C9A961` and `#1a1715` both present in CSS custom properties |
| 5 | **5 screens** | Sections for Welcome, Phone, OTP, Invite Code, Profile Setup |
| 6 | **Phone frame 390×844px** | `.phone { width: 390px; height: 844px; }` in CSS |
| 7 | **OTP boxes 36×44px** | `.otp-row input { width: 36px; height: 44px; }` |
| 8 | **No canvas / no particles** | `grep -ci 'canvas\|particle'` → 0 |
| 9 | **UAE flag SVG** | Inline SVG with red/green/white/black, not emoji 🇦🇪 |
| 10 | **Auto-submit OTP** | JS: no "Verify" button; auto-advances when 6 digits filled |

---

## 4. Design Brief (Full Source)

> **File:** `design/briefs/onboarding-redesign-brief.md`

### What is Trésor
A private luxury item inventory app for a circle of 5-15 women in Dubai. They catalog designer bags, jewelry, and luxury goods, lend/borrow within their trusted circle, track everything, and collaborate on wishlists and group gifts.

### Design System: Warm Atelier
- **Background:** Cream #FAF7F2 / Charcoal #1a1715 (dark mode)
- **Surface:** White #FFFFFF / Charcoal-soft #221e1c
- **Gold accent:** #C9A961 (primary), #E8D5A3 (bright), #9A7E4A (deep)
- **Cream text:** #F5F0E8
- **Typography:** Playfair Display (headings, serif), Jost (body, sans-serif)
- **Borders:** Hairline 1px, never thick
- **Aesthetic:** Editorial luxury — think Net-a-Porter, Farfetch, SSENSE. Generous whitespace. Calm. One action per screen. No progress bars.

### The Screens (in order)

**1. Welcome** — Full-screen brand moment. Logo draws itself. "Trésor" in large serif. Tagline: "Your private circle for luxury collections." Single CTA: "Begin". Dark charcoal background with gold accents. Generous whitespace. The logo should be elegant — not a treasure chest icon. Think monogram, crest, or abstract luxury mark.

**2. Phone Input (UAE)** — Fixed +971 prefix (UAE-only app). UAE flag as inline SVG (red/green/white/black — NOT emoji). Single input for 9-digit local number. Segmented toggle: [SMS] [WhatsApp] with SVG icons. "Send Code" button. "Use email instead" small link at bottom. Context text: "We'll send a verification code to confirm it's you"

**3. OTP Verification** — 6 individual digit boxes (36px wide, 44px tall). Auto-focus progression (active box has gold border + subtle glow). Auto-submit when all 6 digits entered. Context: "Code sent to +971 50 123 4567". "Resend code" with 30s countdown. "Change number" link. No "Verify" button — auto-submits.

**4. Invite Code (AFTER auth)** — Large editorial input with gold underline. Placeholder in serif italic: "Enter your invite code". On validation: circle preview card appears (name, description, member avatars). "Join Circle" button.

**5. Profile Setup** — Large circular avatar placeholder with gold border. Camera icon to add photo. Name input. "Complete Setup" button.

### Design References (from research)
- Net-a-Porter: minimal friction, editorial typography, one action per screen
- Farfetch: generous whitespace, show value before asking for effort
- SSENSE: clean, editorial, no multi-step wizard feel
- Airbnb OTP pattern: auto-submit, auto-focus, 6 boxes
- WhatsApp: segmented control for delivery method

### Rules
- NO EMOJI anywhere. SVG or CSS shapes only.
- NO particle systems, NO canvas effects, NO floating dots
- Each screen should feel calm and static — luxury doesn't need to show off with motion
- Subtle entrance animations only (fade, slide up) — NOT dramatic
- The mockup is HTML/CSS for preview. The real app is React Native (Expo).
- Phone frame: 390×844px (iPhone 15)

### Output
Single HTML file with all 5 screens viewable in sequence. Use the phone frame template. Include demo navigation buttons at the bottom to switch between screens.

---

## 5. Muaath's Research Findings (Full Source)

> **File:** `design/research/onboarding-research.md`
> **Author:** Muaath · **Date:** August 7, 2026

### Nigel's Architecture — Key Requirements
Source: `/docs/USER_MGMT_ARCHITECTURE.md` (§7 Onboarding Flow Redesign)

**New Flow Order:**
```
Welcome → Phone Input → OTP Verify → Invite Code (new users only) → Profile Setup → Bulk Capture → App
```

**Screen-by-Screen:**

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| 1a Welcome | Logo + tagline + CTA | "Get Started" → navigates to phone-input (not invite-code) |
| 1b Phone Input | UAE phone entry | +971 prefix, SMS/WhatsApp toggle, "Use email instead" link, validates with `normalizeUaePhone()` |
| 1c OTP Verify | 6-digit code entry | Auto-focus next, auto-submit when complete, "Resend code", "Change number" |
| 1d Invite Code | Circle join (new users only) | Now AFTER auth — fixes RLS bug where anon users can't validate invite codes |
| 1e Profile Setup | Name + avatar | `createProfile()` includes phone from `user.phone`, `joinCircle()` with circleId |

**Phone Input UX Specs (§5.7):**
- UAE country code +971 prefix shown
- Segmented control: SMS (default) | WhatsApp
- "Send Code" button
- "Use email instead" small link at bottom (tertiary fallback)
- Phone format: +971 5X XXX XXXX (9 digits after country code, starting with 5)
- Validation regex: `^(\+971|0)?(5[0-9])\d{7}$`

**Why Invite Code Moved After Auth:**
1. Security: RLS policy `is_circle_member()` requires `auth.uid()` — null for unauthenticated users. Current flow has a latent bug.
2. UX: Verify phone first (30s), then enter invite code. Natural flow.
3. Deduplication: Returning users authenticate and skip invite code entirely.

### Phone Number Input UX — Best Practices
Sources: Vitaly Friedman (Smashing Magazine), UX Planet (Nick Babich), Evil Martians, USWDS, CodeBridge

1. **Country code visible alongside number.** Display flag + country code (+971) as non-editable prefix.
2. **Auto-format with input masking.** 89% of users enter phone data in different format than expected (Baymard). Use input masks: `5X XXX XXXX`.
3. **Don't split into multiple fields.** Single input for local number. Country code is separate prefix.
4. **Explain why phone number is required.** "We'll send a verification code" reduces anxiety.
5. **Group digits for readability.** Format: `+971 50 123 4567` — groups of 2-4 digits. UAE standard.
6. **Support copy-paste.** Accept and normalize pasted text.
7. **Auto-detect country.** For UAE-only app, pre-select UAE (+971). No country picker needed.
8. **Flag as SVG, not emoji.** UAE flag SVG: red vertical stripe on left, green/white/black horizontal bands.

**Design Decision:** Fixed +971 prefix, UAE flag as inline SVG, single input field for 9-digit local number, input mask `5X XXX XXXX`, SMS/WhatsApp segmented toggle, "Use email instead" as small text link at bottom.

### OTP Verification Screen UX
Sources: Authgear, UX Good Patterns, Design Studio UI/UX (Medium), Designary, Twilio

1. **Six individual digit boxes, not one long field.** Limits visual scope, moves focus automatically, gives sense of progress.
2. **Auto-submit on final digit.** No "Verify" button. Airbnb, WhatsApp, modern apps do this.
3. **Auto-focus next box.** Fluid typing experience.
4. **SMS autofill support.** Design input to auto-focus and auto-submit when code detected.
5. **Support paste.** Paste should fill all 6 boxes at once.
6. **Indicate number of digits.** Show 6 boxes from the start.
7. **Clear context.** "Enter the 6-digit code we sent to +971 50 123 4567."
8. **Resend with rate limit.** "Resend code" link, disabled during rate-limit window (5s per Nigel's config). Show countdown.
9. **Change number option.** Link to go back to phone input.
10. **Loading state on auto-submit.** Spinner immediately after auto-submit.

**Design Decision:** 6 boxes (36×44px), auto-focus progression (active box: accent border + glow), "Code sent to +971 50 123 4567" context, "Resend code" + "Change number" links, channel indicator.

### SMS/WhatsApp Toggle — Segmented Control
Sources: Mobbin, Meta/WhatsApp, Twilio, 360dialog

1. **Segmented control is the standard pattern.** WhatsApp, ChatGPT, banking apps use it.
2. **SMS default, WhatsApp secondary.** SMS is primary path (90%+). WhatsApp alternative for UAE market.
3. **Icons in the segments.** SMS: speech bubble SVG. WhatsApp: logo SVG path. Both with text labels.
4. **Active segment styling.** Surface background + subtle shadow. Inactive: transparent.
5. **WhatsApp auth templates support COPY_CODE button.** OTP message includes native copy button.

**Design Decision:** Two-segment horizontal control [SMS] [WhatsApp]. SMS: speech bubble SVG + "SMS". WhatsApp: logo SVG + "WhatsApp". Active: surface bg + shadow + accent text. Inactive: transparent + muted. Container: subtle bg, rounded, 3px padding, full width, 50% each.

### Luxury App Onboarding Patterns
Sources: Zigpoll, SSENSE, Mobbin, Eleken, Arounda

1. **Minimal friction, maximum elegance.** Minimal screens, generous whitespace. No multi-step wizards with progress bars.
2. **Editorial typography as brand expression.** Playfair Display / serif headlines signal luxury.
3. **One clear action per screen.** Exactly one purpose, one CTA.
4. **Show value before asking for effort.** Welcome shows brand identity before asking for phone. Invite code preview shows social value before profile setup.
5. **Profile setup is lightweight.** Name + avatar only. No lengthy questionnaires.
6. **Avatar as circular gradient placeholder.** Show initials on brand gradient circle until photo uploaded.
7. **No progress bars in luxury onboarding.** Feels like guided experience, not checklist.

### UAE-Specific Considerations
1. **WhatsApp dominance.** UAE users check WhatsApp more than SMS. WhatsApp OTP is expected, not nice-to-have.
2. **Phone format.** UAE mobile: +971 5X XXX XXXX. All start with 5 after country code.
3. **Carrier filtering.** Etisalat and Du block unregistered Sender IDs. OTP needs registered "TRESOR" Sender ID (backend concern).
4. **RTL awareness.** Arabic is RTL, but Trésor's primary language is English. Phone numbers always LTR.
5. **Country flag.** UAE flag SVG: vertical red stripe (1/4 width) on hoist side, then green/white/black horizontal bands. Compact 20×14px for phone input.

### Summary of Design Decisions

| Element | Decision | Rationale |
|---------|----------|-----------|
| Phone prefix | Fixed +971, UAE flag SVG | UAE-only app, no country picker |
| Phone input | Single field, 9 digits, masked `5X XXX XXXX` | Single field better than split |
| Channel toggle | Segmented control [SMS] [WhatsApp] | Standard pattern, instant recognition |
| SMS icon | Speech bubble SVG | Geometric, not emoji |
| WhatsApp icon | WhatsApp logo SVG path | Brand recognition, not emoji |
| OTP boxes | 6 individual boxes, 36×44px | Limits visual scope, sense of progress |
| OTP behavior | Auto-focus next, auto-submit on 6th | Reduces friction |
| OTP context | "Code sent to +971 50 123 4567" | Clear, human, reassuring |
| Resend | Text link, rate-limited (5s) | Nigel's config |
| Change number | Text link → back to phone input | Standard pattern |
| Email fallback | "Use email instead" small link | Tertiary fallback |
| Invite code | Editorial input with gold underline | Consistent luxury pattern |
| Profile setup | Avatar circle + name field + CTA | Lightweight, respect user's time |
| Whitespace | Generous, editorial spacing | Luxury aesthetic |
| Typography | Playfair Display + Jost | Warm Atelier system |

---

## 6. Evaluation of Existing `design/onboarding-v4.html`

**Status:** ✅ Already generated by background Claude Code process (proc_7613fa3d543d). File is complete — 1,069 lines, 33KB, closes with `</html>`.

### Pass/Fail Against Acceptance Criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | No emoji | ✅ PASS | 0 emoji characters found across all Unicode ranges |
| 2 | SVG only | ✅ PASS | 9 inline `<svg>` elements (monogram, arrow, UAE flag, SMS icon, WhatsApp icon, back arrow, camera, person silhouette, loading bar) |
| 3 | Playfair Display + Jost | ✅ PASS | Both loaded via Google Fonts `<link>`, set as `--serif` / `--sans` custom properties |
| 4 | Gold on charcoal | ✅ PASS | `--gold: #C9A961`, `--charcoal: #1a1715` in `:root`, used throughout |
| 5 | 5 screens | ✅ PASS | Sections: `#s-welcome`, `#s-phone`, `#s-otp`, `#s-invite`, `#s-profile` + demo nav with 01–05 |
| 6 | Phone frame 390×844px | ✅ PASS | `.phone { width: 390px; height: 844px; }` |
| 7 | OTP boxes 36×44px | ✅ PASS | `.otp-row input { width: 36px; height: 44px; }` |
| 8 | No canvas/particles | ✅ PASS | 0 occurrences of "canvas" or "particle" |
| 9 | UAE flag SVG | ✅ PASS | Inline SVG with `#00732F` (green), `#FFFFFF` (white), `#000000` (black), `#DA291C` (red) |
| 10 | Auto-submit OTP | ✅ PASS | JS: `submitOtp()` called when all 6 inputs filled; no Verify button in HTML |

### Quality Assessment

This is **genuinely luxury quality**, not AI slop. Specific evidence:

- **Monogram logo:** Circle + rotated diamond (lozenge) + serif "T" + small diamond accent — abstract and elegant, not a treasure chest
- **Phone frame:** Layered box-shadow (gold ring → black bezel → cream edge highlight → large drop shadow) with Dynamic Island notch — feels like a real device render
- **Candle glow:** `radial-gradient` at top of every screen described as "a candle, not a spotlight" in comments — subtle warmth, not a tech-demo gradient
- **Typography:** Playfair Display with italic é accent in gold, generous letter-spacing on eyebrow labels (0.42em), staggered entrance animations with `--d` custom property
- **OTP interaction:** Full JS implementation — auto-focus, auto-submit, paste support (fills all 6), backspace navigation, 30s resend countdown, "Verifying" loading bar state
- **Invite code:** Gold underline input (not full border), circle preview card with corner accents, avatar stack with initials + "+4" count, "Join circle" button disabled until valid
- **Phone input:** UAE flag SVG (correct colors), +971 prefix non-editable, input mask formatting `50 123 4567` (2-3-4 grouping), segmented SMS/WhatsApp toggle with proper SVG icons
- **Copy quality:** "Eight collectors in Dubai sharing bags, jewellery, and the occasional secret." — this is editorial voice, not generic SaaS copy
- **Hairline borders:** 1px rgba borders throughout, never thick — matches Warm Atelier spec

### Recommendation

**The existing file is production-ready for review.** Open it in a browser, walk through all 5 screens, and if anything needs adjusting (copy, spacing, color), re-run the command in §2 with a targeted edit to the prompt. Do not start from scratch — this is a strong base.

---

## 7. Your Assignment

**Muaath — you own this.** Steps:

1. **Open** `design/onboarding-v4.html` in your browser. Walk through all 5 screens using the demo nav.
2. **Evaluate** against your own design judgment + the acceptance criteria in §3.
3. **If it's good:** Approve it. Move on. Tell Dwight it's done.
4. **If it needs changes:** Edit the prompt in the §2 command (the part inside `claude -p "..."`), re-run it, and it'll overwrite `design/onboarding-v4.html` with a fresh version. Iterate until you're happy.
5. **When approved:** The file is the source of truth for the React Native implementation. Dwight's team will port it to Expo.

**Deadline:** Your call — but Dwight needs it before the next sprint planning.

---

*— Dwight, Dev Lead, Trésor*
