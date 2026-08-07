# Trésor Onboarding — Design Research

**Researcher:** Muaath  
**Date:** August 2026  
**Goal:** Find cutting-edge onboarding and animation references for a luxury inventory app  
**Iteration 3 — "Live Elements" Deep Research**

---

## 1. Luxury & Fashion App References

### Hermès Website Redesign (2025)
- **Source:** Instagram @hermès coverage; Awwwards fashion collection
- **URL:** https://www.instagram.com/p/DTIdoYIjBa6
- **What they did:** Hand-drawn illustrations bring artistic touch to digital presence. "Like flipping through a luxury sketchbook." Emphasizes artistry beyond products. Playful modern edge on iconic heritage.
- **Techniques to borrow:** Hand-drawn aesthetic via SVG strokes; illustration-forward approach; "sketchbook" feel through line-drawing animations.

### Brunello Cucinelli — AI E-commerce (Awwwards SOTD, Jul 2026)
- **URL:** https://www.awwwards.com/sites/brunello-cucinelli-ai-e-com
- **Studio:** makemepulse (Developer Award)
- **What they did:** Premium e-commerce experience for luxury fashion house. Awwwards Site of the Day.
- **Techniques to borrow:** WebGL-grade smoothness simulated in CSS; premium product reveals; editorial photography treatment.

### Cartier — Watches & Wonders 2026 (Awwwards SOTD, May 2026)
- **URL:** https://www.awwwards.com/sites/cartier-watches-wonders-2026
- **Studio:** Immersive Garden
- **What they did:** Luxury watch showcase with scroll-based surprises, 3D interaction, unconventional text loading.
- **Techniques to borrow:** Scroll-based animation reveals; unconventional text loading sequences; dramatic product reveals.

### Max Mara — Jacket Circle (Awwwards SOTD, Apr 2026)
- **Studio:** Adoratorio Studio
- **What they did:** Circular composition of luxury garments with interactive exploration.
- **Techniques to borrow:** Circular/radial composition; interactive element exploration; premium product staging.

### Urban Jürgensen (Awwwards SOTD, Oct 2025)
- **URL:** https://www.awwwards.com/sites/urban-jurgensen
- **Studio:** Digital Luxury Group
- **What they did:** 250-year-old Swiss-Danish watch brand revival. Infinite scroll, parallax, unconventional text loading, 3D watch interaction, scroll-based surprises.
- **Color palette:** #f8f5f0 (cream) + #040810 (near-black) — very close to Trésor's palette.
- **Techniques to borrow:** Parallax layers; unconventional text loading (kinetic typography); scroll-based surprise reveals.

### Louis Vuitton — Interactive Fashion Show Experience (2023-2024)
- **Source:** The Interline — "Real-Time 3D: The New Frontier In Fashion And Luxury"
- **What they did:** Six-minute interactive immersive experience using Unreal Engine 5 + Z-weave 3D for digital garments. Digital recreation of the FW 2023 men's show, available for public play/exploration on custom-built video arcades.
- **Techniques to borrow:** Immersive world-building (not just product pages); interactive 3D garment exploration; making users feel part of an exclusive event.

### Gucci — Gucci Ancora Interactive Experience
- **What they did:** Creative Director Sabato De Sarno's first show. Users play three mini-games to win limited edition goodies within a creative neighborhood of Brera, Milan. Invites users to "be part of the Gucci community" and experience Milan Fashion Week globally.
- **Techniques to borrow:** Gamification within luxury context; community-building through interaction; making exclusive events globally accessible.

### Salvatore Ferragamo — Hologram Sneaker Program
- **What they did:** Interactive hologram sneaker program at NYC Greene Street store. Guests design personalized versions with 40 variations including initials and colorways.
- **Techniques to borrow:** Personalization as luxury experience; interactive customization; blending physical/digital retail.

