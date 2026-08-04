# Luxury Item Inventory App — UI/UX Design Research & Recommendations

## App Context
- **Users:** 5–15 women in a closed circle
- **Items:** Luxury designer bags, jewelry, shoes
- **Platform:** iOS-first (React Native / Expo)
- **Key flows:** Invite-code onboarding, AI photo add, browse collections, borrow/lend tracking, wishlist with savings goals, activity feed

---

## 1. Inspiration from Existing Apps

### Vestiaire Collective
- **What to steal:** Full-bleed editorial photography, brand-forward browse experience, personalized notifications for "items you're looking for," offer/negotiation flow (adapts to borrow requests)
- **Pattern:** High-quality imagery is the hero — items fill the card, text is minimal. Brand name + price are the only overlays
- **Link:** https://apps.apple.com/us/app/vestiaire-collective/id446921737

### The RealReal
- **What to steal:** Authentication/trust badges on every item (adapt to "verified owner" in your circle), daily "new arrivals" cadence (adapt to "newly added to circle"), category-first navigation (Bags → Jewelry → Watches)
- **Pattern:** Grid view with clean white background, brand name bold, price + condition below. Trusted-condition labels reduce anxiety — mirror this with item condition notes
- **Link:** https://apps.apple.com/us/app/the-realreal-buy-sell-luxury/id587618103

### Rebag (Clair AI)
- **What to steal:** **Clair AI image recognition** — user photographs a bag, AI identifies brand/model instantly. This is EXACTLY your "add item via photo with AI recognition" feature. Rebag proves this pattern works for luxury items
- **Pattern:** Single-photo → instant ID → valuation. Historical price tracking chart showing resale value over time (adapt to "item value history" for the circle)
- **Link:** https://www.rebag.com/thevault/how-much-is-my-designer-bag-worth-clair-knows

### Whering (Digital Closet)
- **What to steal:** AI background removal on item photos (clean, consistent catalog), predictive auto-tagging (suggests category/color/brand when adding), "no dead ends" philosophy (every screen offers next action), micro-interactions + subtle haptic on save
- **Pattern:** Social closet feature — "see friends' closets, save items from friends' wishlist to yours in one click." This is literally your circle-sharing feature
- **Key UX lesson (from Medium UX analysis):** Whering excels at all 5 UX layers — strategy (planet-centered), scope (only features that matter), structure (no dead ends), skeleton (A/B tested, low cognitive load), surface (visually delightful but not overwhelming)
- **Link:** https://apps.apple.com/us/app/whering-your-digital-closet/id1519461680

### Finale Inventory
- **What to steal:** Multi-location inventory tracking (adapt to "who currently has this item"), stock-level visibility, barcode/scan-in workflow (adapt to photo-scan check-in/out for lends)
- **Pattern:** Dashboard-centric — central hub showing inventory flow (items in via purchases, items out via lends). Visual stock status at a glance
- **Lesson:** Inventory apps need a clear "where is everything" dashboard. Your app needs a "who has what right now" view
- **Link:** https://www.finaleinventory.com

### Collector-Style Apps (Acloset, Indyx)
- **What to steal:** AI-powered style stats (cost-per-wear, wear-rate tracking), one-click item addition from photos, clean analytics dashboard
- **Pattern:** "Your wardrobe, understood at a glance" — visual stats about the collection. Adapt to circle-level stats ("Circle has 47 bags worth $X total, 3 currently lent out")
- **Link:** https://www.acloset.app

---

## 2. Onboarding Flow — Invite Code (Closed Circle)

### Recommended Flow (5 screens, <90 seconds)

