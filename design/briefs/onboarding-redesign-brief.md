# Design Brief: Trésor Onboarding Redesign

## What is Trésor
A private luxury item inventory app for a circle of 5-15 women in Dubai. They catalog designer bags, jewelry, and luxury goods, lend/borrow within their trusted circle, track everything, and collaborate on wishlists and group gifts.

## Design System: Warm Atelier
- **Background:** Cream #FAF7F2 / Charcoal #1a1715 (dark mode)
- **Surface:** White #FFFFFF / Charcoal-soft #221e1c
- **Gold accent:** #C9A961 (primary), #E8D5A3 (bright), #9A7E4A (deep)
- **Cream text:** #F5F0E8
- **Typography:** Playfair Display (headings, serif), Jost (body, sans-serif)
- **Borders:** Hairline 1px, never thick
- **Aesthetic:** Editorial luxury — think Net-a-Porter, Farfetch, SSENSE. Generous whitespace. Calm. One action per screen. No progress bars.

## The Screens (in order)

### 1. Welcome
Full-screen brand moment. Logo draws itself. "Trésor" in large serif. Tagline: "Your private circle for luxury collections." Single CTA: "Begin". Dark charcoal background with gold accents. Generous whitespace. The logo should be elegant — not a treasure chest icon. Think monogram, crest, or abstract luxury mark.

### 2. Phone Input (UAE)
- Fixed +971 prefix (UAE-only app)
- UAE flag as inline SVG (red/green/white/black — NOT emoji)
- Single input for 9-digit local number
- Segmented toggle: [SMS] [WhatsApp] with SVG icons
- "Send Code" button
- "Use email instead" small link at bottom
- Context text: "We'll send a verification code to confirm it's you"

### 3. OTP Verification
- 6 individual digit boxes (36px wide, 44px tall)
- Auto-focus progression (active box has gold border + subtle glow)
- Auto-submit when all 6 digits entered
- Context: "Code sent to +971 50 123 4567"
- "Resend code" with 30s countdown
- "Change number" link
- No "Verify" button — auto-submits

### 4. Invite Code (AFTER auth)
- Large editorial input with gold underline
- Placeholder in serif italic: "Enter your invite code"
- On validation: circle preview card appears (name, description, member avatars)
- "Join Circle" button

### 5. Profile Setup
- Large circular avatar placeholder with gold border
- Camera icon to add photo
- Name input
- "Complete Setup" button

## Design References (from research)
- Net-a-Porter: minimal friction, editorial typography, one action per screen
- Farfetch: generous whitespace, show value before asking for effort
- SSENSE: clean, editorial, no multi-step wizard feel
- Airbnb OTP pattern: auto-submit, auto-focus, 6 boxes
- WhatsApp: segmented control for delivery method

## Rules
- NO EMOJI anywhere. SVG or CSS shapes only.
- NO particle systems, NO canvas effects, NO floating dots
- Each screen should feel calm and static — luxury doesn't need to show off with motion
- Subtle entrance animations only (fade, slide up) — NOT dramatic
- The mockup is HTML/CSS for preview. The real app is React Native (Expo).
- Phone frame: 390×844px (iPhone 15)

## Output
Single HTML file with all 5 screens viewable in sequence. Use the phone frame template. Include demo navigation buttons at the bottom to switch between screens.