### Fendi & Louis Vuitton — Website Design Highlights
- **Source:** Bhavya Web Technologies — "10 Luxury Website Design Examples"
- **Fendi:** Bold visuals, elegant animations, minimalist layout, refined typography, interactive sections. Magazine-style storytelling through brand heritage and seasonal collections.
- **LV:** Minimalist, visually immersive, elegant typography, smooth animations, high-resolution images showcasing product details exquisitely.
- **Techniques to borrow:** Magazine-style editorial storytelling; minimalist luxury = bold visuals + refined typography + generous whitespace.

---

## 2. Live Element & Generative Art Research (NEW — Iteration 3)

### A. Canvas Particle Systems

#### Gold Dust / Floating Particles (Medium — Mike Vardy)
- **Source:** https://medium.com/@mike-at-redspace/magic-mouse-dust-build-a-sparkling-canvas-particle-effect-w-canvas-api-72d32e4cce56
- **Technique:** Canvas API particle system with `requestAnimationFrame` game loop. Each particle has position, velocity, size, color. Clear → update → draw each frame at 60fps. Shadow blur creates glow effect for "sparkle" quality.
- **For Trésor Slide 3 (Wishlist):** Golden dust particles converging toward center — particles spawn at edges, drift toward focal point with easing. Shadow blur + gold color = luxurious sparkle.

#### Connected Particles with Lines (iodigital TechHub)
- **Source:** https://techhub.iodigital.com/articles/particle-background-effect-with-canvas
- **Technique:** Particles bounce off canvas edges. When two particles are within `linkRadius` distance, draw a line between them with opacity based on distance. Creates organic network/web effect.
- **For Trésor Slide 2 (Borrow & Lend):** Orbital nodes with connection lines drawing between them — particles in orbit, lines connect nearby nodes to visualize "lending relationships."

#### Fractal Brownian Motion for Natural Movement (Codrops — UntilLabs)
- **Source:** https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website
- **Technique:** fBM (fractal Brownian motion) creates overlapping layers of randomness — mimics molecular motion. "We weren't just animating dots on a screen; we were borrowing the same logic that shapes molecular motion." 60,000 particles at constant 60 FPS using GL_POINTS + FBOs + fullscreen QuadShader.
- **Key insight:** Natural particle movement ≠ random. Use noise functions (Perlin/Simplex) layered at multiple frequencies for organic, life-like drift. Simple Math.random() looks mechanical; fBM looks alive.

#### Codrops Particle Collection
- **Source:** https://tympanus.net/codrops/hub/tag/particles
- **Notable demos:** Interactive Particles Slideshow (canvas + slideshow), Connected Vertices, A random world of Turbulence (canvas + fluid + particles), Fluid by David Li (GLSL), The Spirit by Edan Kwan (cursor + particles).
- **For Trésor:** Slideshow transitions with particle effects between slides. Particles that react to "cursor" (simulated interaction point).

### B. CSS Blob Morphing & Liquid Effects

#### Pure CSS Blob Animation (DEV — Prahalad)
- **Source:** https://dev.to/prahalad/pure-css-blob-animation-no-svg-no-js-2f4m
- **Technique:** `border-radius` keyframe animation creates organic morphing. Example: `border-radius: 52% 48% 66% 34% / 38% 64% 36% 62%` morphing through multiple states. Pseudo-elements (`::before`, `::after`) with `filter:blur(20px)` create glow layers. No JS, no SVG.
- **For Trésor Auth (Profile Setup):** Avatar circle that morphs and breathes using border-radius keyframes. Glow layers via pseudo-elements.

#### Gooey Filter Effect (CSS-Tricks — Lucas Bebber)
- **Source:** https://css-tricks.com/css-blob-recipes
- **Technique:** SVG filter `<feGaussianBlur>` + `<feColorMatrix>` creates "gooey" effect — elements morph together like liquid drops sticking and flowing. `filter: blur(20px) contrast(30)` (CSS-only version) also creates liquid metal look.
- **For Trésor:** Liquid gold effects on input focus states. Elements that merge and split organically.

#### Fluid Morphing Blob (notepadplusplus.in)
- **Source:** https://notepadplusplus.in/css-animations/fluid-morphing-blob
- **Technique:** 100% pure CSS. Complex `border-radius` keyframes. Use cases: abstract hero backgrounds, loading indicators, profile picture frames with premium feel, section dividers, app icon/splash screens.
- **For Trésor:** Background blob elements that continuously morph, creating living wallpaper feel.