```
Screen 1: Welcome / Exclusive Feel
├── Dark or jewel-tone background, elegant serif logo
├── Tagline: "Your circle's shared luxury collection"
├── Single CTA: "Enter with invite code"
└── Haptic: .soft on tap

Screen 2: Invite Code Entry
├── 6-digit code input (large, centered, OTP-style boxes)
├── Auto-advance to next digit
├── Paste support (auto-detect from clipboard)
├── On success: Haptic.notificationAsync(.success) + smooth transition
└── Error: Haptic.notificationAsync(.error) + shake animation

Screen 3: Create Your Profile
├── Profile photo (camera or library)
├── Display name
├── Optional: favorite brands (chips — Hermès, Chanel, Dior, etc.)
└── This is who you ARE in the circle, not a marketplace profile

Screen 4: Add Your First Item (the "aha" moment)
├── Camera opens immediately — "Photograph your first piece"
├── AI recognizes brand/category (Rebag Clair-style)
├── Background auto-removed (Whering-style)
├── Confirmation: "Beautiful! Your [Chanel Classic Flap] is now in the circle"
└── Haptic: .medium impact + success animation

Screen 5: Circle Preview
├── "You're now part of [Name]'s circle with N members"
├── See grid of circle's existing collection (scrollable preview)
├── "Start browsing" CTA → lands on main browse view
└── Haptic: .light selection
```

### Key Principles
- **Progressive disclosure:** Don't explain every feature. Teach in-context (Whering's model)
- **One task per screen:** Reduces cognitive load, prevents drop-off
- **Get to value fast:** The first item photo is the "time to first value" moment — make it screen 4, not screen 8
- **Exclusivity as emotion:** The invite code IS the brand. Make it feel like a velvet rope, not a form field. Use elegant typography, generous whitespace, maybe a subtle animation on code acceptance
- **No account creation friction:** Since it's a closed circle, skip email/password entirely. Auth via invite code + device. Optionally add Face ID

### References
- Mobbin onboarding patterns: https://mobbin.com/explore/mobile/screens/onboarding
- Whering's onboarding teaches as you explore (no forced tutorial)

---

## 3. Inventory Browsing Patterns

### Layout: Grid (Primary) + List (Toggle)

**Recommendation: 2-column grid as default, with list-view toggle**

| Aspect | Grid View (Default) | List View (Toggle) |
|--------|--------------------|-------------------|
| Best for | Browsing, discovery, visual scanning | Comparing details, reading item notes |
| Use when | Exploring the circle's collection | Checking borrow status, condition notes |
| Card content | Item photo (full-bleed), brand name, status badge | Photo (thumbnail) + brand + model + owner + status + condition |

**Why grid default:** Research shows grid view distributes attention more evenly — better for visual luxury items where the photo sells the item. List view attention drops as users scroll down. For luxury bags/jewelry, the image is everything.

### Card Design (Grid)
```
┌──────────────────────┐
│                      │
│    [Full-bleed       │  ← Square or 4:5 aspect ratio
│     item photo]      │     Background removed, consistent
│                      │
│              [Status]│  ← Top-right corner badge
│                      │     "Available" / "Lent" / "On hold"
│  Chanel              │  ← Brand name (bold, small caps)
│  Classic Flap Bag    │  ← Item name (lighter weight)
│  Owned by Sarah      │  ← Circle member (subtle)
└──────────────────────┘
```

### Filtering System (Critical for 5–15 users with 50–200 items)

**Filter hierarchy (top to bottom, per NN/g research):**
1. **Category** (Bags / Jewelry / Shoes / Watches / Accessories)
2. **Brand** (Hermès, Chanel, Dior, LV, Cartier, etc.) — alphabetical, with logos
3. **Availability** (Available / Lent / On hold / All)
4. **Owner** (Which circle member)
5. **Color** (Visual swatches, not text)
6. **Value range** (Slider)

**Mobile filter UX:**
- **Horizontal scrolling filter chips** at top of grid (ASOS pattern) — Category, Brand, Availability as quick-access chips
- **Full filter sheet** via "Filters" button → slides up as bottom sheet with all options
- **Active filter chips** persist below the chip row with × to remove individually
- **"Clear all"** always visible
- **Dynamic item counts** on each filter value ("Bags (23)")
- **Filter state persists** when navigating back from item detail

