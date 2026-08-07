# Trésor Onboarding Redesign — Research Findings

**Author:** Muaath (Designer)
**Date:** August 7, 2026
**Purpose:** Research basis for redesigning the onboarding section to match Nigel's phone-first auth architecture.

---

## 1. Nigel's Architecture — Key Requirements

Source: `/docs/USER_MGMT_ARCHITECTURE.md` (§7 Onboarding Flow Redesign)

### New Flow Order
```
Welcome → Phone Input → OTP Verify → Invite Code (new users only) → Profile Setup → Bulk Capture → App
```

### Screen-by-Screen Specs

| Screen | Purpose | Key Elements |
|--------|---------|-------------|
| **1a Welcome** | Logo + tagline + CTA | "Get Started" → navigates to phone-input (not invite-code) |
| **1b Phone Input** | UAE phone entry | +971 prefix, SMS/WhatsApp toggle, "Use email instead" link, validates with `normalizeUaePhone()` |
| **1c OTP Verify** | 6-digit code entry | Auto-focus next, auto-submit when complete, "Resend code", "Change number" |
| **1d Invite Code** | Circle join (new users only) | Now AFTER auth — fixes RLS bug where anon users can't validate invite codes |
| **1e Profile Setup** | Name + avatar | `createProfile()` includes phone from `user.phone`, `joinCircle()` with circleId |
| **1f Bulk Capture** | Photo capture (existing 1b) | Moved here from position 1b |
| **1g AI Batch Results** | AI results (existing 1c) | Moved here from position 1c |

### Phone Input UX Specs (from §5.7)
- UAE country code +971 prefix shown
- Segmented control: SMS (default) | WhatsApp
- "Send Code" button
- "Use email instead" small link at bottom (tertiary fallback)
- Phone format: +971 5X XXX XXXX (9 digits after country code, starting with 5)
- Validation regex: `^(\+971|0)?(5[0-9])\d{7}$`

### Why Invite Code Moved After Auth
1. **Security:** RLS policy `is_circle_member()` requires `auth.uid()` — null for unauthenticated users. Current flow has a latent bug.
2. **UX:** Verify phone first (30s), then enter invite code. Natural flow.
3. **Deduplication:** Returning users authenticate and skip invite code entirely.

---

## 2. Phone Number Input UX — Best Practices

### Sources
- Vitaly Friedman (Smashing Magazine UX lead) — LinkedIn post on phone input UX
- UX Planet — "Phone Number Field Design Best Practices" (Nick Babich)
- Evil Martians — "Phone inputs and you: the designer's essential UI guide"
- US Web Design System (USWDS) — Phone number pattern
- CodeBridge — "Phone Number Field Best Practices: 5 Essential Tips"

### Key Findings

1. **Country code visible alongside number.** Display the flag + country code (+971) as a non-editable prefix. Users need instant confirmation of which country they're selecting.

2. **Auto-format with input masking.** Baymard Institute: 89% of users enter phone data in a different format than expected. Use input masks (not placeholders) to show the expected format: `5X XXX XXXX`.

3. **Don't split into multiple fields.** Use a single input for the local number portion. The country code is a separate prefix element.

4. **Explain why the phone number is required.** Users are wary of giving phone numbers. A brief explanation ("We'll send a verification code") reduces anxiety.

5. **Group digits for readability.** Format: `+971 50 123 4567` — groups of 2-4 digits. This is the UAE standard format.

6. **Support copy-paste.** Users often copy their number from contacts. The input should accept and normalize pasted text.

7. **Auto-detect country from geolocation.** For a UAE-only app, pre-select UAE (+971) by default. No country picker needed — the app is invite-only for Dubai residents.

8. **Flag as SVG, not emoji.** Luxury apps use crisp vector flags. The UAE flag SVG: red vertical stripe on left, green/white/black horizontal bands.

### Design Decision for Trésor
- Fixed +971 prefix (UAE-only app, invite circle is Dubai-based)
- UAE flag as inline SVG (red/green/white/black — no emoji)
- Single input field for the 9-digit local number
- Input mask showing `5X XXX XXXX` format
- SMS/WhatsApp segmented toggle below the input
- "Use email instead" as a small text link at the bottom

---

## 3. OTP Verification Screen UX

### Sources
- Authgear — "Login & Signup UX: The 2025 Guide to Best Practices"
- UX Good Patterns — "Auto-submit verification code"
- Design Studio UI/UX (Medium) — "OTP Verification UI: Why Users Bail at This Screen"
- Designary — "UX Tip #15: Automatically validate one-time passcodes"
- Twilio — "Best Practices for OTP Input Forms in Android"

### Key Findings

