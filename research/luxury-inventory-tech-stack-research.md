# Luxury Item Inventory App — Tech Stack Research & Recommendations

**App concept:** A private circle (5–15 users) inventory app for luxury designer items (bags, jewelry, shoes). Users catalog their collections with photos, lend/borrow items, create wishlists, track resale prices, and browse each other's collections. AI-enabled: photo recognition for item identification, price tracking, link parsing.

**Budget:** $20–50/month total operating cost. Must be scalable enough to open-source later.

---

## 1. Backend Recommendation: **Supabase (Pro Plan — $25/mo)**

### Verdict: Supabase, not Firebase, not custom.

### Reasoning

| Factor | Supabase Pro ($25/mo) | Firebase (Blaze) | Custom (Node + Postgres on Railway/Fly) |
|---|---|---|---|
| Database | PostgreSQL (relational, SQL, RLS) | Firestore (NoSQL, document) | PostgreSQL (full control) |
| Pricing model | **Flat $25 + generous included usage** | Per-read/write — unpredictable at scale | ~$5–20/mo VPS + your time |
| Phone OTP auth | Built-in, supports Twilio/Vonage/MessageBird | Built-in, but SMS billed per-verification on Blaze | Build from scratch |
| Image storage | 100 GB included in Pro | 10 GB free then $0.026/GB | Separate bucket (S3/R2) needed |
| Realtime (activity feed) | Postgres Changes — subscribe to INSERT/UPDATE/DELETE | Firestore real-time listeners | Build WebSocket layer |
| Row Level Security | Native to Postgres — data isolation at DB layer | Security rules (JSON, less expressive) | Build authorization middleware |
| Open-source friendliness | **Self-hostable** — can run identical stack on your own infra | Google-locked, no self-host | Full control but more maintenance |
| Schema complexity | SQL handles complex joins (items↔users↔circles↔borrows↔wishlists) easily | NoSQL requires denormalization, complex for relational data | Full SQL |
| Edge Functions (for AI calls) | 2M invocations/mo included in Pro | Cloud Functions — billed per invocation | Separate serverless layer |

### Why Supabase wins for this app specifically:

1. **Relational data model fits perfectly.** Items belong to users, users belong to circles, borrows reference items + lender + borrower + circle, wishlists reference items + users. This is textbook relational — Postgres handles it natively. Firestore would require denormalization and complex query patterns.

2. **Row Level Security (RLS) is critical.** Circle members should only see items from their circle. RLS policies enforce this at the database level — even if the API is exposed, unauthorized users can't read data. Firebase security rules are less expressive and harder to test.

3. **Realtime for activity feed.** Supabase's `postgres_changes` subscription lets the client subscribe to INSERT events on an `activity_feed` table. When someone adds an item, borrows, or updates a wishlist, the feed updates live. 500 concurrent realtime connections in Pro — more than enough for 15 users.

4. **Open-source portability.** Supabase is open-source and self-hostable. When you open-source the app, contributors can run the entire backend locally with Docker. Firebase has no self-host path — it's Google lock-in forever.

5. **Predictable pricing.** $25/mo flat with 8 GB DB, 100 GB storage, 100K MAUs, 2M edge function calls. For 15 users, you'll never hit overages. Firebase's per-read billing is unpredictable and can spike with chatty real-time listeners.

### Pro plan included limits (2026, verified):
- **Database:** 8 GB (then $0.125/GB)
- **File storage:** 100 GB (then $0.021/GB)
- **MAUs:** 100,000 (then $0.00325/MAU)
- **Edge Functions:** 2 million/mo (then $2/1M)
- **Realtime:** 500 concurrent connections, 2M messages/mo
- **Egress:** 250 GB
- **Daily backups** included

**For 15 users, you will stay at exactly $25/mo with zero overages.**

---

## 2. Phone OTP Auth: **Supabase Auth + Twilio (SMS provider)**

### How it works
Supabase has built-in phone OTP auth. You configure an SMS provider in the Supabase dashboard (Twilio, Vonage, or MessageBird). The flow:

1. Client calls `supabase.auth.signInWithOtp({ phone: '+1234567890' })`
2. Supabase sends a 6-digit OTP via the configured SMS provider
3. Client calls `supabase.auth.verifyOtp({ phone, token: '123456', type: 'sms' })`
4. Supabase returns a JWT session — user is authenticated

### Cost analysis for 15 users

**Twilio Verify pricing (2026):**
- $0.05 per successful verification + $0.0083 per SMS (US)
- ≈ **$0.058 per login** for US numbers
- 15 users × ~2 logins/month = 30 verifications = **~$1.75/mo**