### C. Animated Mesh Gradients

#### Mesh Gradient via Blurred Orbs (Quackit)
- **Source:** https://www.quackit.com/css/animations/examples/css_animation_mesh_gradient.cfm
- **Technique:** Multiple `<div>` elements with `radial-gradient()` backgrounds fading to transparent at edges. Parent container gets `filter: blur(40px)` — destroys hard edges, colors "bleed" and mix. Each orb animates independently with different `animation-duration` and `animation-delay` so pattern never looks synchronized. Disable for `prefers-reduced-motion`.
- **For Trésor Slide 1 (Curate):** Flowing silk/gradient background — warm gold and charcoal mesh orbs slowly drifting, blurred into seamless silk-like surface.

#### @property Animated Gradients (Effect.Labs)
- **Source:** https://effect-labs.com/en/pages/backgrounds.html
- **Technique:** `@property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }` allows animating gradient angles. "Breathing Gradient" animates angle AND hues via @property in OKLCH color space. "Animated Border Mesh" — multicolor mesh gradient rotating around element.
- **For Trésor:** @property animated gradient borders on input fields. Breathing background gradients that shift hue over time. Premium rotating glow borders.

#### Aurora/Sunset Mesh (Effect.Labs collection)
- **Techniques:** "Aurora Mesh" — green/cyan/purple gradients that blend and ripple. "Sunset Mesh" — warm-toned (orange, pink, red, purple) in motion. "Neon Mesh" — bold glowing colors. "Breathing Gradient" — angle + hue animation via @property.
- **For Trésor:** Warm gold/charcoal aurora mesh variant — luxury-appropriate color palette of the aurora technique.

### D. Silk & Fabric Simulation

#### Silk Background Animation (21st.dev — waleedkibhen)
- **Source:** https://21st.dev/@waleedkibhen/components/silk-background-animation
- **Technique:** Flowing silk background animation, realistic fabric simulation, WebGPU canvas. Component available for React.
- **For Trésor Slide 1:** Canvas-based silk wave simulation — sine wave layers with gradient fills, creating flowing fabric appearance. Multiple wave layers at different frequencies/phases = realistic silk movement.

### E. Glassmorphism (Luxury Application)