1. **Six individual digit boxes, not one long field.** Breaking the code into separate boxes limits visual scope, moves focus automatically after each digit, and gives a clear sense of progress. Each filled box is a small win.

2. **Auto-submit on final digit.** When the 6th digit is entered, the form should submit automatically. No "Verify" button tap needed. Every additional step is a point where users can second-guess and abandon. Airbnb, WhatsApp, and most modern apps do this.

3. **Auto-focus next box.** After each digit, focus moves to the next box automatically. This creates a fluid typing experience.

4. **SMS autofill support.** iOS and Android both support OTP autofill from messages. Design the input to auto-focus and auto-submit when the code is detected from SMS (with user permission).

5. **Support paste.** Users may copy the code from WhatsApp/SMS. The paste should fill all 6 boxes at once.

6. **Indicate number of digits.** Show 6 boxes from the start — this creates expectation of how many digits are needed (form masking).

7. **Clear context.** "Enter the 6-digit code we sent to +971 50 123 4567" — tell users where the code was sent and to which number.

8. **Resend with rate limit.** "Resend code" link, disabled state during rate-limit window (5s per Nigel's config). Show countdown timer.

9. **Change number option.** "Change number" link to go back to phone input.

10. **Loading state on auto-submit.** Display a spinner immediately after auto-submit to confirm action was taken. Clear input and refocus on error.

### Design Decision for Trésor
- 6 individual digit boxes, 36px × 44px each
- Auto-focus progression (visual: active box has accent border + glow)
- Show first 3 digits filled to demonstrate the interaction state
- "Code sent to +971 50 123 4567" context text
- "Resend code" and "Change number" links below
- Bottom-left: which channel (SMS/WhatsApp indicator)
- Active box has accent border + subtle glow (`box-shadow: 0 0 0 3px var(--accs)`)

---

## 4. SMS/WhatsApp Toggle — Segmented Control

### Sources
- Mobbin — Segmented Control UI Design Inspiration (WhatsApp, ChatGPT, Monarch, Monzo patterns)
- Meta/WhatsApp — Authentication templates with COPY_CODE button
- Twilio — WhatsApp API authentication templates
- 360dialog — Zero-tap authentication templates

### Key Findings

1. **Segmented control is the standard pattern.** WhatsApp, ChatGPT, and banking apps use a two-segment toggle for delivery method selection. It's instantly recognizable and requires a single tap.

2. **SMS default, WhatsApp secondary.** SMS is the primary path (90%+ per Nigel's arch). WhatsApp is the alternative for the UAE market where WhatsApp dominates.

3. **Icons in the segments.** SMS segment gets a speech bubble icon. WhatsApp segment gets the WhatsApp logo (SVG path, not emoji). Both use text labels alongside icons.

4. **Active segment styling.** Active segment gets surface background + subtle shadow. Inactive segments are transparent. The toggle slides smoothly.

5. **WhatsApp authentication templates support COPY_CODE button.** The OTP message includes a copy button natively — users can copy and paste the code into the app.

### Design Decision for Trésor
- Two-segment horizontal control: [SMS] [WhatsApp]
- SMS segment: speech bubble SVG + "SMS" label
- WhatsApp segment: WhatsApp logo SVG path + "WhatsApp" label
- Active segment: `background: var(--surf)`, `box-shadow: var(--sh)`, accent text color
- Inactive segment: transparent, `color: var(--ink3)`
- Container: `background: var(--sub)`, `border-radius: var(--rs)`, padding 3px
- Width: full (100%), each segment 50%

---

## 5. Luxury App Onboarding Patterns

### Sources
- Zigpoll — Farfetch and Net-a-Porter onboarding analysis
- SSENSE App Store screenshots and editorial approach
- Mobbin — Profile page and onboarding screen patterns
- Eleken — "20 profile page design examples with expert UX advice"
- Arounda — "35 Best SaaS Profile Page Design Examples"

### Key Findings

1. **Minimal friction, maximum elegance.** Luxury apps (Net-a-Porter, Farfetch, SSENSE) use minimal screens with generous whitespace. No multi-step wizards with progress bars — each screen is a full, calm experience.

2. **Editorial typography as brand expression.** Playfair Display / serif headlines on onboarding screens. The typography itself signals luxury before any product is shown.

3. **One clear action per screen.** Each onboarding screen has exactly one purpose and one CTA. No decision paralysis.

4. **Show value before asking for effort.** Trésor's welcome screen shows the brand identity (logo, tagline) before asking for phone number. The invite code preview (circle members) shows social value before profile setup.

5. **Profile setup is lightweight.** Name + avatar only. No lengthy questionnaires. Luxury apps respect the user's time.

6. **Avatar as circular gradient placeholder.** Until the user uploads a photo, show initials on a brand gradient circle. This matches Trésor's existing `.av` component pattern.

7. **No progress bars or step indicators in luxury onboarding.** Unlike SaaS apps, luxury onboarding feels like a guided experience, not a checklist. However, Trésor's bulk capture screens DO use "Step X of 3" because the capture flow is utilitarian.

### Design Decision for Trésor
- Welcome: full-screen brand moment, logo + tagline + single CTA
- Phone input: clean, editorial, one field + one toggle + one CTA
- OTP: focused, 6 boxes centered, calm context text
- Invite code: same 6-box pattern as existing (letter boxes), now positioned after auth
- Profile setup: avatar circle (gradient, initials) + name field + single CTA
- Bulk capture & AI results: unchanged from existing design (just renumbered)

---

## 6. UAE-Specific Considerations

1. **WhatsApp dominance.** UAE users check WhatsApp more frequently than SMS. Offering WhatsApp OTP is not a nice-to-have — it's expected. Nigel's architecture correctly identifies this.

2. **Phone format.** UAE mobile: +971 5X XXX XXXX. All mobile numbers start with 5 after the country code. Landlines start with other digits (2-4, 6-9) but Trésor only accepts mobile.

3. **Carrier filtering.** Etisalat and Du block unregistered Sender IDs. OTP messages need registered "TRESOR" Sender ID. This is a backend concern, not a design one, but the UX should set expectations (code may take a few seconds).

4. **RTL awareness.** Arabic is RTL, but Trésor's primary language is English. Phone numbers are always LTR even in RTL contexts. The +971 prefix is always on the left.

5. **Country flag.** UAE flag SVG: vertical red stripe (1/4 width) on the hoist side, then three horizontal bands — green (top), white (middle), black (bottom). Compact 20×14px SVG for the phone input.

---

## 7. Summary of Design Decisions

| Element | Decision | Rationale |
|---------|----------|-----------|
| Phone prefix | Fixed +971, UAE flag SVG | UAE-only app, no country picker needed |
| Phone input | Single field, 9 digits, masked `5X XXX XXXX` | UX Planet + Baymard: single field better than split |
| Channel toggle | Segmented control [SMS] [WhatsApp] | Mobbin: standard pattern, instant recognition |
| SMS icon | Speech bubble SVG | Geometric, not emoji |
| WhatsApp icon | WhatsApp logo SVG path | Brand recognition, not emoji |
| OTP boxes | 6 individual boxes, 36×44px | Design Studio UI/UX: limits visual scope, sense of progress |
| OTP behavior | Auto-focus next, auto-submit on 6th | Authgear + Airbnb pattern: reduces friction |
| OTP context | "Code sent to +971 50 123 4567" | Authgear: clear, human, reassuring |
| Resend | Text link, rate-limited (5s) | Nigel's config: `max_frequency = "5s"` |
| Change number | Text link → back to phone input | Standard pattern |
| Email fallback | "Use email instead" small link | Nigel's §5.7: tertiary fallback |
| Invite code | 6 letter boxes (existing pattern) | Consistent with existing design |
| Profile setup | Avatar circle + name field + CTA | Luxury pattern: lightweight, respect user's time |
| Whitespace | Generous, editorial spacing | Luxury aesthetic: every element earns its place |
| Typography | Playfair Display headlines, Jost body | Existing Warm Atelier system |

---

## Sources

1. Vitaly Friedman — Phone Number Input UX (LinkedIn post, Smashing Magazine)
2. Nick Babich — "Phone Number Field Design Best Practices" (UX Planet)
3. Evil Martians — "Phone inputs and you: the designer's essential UI guide"
4. US Web Design System — Phone number pattern
5. CodeBridge — "Phone Number Field Best Practices: 5 Essential Tips"
6. Authgear — "Login & Signup UX: The 2025 Guide to Best Practices"
7. UX Good Patterns — "Auto-submit verification code"
8. Design Studio UI/UX — "OTP Verification UI: Why Users Bail at This Screen" (Medium)
9. Designary — "UX Tip #15: Automatically validate one-time passcodes"
10. Twilio — "Best Practices for OTP Input Forms in Android"
11. Mobbin — Segmented Control UI Design Inspiration
12. Meta/WhatsApp — Authentication templates documentation
13. 360dialog — Zero-tap authentication templates
14. Eleken — "20 profile page design examples with expert UX advice"
15. Arounda — "35 Best SaaS Profile Page Design Examples"
16. Nigel's Architecture Doc — `/docs/USER_MGMT_ARCHITECTURE.md` (§5.7, §7)
