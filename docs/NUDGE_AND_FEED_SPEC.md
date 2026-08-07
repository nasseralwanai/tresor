# Trésor — Nudge Borrower & Circle Feed Redesign Spec

**Author:** Nigel (System Architect)
**Status:** DRAFT — for Nasser's approval before implementation
**Date:** 2026-08-07

---

## Table of Contents

**Part I: Nudge Borrower**
1. [Feature Overview](#1-feature-overview)
2. [Notification Strategy](#2-notification-strategy)
3. [Rate Limiting & Cooldown](#3-rate-limiting--cooldown)
4. [Tone & Copy Guidelines](#4-tone--copy-guidelines)
5. [Database Changes](#5-database-changes)
6. [Push Notification Infrastructure](#6-push-notification-infrastructure)
7. [API Functions](#7-api-functions)
8. [UI — Nudger (Lender)](#8-ui--nudger-lender)
9. [UI — Borrower (Nudged)](#9-ui--borrower-nudged)
10. [Edge Cases](#10-edge-cases)
11. [User Flow Diagram](#11-user-flow-diagram)

**Part II: Circle Feed Redesign**
12. [Design Philosophy](#12-design-philosophy)
13. [Feed Architecture](#13-feed-architecture)
14. [Feed Sections](#14-feed-sections)
15. [Activity Type Routing](#15-activity-type-routing)
16. [Social Interactions](#16-social-interactions)
17. [Filtering & Sorting](#17-filtering--sorting)
18. [Database Changes](#18-database-changes)
19. [API Functions](#19-api-functions)
20. [UI Wireframes](#20-ui-wireframes)
21. [Implementation Phasing](#21-implementation-phasing)

**Sources**

---

# Part I: Nudge Borrower

## 1. Feature Overview

The nudge feature lets a lender gently remind a borrower that an item is still out. Currently a stub (`nudgeBorrower()` in `src/lib/borrow.ts` is a no-op; `active.tsx` shows a "Coming Soon" alert). This spec designs the full feature.

**Design principle:** This is a luxury circle, not debt collection. The nudge is a courtesy tap on the shoulder — the digital equivalent of "Hey, whenever you get a chance." It should never feel aggressive, automated, or transactional.

**Core behavior:**
- Lender taps "Nudge [borrower]" on the active borrow card
- Borrower receives **both** an in-app notification (persistent, visible in notification center) and a push notification (if permissions granted and app is backgrounded)
- Rate limiting prevents abuse: max 1 nudge per 24 hours per borrow, max 3 per borrow lifetime
- Lender sees confirmation + when they last nudged + cooldown state
- Borrower sees a gentle banner with item context + quick action to mark returned

## 2. Notification Strategy

### 2.1 Dual-channel: in-app + push

Both channels fire simultaneously. This follows the principle that **push notifications bring users back, while in-app notifications provide context when they're already engaged** ([Appcues](https://www.appcues.com/blog/in-app-notifications); [AnnounceKit](https://announcekit.app/blog/in-app-notifications-vs-push-notifications)). The key is assigning each channel a clear role rather than duplicating messages blindly.

| Channel | Role | When it fires | Persistence |
|---------|------|---------------|-------------|
| **Push** | Re-engagement — brings borrower back to the app | App backgrounded or closed + push permission granted | Ephemeral (dismissed on tap) |
| **In-app** | Contextual — shows in notification center + active borrow screen | Always (regardless of push permission) | Persistent (stored in DB, marked read/unread) |

**Why both:** If the borrower has the app open, the push is silently dropped by iOS (a push to a foregrounded app doesn't display a banner unless explicitly handled). The in-app notification ensures the message is always delivered. If the app is closed, the push wakes them; tapping it opens the app and the in-app notification is already there with full context.

Per [Courier's notification center guide](https://www.courier.com/guides/how-to-build-a-notification-center/chapter-3-best-practices-for-notification-centers): "Match format to urgency." A nudge is low-urgency but time-relevant — push is appropriate, but should not be aggressive (no sound, gentle title).

### 2.2 Push notification payload

```json
{
  "to": "<expo_push_token>",
  "title": "Sarah sent a gentle reminder",
  "body": "Your Chanel Classic Flap has been borrowed for 2 weeks. No rush — return it when you can.",
  "data": {
    "type": "borrow_nudge",
    "borrow_id": "<uuid>",
    "item_brand": "Chanel",
    "item_model": "Classic Flap",
    "lender_name": "Sarah"
  },
  "sound": "default",
  "priority": "default",
  "channelId": "nudges"
}
```

**Push settings:**
- **Sound:** `default` but quiet — iOS allows custom sounds; we should use a soft, short tone, not the default aggressive tri-tone. A custom `.caf` file (e.g., `gentle_tap.caf`) at low volume. This matches the luxury aesthetic.
- **Priority:** `default` (not `high`). Nudges are not urgent alerts.
- **Channel (Android):** `nudges` channel with low importance level.
- **Badge:** Do not increment app badge for nudges. Badge should be reserved for actionable items (borrow requests, etc.).

### 2.3 In-app notification

The in-app notification is stored in the new `notifications` table (see [§5](#5-database-changes)) and surfaced via:
1. A notification bell icon badge on the tab bar (unread count)
2. A notification center screen (accessible from the bell)
3. A contextual banner on the active borrow screen when the borrower opens it

## 3. Rate Limiting & Cooldown

### 3.1 Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| **Cooldown between nudges** | 24 hours | Prevents harassment; gives borrower a fair window to respond |
| **Max nudges per borrow** | 3 | A borrow shouldn't need more than 3 reminders; if it does, it's a conversation, not a nudge |
| **Max nudges per lender per day** | 5 | Prevents a lender from machine-gunning nudges across multiple borrows |
| **First nudge eligibility** | 48 hours after `borrowed_at` | Don't nudge someone who just borrowed yesterday. Give them a grace period. |

These limits are enforced **server-side** via a Postgres function (not just client-side). Client-side checks are for UX (disable button during cooldown); server-side checks are the source of truth.

### 3.2 Cooldown UI states

The nudge button on the active borrow card cycles through these states:

| State | Condition | Button appearance |
|-------|-----------|-------------------|
| **Available** | No nudge sent yet, or cooldown expired, and under max | Enabled: "Nudge [name]" with bell icon |
| **Cooldown** | Last nudge < 24h ago | Disabled: "Nudged — next available in 18h" with clock icon, muted styling |
| **Maxed** | 3 nudges sent for this borrow | Hidden, replaced by: "You've sent all nudges. Message [name] directly." with a chat/action alternative |
| **Not yet eligible** | Borrow < 48h old | Hidden entirely (the button doesn't appear until 48h after borrow starts) |

### 3.3 Server-side enforcement (Postgres function)

```sql
-- The nudge function checks all rate limits before inserting.
-- Returns a structured result so the client can show appropriate UX.
```

See [§5.3](#53-nudge_borrower-function) for the full function.

## 4. Tone & Copy Guidelines

### 4.1 Voice

The nudge is **warm, specific, and consequence-free**. It should read like a text from a friend, not a system alert.

**Do:**
- Use the lender's first name ("Sarah sent a gentle reminder")
- Include the item name for context ("Your Chanel Classic Flap...")
- Acknowledge the duration without judgment ("...has been with you for 2 weeks")
- End with an out ("No rush — return it when you can")

**Don't:**
- Use words like "overdue," "late," "return immediately," "urgent," "reminder" (too clinical)
- Show the exact number of days in a threatening way ("23 days overdue")
- Imply consequences
- Use exclamation marks
- Use emoji (design rule: SVG/CSS only)

### 4.2 Copy templates

**Push notification title:**
```
{lender_first_name} sent a gentle reminder
```

**Push notification body (varies by duration):**
```
// < 1 week (shouldn't happen due to 48h grace, but safety net)
"Your {brand} {model} is still with you. Return it whenever you're ready."

// 1-2 weeks
"Your {brand} {model} has been borrowed for {duration}. No rush — return it when you can."

// 2-4 weeks
"Whenever you get a chance, your {brand} {model} can come back to the circle."

// 4+ weeks
"Your {brand} {model} has been out for a while. Would you like to return it soon?"
```

**In-app notification (notification center):**
```
Title: {lender_name} nudged you about {brand} {model}
Body:  "Your {brand} {model} has been borrowed for {duration}. No rush — return it when you can."
Action: [Mark as Returned]  [View Item]
```

**Lender confirmation toast (after nudging):**
```
"Nudge sent to {borrower_name}. They'll see it next time they open Trésor."
```

## 5. Database Changes

### 5.1 New table: `notifications`

Stores all in-app notifications (nudges and future notification types). This is a general-purpose notification table, not nudge-specific — the redesigned feed and future features will also use it.

```sql
-- Migration: 0008_notifications.sql

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  circle_id    uuid references public.circles(id) on delete cascade,
  type         text not null check (type in (
    'borrow_nudge', 'borrow_requested', 'borrow_approved',
    'borrow_returned', 'borrow_completed', 'item_shared',
    'feed_reaction', 'feed_comment', 'wishlist_shared',
    'member_joined'
  )),
  title        text not null,
  body         text,
  data         jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Indexes
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists idx_notifications_user_all
  on public.notifications (user_id, created_at desc);

-- RLS: users can only see their own notifications
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Insert is NOT allowed via RLS (with check true) for clients.
-- Notifications are inserted by the nudge function (security definer)
-- or by database triggers. This prevents users from forging notifications.
```

### 5.2 New table: `borrow_nudges`

Tracks nudge history per borrow transaction for rate limiting and auditability.

```sql
create table if not exists public.borrow_nudges (
  id              uuid primary key default gen_random_uuid(),
  borrow_id       uuid not null references public.borrow_transactions(id) on delete cascade,
  lender_id       uuid not null references public.profiles(id) on delete cascade,
  borrower_id     uuid not null references public.profiles(id) on delete cascade,
  message_variant text not null default 'standard',
  nudged_at       timestamptz not null default now()
);

create index if not exists idx_nudges_borrow
  on public.borrow_nudges (borrow_id, nudged_at desc);

create index if not exists idx_nudges_lender_date
  on public.borrow_nudges (lender_id, nudged_at desc);

-- RLS: both lender and borrower can see nudge history for a borrow
alter table public.borrow_nudges enable row level security;

create policy "nudges_select_parties"
  on public.borrow_nudges for select
  using (
    lender_id = auth.uid()
    or borrower_id = auth.uid()
  );

-- Insert is done via the nudge function (security definer), not client RLS
```

### 5.3 `nudge_borrower()` function

A Postgres function that enforces all rate limits and creates the notification atomically. Called from the Supabase Edge Function (or directly via RPC).

```sql
create or replace function public.nudge_borrower(
  _borrow_id  uuid,
  _lender_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _borrow        record;
  _borrower_name text;
  _lender_name   text;
  _item_display  text;
  _duration_text text;
  _msg_variant   text;
  _nudge_count   int;
  _lender_count  int;
  _last_nudge    timestamptz;
  _borrower_tok  text;
  _notif_id      uuid;
  _days_borrowed int;
begin
  -- 1. Load borrow record (must be active)
  select * into _borrow
  from public.borrow_transactions
  where id = _borrow_id
    and lender_id = _lender_id
    and status = 'active';

  if not found then
    return jsonb_build_object('success', false, 'error', 'borrow_not_found_or_not_active');
  end if;

  -- 2. Check 48h grace period
  _days_borrowed := extract(day from now() - coalesce(_borrow.borrowed_at, _borrow.requested_at));
  if _days_borrowed < 2 then
    return jsonb_build_object('success', false, 'error', 'grace_period_active',
      'message', 'Item was borrowed less than 48 hours ago.');
  end if;

  -- 3. Check max 3 nudges per borrow
  select count(*) into _nudge_count
  from public.borrow_nudges
  where borrow_id = _borrow_id;

  if _nudge_count >= 3 then
    return jsonb_build_object('success', false, 'error', 'max_nudges_reached');
  end if;

  -- 4. Check 24h cooldown
  select max(nudged_at) into _last_nudge
  from public.borrow_nudges
  where borrow_id = _borrow_id;

  if _last_nudge is not null and (now() - _last_nudge) < interval '24 hours' then
    return jsonb_build_object('success', false, 'error', 'cooldown_active',
      'next_available_at', _last_nudge + interval '24 hours');
  end if;

  -- 5. Check max 5 nudges per lender per day
  select count(*) into _lender_count
  from public.borrow_nudges
  where lender_id = _lender_id
    and nudged_at > now() - interval '24 hours';

  if _lender_count >= 5 then
    return jsonb_build_object('success', false, 'error', 'daily_limit_reached');
  end if;

  -- 6. Resolve names
  select coalesce(display_name, phone) into _lender_name
  from public.profiles where id = _lender_id;

  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = _borrow.borrower_id;

  -- 7. Build item display and duration
  select concat_ws(' ', brand, model_name) into _item_display
  from public.items where id = _borrow.item_id;

  _duration_text := case
    when _days_borrowed < 7 then concat(_days_borrowed, ' days')
    when _days_borrowed < 14 then '1 week'
    when _days_borrowed < 30 then concat(floor(_days_borrowed / 7.0)::int, ' weeks')
    else 'a while'
  end;

  -- 8. Select message variant based on duration
  _msg_variant := case
    when _days_borrowed < 7 then 'early'
    when _days_borrowed < 14 then 'standard'
    when _days_borrowed < 28 then 'extended'
    else 'long'
  end;

  -- 9. Insert nudge record
  insert into public.borrow_nudges (borrow_id, lender_id, borrower_id, message_variant)
  values (_borrow_id, _lender_id, _borrow.borrower_id, _msg_variant);

  -- 10. Insert in-app notification
  insert into public.notifications (user_id, circle_id, type, title, body, data)
  values (
    _borrow.borrower_id,
    _borrow.circle_id,
    'borrow_nudge',
    concat(_lender_name, ' sent a gentle reminder'),
    concat('Your ', _item_display, ' has been borrowed for ', _duration_text,
           '. No rush — return it when you can.'),
    jsonb_build_object(
      'borrow_id', _borrow_id,
      'item_display', _item_display,
      'lender_name', _lender_name,
      'borrower_name', _borrower_name
    )
  )
  returning id into _notif_id;

  -- 11. Get push token for edge function
  select push_token into _borrower_tok
  from public.profiles where id = _borrow.borrower_id;

  -- 12. Return success with data the edge function needs to send push
  return jsonb_build_object(
    'success', true,
    'notification_id', _notif_id,
    'push_token', _borrower_tok,
    'push_title', concat(_lender_name, ' sent a gentle reminder'),
    'push_body', concat('Your ', _item_display, ' has been borrowed for ',
                         _duration_text, '. No rush — return it when you can.'),
    'push_data', jsonb_build_object(
      'type', 'borrow_nudge',
      'borrow_id', _borrow_id,
      'notification_id', _notif_id
    )
  );
end;
$$;
```

### 5.4 Column addition: `borrow_transactions.last_nudged_at`

Denormalized for quick UI queries without joining `borrow_nudges`.

```sql
alter table public.borrow_transactions
  add column if not exists last_nudged_at timestamptz;
alter table public.borrow_transactions
  add column if not exists nudge_count int not null default 0;
```

These are updated by the `nudge_borrower()` function (add to the function body):
```sql
-- After inserting borrow_nudges record:
update public.borrow_transactions
  set last_nudged_at = now(),
      nudge_count = nudge_count + 1
  where id = _borrow_id;
```

## 6. Push Notification Infrastructure

### 6.1 Architecture: Supabase Edge Function + Expo Push API

Trésor already has `expo-notifications ~57.0.8` as a dependency and the `profiles` table has a `push_token` column. The architecture follows [Supabase's official push notification guide](https://supabase.com/docs/guides/functions/examples/push-notifications):

```
┌──────────┐         ┌──────────────┐      ┌─────────────────┐      ┌──────────┐
│  App     │         │  Supabase    │      │  Edge Function  │      │ Expo     │
│ (RN)     │         │  (Postgres)  │      │  (send-push)    │      │ Push API │
└────┬─────┘         └──────┬───────┘      └────────┬────────┘      └────┬─────┘
     │                      │                       │                    │
     │ 1. RPC nudge_borrower│                       │                    │
     │─────────────────────►│                       │                    │
     │                      │ 2. Check limits       │                    │
     │                      │    Insert nudge+notif │                    │
     │                      │    Return push data   │                    │
     │                      │                       │                    │
     │ 3. { success,        │                       │                    │
     │    push_token, ... } │                       │                    │
     │◄─────────────────────┘                       │                    │
     │                                              │                    │
     │ 4. POST /functions/v1/send-push              │                    │
     │    { token, title, body, data }              │                    │
     │─────────────────────────────────────────────►│                    │
     │                                              │ 5. POST to Expo    │
     │                                              │    Push API        │
     │                                              │───────────────────►│
     │                                              │                    │ 6. APNs/FCM
     │                                              │                    │──────►📱
     │                                              │                    │
     │                                              │ 7. { status: ok }  │
     │                                              │◄───────────────────┤
     │ 8. { sent: true }                            │                    │
     │◄─────────────────────────────────────────────┘                    │
```

**Why this flow (and not a DB trigger → webhook):**

The `nudge_borrower()` RPC does all rate-limiting and DB inserts atomically. The client then calls the `send-push` edge function with the push token and message returned by the RPC. This separation means:
- Rate limiting failures don't waste edge function calls
- The push send can fail gracefully without rolling back the notification (the in-app notification is already saved)
- The client can show appropriate UX based on the RPC result (success, cooldown, maxed, etc.)

### 6.2 Edge Function: `send-push`

```typescript
// supabase/functions/send-push/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushRequest {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  channelId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { token, title, body, data, sound, channelId }: PushRequest =
    await req.json();

  if (!token || !title || !body) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const message = {
    to: token,
    title,
    body,
    data: data ?? {},
    sound: sound ?? "default",
    channelId: channelId ?? "default",
    priority: "default" as const,
  };

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

**Environment variables:**
- `EXPO_ACCESS_TOKEN` — Expo access token for authenticated push sends (enhanced security). Set via `supabase secrets set EXPO_ACCESS_TOKEN=<token>`.

### 6.3 Client-side push token registration

On app launch (after auth), register the push token and save to `profiles.push_token`:

```typescript
// src/lib/notifications.ts (new file)

import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

/**
 * Register for push notifications and save token to profiles table.
 * Called on app launch after user is authenticated.
 * Returns the push token or null if permission denied.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null; // User denied — in-app notifications still work
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  })).data;

  // Save to profiles
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  return token;
}

/**
 * Configure notification behavior when app is in foreground.
 * Push notifications received while app is open should show a banner
 * (not silently dropped) for nudges, since the user may be in a
 * different tab.
 */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
```

### 6.4 Android notification channel

```typescript
// In app _layout.tsx, after registerForPushNotifications:
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('nudges', {
    name: 'Nudges',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A961',
    sound: 'gentle_tap.caf',
  });
}
```

## 7. API Functions

### 7.1 Client-side: `src/lib/borrow.ts` (updated)

Replace the existing stub `nudgeBorrower` function:

```typescript
export interface NudgeResult {
  success: boolean;
  error?: 'grace_period_active' | 'cooldown_active' | 'max_nudges_reached'
        | 'daily_limit_reached' | 'borrow_not_found_or_not_active';
  nextAvailableAt?: string;
  message?: string;
  pushSent?: boolean;
}

/**
 * Send a gentle nudge to a borrower.
 * Calls the nudge_borrower() RPC for rate-limited notification creation,
 * then fires the send-push edge function if a push token exists.
 */
export async function nudgeBorrower(transactionId: string): Promise<NudgeResult> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // 1. Call the RPC — does all rate limiting + DB inserts atomically
  const { data, error } = await supabase
    .rpc('nudge_borrower', {
      _borrow_id: transactionId,
      _lender_id: user.user.id,
    });

  if (error) throw error;

  const result = data as NudgeResult;
  if (!result.success) {
    return result; // Rate limited — return the reason for UX
  }

  // 2. Send push notification via edge function (best-effort)
  try {
    const pushData = (data as any);
    if (pushData.push_token) {
      const { error: pushError } = await supabase.functions.invoke('send-push', {
        body: {
          token: pushData.push_token,
          title: pushData.push_title,
          body: pushData.push_body,
          data: pushData.push_data,
          sound: 'gentle_tap.caf',
          channelId: 'nudges',
        },
      });

      result.pushSent = !pushError;
    }
  } catch {
    result.pushSent = false;
    // Push failure is non-fatal — in-app notification is already saved
  }

  return result;
}

/**
 * Get nudge history for a borrow transaction.
 * Used to show the lender nudge state (cooldown, count remaining).
 */
export async function getNudgeState(transactionId: string): Promise<{
  count: number;
  lastNudgedAt: string | null;
  nextAvailableAt: string | null;
  remaining: number;
}> {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('nudge_count, last_nudged_at')
    .eq('id', transactionId)
    .single();

  if (error) throw error;

  const count = data.nudge_count ?? 0;
  const lastNudgedAt = data.last_nudged_at;
  const nextAvailableAt = lastNudgedAt
    ? new Date(new Date(lastNudgedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    count,
    lastNudgedAt,
    nextAvailableAt,
    remaining: Math.max(0, 3 - count),
  };
}
```

### 7.2 Client-side: `src/lib/notifications.ts` (new file)

```typescript
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Get all notifications for the current user, newest first.
 */
export async function getNotifications(limit: number = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Get unread notification count (for badge).
 */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);

  if (error) throw error;
}
```

## 8. UI — Nudger (Lender)

### 8.1 Active borrow card — nudge button states

The nudge button on `active.tsx` replaces the current "Coming Soon" alert. It renders based on `getNudgeState()`:

```
┌─────────────────────────────────────────────┐
│  [Lent Out]                     2 weeks ago  │
│                                               │
│  [img] CHANEL                                 │
│        Classic Flap                           │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ [avatar] Item is with        Since Aug 1│ │
│  │          Layla                            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  [bell-icon]  Nudge Layla                │ │  ← AVAILABLE state
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Cooldown state (last nudge < 24h ago):**
```
│  ┌─────────────────────────────────────────┐ │
│  │  [clock-icon]  Nudged — 18h until next  │ │  ← muted, disabled
│  └─────────────────────────────────────────┘ │
```

**Maxed state (3 nudges sent):**
```
│  You've sent all nudges for this borrow.     │
│  Message Layla directly to arrange return.    │
```

**Not yet eligible (borrow < 48h):**
The nudge button is not rendered. Instead:
```
│  Nudge available in 1 day                    │  ← caption, muted
```

### 8.2 After nudging — confirmation

When the nudge succeeds, show a brief toast/snackbar:

```
┌─────────────────────────────────────────────┐
│  [check-icon]  Nudge sent to Layla.          │
│  They'll see it next time they open Trésor.   │
└─────────────────────────────────────────────┘
```

The button immediately transitions to the cooldown state, showing the live countdown.

When the nudge fails (rate limited), show a non-blocking alert:

```
┌─────────────────────────────────────────────┐
│  Can't nudge yet                             │
│                                               │
│  You can nudge Layla again in 18 hours.      │
│                                               │
│                                    [OK]       │
└─────────────────────────────────────────────┘
```

### 8.3 Nudge history (optional, in borrow detail)

Below the active borrow card, a subtle history section:

```
REMINDER HISTORY
  Nudge sent    2 days ago
  Nudge sent    5 days ago
  2 of 3 nudges used
```

This gives the lender visibility into their own nudging pattern without being a dashboard.

## 9. UI — Borrower (Nudged)

### 9.1 Push notification (lock screen / notification center)

```
┌─────────────────────────────────────────────┐
│  Trésor                          just now    │
│                                               │
│  Sarah sent a gentle reminder                 │
│  Your Chanel Classic Flap has been borrowed   │
│  for 2 weeks. No rush — return it when        │
│  you can.                                     │
└─────────────────────────────────────────────┘
```

Tapping the push notification deep-links to `/borrow/active` with the specific borrow highlighted.

### 9.2 In-app banner (on active borrow screen)

When the borrower opens the app and has an unread nudge, a banner appears at the top of the active borrows screen:

```
┌─────────────────────────────────────────────┐
│  [bell-icon]  Sarah sent a gentle reminder    │
│  Your Chanel Classic Flap has been borrowed   │
│  for 2 weeks.                                 │
│                                               │
│  [Mark as Returned]              [Dismiss]    │
└─────────────────────────────────────────────┘
```

The banner is dismissible (marks notification as read). "Mark as Returned" triggers the standard return flow.

### 9.3 Notification center (new screen)

A bell icon in the tab bar header shows an unread badge. Tapping opens the notification center:

```
┌─────────────────────────────────────────────┐
│  [<]  Notifications            [Mark All Read]│
├─────────────────────────────────────────────┤
│                                               │
│  ● [bell] Sarah sent a gentle reminder        │
│    Your Chanel Classic Flap has been...       │
│    2h ago                          [Return]   │
│                                               │
│  ● [borrow] Mona requested to borrow your     │
│    Dior Saddle Bag                            │
│    5h ago                          [View]     │
│                                               │
│    [check] Layla returned your Cartier        │  ← read, muted
│    Love Bracelet                              │
│    1d ago                                     │
│                                               │
│    [check] Maya joined the circle             │  ← read, muted
│    3d ago                                     │
│                                               │
└─────────────────────────────────────────────┘
```

Unread notifications have a gold dot (`●`) and full opacity. Read notifications have no dot and reduced opacity. Each notification type has a distinct SVG icon (no emoji).

**Design note:** The notification center follows the [Courier best practice](https://www.courier.com/guides/how-to-build-a-notification-center/chapter-3-best-practices-for-notification-centers) of front-loading important info and making notifications scannable. The unread dot is the "unread signal" — it's subtle (gold, small) rather than a loud red badge, matching the luxury aesthetic.

## 10. Edge Cases

| # | Edge case | Handling |
|---|-----------|----------|
| 1 | **Borrower has app closed** | Push notification delivered to lock screen. In-app notification saved to DB — visible when they next open the app. |
| 2 | **Borrower has push notifications disabled** | Push silently fails (Expo returns a `DeviceNotRegistered` or similar error). In-app notification still saved and visible. No error shown to lender. |
| 3 | **Borrower has no push token** (`push_token` is null) | `nudge_borrower()` returns `push_token: null`. Client skips the `send-push` call. In-app notification is still created. Lender sees normal confirmation. |
| 4 | **Borrower uninstalled app** | Expo Push API returns `DeviceNotRegistered`. Edge function logs but doesn't error. In-app notification still saved (will never be read, but doesn't cause issues). |
| 5 | **Lender tries to nudge a completed/returned borrow** | `nudge_borrower()` checks `status = 'active'` and returns `borrow_not_found_or_not_active`. Client shows: "This borrow is no longer active." |
| 6 | **Lender tries to nudge their own borrow** (edge: they're both borrower and lender?) | Not possible by design — `borrower_id != lender_id` is enforced by the borrow request flow. But the function checks `lender_id = _lender_id` anyway. |
| 7 | **Two lenders somehow exist for one item** | Not possible — an item has one owner. The borrow transaction has one `lender_id`. |
| 8 | **Borrower returns item right after nudge** | The nudge notification remains in the notification center (it's historical). When the borrower taps it, the active borrow screen shows the item as returned/completed. The notification can be auto-marked as read when the borrow status changes. |
| 9 | **Clock skew between client and server** | All rate-limiting uses server-side `now()`. Client cooldown display is approximate. The server is the source of truth. |
| 10 | **Network failure during push send** | In-app notification is already saved (RPC succeeded). Push send is best-effort. Lender sees success. Borrower sees in-app notification. |
| 11 | **Borrower is in a different timezone** | Duration text uses server time. No timezone display issues since we use relative text ("2 weeks", "a while") not absolute times. |
| 12 | **Lender rapidly taps nudge** | Client-side: disable button immediately on tap (optimistic UI). Server-side: the RPC is atomic; concurrent calls will fail on the 24h cooldown check. |
| 13 | **Push token is stale** (user got a new device) | Expo returns `DeviceNotRegistered`. We should clear the push token: add a cleanup step in the edge function that sets `push_token = null` for the user if Expo returns `DeviceNotRegistered`. |
| 14 | **Borrow is for a private item** | No special handling needed. The nudge operates on the borrow transaction, not the item visibility. |

## 11. User Flow Diagram

```
LENDER FLOW                           BORROWER FLOW
===========                           ============

[Active Borrow Screen]                [App is backgrounded/closed]
        |                                      |
        | Tap "Nudge Layla"                    |
        v                                      |
[RPC: nudge_borrower()]                        |
        |                                      |
        ├── success? ── no ──> [Show error:    |
        |                  cooldown/maxed/     |
        |                  grace period]       |
        |                                      |
        | yes                                  |
        v                                      |
[Edge fn: send-push]                   [Push notification received]
        |                                      |
        ├── push ok? ── no ──> [in-app only]  |
        |                                      v
        | yes                          [Tap notification]
        v                                      |
[Toast: "Nudge sent to Layla"]                 v
        |                              [Deep link to /borrow/active]
        v                                      |
[Button → cooldown state]                      v
                                        [In-app banner at top:]
                                        "Sarah sent a gentle reminder"
                                        "Your Chanel Classic Flap..."
                                        [Mark as Returned] [Dismiss]
                                               |
                                               ├── [Mark as Returned]
                                               |       |
                                               |       v
                                               |   [Return flow]
                                               |
                                               └── [Dismiss]
                                                       |
                                                       v
                                               [Notification marked read]
                                               [Banner dismissed]
```

---

# Part II: Circle Feed Redesign

## 12. Design Philosophy

### 12.1 From flat list to curated sections

The current activity feed is a single chronological dump — every `activity_feed` row in reverse chronological order. Nasser wants it **segregated, creative, not overwhelming** — "Instagram feed but for luxury items."

The redesign moves from a flat timeline to a **sectioned feed** with distinct visual zones. The key insight from [Instagram's feed design analysis](https://engineeringenablement.substack.com/p/designing-instagram-taught-me-why) is that feeds should separate content types and prioritize visual, media-heavy items over text-only activity. Trésor's feed should foreground items (visual) and push system activity (borrows, joins) into a compact secondary zone.

### 12.2 Principles

1. **Visual-first:** Items with photos get premium placement. Text-only activity is compact.
2. **Sectioned, not infinite:** The feed has clear sections with headers, not an undifferentiated scroll. Each section has a purpose.
3. **Social but restrained:** Reactions and comments exist but are lightweight — this is a small circle, not a public platform. No public follower counts, no algorithmic ranking.
4. **Editorial, not chronological-only:** A "Featured" section at the top surfaces interesting content (new items, active borrows, "Who Wore It Best") above the raw timeline.
5. **No emoji:** All icons are SVG (MaterialCommunityIcons or custom). Reactions are SVG glyphs, not emoji.

## 13. Feed Architecture

### 13.1 Feed model: pull-based with section queries

For a circle of 5–15 users, a push-based fanout model (precomputing feeds) is unnecessary — the scale is tiny. We use a **pull-based model**: each section is a separate query against `activity_feed` (and new tables) filtered by type and ordered appropriately. The client assembles the sections.

This follows the [Instagram feed design analysis](https://engineeringenablement.substack.com/p/designing-instagram-taught-me-why) guidance that for small follower counts, pull-based is simpler and sufficient. Push-based fanout is only needed at celebrity scale.

### 13.2 Feed structure

```
┌─────────────────────────────────────────────┐
│  CIRCLE FEED                                 │
│  [All] [Borrows] [Items] [Wishlists] [Shares]│  ← filter pills
├─────────────────────────────────────────────┤
│                                               │
│  ╔═════════════════════════════════════════╗ │
│  ║  FEATURED                              ║ │  ← Section 1: Featured
│  ║  (Who Wore It Best + active borrows)   ║ │
│  ╚═════════════════════════════════════════╝ │
│                                               │
│  ── LATEST ITEMS ────────────────────────     │  ← Section 2: Items
│  [Item card] [Item card] [Item card]          │
│  (horizontal scroll or 2-col grid)            │
│                                               │
│  ── CIRCLE ACTIVITY ─────────────────────     │  ← Section 3: Activity
│  [compact activity row]                       │
│  [compact activity row]                       │
│  [compact activity row]                       │
│                                               │
│  ── SHARED WISHLISTS ────────────────────     │  ← Section 4: Wishlists
│  [Wishlist card with items preview]           │
│  [Wishlist card with items preview]           │
│                                               │
│  ── RECENT SHARES ───────────────────────     │  ← Section 5: Shares
│  [Shared item card with reactions]            │
│  [Shared item card with reactions]            │
│                                               │
└─────────────────────────────────────────────┘
```

## 14. Feed Sections

### Section 1: Featured

A pinned zone at the top of the feed. Contains:

- **"Who Wore It Best"** voting card (existing feature, moved here from the flat list)
- **Active borrows summary** — a compact card showing items currently out in the circle ("3 items currently borrowed"). Tappable to see the active borrows list.

This section is always visible (unless the circle has zero activity). It's the "curated" top-of-feed experience.

**Visual:** Full-width card with elevated surface, gold accent border. The voting card uses the existing design. The active borrows summary is a new compact card.

### Section 2: Latest Items

Newly added items displayed as visual cards with their primary image. This is the most "Instagram-like" section — visual, browsable, tappable.

**Layout:** Horizontal scroll of item cards (each ~160px wide), showing primary image, brand, model, owner avatar. Or a 2-column grid if items have landscape images.

**Data source:** `items` table where `circle_id = X` and `is_private = false`, ordered by `created_at desc`, limit 10.

**Social:** Each item card has a react button (heart/count) and a share-to-circle button. Tapping the card opens the item detail.

**Why separate from activity:** Items are the core visual content. Burying them in a timeline of "Sarah added a Chanel" text rows wastes the visual richness. This section gives items their own visual stage, following the Instagram pattern of separating media content from activity metadata.

### Section 3: Circle Activity

The compact activity timeline — the existing feed, but visually compressed. This is where borrow requests, approvals, returns, member joins, and item updates live. Each entry is a single-line row (avatar + text + timestamp), not a full card.

**Visual:** Compact rows, no item thumbnails (thumbnails live in the Items section). Each row is ~44px tall. Activity type is indicated by a small colored icon on the left.

**Data source:** `activity_feed` table, types filtered to activity events (borrows, members, updates), ordered by `created_at desc`, limit 20.

**Interactions:** Active borrows in this section still have the "Mark Returned" quick action (existing feature).

### Section 4: Shared Wishlists

Wishlists that members have marked as public (`is_private = false`). Each wishlist shows as a card with the wishlist name, owner, and a preview of top items (brand thumbnails).

**Layout:** Vertical cards, each showing wishlist name, owner avatar, 3–4 item brand chips, and a "View all" link.

**Data source:** `wishlists` table where `is_private = false`, joined with `wishlist_items` for preview, filtered to circle members.

**Social:** Members can react to a wishlist (e.g., "I have one of these!" or "Love this"). They can also "offer" an item from their collection that matches a wishlist item — this creates a share/notification.

### Section 5: Recent Shares

A new social layer: items explicitly shared to the circle by their owners, with reactions and comments. This is the most "Instagram post" like section — an owner shares an item with a caption, and members can react and comment.

**Layout:** Full-width cards with:
- Owner avatar + name + timestamp
- Item primary image (large, ~16:9 or square)
- Brand + model (editorial typography)
- Caption (owner's text)
- Reaction bar (react button + count, comment button + count)
- Latest 2 comments (inline, expandable)

**Data source:** New `circle_posts` table (see [§18](#18-database-changes)).

**Why a new table:** The existing `activity_feed` table is auto-generated by triggers and is purely factual ("Sarah added a Chanel"). Shares are intentional social acts with captions, reactions, and comments — they need their own table. This follows the [Instagram system design pattern](https://dev.to/zeeshanali0704/instagram-system-design-48oj) of separating posts from activity metadata.

## 15. Activity Type Routing

Each `activity_type` enum value is routed to a specific section:

| Activity type | Section | Display |
|---------------|---------|---------|
| `item_added` | Latest Items | Visual card (pulled from `items`, not `activity_feed`) |
| `item_updated` | Circle Activity | Compact row |
| `item_removed` | Circle Activity | Compact row |
| `borrow_requested` | Circle Activity | Compact row |
| `borrow_approved` | Circle Activity | Compact row |
| `borrow_active` | Featured (summary) + Circle Activity | Compact row + summary count |
| `borrow_returned` | Circle Activity | Compact row |
| `borrow_completed` | Circle Activity | Compact row |
| `borrow_declined` | Circle Activity | Compact row |
| `wishlist_item_added` | Shared Wishlists | Wishlist card (if wishlist is public) |
| `price_alert` | Circle Activity | Compact row |
| `member_joined` | Circle Activity | Compact row |
| `member_left` | Circle Activity | Compact row |
| **NEW: `item_shared`** | Recent Shares | Full share card (from `circle_posts`) |
| **NEW: `wishlist_shared`** | Shared Wishlists | Wishlist card |

## 16. Social Interactions

### 16.1 Reactions

Members can react to item shares and shared wishlists. Reactions are lightweight — a single tap, no text.

**Reaction types (SVG glyphs, no emoji):**

| Reaction | Icon | Meaning |
|----------|------|---------|
| Love | Heart outline → filled | "I love this" |
| Want | Tag/bookmark icon | "I want this" |
| Have | Check-circle icon | "I have one too" |
| Covet | Sparkle/diamond icon | "Coveting this" |

**Why 4 reactions (not just "like"):** In a luxury circle, the nuance matters. "Want" vs "Have" vs "Covet" are meaningfully different signals. This is more expressive than a single like button while remaining simple. Per [DBA Stack Exchange's reaction schema discussion](https://dba.stackexchange.com/questions/316746/system-database-design-for-comments-replies-and-upvotes-at-scale), using a `Reaction` table with a `reactionType` enum is the standard pattern.

**Design:** The reaction bar shows 4 small SVG icons in a row. Tapping one fills the icon with gold and increments the count. Tapping again un-reacts. The count is shown as "3 loves · 2 wants" in compact text.

### 16.2 Comments

Members can comment on item shares. Comments are simple text — no threading, no replies to replies. This is a small circle; threading adds complexity without value.

**Design:**
- Latest 2 comments shown inline on the share card
- "View all N comments" expands to a comment sheet (bottom sheet modal)
- Comment input at the bottom of the sheet
- Comments are ordered oldest-first (chronological), not newest-first
- No editing; comments can be deleted by their author

### 16.3 Share to circle

An owner can share an item from their collection to the circle feed. This creates a `circle_posts` entry with an optional caption.

**Share flow:**
1. On any item detail screen, tap "Share to Circle"
2. Optional: add a caption ("Wore this to the gala last night")
3. Post appears in the "Recent Shares" section of the circle feed
4. Members can react and comment

**Share from wishlist:** A member can share their public wishlist to the circle ("My birthday wishlist — hint hint"). This creates a `wishlist_shared` activity and surfaces in the Shared Wishlists section.

## 17. Filtering & Sorting

### 17.1 Filter pills

Horizontal scrollable pills at the top of the feed:

```
[All] [Borrows] [Items] [Wishlists] [Shares]
```

Tapping a pill filters the feed to show only that section. "All" shows everything (default).

| Filter | Shows |
|--------|-------|
| All | All sections |
| Borrows | Featured (active borrows) + Circle Activity (borrow events only) |
| Items | Latest Items section only |
| Wishlists | Shared Wishlists section only |
| Shares | Recent Shares section only |

### 17.2 Sorting

Within each section, the default sort is **newest first** (`created_at desc`). There is no algorithmic ranking — the circle is small enough that chronological is sufficient and transparent.

The "Featured" section is the only exception — it's curated by type (voting card always first, active borrows summary second), not by time.

## 18. Database Changes

### 18.1 New table: `circle_posts`

For item/wishlist shares with captions.

```sql
-- Migration: 0009_circle_posts.sql

create table if not exists public.circle_posts (
  id           uuid primary key default gen_random_uuid(),
  circle_id    uuid not null references public.circles(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('item_share', 'wishlist_share')),
  item_id      uuid references public.items(id) on delete set null,
  wishlist_id  uuid references public.wishlists(id) on delete set null,
  caption      text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_circle_posts_circle
  on public.circle_posts (circle_id, created_at desc);

-- RLS
alter table public.circle_posts enable row level security;

create policy "circle_posts_select_members"
  on public.circle_posts for select
  using (public.is_circle_member(circle_id));

create policy "circle_posts_insert_members"
  on public.circle_posts for insert
  with check (
    author_id = auth.uid()
    and public.is_circle_member(circle_id)
  );

create policy "circle_posts_delete_author"
  on public.circle_posts for delete
  using (author_id = auth.uid());

-- Trigger: create activity_feed entry when a circle post is created
create or replace function public.create_circle_post_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name text;
  _summary    text;
begin
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = new.author_id;

  _summary := case
    when new.type = 'item_share' then concat(_actor_name, ' shared an item to the circle')
    when new.type = 'wishlist_share' then concat(_actor_name, ' shared a wishlist to the circle')
  end;

  insert into public.activity_feed (circle_id, user_id, type, item_id, actor_name, summary, metadata)
  values (
    new.circle_id,
    new.author_id,
    'item_shared'::public.activity_type,
    new.item_id,
    _actor_name,
    _summary,
    jsonb_build_object('post_id', new.id, 'post_type', new.type, 'caption', new.caption)
  );

  return new;
end;
$$;

create trigger trg_circle_post_activity
  after insert on public.circle_posts
  for each row
  execute function public.create_circle_post_activity();
```

### 18.2 New enum values for `activity_type`

```sql
-- Add new activity types for the feed redesign
alter type public.activity_type add value if not exists 'item_shared';
alter type public.activity_type add value if not exists 'wishlist_shared';
alter type public.activity_type add value if not exists 'feed_reaction';
alter type public.activity_type add value if not exists 'feed_comment';
```

### 18.3 New table: `post_reactions`

```sql
create table if not exists public.post_reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.circle_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reaction   text not null check (reaction in ('love', 'want', 'have', 'covet')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)  -- one reaction per user per post
);

create index if not exists idx_reactions_post
  on public.post_reactions (post_id);

-- RLS
alter table public.post_reactions enable row level security;

create policy "reactions_select_members"
  on public.post_reactions for select
  using (
    exists (
      select 1 from public.circle_posts cp
      where cp.id = post_reactions.post_id
        and public.is_circle_member(cp.circle_id)
    )
  );

create policy "reactions_insert_own"
  on public.post_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.circle_posts cp
      where cp.id = post_reactions.post_id
        and public.is_circle_member(cp.circle_id)
    )
  );

create policy "reactions_delete_own"
  on public.post_reactions for delete
  using (user_id = auth.uid());
```

### 18.4 New table: `post_comments`

```sql
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.circle_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_post
  on public.post_comments (post_id, created_at asc);

-- RLS
alter table public.post_comments enable row level security;

create policy "comments_select_members"
  on public.post_comments for select
  using (
    exists (
      select 1 from public.circle_posts cp
      where cp.id = post_comments.post_id
        and public.is_circle_member(cp.circle_id)
    )
  );

create policy "comments_insert_members"
  on public.post_comments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.circle_posts cp
      where cp.id = post_comments.post_id
        and public.is_circle_member(cp.circle_id)
    )
  );

create policy "comments_delete_own"
  on public.post_comments for delete
  using (user_id = auth.uid());
```

### 18.5 Summary of all new tables

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `notifications` | In-app notification store (nudges + future types) | `user_id` → profiles |
| `borrow_nudges` | Nudge audit + rate limiting | `borrow_id` → borrow_transactions |
| `circle_posts` | Item/wishlist shares with captions | `circle_id`, `author_id`, optional `item_id`/`wishlist_id` |
| `post_reactions` | Love/Want/Have/Covet reactions on posts | `post_id` → circle_posts, `user_id` |
| `post_comments` | Comments on posts (flat, no threading) | `post_id` → circle_posts, `user_id` |

**New columns on existing tables:**
- `borrow_transactions.last_nudged_at` (timestamptz)
- `borrow_transactions.nudge_count` (int, default 0)

## 19. API Functions

### 19.1 `src/lib/feed.ts` (new file — replaces sections of `activity.ts`)

```typescript
import { supabase } from '@/lib/supabase';
import type { ActivityEntry, Item } from '@/types/items';

export interface CirclePost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  type: 'item_share' | 'wishlist_share';
  item_id: string | null;
  wishlist_id: string | null;
  caption: string | null;
  item_brand: string | null;
  item_model: string | null;
  item_image: string | null;
  created_at: string;
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
  comment_count: number;
  latest_comments: PostComment[];
}

export interface PostComment {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface FeedData {
  featured: {
    activeBorrowCount: number;
    activeBorrows: ActivityEntry[];
  };
  latestItems: Item[];
  circleActivity: ActivityEntry[];
  sharedWishlists: any[]; // typed in implementation
  recentShares: CirclePost[];
}

/**
 * Get the full sectioned feed for a circle.
 * Makes parallel queries for each section.
 */
export async function getCircleFeed(circleId: string): Promise<FeedData> {
  const [items, activity, posts] = await Promise.all([
    getLatestItems(circleId),
    getCircleActivity(circleId),
    getRecentShares(circleId),
  ]);

  return {
    featured: {
      activeBorrowCount: activity.filter(a => a.type === 'borrow_active').length,
      activeBorrows: activity.filter(a => a.type === 'borrow_active'),
    },
    latestItems: items,
    circleActivity: activity,
    sharedWishlists: [], // populated in Phase 2
    recentShares: posts,
  };
}

async function getLatestItems(circleId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles!items_owner_id_fkey(display_name)')
    .eq('circle_id', circleId)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    owner_name: row.owner?.display_name ?? 'Unknown',
  }));
}

async function getCircleActivity(circleId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, items!activity_feed_item_id_fkey(brand)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    actor_name: row.actor_name ?? 'Unknown',
    summary: row.summary ?? '',
    item_brand: row.items?.brand ?? null,
  }));
}

async function getRecentShares(circleId: string): Promise<CirclePost[]> {
  const { data, error } = await supabase
    .from('circle_posts')
    .select(`
      *,
      author:profiles!circle_posts_author_id_fkey(display_name, avatar_url),
      items:items!circle_posts_item_id_fkey(brand, model_name, primary_image_url),
      post_reactions(reaction, user_id),
      post_comments(id, user_id, body, created_at,
        author:profiles!post_comments_user_id_fkey(display_name))
    `)
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const currentUserId = (await supabase.auth.getUser()).data.user?.id;

  return (data ?? []).map((row: any) => {
    const reactions = row.post_reactions ?? [];
    const reactionCounts: Record<string, number> = {};
    let myReaction: string | null = null;

    for (const r of reactions) {
      reactionCounts[r.reaction] = (reactionCounts[r.reaction] ?? 0) + 1;
      if (r.user_id === currentUserId) myReaction = r.reaction;
    }

    return {
      id: row.id,
      author_id: row.author_id,
      author_name: row.author?.display_name ?? 'Unknown',
      author_avatar: row.author?.avatar_url ?? null,
      type: row.type,
      item_id: row.item_id,
      wishlist_id: row.wishlist_id,
      caption: row.caption,
      item_brand: row.items?.brand ?? null,
      item_model: row.items?.model_name ?? null,
      item_image: row.items?.primary_image_url ?? null,
      created_at: row.created_at,
      reactionCounts,
      my_reaction: myReaction,
      comment_count: (row.post_comments ?? []).length,
      latest_comments: (row.post_comments ?? []).slice(-2).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        author_name: c.author?.display_name ?? 'Unknown',
        body: c.body,
        created_at: c.created_at,
      })),
    };
  });
}

/**
 * Share an item to the circle feed.
 */
export async function shareItemToCircle(params: {
  circleId: string;
  itemId: string;
  caption?: string;
}): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('circle_posts')
    .insert({
      circle_id: params.circleId,
      author_id: user.user.id,
      type: 'item_share',
      item_id: params.itemId,
      caption: params.caption ?? null,
    });

  if (error) throw error;
}

/**
 * React to a circle post (or un-react if already reacted).
 */
export async function toggleReaction(
  postId: string,
  reaction: 'love' | 'want' | 'have' | 'covet'
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Check if already reacted
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id, reaction')
    .eq('post_id', postId)
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (existing) {
    if (existing.reaction === reaction) {
      // Same reaction — remove it (toggle off)
      await supabase.from('post_reactions').delete().eq('id', existing.id);
    } else {
      // Different reaction — update it
      await supabase
        .from('post_reactions')
        .update({ reaction })
        .eq('id', existing.id);
    }
  } else {
    // No existing reaction — insert
    await supabase.from('post_reactions').insert({
      post_id: postId,
      user_id: user.user.id,
      reaction,
    });
  }
}

/**
 * Add a comment to a circle post.
 */
export async function addComment(
  postId: string,
  body: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: user.user.id,
      body,
    });

  if (error) throw error;
}

/**
 * Get all comments for a post (for the comment sheet).
 */
export async function getComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, user_id, body, created_at, author:profiles!post_comments_user_id_fkey(display_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    id: c.id,
    user_id: c.user_id,
    author_name: c.author?.display_name ?? 'Unknown',
    body: c.body,
    created_at: c.created_at,
  }));
}
```

## 20. UI Wireframes

### 20.1 Full feed (All filter)

```
┌─────────────────────────────────────────────┐
│  Activity                          [bell 3]  │  ← header with notification badge
├─────────────────────────────────────────────┤
│  [All] [Borrows] [Items] [Wishlists] [Shares]│  ← filter pills (horizontal scroll)
├─────────────────────────────────────────────┤
│                                               │
│  ╔═════════════════════════════════════════╗ │
│  ║  [trophy] Who Wore It Best?              ║ │  ← FEATURED section
│  ║  Vote for this week's best styled item   ║ │
│  ║                                           ║ │
│  ║  [photo] [photo] [photo]                  ║ │
│  ║  Sarah    Mona     Lina                   ║ │
│  ║  Chanel   Dior     Gucci                  ║ │
│  ║  12 votes 8 votes  5 votes                ║ │
│  ╚═════════════════════════════════════════╝ │
│                                               │
│  ╔═════════════════════════════════════════╗ │
│  ║  [swap] 3 items currently borrowed       ║ │  ← active borrows summary
│  ║  Tap to view all active borrows           ║ │
│  ╚═════════════════════════════════════════╝ │
│                                               │
│  ── LATEST ITEMS ──────────────── [See All]   │  ← section header
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ [img] │ │ [img] │ │ [img] │ │ [img] │       │  ← horizontal scroll
│  │CHANEL │ │ DIOR  │ │GUCCI  │ │HERMES │       │
│  │Classic│ │Saddle │ │Marmont│ │Birkin │       │
│  │Sarah  │ │Mona   │ │Lina   │ │Maya   │       │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                               │
│  ── CIRCLE ACTIVITY ──────────────────────     │  ← section header
│  [avatar] Sarah added a Chanel Classic    2h  │  ← compact row
│  [avatar] Mona requested to borrow Dior   5h  │
│  [avatar] Layla returned Cartier Love     1d  │
│  [avatar] Maya joined the circle          3d  │
│                                               │
│  ── RECENT SHARES ────────────────────────     │  ← section header
│  ┌─────────────────────────────────────────┐ │
│  │ [avatar] Sarah                         2h │ │  ← share card
│  │                                           │ │
│  │         [ LARGE ITEM IMAGE ]              │ │
│  │                                           │ │
│  │ CHANEL                                    │ │
│  │ Classic Flap                              │ │
│  │                                           │ │
│  │ "Wore this to the gala last night"        │ │
│  │                                           │ │
│  │ [heart] 3  [tag] 1  [check] 2  [diamond] 0│ │  ← reactions
│  │ [comment] 2 comments                      │ │
│  │                                           │ │
│  │   Mona: Stunning!                         │ │  ← inline comments
│  │   Lina: Where did you get it authenticated?│ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ [avatar] Maya                          1d │ │  ← another share
│  │         [ LARGE ITEM IMAGE ]              │ │
│  │ HERMES Birkin 30                          │ │
│  │ "Finally authenticated my Birkin"         │ │
│  │ [heart] 5  [tag] 3  [check] 0  [diamond] 4│ │
│  └─────────────────────────────────────────┘ │
│                                               │
└─────────────────────────────────────────────┘
```

### 20.2 Item share card (detail)

```
┌─────────────────────────────────────────────┐
│  [avatar] Sarah                       2h ago │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                           │ │
│  │            [ ITEM IMAGE ]                 │ │  ← full-bleed image
│  │            (square or 4:5)                │ │
│  │                                           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  CHANEL                                       │  ← brand (gold, letterspaced)
│  Classic Flap                                 │  ← model (primary text)
│                                               │
│  "Wore this to the gala last night"           │  ← caption (secondary text)
│                                               │
│  ─────────────────────────────────────────── │
│  [heart]  [tag]  [check]  [diamond]  [comment]│  ← reaction bar
│   3 loves  1 wants  2 have    0 covet  2     │
│  ─────────────────────────────────────────── │
│                                               │
│  Mona   Stunning!                        1h   │  ← inline comments
│  Lina   Where did you get it authenticated? 30m│
│                                               │
│  View all 2 comments                          │
└─────────────────────────────────────────────┘
```

### 20.3 Comment sheet (bottom modal)

```
┌─────────────────────────────────────────────┐
│  Comments                              [X]    │
├─────────────────────────────────────────────┤
│                                               │
│  [avatar] Mona   Stunning!              1h    │
│                                               │
│  [avatar] Lina   Where did you get it        │
│                  authenticated?         30m   │
│                                               │
│  [avatar] Sarah  At the Chanel boutique      │
│                  in Dubai Mall          25m   │
│                                               │
├─────────────────────────────────────────────┤
│  [ Add a comment... ]               [Post]    │
└─────────────────────────────────────────────┘
```

### 20.4 Filtered view (Items only)

```
┌─────────────────────────────────────────────┐
│  Activity                          [bell 3]  │
├─────────────────────────────────────────────┤
│  [All] [►Items◄] [Borrows] [Wishlists] [Shares]│
├─────────────────────────────────────────────┤
│                                               │
│  ── LATEST ITEMS ────────────────────────     │
│  ┌──────────┐ ┌──────────┐                    │
│  │  [img]    │ │  [img]    │                   │  ← 2-column grid
│  │           │ │           │                   │
│  │ CHANEL    │ │ DIOR      │                   │
│  │ Classic   │ │ Saddle    │                   │
│  │ Flap      │ │ Bag       │                   │
│  │ [heart] 3 │ │ [heart] 5 │                   │
│  └──────────┘ └──────────┘                    │
│  ┌──────────┐ ┌──────────┐                    │
│  │  [img]    │ │  [img]    │                   │
│  │ GUCCI     │ │ HERMES    │                   │
│  │ Marmont   │ │ Birkin 30 │                   │
│  │ [heart] 2 │ │ [heart] 8 │                   │
│  └──────────┘ └──────────┘                    │
│                                               │
│  [See All Items]                              │
└─────────────────────────────────────────────┘
```

### 20.5 Notification center

```
┌─────────────────────────────────────────────┐
│  [<]  Notifications            [Mark All Read]│
├─────────────────────────────────────────────┤
│                                               │
│  ● [bell] Sarah sent a gentle reminder        │  ← unread (gold dot)
│    Your Chanel Classic Flap has been...       │
│    2h ago                          [Return]   │
│                                               │
│  ● [swap] Mona requested to borrow your       │  ← unread
│    Dior Saddle Bag                            │
│    5h ago                          [View]     │
│                                               │
│    [check] Layla returned your Cartier        │  ← read (no dot, muted)
│    Love Bracelet                              │
│    1d ago                                     │
│                                               │
│    [heart] Maya reacted to your shared item   │  ← read
│    2d ago                                     │
│                                               │
│    [person] Lina joined the circle            │  ← read
│    3d ago                                     │
│                                               │
└─────────────────────────────────────────────┘
```

## 21. Implementation Phasing

### Phase 1: Nudge Borrower (priority — Nasser flagged this as "quite important")

1. Migration `0008_notifications.sql` — `notifications` + `borrow_nudges` tables, `borrow_transactions` columns, `nudge_borrower()` function
2. Edge function `send-push/index.ts`
3. Client `src/lib/notifications.ts` — push token registration, notification CRUD
4. Update `src/lib/borrow.ts` — replace `nudgeBorrower` stub with real implementation
5. Update `app/borrow/active.tsx` — nudge button states, confirmation, cooldown
6. New screen `app/notifications.tsx` — notification center
7. Notification bell + badge in tab bar header
8. Push permission request flow (on first borrow action or onboarding)

### Phase 2: Feed Redesign — Shares + Social

1. Migration `0009_circle_posts.sql` — `circle_posts`, `post_reactions`, `post_comments` tables, new activity types
2. Client `src/lib/feed.ts` — sectioned feed API
3. Rewrite `app/(tabs)/activity.tsx` — sectioned feed with Featured, Latest Items, Circle Activity, Recent Shares
4. Share-to-circle flow (button on item detail)
5. Reaction bar component
6. Comment sheet component
7. Filter pills

### Phase 3: Feed Redesign — Wishlists + Polish

1. Shared wishlists section in feed
2. Wishlist sharing flow
3. Wishlist reaction (offer matching item)
4. Visual polish — animations, skeletons per section
5. Empty states per section

---

## Sources

### Notification UX Best Practices

1. **[Appcues — In-App Notifications: 8 Types, Best Practices, and Examples](https://www.appcues.com/blog/in-app-notifications)** — "In-app notifications talk to users who are already engaged, while push notifications try to bring users back." Core principle for the dual-channel nudge strategy.

2. **[AnnounceKit — In-App vs Push Notifications](https://announcekit.app/blog/in-app-notifications-vs-push-notifications)** — "Use in-app notifications when context matters. Use push notifications when timing matters." Guidance on not duplicating messages across channels; assign each channel a clear role.

3. **[Courier — Notification Center Best Practices and UX](https://www.courier.com/guides/how-to-build-a-notification-center/chapter-3-best-practices-for-notification-centers)** — "Match format to urgency." Guidance on notification center design, unread signals, front-loading important info, and scannability.

4. **[Toptal — Push Notification Best Practices: 7 Questions Designers Should Ask](https://www.toptal.com/designers/ux/push-notification-best-practices)** — Frequency and cadence management; "too many or several in a row can lead users to disengage." Starting on the lower end and following metrics closely.

5. **[Smashing Magazine — Design Guidelines For Better Notifications UX](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux)** — Notification design hierarchy, channel urgency association, frequency thresholds.

6. **[onething.design — 10 Best Practices for Push Notification UX Design](https://www.onething.design/post/best-practices-for-push-notification-ux-design)** — "Limit frequency to prevent notification overload." Key elements: relevance, timing, clarity, personalization, frequency control.

7. **[MoEngage — 19 Push Notification Best Practices](https://www.moengage.com/learn/push-notification-best-practices)** — Timing and frequency optimization, A/B testing, tracking opt-in and delivery rates.

### Social Feed Design Patterns

8. **[Engineering Enablement — Designing Instagram Taught Me Why Feeds Are Harder Than Databases](https://engineeringenablement.substack.com/p/designing-instagram-taught-me-why)** — Separating post metadata from media, hybrid feed models, read-heavy vs write-heavy considerations, why pull-based is sufficient for small follower counts.

9. **[DEV Community — Instagram System Design](https://dev.to/zeeshanali0704/instagram-system-design-48oj)** — Feed table schema (user_id, post_id, created_at), pull vs push vs hybrid feed models, database schema for posts/likes/comments/follows.

10. **[ByteByteGo — Design a News Feed System](https://bytebytego.com/courses/system-design-interview/design-a-news-feed-system)** — Feed generation architecture, content caching, social graph modeling, ranking vs chronological.

11. **[DBA Stack Exchange — System/database design for comments/replies and upvotes](https://dba.stackexchange.com/questions/316746/system-database-design-for-comments-replies-and-upvotes-at-scale)** — Reaction table pattern with `reactionType` enum, separation of post and reaction tables, closure table pattern for threaded comments.

12. **[GitHub Discussion — Modeling posts, comments, and threaded replies](https://github.com/orgs/community/discussions/167352)** — Self-referencing table pattern for comments; "single self-referencing table all the way; don't overthink this, it's a solved pattern."

### Push Notification Infrastructure

13. **[Supabase — Sending Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications)** — Official Supabase guide for Expo push notifications via Edge Functions. Database webhook → Edge Function → Expo Push API pattern. `EXPO_ACCESS_TOKEN` for enhanced security.

14. **[Expo — Using Supabase](https://docs.expo.dev/guides/using-supabase)** — Supabase + Expo integration, SDK initialization, RLS-compatible client setup.

15. **[Expo Push Notifications Setup Guide](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)** — `expo-notifications` SDK 57, push token registration, notification channels (Android), foreground handler configuration.