#### Backdrop Filter Best Practices (UXPilot)
- **Source:** https://uxpilot.ai/blogs/glassmorphism-ui
- **Key rules:** Avoid animating blur-heavy elements (expensive). Use `will-change` cautiously. `@supports` feature detection with fallbacks. `transform: translateZ(0)` for GPU compositing. Pre-blurred static backgrounds for performance on low-end devices.
- **For Trésor Layer 3 (Coaching):** Coach marks with `backdrop-filter: blur(20px)` + `background: rgba(26,23,21,0.6)` — frosted glass overlay with blur backdrop. Keep blur static (don't animate it), animate transform/opacity instead.

#### Next-Level Frosted Glass (Josh W. Comeau)
- **Source:** https://www.joshwcomeau.com/css/backdrop-filter
- **Technique:** `backdrop-filter: blur(16px)` + `mask-image: linear-gradient(...)` for partial frosted effects. Gradient masks create "frosted on top, clear on bottom" transitions.
- **For Trésor:** Glass panels with gradient mask edges — frosted center fading to clear edges. Premium depth without heavy performance cost.

---

## 3. Tech Company Animation Philosophy (NEW — Iteration 3)

### Linear — Fast, Spring-Dominant, Physically Grounded
- **Source:** DesignMD — "Linear vs Vercel: two approaches to minimal motion"
- **Philosophy:** Motion is fast, spring-dominant, physically grounded. Duration: 200ms small interactions, 350ms view transitions, 100-150ms hover states. Feels immediate.
- **Signature easing:** `ease-out-expo` — starts at nearly full speed, decelerates sharply to stop. "Precise arriving exactly where it should be, with no wasted movement."
- **For Trésor:** Micro-interactions use ease-out-expo for precise, premium feel. Fast but smooth. No wasted movement.

### Vercel — Restrained, Confirms Without Performing
- **Philosophy:** "The deployment worked. You can see that it worked. We do not need to celebrate it for you." Motion confirms state changes without performing. Restrained, even.
- **For Trésor:** Success states confirm subtly — not with confetti explosions but with elegant, restrained acknowledgment. A checkmark draws itself. A line fills. Quiet luxury.

### Stripe — Functional Elegance
- **Pattern:** Animations serve comprehension. Gradient shifts guide the eye. Loading states are informative, not decorative. Every movement teaches something about the system state.
- **For Trésor:** Slide 4 (Track Everything) adopts Stripe's data-viz philosophy — animations make data legible, not just pretty. Lines draw to show trends. Numbers count up to show growth.

---

## 4. Data Visualization Animation Techniques (NEW — Iteration 3)

### Animated Line Chart — Self-Drawing
- **Source:** KPI Studio, Flourish
- **Technique:** Canvas or SVG path with `stroke-dasharray` = path length, `stroke-dashoffset` animated from full length to 0. Line "draws itself" left to right. Multiple lines can draw sequentially.
- **For Trésor Slide 4:** Elegant chart lines drawing themselves — collection value over time, items tracked, etc. Gold stroke on dark background.

### Count-Up Number Animation
- **Source:** KPI Studio
- **Technique:** JavaScript `requestAnimationFrame` easing from 0 to target value. `easeOutExpo` for premium deceleration. Format with commas/locale. Display in large display font.
- **For Trésor Slide 4:** Numbers count up — "127 items tracked", "$48K collection value", "8 active loans". Numbers materialize with count-up + fade + slight scale.

### Odometer-Style Digit Animation
- **Technique:** Digits roll upward like mechanical counter. Each digit position has a vertical strip of 0-9, translateY animates to correct position. Premium, tactile feel.
- **For Trésor Slide 4:** Odometer-style number display for key metrics — mechanical, tactile, luxurious.

### Bar Chart Growth Animation
- **Technique:** Bars start at height: 0, animate to target height with spring easing. Stagger each bar by 100-150ms. Gold gradient fill.
- **For Trésor Slide 4:** Background bar chart visualization — subtle, elegant, adds data-richness without overwhelming.

---

## 5. Onboarding Pattern Research

### Best Practices (2026 sources)
- **Source:** UXCam, Appcues, Plotline, Formbricks
- **Key patterns:**
  - Onboarding IS the product promise in miniature (Headspace example)
  - Show value in under 10 seconds
  - Teach through action, not text
  - Celebrate wins with positive reinforcement (confetti, progress bars)
  - Progressive disclosure — don't overwhelm
  - Get to "aha moment" fast (SoundCloud example)
- **For Trésor:** Each carousel slide shows a feature IN ACTION, not described. Auth flow celebrates each step. Coaching is progressive, not dump-all-at-once.

### Linear Onboarding (Mobbin reference)
- **URL:** https://mobbin.com/explore/flows/64ae582c-747c-4c77-8629-812abcbef186
- **25-screen flow:** Account creation → workspace setup → app introduction
- **Technique:** Fast, efficient, dark minimal aesthetic with subtle animations
- **For Trésor:** Auth flow should be efficient but luxurious — each step feels intentional, not rushed.

---

## 6. X/Twitter Design Community Insights

### Rive for Onboarding (@uiuxanimation, @RiveAnimator)
- **Pattern:** Single character/mascot with multiple animation states (idle, action, success). State changes controlled by number inputs. Developer-friendly, mobile-optimized.
- **For Trésor:** Could simulate state-based animations with CSS — elements that change animation states (idle → active → success).

### Rexan Wong's "Sexy Software" Playbook (@rexan_wong)
- **Key advice:** Study the best (Mobbin for flows). Copy color palettes from admired apps. Focus on micro-interactions (smooth hover states, loading animations). Use Framer Motion or CSS transitions. Perfect spacing & typography (8px system, 2 fonts max). White space is your friend.
- **For Trésor:** Already following the 2-font system (Playfair + Jost). Double down on micro-interactions and generous whitespace.

### React Native Animation Community (@wcandillon, @blazejkustra_)
- William Candillon (Can it be done in React Native?) — showcases complex animations
- Błażej Kustra (Software Mansion) — real materials, WebGPU interactivity
- RN 0.85 introduces Shared Animation Backend (collaboration with Software Mansion)
- **For Trésor:** Simulate Reanimated's shared element transitions and spring physics in CSS for the mockup.

---

## 7. Iteration 3 Design Strategy — "Live Elements"

### The Problem with Iterations 1 & 2
- **Iteration 1:** 18 animations, basic geometric shapes, standard app tutorial feel. Too safe.
- **Iteration 2:** 55 animations but SAME visual language across all slides. Reused SVG shapes. ASCII-like elements. Creatively limited.
- **Nasser's feedback:** "Reusing ASCII elements", "limiting yourself creatively", wants "live elements."

### What "Live Elements" Means (Iteration 3 Approach)
1. **Canvas-based particle systems** — Gold dust floating, silk-like flowing backgrounds. Real `requestAnimationFrame` loops, not static shapes.
2. **CSS generative art** — Not just geometric shapes. Organic, flowing, alive. Border-radius morphing, gradient mesh breathing.
3. **Animated gradient meshes** — Multiple blurred radial-gradient orbs drifting independently. @property for animated gradient angles.
4. **Liquid/blob morphing** — Pure CSS border-radius keyframes creating organic shapes that continuously transform.
5. **Texture simulation** — Silk, gold leaf, marble via layered CSS gradients + filters (blur, drop-shadow, hue-rotate).
6. **Dynamic light effects** — Glow, shimmer, sweep using CSS animations + canvas shadow blur.
7. **EACH SLIDE = DIFFERENT TECHNIQUE** — No reused visual elements. Slide 1 = silk canvas. Slide 2 = orbital network canvas. Slide 3 = converging particle canvas. Slide 4 = data-viz canvas.

### Slide-by-Slide Unique Techniques (NO REUSE)

#### Slide 1 "Curate Your Collection" — Silk Flow Canvas
- Canvas: Flowing silk wave simulation. Multiple sine wave layers with gold gradient fills at different frequencies/phases.
- Background: Animated mesh gradient (blurred orbs) in warm gold/charcoal.
- Foreground: Item cards materialize with light sweep (clip-path reveal + gradient sweep).
- Unique visual: Wavy, flowing, fabric-like. NO geometric shapes.

#### Slide 2 "Borrow & Lend" — Orbital Network Canvas
- Canvas: Nodes orbiting center point at different radii/speeds. Connection lines draw between nearby nodes (opacity based on distance). 
- Background: Radial gradient emanating from center. Concentric ring guides (faint).
- Foreground: Item icons orbit, lending connections draw as curved bezier paths.
- Unique visual: Circular, networked, astronomical. Completely different from Slide 1.

#### Slide 3 "Wishlist & Group Gifts" — Converging Gold Dust Canvas
- Canvas: Golden particles spawn at edges, drift toward center focal point with easing. Particles have shadow blur (glow). Some particles orbit the center before converging.
- Background: Dark vignette, center radial glow (gold).
- Foreground: Gift/wishlist icon at center, particles converge to "form" it.
- Unique visual: Particulate, converging, luminous. Different from Slides 1 & 2.

#### Slide 4 "Track Everything" — Data Visualization Canvas
- Canvas: Elegant line chart drawing itself (stroke-dashoffset on canvas path). Bar chart growing with spring easing. Grid lines fade in. Data points pulse.
- Foreground: Large numbers count up via JS (easeOutExpo). Odometer-style for key metric.
- Background: Subtle grid pattern, data terminal aesthetic.
- Unique visual: Analytical, precise, data-rich. Different from all other slides.

### Auth Flow — Each Step Unique

#### Welcome — Logo from Gold Particles
- Canvas: Gold particles converge from random positions to form the Trésor logo shape. Once formed, logo "solidifies" with glow pulse.
- Alternative: SVG calligraphic stroke draws the logo mark (stroke-dashoffset), then fill fades in.
- Unique: Particle-to-form transition. No other screen uses this.

#### Phone Input — Liquid Gold Focus
- @property animated gradient border. On focus: border becomes flowing liquid gold (animated gradient angle + hue). Input field has subtle inner glow.
- Background: Single morphing blob (CSS border-radius keyframes) in gold, low opacity.
- Unique: Liquid metal aesthetic. No particles, no silk.

#### OTP — Animated Digit Slots
- Each digit slot: distinct element with entrance animation (spring scale). On input: slot glows gold, digit materializes. On complete: all slots pulse, checkmark draws via SVG, success ripple expands.
- Background: Subtle horizontal gold line that pulses (heartbeat monitor aesthetic).
- Unique: Mechanical/digital aesthetic with organic ripple. Different from liquid gold.

#### Profile Setup — Breathing Avatar
- CSS blob morphing: avatar circle continuously morphs border-radius (breathing). Gold gradient fill with @property hue shift. On selection: spring scale + glow burst.
- Background: Two large blurred orbs drifting (mesh gradient) in gold and warm charcoal.
- Unique: Organic morphing/breathing. Different from all previous.

#### Circle Preview — Staggered Cascade + Letter Materialization
- Member avatars reveal one-by-one with spring physics (+120ms stagger). Each: scale(0→1) with overshoot + drop-shadow glow. Connecting lines draw between members (canvas or SVG).
- Circle name: Each letter materializes independently (translateY + opacity + slight rotate, 60ms stagger).
- Background: Radial gradient expanding outward as members reveal.
- Unique: Cascade choreography + typographic materialization.

### Layer 3: In-App Coaching — Generative Art

#### Empty States — Generative Art Canvas Backgrounds
- Each empty state has a UNIQUE canvas generative art background:
  - Empty collection: Slowly rotating golden spiral (Fibonacci) drawn on canvas.
  - Empty wishlist: Particle field slowly drifting upward (like rising embers).
  - Empty circle: Concentric circles pulsing outward like ripples.
- NOT just text + icon. The background IS the art.

#### Coach Marks — Spring Physics + Blur Backdrop
- Glassmorphism overlay: `backdrop-filter: blur(20px)` + `background: rgba(26,23,21,0.5)`.
- Coach mark tooltip springs in with `cubic-bezier(.34, 1.56, .64, 1)` overshoot.
- Spotlight cutout: `mask-image` radial gradient creating "hole" in blur around highlighted element.
- Pulsing ring around highlighted element (animated box-shadow).

#### Checklist — Satisfying Completion
- Each item: checkbox circle fills with gold gradient (clip-path circle expand). Checkmark draws via SVG stroke-dashoffset. Item text gets strike-through animation. Subtle haptic-like scale pulse on completion.
- Progress bar: Gold line fills with gradient, count-up number updates.

---

## 8. Technical Implementation Plan

### Canvas Elements (minimum 4)
1. `silk-canvas` — Slide 1 flowing silk waves
2. `orbit-canvas` — Slide 2 orbital network
3. `dust-canvas` — Slide 3 converging gold dust
4. `data-canvas` — Slide 4 data visualization
5. `welcome-canvas` — Auth welcome particle-to-logo

### CSS Techniques
- `@property` for animated gradient angles/hues
- `filter: blur()`, `drop-shadow()`, `hue-rotate()`, `contrast()` for textures
- `clip-path: polygon()`, `circle()`, `inset()` for reveals
- `mask-image: linear-gradient()`, `radial-gradient()` for partial effects
- `border-radius` keyframes for blob morphing
- `backdrop-filter: blur()` for glassmorphism
- `mix-blend-mode` for color blending
- `stroke-dasharray` / `stroke-dashoffset` for SVG line drawing

### Animation Count Target: 60+
Each slide: 8-12 animations. Auth flow: 15-20 animations. Coaching: 10-15 animations. Transitions: 5-8.

### Color System (unchanged)
- Background: `#1a1715` (warm charcoal)
- Accent: `#c9a96a` (gold)
- Text: `#f5f0e8` (cream)
- Gold gradient: `linear-gradient(135deg, #c9a96a, #e8d5a3, #c9a96a)`
- Gold glow: `rgba(201, 169, 106, 0.3)`

### Typography (unchanged)
- Display: Playfair Display (serif, editorial)
- Body: Jost (sans-serif, clean)

---

## 9. Design Principles (Updated for Iteration 3)

1. **Every slide is a different world** — No reused visual elements. Each slide has its own canvas technique, its own visual language, its own personality.
2. **The file must feel ALIVE** — Things are always moving, breathing, shifting. No static moments. Backgrounds breathe, particles drift, gradients morph.
3. **Canvas = live elements** — Real `requestAnimationFrame` loops, real particle physics, real generative art. Not static SVGs pretending to move.
4. **Luxury = restraint within richness** — Rich visual techniques but restrained color palette. Gold on charcoal. Cream text. No rainbow. No neon. Restraint = luxury.
5. **Spring physics everywhere** — `cubic-bezier(.34, 1.56, .64, 1)` for overshoot/settle. `ease-out-expo` for precision. Never linear. Never basic ease.
6. **Stagger everything** — Sequential reveals feel designed. Simultaneous reveals feel basic. Every group of elements staggers.
7. **Show, don't tell** — Animate features in action. Don't describe with text what you can show with motion.
8. **Dark editorial aesthetic** — Warm charcoal, gold accent, cream text — like a Vogue spread brought to life.

## Reference from Nasser (X Post)

### Jay Dwivedi — "How to Make Your Onboarding 10x Better" (7 Practical Tips)
- **Source:** https://x.com/jaydwivedi_/status/2084610502093930519
- **Studio:** Kree8 Studio (kree8.studio)

**Key principles for Trésor onboarding:**

1. **Define the activation moment** — For Trésor, the activation moment is when a user sees their circle's collection for the first time. Design the entire flow around getting them there fast.

2. **Show value before asking for effort** — Don't ask for account creation, invite code, profile setup all at once. Show what Trésor looks like (the collection, the circle, the beauty) BEFORE asking them to fill forms.

3. **Ask only useful questions** — Every question must change the experience. Name and avatar? Yes, it personalizes the circle. Invite code? Yes, it determines their circle. Nothing else.

4. **One clear action per screen** — Each screen has ONE purpose. No multi-decision screens.

5. **Make it animated and interesting** — Purposeful animations, interactive selections, satisfying transitions, illustrations, subtle haptics. Motion should make the experience easier to understand, not slow users down.

6. **Make it personal** — Use the user's answers to make generic info feel specific. Their name in the circle, their circle's name, seeing their friends' avatars.

7. **End with a meaningful result** — Don't end on "You're all set" + empty dashboard. Show them their circle, their collection preview, their first action. A strong onboarding ends with VALUE.

**Nasser's additional note:** This is the QUALITY of thinking + execution expected. The onboarding must feel like it was designed by a top studio like Kree8, not generated by AI.


## Reference from Nasser (X Post 2)

### ScreensDesign MCP — 2,600+ Top iOS App Screens Database
- **Source:** https://x.com/siron93/status/2085034533003383011
- **Tool:** ScreensDesign MCP (screensdesign.com) — searchable database of onboarding, paywalls, pricing screens from top iOS apps
- **What it offers:** Search onboarding patterns from 2,600+ real iOS apps. Ask things like "Show me onboarding from top luxury apps" or "Compare onboarding flows of top subscription apps."

**For Trésor:** This is a research tool Muaath should use to study REAL onboarding screens from successful iOS apps — not just CSS animation showcases, but actual shipping app onboarding flows. The onboarding design should be informed by what top apps actually do, not just theoretical animation techniques.

**Nasser's intent:** Muaath should study real app onboarding examples, not just design in a vacuum. Research actual shipping apps.

