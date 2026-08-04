# Trésor — Project Brief for Dwight

## Concept
A private social inventory app for a circle of 5-15 women to manage their luxury designer items (bags, jewelry, shoes), track lends/borrows, build wishlists with savings goals, and discover what each other owns — powered by AI photo recognition.

## Critical Constraint: Local-First Development
**Everything must run locally on Nasser's Mac for validation, testing, and QA before any cloud deployment.**

- Expo app runs on iOS Simulator + physical device via Expo Go
- Supabase runs locally via `supabase start` (Docker) — local PostgreSQL, Auth, Storage, Edge Functions
- AI APIs (GPT-4o Vision) can use cloud endpoints during dev (API keys only)
- No cloud hosting spend until Nasser approves the app
- Future hosting options being evaluated: dedicated Mac Mini (local models + self-hosted Supabase), or cloud (Supabase Pro + cloud APIs). Cost minimization is a priority.

## Tech Stack

| Layer | Choice | Local Dev |
|---|---|---|
| **Frontend** | Expo (React Native) | iOS Simulator + Expo Go |
| **Backend** | Supabase (self-hosted via Docker) | `supabase start` — local Postgres, Auth, Storage, Edge Functions, Realtime |
| **Auth** | Supabase Auth + Twilio SMS (phone OTP) | Twilio test mode (OTP to verified numbers) |
| **Image Storage** | Supabase Storage | Local storage via Docker volume |
| **Push Notifications** | expo-notifications (APNs) | Works in Expo Go on physical device |
| **AI Vision** | GPT-4o-mini → GPT-4o (cloud API) | Cloud API key, called from local Edge Functions |
| **Price Tracking** | eBay Browse API + scraping | Local cron jobs / Supabase scheduled functions |
| **Link Parsing** | GPT-4o structured output | Cloud API key |

## Database Schema

```sql
-- Core tables
users (id, phone, name, avatar_url, circle_id, role [admin|member], created_at)
circles (id, name, invite_code, created_by, created_at)
items (id, owner_id, brand, model, category, condition, 
       purchase_price, current_value, currency, 
       photos[], notes, ai_metadata jsonb, status [available|borrowed], created_at)
borrow_transactions (id, item_id, borrower_id, lender_id, 
       status [requested|accepted|active|returned|declined], 
       requested_at, accepted_at, returned_at, notes)
wishlists (id, user_id, item_name, brand, category, 
       target_price, current_savings, target_date, url, image_url, 
       ai_metadata jsonb, created_at)
activity_feed (id, circle_id, user_id, event_type, payload jsonb, created_at)
price_history (id, item_id, platform, price, currency, recorded_at)

-- RLS policies: users can only see items from their circle
-- Borrow transactions: both parties can update status
-- Activity feed: visible to all circle members
```

## Core Features

### 1. Onboarding (< 90 seconds)
1. Welcome — exclusive, elegant feel
2. Enter invite code (velvet rope)
3. Phone OTP verification (Twilio)
4. Profile setup (name, photo)
5. **Add first item via photo by screen 4** (time-to-value)
6. Circle preview — see who's in

### 2. Inventory Management
- **AI Photo Add:** Photograph item → GPT-4o Vision identifies brand, model, category, estimated value → user confirms/edits
- **Link Add:** Paste URL → AI extracts product info + image → added to inventory
- **Manual Add:** Fallback form
- Each item: photos, brand, model, category, condition, purchase price, current estimated value, notes
- Browse: 2-column grid (default), list toggle, filter by category/brand/availability/owner/color

### 3. Circle Social
- Browse all members' inventories (read-only)
- Activity feed: new items, borrow requests, returns, wishlist updates
- Push notifications on key events
- No DMs — borrowing is the communication

### 4. Borrow/Lend Flow (Request → Accept → Track → Return)
```
User finds item in friend's inventory
  → Taps "Request to Borrow"
  → Owner gets push notification
  → Owner Accepts/Declines
  → If accepted: item status = "Borrowed by [name]"
  → Activity feed update
  → Return: either party marks "Returned"
  → Push notification to owner
```