### Browse Screen Structure
```
┌─────────────────────────────────┐
│  [Circle Name]    [Search 🔍]   │  ← Sticky header
│─────────────────────────────────│
│  [All] [Bags] [Jewelry] [Shoes] │  ← Horizontal category chips
│  [Available] [Brand ▾]          │  ← Quick filter chips
│─────────────────────────────────│
│  [Grid] [List]     47 items     │  ← View toggle + count
│─────────────────────────────────│
│  ┌─────────┐  ┌─────────┐      │
│  │ Item 1  │  │ Item 2  │      │  ← 2-col grid
│  └─────────┘  └─────────┘      │
│  ┌─────────┐  ┌─────────┐      │
│  │ Item 3  │  │ Item 4  │      │
│  └─────────┘  └─────────┘      │
│                 [Pull to refresh]│
└─────────────────────────────────┘
```

### Search
- Full-text search across brand, item name, owner name, tags
- Recent searches stored
- Empty state: "Search for a brand, item, or friend"

### References
- NN/g filter categories: https://www.nngroup.com/articles/filter-categories-values
- Ecommerce filter UX patterns: https://www.btng.studio/articles/top-ecommerce-ux-filter-design-patterns-practical-tips-for-2025
- Baymard product lists: https://baymard.com/research/ecommerce-product-lists

---

## 4. Borrow / Lend Flow UX

### State Machine
```
                    ┌──────────┐
                    │ AVAILABLE│
                    └────┬─────┘
                         │ User A taps "Request to Borrow"
                         ▼
                    ┌──────────┐
                    │ REQUESTED│ ── Owner gets push notification
                    └────┬─────┘
              Owner      │
         ┌───────┬───────┘
         │       │
     Accept    Decline
         │       │
         ▼       ▼
    ┌────────┐  ┌──────────┐
    │ACCEPTED│  │DECLINED  │ → Notifies requester, back to available
    └───┬────┘  └──────────┘
        │ Handover happens in person
        ▼
    ┌────────────┐
    │  LENT OUT  │ → Shows borrower name + due date
    │ (tracked)  │   Push reminder 2 days before due
    └─────┬──────┘
          │ Borrower taps "Mark as Returned"
          │ OR Owner taps "Confirm Returned"
          ▼
    ┌────────────┐
    │  RETURNED  │ → Both confirm, back to available
    │ (pending   │   Optional: condition check + photo
    │  confirm)  │
    └────────────┘
```

### Screen-by-Screen Flow

**Item Detail → Request:**
```
┌─────────────────────────┐
│  [← Back]      [♡]      │
│                         │
│  [Large item photo]     │  ← Swipeable gallery
│                         │
│  Chanel Classic Flap    │
│  Black, Caviar, Medium  │
│  Owned by Sarah M.      │
│  Value: ~$8,500         │
│                         │
│  ─── Status: Available ─│
│                         │
│  [ Request to Borrow ]  │  ← Full-width CTA, primary color
│                         │
│  Condition: Excellent   │
│  Notes: "Minor corner   │
│  wear on bottom-right"  │
└─────────────────────────┘
```

**Request Modal (bottom sheet):**
```
┌─────────────────────────┐
│  Request to Borrow      │
│                         │
│  When do you need it?   │
│  [Date picker]          │
│                         │
│  When will you return?  │
│  [Date picker]          │
│                         │
│  Message to Sarah:      │
│  [Optional text field]  │
│                         │
│  [ Send Request ]       │
└─────────────────────────┘
```

**Owner's Accept/Decline (push notification → inline):**
- Push notification: "Aisha wants to borrow your Chanel Classic Flap"
- Tap → bottom sheet with request details + Accept / Decline buttons
- Accept triggers: Haptic.notificationAsync(.success) + "Request accepted" confirmation

**Active Loan Tracking:**
```
┌─────────────────────────┐
│  My Active Borrows      │
│─────────────────────────│
│  ┌─────────────────────┐│
│  │ [photo] Chanel Flap ││
│  │ Borrowed from Sarah ││
│  │ Due: Aug 12 (3 days)││  ← Color shifts to amber/red as due date approaches
│  │ [ Mark Returned ]   ││
│  └─────────────────────┘│
│                         │
│  My Lent Items          │
│─────────────────────────│
│  ┌─────────────────────┐│
│  │ [photo] Cartier LOVE││
│  │ Lent to Aisha       ││
│  │ Due: Aug 9 (today!) ││  ← Red if overdue
│  │ [ Nudge Return ]    ││  ← Gentle reminder button
│  └─────────────────────┘│
└─────────────────────────┘
```