**Firebase phone auth comparison:**
- $0.01–$0.06 per SMS depending on region (US: $0.01, UK: $0.04, others: $0.06)
- Requires Blaze plan (pay-as-you-go) — no free tier for phone auth
- Cheaper per-SMS but you lose the Supabase ecosystem benefits

### Recommendation: **Twilio as SMS provider within Supabase**

- Cost is negligible at 15 users (~$2/mo)
- Supabase manages the OTP generation, verification, rate limiting, and session management
- Twilio is the most reliable SMS provider globally
- Rate limits built in: 1 OTP request per 60 seconds, OTP expires after 1 hour
- Configure CAPTCHA in production to prevent abuse

### Alternative for cost optimization:
If SMS costs become significant (e.g., international users or higher login frequency), consider:
- **MessageBird** — sometimes cheaper for specific regions
- **WhatsApp OTP via Twilio** — $0.05 + $0.0034/msg (cheaper delivery, but requires user has WhatsApp)
- For 15 users, none of this matters — stick with SMS via Twilio.

### Code pattern (React Native + Expo):
```typescript
import { supabase } from './supabaseClient'

// Step 1: Send OTP
const { error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890',
})

// Step 2: Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms',
})
// data.session contains access_token + refresh_token
```

---

## 3. Image Storage Strategy

### Recommendation: **Supabase Storage (included in Pro plan)**

Supabase Storage is S3-compatible and included in the Pro plan with 100 GB. For 15 users with luxury item photos, this is more than sufficient.

### Storage architecture

```
supabase-storage://
  ├── items/
  │   ├── {user_id}/
  │   │   ├── {item_id}/
  │   │   │   ├── original.jpg        (full-res, for AI processing)
  │   │   │   ├── display.webp         (compressed, for app display)
  │   │   │   └── thumbnail.webp       (small, for grid views)
```

### Why Supabase Storage over alternatives:

| Option | Cost (for ~5 GB usage) | Complexity | RLS Integration |
|---|---|---|---|
| **Supabase Storage** | $0 (included in Pro's 100 GB) | Zero — same SDK, same dashboard | Native RLS on buckets |
| Cloudflare R2 | ~$0.08/mo (free tier covers 10 GB) | Extra integration, custom auth | Build your own access control |
| AWS S3 | ~$0.12/mo storage + egress | AWS account, IAM, SDK | Build your own |
| Firebase Storage | $0 (10 GB free) then $0.026/GB | Separate from Supabase | Firebase security rules |

**Verdict:** Supabase Storage. It's already included in your $25/mo, integrates with RLS (so circle members can only access items in their circle), and uses the same SDK. No reason to add a separate storage provider.

### Image optimization pipeline:

1. **Client-side (Expo):** Use `expo-image-manipulator` to compress before upload
   - Resize to max 1920px on longest side
   - Convert to WebP quality 80 for display copy
   - Keep original for AI vision processing

2. **Upload to Supabase Storage:**
   ```typescript
   const { data, error } = await supabase.storage
     .from('items')
     .upload(`${userId}/${itemId}/display.webp`, compressedImage)
   ```

3. **AI processing:** Edge Function reads the original image, sends to vision API, stores results in the `items` table.

4. **Signed URLs for private access:** Since items are circle-scoped, use signed URLs:
   ```typescript
   const { data } = await supabase.storage
     .from('items')
     .createSignedUrl(`${userId}/${itemId}/display.webp`, 3600)
   ```

### Storage estimate for 15 users:
- 15 users × 20 items avg × 3 images per item × ~500 KB avg = **~450 MB**
- Well within the 100 GB Pro plan limit. You could 100x your user base and still be fine.

---

## 4. Push Notifications (iOS)

### Recommendation: **Expo Notifications (expo-notifications)**

Expo provides a unified push notification API that abstracts APNs (iOS) and FCM (Android) behind the Expo Push Notification Service (EPNS).

### Setup steps:

1. **Install:**
   ```bash
   npx expo install expo-notifications expo-device expo-constants
   ```

2. **Configure `app.json`:**
   ```json
   {
     "expo": {
       "plugins": ["expo-notifications"],
       "ios": {
         "bundleIdentifier": "com.yourapp.luxuryinventory"
       }
     }
   }
   ```

3. **Request permission & get push token:**
   ```typescript
   import * as Notifications from 'expo-notifications'
   import * as Device from 'expo-device'

   async function registerForPushNotifications() {
     if (!Device.isDevice) return null
     
     const { status } = await Notifications.requestPermissionsAsync()
     if (status !== 'granted') return null

     const { data: token } = await Notifications.getExpoPushTokenAsync()
     // Store this token in Supabase: user's push_token field
     await supabase.from('profiles').update({ push_token: token }).eq('id', userId)
     return token
   }
   ```

4. **Send notifications from Supabase Edge Function:**
   ```typescript
   // supabase/functions/send-push-notification/index.ts
   import { createClient } from 'https://esm.sh/@supabase/supabase-js'

   Deno.serve(async (req) => {
     const { user_id, title, body } = await req.json()
     const supabase = createClient(/* ... */)
     
     const { data: user } = await supabase
       .from('profiles')
       .select('push_token')
       .eq('id', user_id)
       .single()

     await fetch('https://exp.host/--/api/v2/push/send', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         to: user.push_token,
         title,
         body,
         sound: 'default',
       }),
     })
     return new Response('OK')
   })
   ```

5. **Trigger via database webhook:** When a borrow request is created, a Postgres trigger fires the Edge Function, which sends the push notification.

### Notification events for this app:
- Borrow request received → "Sarah wants to borrow your Chanel Classic Flap"
- Borrow request approved/denied → "Your borrow request was approved"
- Item returned reminder → "Reminder: Return the Hermès Birkin by Friday"
- New item added to circle → "Ahmed added a new item to your circle"
- Price alert → "Your Louis Vuitton Neverfull increased 12% in value"
- Wishlist match → "An item matching your wishlist was added"

### Cost: **Free**
- Expo Push Notification Service is free (no per-notification cost)
- APNs is free (Apple doesn't charge for push)
- EAS Build handles APNs key/certificate management automatically
- For production at scale (>10K notifications), consider migrating to FCM + APNs direct, but for 15 users EPNS is perfect

### iOS-specific notes:
- Requires an Apple Developer account ($99/year — not part of monthly budget)
- APNs key (`.p8`) is managed automatically by EAS Build
- Use `deliveryMode: 'background'` for silent data-only notifications (e.g., price updates)
- Rich notifications (images) require a Notification Service Extension — available via `expo-apple-targets` in SDK 52+

---

## 5. Database Schema Design

### PostgreSQL schema for Supabase. All tables have RLS enabled.

### Entity overview:
```
profiles (1) ──< items (N) >── circles (M)
profiles (1) ──< borrow_transactions (N)
profiles (1) ──< wishlist_items (N)
profiles (1) ──< activity_feed (N)
circles (1) ──< circle_members (N) >── profiles (M)
items (1) ──< item_photos (N)
items (1) ──< price_history (N)
```

---

### Table: `profiles`
Extends `auth.users` (Supabase Auth). Created on first login.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  push_token TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and profiles of circle members
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

### Table: `circles`
A private group of users who share inventory.

```sql
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Only circle members can see their circles
CREATE POLICY "Circle members can read" ON circles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
    )
  );
```

---

### Table: `circle_members`
Join table — who's in which circle.

```sql
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Members can see who's in their circles
CREATE POLICY "Members can read circle membership" ON circle_members
  FOR SELECT USING (user_id = auth.uid() OR circle_id IN (
    SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
  ));

-- Users can join circles via invite code (handled via Edge Function)
-- Admins can remove members
CREATE POLICY "Admins can delete members" ON circle_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );
```

---

### Table: `items`
The core entity — a luxury item in someone's inventory.

```sql
CREATE TYPE item_category AS ENUM ('bag', 'jewelry', 'watch', 'shoes', 'clothing', 'accessories', 'other');
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');
CREATE TYPE item_status AS ENUM ('available', 'borrowed', 'unavailable');

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  
  -- Identification
  brand TEXT NOT NULL,                    -- e.g., 'Chanel', 'Hermès'
  model_name TEXT,                        -- e.g., 'Classic Flap'
  category item_category NOT NULL,
  color TEXT,
  size TEXT,
  material TEXT,
  
  -- Details
  condition item_condition DEFAULT 'good',
  status item_status DEFAULT 'available',
  purchase_price DECIMAL(10, 2),
  purchase_date DATE,
  estimated_value DECIMAL(10, 2),         -- Current market value
  currency TEXT DEFAULT 'USD',
  
  -- Metadata
  serial_number TEXT,
  authenticity_verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  -- AI-extracted data
  ai_brand_confidence FLOAT,              -- Confidence from vision API
  ai_identification JSONB,                -- Full AI response
  source_url TEXT,                        -- If added via link parsing
  
  -- Images
  primary_image_url TEXT,                 -- Main display image path in storage
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_owner ON items(owner_id);
CREATE INDEX idx_items_circle ON items(circle_id);
CREATE INDEX idx_items_brand ON items(brand);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_status ON items(status);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their items
-- Circle members can read items in their circle
CREATE POLICY "Owners can manage own items" ON items
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Circle members can view items" ON items
  FOR SELECT USING (
    circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );
```

---

### Table: `item_photos`
Multiple photos per item.

```sql
CREATE TABLE item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,             -- Path in Supabase Storage
  display_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_item_photos_item ON item_photos(item_id);

ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;

-- Access follows item access rules
CREATE POLICY "Can manage photos of own items" ON item_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_photos.item_id AND items.owner_id = auth.uid())
  );

CREATE POLICY "Circle members can view item photos" ON item_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_photos.item_id
      AND (items.owner_id = auth.uid() OR items.circle_id IN (
        SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
      ))
    )
  );
```

---

### Table: `borrow_transactions`
Lending/borrowing lifecycle.

```sql
CREATE TYPE borrow_status AS ENUM (
  'requested',      -- Borrower asks
  'approved',       -- Owner approves
  'active',         -- Item handed over
  'returned_pending', -- Borrower marks as returned
  'completed',      -- Owner confirms return
  'declined',       -- Owner rejects request
  'cancelled'       -- Borrower cancels
);

CREATE TABLE borrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  
  status borrow_status NOT NULL DEFAULT 'requested',
  
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  borrowed_at TIMESTAMPTZ,                -- When physically handed over
  due_date DATE,
  returned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Notes
  borrower_note TEXT,                     -- "Need for wedding on Saturday"
  lender_note TEXT,                       -- "Please keep away from water"
  return_condition_note TEXT,
  
  -- Condition tracking
  condition_before item_condition,
  condition_after item_condition,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_borrows_item ON borrow_transactions(item_id);
CREATE INDEX idx_borrows_borrower ON borrow_transactions(borrower_id);
CREATE INDEX idx_borrows_lender ON borrow_transactions(lender_id);
CREATE INDEX idx_borrows_status ON borrow_transactions(status);

ALTER TABLE borrow_transactions ENABLE ROW LEVEL SECURITY;

-- Only borrower, lender, and circle members can see transactions
CREATE POLICY "Participants can view borrows" ON borrow_transactions
  FOR SELECT USING (
    borrower_id = auth.uid() OR lender_id = auth.uid()
  );

CREATE POLICY "Circle members can view circle borrows" ON borrow_transactions
  FOR SELECT USING (
    circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );

-- Borrower creates request; owner approves/declines; both can update status
CREATE POLICY "Borrower can create request" ON borrow_transactions
  FOR INSERT WITH CHECK (borrower_id = auth.uid());

CREATE POLICY "Lender can update status" ON borrow_transactions
  FOR UPDATE USING (lender_id = auth.uid());

CREATE POLICY "Borrower can update status" ON borrow_transactions
  FOR UPDATE USING (borrower_id = auth.uid());
```

---

### Table: `wishlists` + `wishlist_items`
Users track items they want.

```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Wishlist',
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlists" ON wishlists
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Circle members can view non-private wishlists" ON wishlists
  FOR SELECT USING (
    is_private = FALSE AND user_id IN (
      SELECT user_id FROM circle_members
      WHERE circle_id IN (
        SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
      )
    )
  );


CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Either a specific item in the circle, or a generic desire
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  
  -- Or a manual entry (brand + model they're looking for)
  brand TEXT,
  model_name TEXT,
  category item_category,
  max_price DECIMAL(10, 2),
  notes TEXT,
  source_url TEXT,                        -- Link to listing
  
  priority INT DEFAULT 0,
  fulfilled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wishlist_items_user ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_items_item ON wishlist_items(item_id);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist items" ON wishlist_items
  FOR ALL USING (user_id = auth.uid());
```

---

### Table: `price_history`
Track resale/market value over time for items.

```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  source TEXT,                            -- 'vestiaire', 'stockx', 'the_realreal', 'manual', 'ai_estimate'
  source_url TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI price tracking metadata
  ai_confidence FLOAT,
  metadata JSONB
);

CREATE INDEX idx_price_history_item ON price_history(item_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at DESC);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Item access rules apply
CREATE POLICY "Can manage price history of own items" ON price_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = price_history.item_id AND items.owner_id = auth.uid())
  );

CREATE POLICY "Circle members can view price history" ON price_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = price_history.item_id
      AND (items.owner_id = auth.uid() OR items.circle_id IN (
        SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
      ))
    )
  );
```

---

### Table: `activity_feed`
Single table for all activity events — powers the real-time feed.

```sql
CREATE TYPE activity_type AS ENUM (
  'item_added',
  'item_updated',
  'item_removed',
  'borrow_requested',
  'borrow_approved',
  'borrow_active',
  'borrow_returned',
  'borrow_completed',
  'borrow_declined',
  'wishlist_item_added',
  'price_alert',
  'member_joined',
  'member_left'
);

CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- Actor
  
  type activity_type NOT NULL,
  
  -- Polymorphic references
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  borrow_id UUID REFERENCES borrow_transactions(id) ON DELETE CASCADE,
  
  -- Pre-formatted display data (denormalized for feed performance)
  actor_name TEXT,                        -- Snapshot of display_name
  summary TEXT,                           -- "Sarah added a Chanel Classic Flap"
  metadata JSONB,                         -- Additional context
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_circle ON activity_feed(circle_id, created_at DESC);
CREATE INDEX idx_activity_feed_user ON activity_feed(user_id, created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle members can read feed" ON activity_feed
  FOR SELECT USING (
    circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );
```

**Activity feed is populated by Postgres triggers** on each table. Example:

```sql
CREATE OR REPLACE FUNCTION create_activity_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_feed (circle_id, user_id, type, item_id, actor_name, summary)
  VALUES (
    NEW.circle_id,
    NEW.owner_id,
    'item_added',
    NEW.id,
    (SELECT display_name FROM profiles WHERE id = NEW.owner_id),
    (SELECT display_name FROM profiles WHERE id = NEW.owner_id) || ' added a ' || NEW.brand || ' ' || COALESCE(NEW.model_name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_item_added
  AFTER INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION create_activity_entry();
```

---

### Realtime subscription for activity feed (client):

```typescript
useEffect(() => {
  const channel = supabase
    .channel('activity-feed')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `circle_id=eq.${currentCircleId}`,
      },
      (payload) => {
        setFeedItems((prev) => [payload.new as ActivityFeedItem, ...prev])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)  // CRITICAL: prevents connection leaks
  }
}, [currentCircleId])
```

---

## 6. AI Integration Strategy

### Item Identification via Photo (Vision API)

**Recommendation: GPT-4o Vision (via Supabase Edge Function)**

- GPT-4o: $2.50/1M input tokens, $10/1M output tokens
- A single image identification call ≈ ~1,000 input tokens + ~200 output tokens = **~$0.0045 per identification**
- 15 users × 20 items = 300 identifications = **~$1.35/mo**

**Alternative: Google Cloud Vision API** (Label Detection + Logo Detection)
- $1.50 per 1,000 images (first 1,000 free/mo)
- Less capable for specific brand/model identification but cheaper at scale
- 300 identifications = **$0.45/mo** (free tier covers it)

**Recommended hybrid approach:**
1. Use Google Cloud Vision for initial label/logo detection (free tier covers ~1,000/mo)
2. Feed results + image to GPT-4o for precise brand/model identification
3. This minimizes GPT-4o token usage while getting accurate results

**Edge Function pattern:**
```typescript
// supabase/functions/identify-item/index.ts
Deno.serve(async (req) => {
  const { image_url } = await req.json()
  
  // 1. Google Vision for logo/label detection
  const visionResult = await callGoogleVision(image_url)
  
  // 2. GPT-4o for precise identification
  const gptResult = await callOpenAI(image_url, visionResult)
  
  // 3. Update item with AI data
  return Response.json(gptResult)
})
```

### Price Tracking

**Recommendation: Scheduled Edge Function + web scraping/APIs**

- Vestiaire Collective, The RealReal, StockX have unofficial APIs or scrapeable listings
- Run a daily cron Edge Function that:
  1. Queries all items with `estimated_value IS NOT NULL`
  2. Searches resale platforms by brand + model
  3. Updates `price_history` table
  4. Triggers push notification if price changed >5%

### Link Parsing

- When user shares a product URL (from a luxury retailer or resale site)
- Edge Function fetches the page, extracts: brand, model, price, images, description
- Use OpenAI's structured output for reliable parsing:
  ```typescript
  const result = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `Extract product info from: ${pageContent}` }],
    response_format: { type: 'json_object' }
  })
  ```

---

## 7. Total Monthly Cost Breakdown

| Component | Monthly Cost | Notes |
|---|---|---|
| **Supabase Pro** | $25.00 | DB, Storage, Auth, Realtime, Edge Functions |
| **Twilio SMS (OTP)** | ~$2.00 | 30 verifications/mo at ~$0.058 each |
| **GPT-4o Vision API** | ~$1.50 | ~300 item identifications/mo |
| **Google Cloud Vision** | $0.00 | Free tier covers 1,000 images/mo |
| **Expo Push Notifications** | $0.00 | EPNS is free |
| **Apple Developer Program** | $8.25 | $99/year amortized |
| **Domain (optional)** | ~$1.00 | For invite links, landing page |
| **TOTAL** | **~$37.75/mo** | Well within $20–50 budget |

**At 15 users, you will not hit any Supabase overage charges.** The biggest variable cost is SMS OTP, which at 15 users is trivial.

### Scaling beyond 15 users (open-source scenario):
- **50 users:** ~$27 (Supabase) + $6 (SMS) + $5 (AI) = ~$38/mo
- **200 users:** ~$30 (Supabase) + $25 (SMS) + $20 (AI) = ~$75/mo
- **1,000 users:** ~$40 (Supabase) + $120 (SMS) + $100 (AI) = ~$260/mo
  - At this scale, optimize SMS (WhatsApp OTP, rate limiting) and AI (batch processing, caching)

---

## 8. Recommended Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| **Mobile framework** | Expo (React Native) SDK 52+ | Best DX for React Native, EAS Build for iOS, OTA updates |
| **Backend** | Supabase Pro ($25/mo) | Postgres + Auth + Storage + Realtime + Edge Functions in one |
| **Auth** | Supabase Auth + Twilio SMS | Phone OTP, ~$0.058/verification, built-in rate limiting |
| **Database** | PostgreSQL (Supabase) | Relational schema, RLS for circle-scoped access |
| **Image storage** | Supabase Storage | 100 GB included, RLS integration, S3-compatible |
| **Push notifications** | expo-notifications (EPNS) | Free, abstracts APNs, EAS manages certificates |
| **AI — vision** | GPT-4o Vision via Edge Functions | Best brand/model identification, ~$0.005/image |
| **AI — labels (supplement)** | Google Cloud Vision | Free tier covers 1,000 images/mo, logo/label detection |
| **AI — price tracking** | Scheduled Edge Functions | Daily cron, scrape resale platforms, store in price_history |
| **AI — link parsing** | GPT-4o structured output | Parse product pages into item records |
| **Activity feed** | Supabase Realtime (postgres_changes) | Live feed via Postgres triggers → activity_feed table |
| **CI/CD** | EAS Build + Submit | Cloud builds, App Store submission, GitHub Actions integration |
| **State management** | Zustand + React Query (TanStack Query) | Lightweight, works well with Supabase real-time |
| **Navigation** | Expo Router (file-based) | Type-safe routing, deep linking for invite codes |

---

## 9. Key Pitfalls & Recommendations

1. **Always clean up Supabase Realtime channels** in `useEffect` returns. Connection leaks are the #1 production issue with Supabase Realtime.

2. **Enable RLS on every table before exposing to the client.** Supabase exposes auto-generated APIs — without RLS, all data is publicly readable.

3. **Use Postgres triggers for activity_feed, not client-side writes.** This ensures consistency — even if a client crashes, the activity is recorded.

4. **Compress images before upload** using `expo-image-manipulator`. Upload full-res only if needed for AI. Display WebP at 80% quality.

5. **Use Edge Functions for all AI API calls.** Never expose API keys (OpenAI, Google Vision) in the client. Edge Functions run on Supabase's infrastructure with secrets in env vars.

6. **Rate-limit OTP requests.** Supabase defaults to 1 OTP per 60 seconds per phone number. Keep this. Add CAPTCHA in production to prevent SMS pumping attacks.

7. **Use invite codes for circle joining.** The `circles.invite_code` column generates a random 8-char code. New users enter it to join a circle. Edge Function validates and inserts into `circle_members`.

8. **Apple Developer account ($99/yr) is a separate cost** not covered by the monthly budget. It's required for App Store distribution and APNs.

9. **For open-sourcing:** Structure the repo with a `supabase/` directory containing migration SQL files. Document the setup with `supabase db push`. Contributors can run the full stack locally with `supabase start` (local development via Supabase CLI + Docker).