### 5. Wishlist with Savings Goals
- Add items (photo, link, or manual)
- Set target price + target date
- Track current savings (manual input)
- Visual progress bar
- AI suggests similar items at lower price points
- Price tracking: background job checks eBay/resale platforms, notifies on price drops

### 6. AI Features
| Feature | How | Cost |
|---|---|---|
| Photo identification | GPT-4o Vision via Edge Function | ~$0.005/image |
| Link parsing | GPT-4o extracts structured data from URL | ~$0.002/link |
| Price tracking | Scheduled Edge Functions scrape eBay + luxury platforms | Free (eBay API) + scraping |
| Voice search | Apple STT → search through inventory | ~$0.001/search |
| Smart suggestions | GPT-4o suggests similar items, alternatives | ~$0.001/query |

### 7. iOS-Native Experience
- **Haptics:** 11 interaction→haptic mappings (expo-haptics)
- **Gestures:** Long-press context menus, swipe actions on borrow cards
- **Bottom tab:** My Trésor | Circle | Add (elevated center button) | Wishlist | Activity
- **Typography:** SF Pro, SF Symbols
- **Dark mode** mandatory
- **Face ID** app lock
- **Live Activities:** Borrow countdown on lock screen
- **Skeleton shimmer** loaders, 60fps animations (Reanimated)

## Design References
- **Rebag's Clair AI** — photo → instant brand ID
- **Whering** — social closet, see friends' closets
- **Vestiaire Collective** — editorial photography, luxury visual bar
- **The RealReal** — trust badges, authentication feel

## Phased Delivery Plan

### Phase 1: Scaffolding (Mauricio leads)
- Expo project setup with TypeScript, navigation, theming
- Local Supabase via Docker (`supabase start`)
- Database schema + migrations
- RLS policies
- EAS Build configuration
- CI/CD pipeline (GitHub Actions)
- **Deliverable:** App boots in simulator, connects to local Supabase, empty screens with navigation

### Phase 2: Auth + Onboarding (Sonny leads)
- Phone OTP via Supabase Auth + Twilio
- Invite code flow (generate, validate, join circle)
- Profile creation (name, avatar upload)
- Onboarding screens (5-screen flow)
- **Deliverable:** User can install on device, enter invite code, verify phone, create profile

### Phase 3: Core Inventory (Sonny + Muaath)
- Item CRUD (add, edit, delete, view)
- Photo capture + upload to Supabase Storage
- Image compression (expo-image-manipulator → WebP)
- Inventory grid + list views
- Filtering (category, brand, availability, owner)
- Item detail screen
- **Deliverable:** User can add items with photos, browse their inventory, filter

### Phase 4: AI Integration (Sonny leads)
- GPT-4o Vision Edge Function: photo → brand, model, category, estimated value
- Link parsing Edge Function: URL → structured item data
- AI pre-fill flow: photo/link → AI suggests → user confirms
- Voice search (Apple STT → text search)
- **Deliverable:** User photographs item, AI identifies it, one-tap add to inventory

### Phase 5: Circle + Borrow (Zizo + Sonny)
- Circle member list + browsing others' inventories
- Borrow request flow (request → accept/decline → active → returned)
- Real-time status updates (Supabase Realtime)
- Push notifications for borrow events
- Activity feed (real-time)
- **Deliverable:** Full borrow/lend lifecycle works between users

### Phase 6: Wishlist + Price Tracking (Zizo + Sonny)
- Wishlist CRUD
- Savings goal UI (progress bar, target date)
- Price tracking scheduled jobs (eBay API)
- Price drop notifications
- AI similar item suggestions
- **Deliverable:** User can create wishlists, track savings, get price alerts

### Phase 7: Polish (Muaath + Vlad + Nigel)
- Haptics across all interactions
- Dark mode
- Face ID app lock
- Live Activities (borrow countdown)
- Skeleton loaders, animations
- Full QA pass (Vlad)
- Architecture review (Nigel)
- **Deliverable:** Production-ready app, fully tested locally

## Design Direction
- **Reference:** Apple Design Award aesthetic — clean, minimal, premium, generous whitespace
- **Muaath** to propose 2-3 visual direction options (color palette, typography, component style) using the `claude-design`, `sketch`, and `popular-web-designs` skills
- Nasser will review and choose the direction before Phase 3 UI work begins
- Dark mode mandatory from day one