### Key UX Decisions
- **Dual confirmation on return:** Both borrower and owner confirm return — prevents disputes in a friend circle where relationships matter
- **Optional condition photo on return:** Camera opens, AI could compare to original photos — reduces anxiety about damage
- **Gentle nudges, not aggressive reminders:** "Nudge" button sends a polite push. No automated shaming notifications
- **Visual due-date urgency:** Color gradient from green → amber → red as due date approaches (not just text)
- **No money in the flow:** This is a friend circle, not a rental business. Keep it relational. Optional "thank you" gesture (emoji/sticker) after return
- **Loan history per item:** See who borrowed it and when — builds trust and accountability

### References
- Peer-to-peer lending UX: https://www.independentbanker.org/w/10-mobile-lending-ux-best-practices (breadcrumbs, progress indication, status clarity)
- Shneebs community lending: matching + tracking + reminders + return enforcement
- Whering social closet: one-click save from friends → adapt to one-click borrow request

---

## 5. Wishlist UI with Savings Goals / Targets

### Design: Two-Tier Wishlist

**Tier 1: Want It (simple bookmark)**
- Heart icon on any item → adds to wishlist
- "Saved from [friend's name]'s closet" or "External wishlist item"

**Tier 2: Saving For It (goal tracker)**
- Convert any wishlist item into a savings goal
- Set target price (current market value or "would buy at" price)
- Track savings progress toward it

### Savings Goal Card Design
```
┌──────────────────────────────────┐
│  [Item photo]   Hermès Birkin 30 │
│                 Togo, Gold, PHW  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ████████░░░░░░░░░░░  42%   │  │ ← Progress bar (gradient fill)
│  └────────────────────────────┘  │
│                                  │
│  $12,800 saved  /  $30,000 goal  │
│  Target: Dec 2026                │
│  ─────────────────────────────   │
│  [ + Add to Savings ]            │
│  [ Track Price Changes ]         │
└──────────────────────────────────┘
```

### Savings Goal Detail
```
┌──────────────────────────────────┐
│  [← Back]              [Edit]    │
│                                  │
│  [Large item photo]              │
│                                  │
│  Hermès Birkin 30                │
│  Togo Leather, Gold Hardware     │
│                                  │
│  ╭──────────────────────────╮    │
│  │     $12,800              │    │
│  │     of $30,000           │    │
│  │     ████████░░░  42%     │    │
│  │     On track for Dec 2026│    │
│  ╰──────────────────────────╯    │
│                                  │
│  Savings History                 │
│  ────────────────────────────    │
│  Aug 4  +$500   "Monthly save"   │
│  Jul 4  +$500   "Monthly save"   │
│  Jun 12 +$2,000 "Birthday gift"  │
│  May 4  +$800   "Monthly save"   │
│  ────────────────────────────    │
│                                  │
│  Price Tracking 📈               │
│  Current market: ~$30,000        │
│  6-month trend: [mini chart]     │
│  Alert me at: $28,000            │
│                                  │
│  [ + Add Savings ]               │
└──────────────────────────────────┘
```

### Key UX Decisions
- **Circular progress ring OR linear bar:** Linear bar is more scannable in a list; circular ring is more emotional for a single-goal focus view. Use linear in list, circular in detail
- **Mini price chart:** Rebag's Clair does historical price tracking — adapt this to show market trends for wishlist items. This is a killer feature for luxury (values appreciate!)
- **"On track" status:** Auto-calculated from savings rate vs. target date. Green = on track, amber = behind, with suggestion to adjust
- **Social element (optional):** "3 friends are also saving for similar items" — subtle, opt-in. Could enable group savings accountability
- **Celebration moment:** When goal is reached, full-screen confetti + Haptic.notificationAsync(.success) + "You did it! Time to go shopping 🎉"
- **Dribbble inspiration:** Search "savings goal tracker progress bar" on Dribbble for visual patterns
- **Mobbin reference:** https://mobbin.com/explore/mobile/screens/progress (real progress screen examples from Ubank, Shipt, etc.)