## Admin Role
- Nasser's wife is the circle admin
- Admin can: generate invite codes, remove members, edit circle settings
- Members can: manage their own inventory, borrow/lend, wishlist, view circle

## Item Categories (to be refined)
Start with these, expand based on luxury store research:
- Handbags, Jewelry, Shoes, Watches, Clothing, Accessories
- Muaath/Nigel to research full category taxonomy from luxury retailers (Chanel, Hermès, Net-a-Porter, FarFetch, SSENSE, etc.) and propose the final list

## Currency
- AED only — if item is priced in another currency (USD, EUR, etc.), auto-convert to AED at entry
- Exchange rates via free API (exchangerate-api.com or similar) cached daily

## Creative Features (to explore, filter, and prioritize)

These are ideas beyond the core brief. The team should evaluate each for viability, effort, and value, then propose which to include vs defer.

### AI-Powered
- **Outfit matching:** User photographs an outfit → AI suggests which item from the circle's inventory would complete the look
- **Collection insights:** AI analyzes your inventory and suggests gaps ("You have 4 black bags but no evening clutch")
- **Authenticity check:** Photo → AI flags potential counterfeit indicators (stitching, hardware, logo placement) — not definitive, but a helpful hint
- **Smart valuation:** AI estimates current market value based on condition, age, rarity, and recent resale data
- **Style profile:** AI builds a taste profile per user — "Classic Luxury," "Bold Statement," etc. — used for suggestions
- **Photo quality enhancement:** Auto-crop, background removal, color correction on item photos so the inventory looks editorial

### Social / Circle
- **"Who wore it best":** Fun feature — if two members own the same item, the circle can vote on styling
- **Gift registry:** Members can mark wishlist items as "gift ideas for [member]" — visible only to the admin (wife)
- **Lending history score:** Each member has a "reliability score" based on return timeliness — visible to all, encourages responsible borrowing
- **Item genealogy:** Track the full history of an item — who owned it, who borrowed it, when. Like provenance for art
- **Circle challenges:** "Wear your most underused bag this week" — gamified engagement
- **Shared wishlist:** Circle-wide wishlist for group gifts (e.g., everyone chips in for someone's birthday)

### Inventory Management
- **Wardrobe calendar:** Schedule when you plan to wear/carry specific items — prevents overuse of favorites
- **Cost-per-wear tracking:** Automatically calculate CPW based on purchase price and usage log — shows real value of items
- **Insurance documentation:** Export a PDF inventory with photos, valuations, and receipts for insurance purposes
- **Maintenance reminders:** "Time to re-sole your Louboutins" — AI suggests maintenance schedules per item type
- **Seasonal rotation:** AI suggests which items to bring out / store based on season and usage patterns
- **Duplicate detection:** "You already own a similar Balenciaga City in black — are you sure?"

### Discovery / Shopping
- **"Find similar" in circle:** See a friend's bag → tap → AI finds similar items across price points
- **Price drop alerts:** Wishlist items monitored across eBay, Vestiaire, Chrono24 — push notification when price drops below target
- **Restock alerts:** Discontinued item you want? AI monitors resale platforms for new listings
- **Investment tracker:** Track which items appreciate vs depreciate — "Your Hermès Birkin is up 12% this year"
- **Trend forecasting:** AI identifies trending items in the circle's categories — "Quilted bags are trending, your Chanel Classic is well-positioned"

### Utility
- **Offline mode:** Full inventory access offline — syncs when online. Critical for travel
- **Export/import:** CSV/PDF export of inventory, JSON import from other apps
- **Multi-circle support:** One user can be in multiple circles (family, friends, work)
- **Item QR codes:** Generate a QR label for physical items — scan to see lending history
- **Apple Wallet integration:** Add high-value item "cards" to Apple Wallet for insurance/travel


## Research References
- `~/Projects/personal/tresor/research/luxury-inventory-tech-stack-research.md` — full tech stack analysis
- `~/Projects/personal/tresor/research/luxury-recognition-app-research.md` — AI capabilities analysis
- `~/Projects/personal/tresor/research/luxury-inventory-app-ux-research.md` — UI/UX patterns