### References
- Rebag Clair historical price tracking: https://www.rebag.com/thevault/how-much-is-my-designer-bag-worth-clair-knows
- Dribbble savings goal UI: https://dribbble.com/search/goal-progress-bar
- Mobbin progress screens: https://mobbin.com/explore/mobile/screens/progress

---

## 6. Activity Feed Design

### Feed Type: Chronological + Aggregated (hybrid)

For a 5–15 person circle, a **chronological flat feed** with **light aggregation** works best. Too few users for algorithmic ranking; too many events for pure chronological without grouping.

### Feed Entry Types (with icons)
| Activity | Icon | Example Entry |
|----------|------|---------------|
| Item added | ➕ | "Sarah added a **Chanel Classic Flap** to her collection" |
| Borrow requested | 🤝 | "Aisha requested to borrow your **Cartier LOVE bracelet**" |
| Borrow accepted | ✅ | "Sarah accepted your borrow request for the **Chanel Flap**" |
| Item returned | ↩️ | "Aisha returned the **Cartier LOVE** to Sarah" |
| Wishlist update | 💰 | "Mariam is saving for a **Hermès Birkin 30** — 42% there!" |
| Goal reached | 🎉 | "Aisha reached her savings goal for the **Lady Dior**!" |
| New member | 👋 | "Mariam joined the circle" |
| Item updated | ✏️ | "Sarah updated condition notes on her **LV Neverfull**" |

### Feed Card Design
```
┌──────────────────────────────────────┐
│  [avatar] Sarah added a              │  ← Actor (avatar + name)
│           Chanel Classic Flap        │  ← Short description (bold item name)
│           to her collection          │
│           [thumbnail]  2h ago        │  ← Item preview + timestamp
│                                      │
│  [♡ Save]  [👁 View Item]            │  ← Inline actions (optional)
└──────────────────────────────────────┘
```

### Feed Screen Structure
```
┌─────────────────────────────────┐
│  Activity                       │  ← Title
│─────────────────────────────────│
│  [All] [Borrows] [New Items]    │  ← Filter chips
│  [Wishlist] [Members]           │
│─────────────────────────────────│
│  ┌─────────────────────────────┐│
│  │ [avatar] Sarah added a      ││  ← Today
│  │ Chanel Classic Flap         ││
│  │ [thumb] 2h ago              ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ [avatar] Aisha returned the ││
│  │ Cartier LOVE to Sarah       ││
│  │ [thumb] 5h ago              ││
│  └─────────────────────────────┘│
│  ─── Yesterday ───              │  ← Date dividers
│  ┌─────────────────────────────┐│
│  │ [avatar] Mariam joined the  ││
│  │ circle  🎉                  ││
│  │ 1d ago                      ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Key UX Decisions
- **Avatar-first:** In a friend circle, WHO did something matters more than WHAT. Lead with the avatar
- **Date dividers:** "Today", "Yesterday", "This Week" — helps scan chronologically
- **Light aggregation:** If Sarah adds 5 items in one session, show "Sarah added 5 new items" with a stacked thumbnail preview (expandable)
- **Filter chips:** Let users filter by activity type — especially useful for tracking borrows
- **Unread indicator:** Blue dot on new activities since last viewed. "Mark all as read" option
- **Pull to refresh:** With haptic feedback + loading spinner
- **Lazy loading:** Infinite scroll with pagination — don't load entire history at once
- **Tappable entries:** Tap any feed item → navigate to the relevant item/detail
- **Concise copy:** "Sarah added a Chanel Classic Flap" — not "Sarah added a new item to her collection which is a Chanel Classic Flap bag in black caviar leather." Write for scanning, not reading

### References
- Aubergine activity feed guide: https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds (8 standard components: actor, icon, description, text preview, timestamp, location, filtering, new activity indicator)
- Eleken timeline UI: https://www.eleken.co/blog-posts/timeline-ui-design (activity-feed patterns: clear timestamps, visual cues, consistent layouts, progressive disclosure, max 2-3 hierarchy levels, semantic emphasis)

---

## 7. iOS-Specific Design Patterns (Native Feel)

### Haptics (expo-haptics)

**Haptic strategy — map each interaction type to a specific haptic:**

| Interaction | Haptic | Code |
|------------|--------|------|
| Toggle filter chip | Selection | `Haptics.selectionAsync()` |
| Tap item card | Light impact | `Haptics.impactAsync(.light)` |
| Save to wishlist (heart) | Medium impact | `Haptics.impactAsync(.medium)` |
| Send borrow request | Medium impact | `Haptics.impactAsync(.medium)` |
| Request accepted | Success notification | `Haptics.notificationAsync(.success)` |
| Request declined | Error notification | `Haptics.notificationAsync(.error)` |
| Invite code accepted | Success notification | `Haptics.notificationAsync(.success)` |
| Invite code rejected | Error notification | `Haptics.notificationAsync(.error)` |
| Savings goal reached | Success + impact | `Haptics.notificationAsync(.success)` |
| Pull to refresh trigger | Light impact | `Haptics.impactAsync(.light)` |
| Swipe action reveal | Selection | `Haptics.selectionAsync()` |
| Long press item (context menu) | Medium impact | `Haptics.impactAsync(.medium)` |

**Rules:**
- Never fire haptics without a user action causing them
- Don't overuse — if everything vibrates, nothing matters
- Match haptic intensity to action weight (light = navigation, medium = commitment, notification = outcome)
- Apple HIG: haptics should complement the UI, not substitute for visual feedback

### Gestures

| Gesture | Action | Pattern |
|---------|--------|---------|
| Tap | Open item detail | Standard |
| Long press | Context menu: Save to wishlist, Request to borrow, Share with friend | iOS native context menu (sheet) |
| Swipe left (on borrow card) | "Mark as Returned" action | iOS native swipe action |
| Swipe right (on borrow card) | "Nudge" / message owner | iOS native swipe action |
| Pinch | Zoom item photo | Standard |
| Swipe (on photo gallery) | Next/previous photo | Standard paging |
| Pull down | Refresh feed/inventory | Standard pull-to-refresh |
| Swipe up (from bottom) | Add new item (FAB alternative) | Custom — camera opens |
| 3D touch / long press (app icon) | Quick actions: Add Item, My Borrows, Wishlist | iOS home screen shortcuts |

**Implementation:** Use `react-native-gesture-handler` + `react-native-reanimated` for smooth, UI-thread gestures at 60fps. Avoid `PanResponder` — it runs on JS thread and janks.

### Native iOS Visual Patterns

**Navigation:**
- Use **SF Symbols** for all icons (Apple's native icon set) — ensures consistency with iOS
- **Large title navigation bar** that collapses on scroll (like Mail, Settings) — feels instantly native
- **Bottom tab bar** with 4–5 tabs: Collection | Activity | Add (center, elevated) | Wishlist | Profile
- **Tab bar haptic:** `selectionAsync()` on tab change

**Tab Bar Structure:**
```
┌──────────────────────────────────────┐
│  [Collection] [Activity]  ⊕  [Wishlist] [Profile] │
│                      ↑                │
│               Elevated center button  │
│               (Add Item — opens camera)│
└──────────────────────────────────────┘
```

**Sheets & Modals:**
- **Bottom sheets** for: borrow request form, filter panel, return confirmation — use `react-native-bottom-sheet` or `@gorhom/bottom-sheet`
- **Half-sheet** for quick actions, **full-sheet** for forms
- **Modal presentation:** Slide-up animation for item detail (like Apple Maps location cards)

**Typography:**
- Use **SF Pro** (system font) — it's what every native iOS app uses
- Dynamic Type support: respect user's font size settings
- Hierarchy: Large Title (34pt) → Title (28pt) → Headline (17pt semibold) → Body (17pt) → Caption (13pt)

**Color & Material:**
- **Dark mode support is mandatory** — use semantic colors (`systemBackground`, `label`, `secondaryLabel`) not hardcoded values
- **SF Symbols** adapt to dark/light automatically
- Consider **vibrancy/material** backgrounds for overlay UI (like Apple's translucent nav bars) — use `@expo/vector-icons` with SF Symbols
- Luxury palette suggestion: Deep charcoal (#1A1A1A) or deep emerald/navy as primary, warm gold (#C5A572) or rose gold (#B76E79) as accent, ivory/cream (#F8F5F0) backgrounds in light mode

**Animations:**
- Use `react-native-reanimated` for all animations (UI thread, 60fps)
- Spring animations for card presses (scale to 0.96 on press, spring back)
- Shared element transitions: item card → item detail (photo expands seamlessly)
- Tab transition: subtle crossfade
- Loading: **Shimmer/skeleton** placeholders, not spinners (more premium feel)

**Other native touches:**
- **Face ID / Touch ID:** for app lock (privacy in a circle app)
- **Push notifications:** with rich media (item photo in notification)
- **Live Activities / Dynamic Island:** (iOS 16+) — show active borrow countdown on lock screen. "Chanel Flap — due in 2 days"
- **Widgets:** Home screen widget showing "Items available to borrow" or "Your active borrows"
- **Share Sheet:** native iOS share sheet for sharing item to a friend via iMessage

### React Native / Expo Specifics

```bash
# Required packages for native feel
npx expo install expo-haptics
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
npx expo install @gorhom/bottom-sheet
npx expo install expo-image (for fast, cached images)
npx expo install expo-secure-store (for auth tokens)
npx expo install expo-local-authentication (Face ID)
npx expo install expo-notifications
```

### References
- Expo Haptics docs: https://docs.expo.dev/versions/latest/sdk/haptics
- React Native gesture handler: https://oneuptime.com/blog/post/2026-01-15-react-native-gesture-handlers/view
- LogRocket haptics guide: https://blog.logrocket.com/customizing-haptic-feedback-react-native-apps
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines
- DesignRush luxury app designs: https://www.designrush.com/best-designs/apps/luxury

---

## Summary: Top 10 Design Decisions

1. **Invite code onboarding** → 5 screens, <90s, velvet-rope feel, first item photo by screen 4
2. **2-column grid** as default browse view with list toggle — luxury items are visual, grid wins
3. **Horizontal filter chips** + bottom sheet for full filters — category → brand → availability → owner → color → value
4. **Borrow flow:** Request → Accept → Track (with due dates + color urgency) → Dual-confirm return — relational, no money
5. **Wishlist with savings goals:** Progress bar + mini price chart + "on track" status + celebration on completion
6. **Activity feed:** Avatar-first chronological with date dividers, light aggregation, filter chips by type
7. **Haptics on every meaningful interaction** — mapped by weight (selection/light/medium/notification)
8. **Bottom tab bar** with elevated center "Add" button (opens camera directly)
9. **Background-removed item photos** (Whering/Acloset pattern) — consistent, premium catalog feel
10. **AI photo recognition** on add (Rebag Clair pattern) — photograph → instant brand/category ID → auto-filled metadata

## Key Reference Apps to Download & Study
| App | What to study | Link |
|-----|--------------|------|
| Vestiaire Collective | Editorial browse, brand-forward grid | [App Store](https://apps.apple.com/us/app/vestiaire-collective/id446921737) |
| The RealReal | Trust badges, category nav, condition labels | [App Store](https://apps.apple.com/us/app/the-realreal-buy-sell-luxury/id587618103) |
| Rebag | Clair AI photo recognition, price tracking | [rebag.com](https://www.rebag.com) |
| Whering | AI background removal, social closet, micro-interactions | [App Store](https://apps.apple.com/us/app/whering-your-digital-closet/id1519461680) |
| Acloset | Style stats, clean analytics dashboard | [acloset.app](https://www.acloset.app) |

## Design Inspiration Galleries
- **Mobbin** (real iOS screen library): https://mobbin.com — search "progress", "onboarding", "activity feed"
- **Dribbble** (concept designs): https://dribbble.com — search "luxury mobile app", "savings goal", "timeline feed"
- **DesignRush** (award-winning luxury apps): https://www.designrush.com/best-designs/apps/luxury
- **NN/g** (filter UX research): https://www.nngroup.com/articles/filter-categories-values
- **Baymard** (product list UX): https://baymard.com/research/ecommerce-product-lists
