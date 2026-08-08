# Trésor — Pricing Privacy and Offline Borrow Spec

**Author:** Dwight (Dev Lead)
**Date:** August 8, 2026
**Status:** Proposed — for dev team review
**Related files:** `design/full-app-mockup-v4.html` (mockup), `design/briefs/enriched-brief-muaath-v4.md` (design brief), `supabase/migrations/0001_initial_schema.sql` through `0015_borrow_item_status.sql`

---

## Part 1 — Pricing Visibility Rules

### 1.1 The Principle

Trésor is a private collection-sharing platform, not a marketplace. How much someone paid for their handbag is personal financial information. Prices must only be visible to the item's owner and co-owners — never to the broader circle in social or browsing contexts.

**The rule in one sentence:** prices appear only when the viewer has a financial stake in the item.

### 1.2 Visibility Matrix

| Screen / Context | Who is viewing | Purchase price | Current market value | Co-owner splits | Activity feed cost |
|---|---|---|---|---|---|
| **Item Detail** | Owner | Visible | Visible | Visible | N/A |
| **Item Detail** | Co-owner | Visible | Visible | Visible (their share + others) | N/A |
| **Item Detail** | Circle member (not owner) | Hidden | Hidden | Hidden | N/A |
| **Activity Feed** | Any circle member | Hidden | Hidden | Hidden | Hidden — actions only |
| **Circle / Members screen** | Any circle member | Hidden | Hidden | Hidden | N/A |
| **Collection grid** | Any circle member | Hidden | Hidden | Hidden | N/A |
| **Borrow flow** (request + approve) | Borrower (not owner) | Hidden | Hidden | Hidden | N/A |
| **Borrow flow** (offline record) | Owner recording | Visible (it's their item) | Visible | Visible | N/A |
| **Wishlist** | Owner (own wishlist) | Visible (target price) | N/A | N/A | N/A |
| **Wishlist** | Circle member (shared wishlist) | Hidden | N/A | N/A | N/A |

### 1.3 What "Prices" Means

The following fields are subject to pricing privacy rules:

- `items.purchase_price` — what the owner originally paid
- `items.estimated_value` — current estimated market value
- `price_history.price` — historical price records
- `ownership_ledger.amount` — co-ownership payment amounts
- `item_owners.amount_paid` — how much each co-owner contributed
- `item_owners.share_percentage` — ownership split percentages
- Any computed/derived price (e.g., "total circle value", "per-member collection value")

### 1.4 Implementation — Database Layer (RLS)

Currently, the `items` table has these RLS policies:

```sql
-- Owner can do everything with their own items
create policy "items_owner_all" on public.items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Circle members can SELECT items in their circle
create policy "items_circle_members_select" on public.items for select
  using (circle_id is not null and public.is_circle_member(circle_id));
```

**Problem:** The `items_circle_members_select` policy allows circle members to read ALL columns on the `items` table, including `purchase_price`, `estimated_value`, and `currency`. This means any circle member can query the raw price columns via the Supabase client.

**Solution — Column-level security via a view:**

Create a view that exposes non-sensitive columns to circle members, and restrict base table access:

```sql
-- Migration 0016: Pricing Privacy — column-level access control

-- 1. Create a function to check if the current user is an owner or co-owner of an item
create or replace function public.is_item_owner_or_coowner(_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.items i
    where i.id = _item_id
    and (
      i.owner_id = auth.uid()
      or exists (
        select 1 from public.item_owners io
        where io.item_id = i.id
        and io.user_id = auth.uid()
        and io.is_active = true
      )
    )
  );
$$;

-- 2. Create a view that exposes items with price columns NULLed for non-owners
create or replace view public.items_visible as
select
  i.id, i.owner_id, i.circle_id, i.brand, i.model_name, i.category,
  i.color, i.size, i.material, i.condition, i.status,
  i.serial_number, i.authenticity_verified, i.notes,
  i.ai_brand_confidence, i.ai_identification, i.source_url,
  i.primary_image_url, i.created_at, i.updated_at,
  i.ownership_type, i.co_borrow_approval, i.current_custodian_id,
  -- Price columns: only visible to owner or co-owners
  case when public.is_item_owner_or_coowner(i.id)
       then i.purchase_price else null end as purchase_price,
  case when public.is_item_owner_or_coowner(i.id)
       then i.estimated_value else null end as estimated_value,
  case when public.is_item_owner_or_coowner(i.id)
       then i.currency else null end as currency,
  case when public.is_item_owner_or_coowner(i.id)
       then i.purchase_date else null end as purchase_date
from public.items i;

-- 3. Revoke direct table access from authenticated role, grant view access
revoke select on public.items from authenticated;
grant select on public.items_visible to authenticated;

-- 4. Owners still need full table access for insert/update/delete
-- (the items_owner_all RLS policy handles this on the base table)
grant select, insert, update, delete on public.items to authenticated;
-- The RLS policy items_owner_all restricts non-owner mutations to nothing.

-- 5. Apply the same pattern to price_history
create or replace view public.price_history_visible as
select ph.*
from public.price_history ph
where public.is_item_owner_or_coowner(ph.item_id);

revoke select on public.price_history from authenticated;
grant select on public.price_history_visible to authenticated;

-- 6. Apply the same pattern to ownership_ledger
create or replace view public.ownership_ledger_visible as
select ol.*
from public.ownership_ledger ol
where public.is_item_owner_or_coowner(ol.item_id);

revoke select on public.ownership_ledger from authenticated;
grant select on public.ownership_ledger_visible to authenticated;

-- 7. item_owners: only owners/co-owners can see amount_paid and share_percentage
create or replace view public.item_owners_visible as
select
  io.id, io.item_id, io.user_id, io.joined_at, io.is_active,
  io.created_at, io.updated_at,
  case when public.is_item_owner_or_coowner(io.item_id)
       then io.share_percentage else null end as share_percentage,
  case when public.is_item_owner_or_coowner(io.item_id)
       then io.amount_paid else null end as amount_paid,
  case when public.is_item_owner_or_coowner(io.item_id)
       then io.currency else null end as currency
from public.item_owners io;

revoke select on public.item_owners from authenticated;
grant select on public.item_owners_visible to authenticated;
```

### 1.5 Implementation — Application Layer

#### Frontend changes required:

**`src/lib/items.ts` — `getItems()`:**
- Change all queries from `items` table to `items_visible` view
- The view automatically nulls price fields for non-owners
- No client-side filtering needed — the database handles it

**`src/lib/items.ts` — `getItemDetail()`:**
- Query `items_visible` instead of `items`
- If `purchase_price` is null, the current user is not the owner — do not render the price section
- If `purchase_price` is not null, render the full price triptych:
  - Purchase price (with currency)
  - Current estimated market value
  - Co-owner splits (query `item_owners_visible` for share data)

**`src/lib/feed.ts` — `getFeedData()`:**
- The activity feed already queries `activity_feed` which does not store price data
- Verify that `buildShareCards()` does not include price fields from items
- The `ShareCard` interface (line 23) does not include price — verify this stays clean

**`src/components/ItemCard.tsx`:**
- Remove any price display from item cards in the collection grid
- Cards should show: image, brand, model, status badge, Nº serial
- No price on grid cards, ever

**`src/components/home/RecentlyAddedCarousel.tsx`:**
- Remove price display from recently added items
- Show brand, model, and image only

**`src/components/CoOwnersPanel.tsx`:**
- This panel shows co-owner information
- Only render share percentages and amounts if the current user is the owner or a co-owner
- For non-owners viewing a co-owned item, show co-owner names only (no percentages, no amounts)

**Activity Feed component:**
- Activity entries already use `summary` text and `metadata` jsonb
- Verify that `metadata` does not contain price data for `item_added` events
- Check the trigger `create_activity_entry()` (migration 0001, line 420) — it stores `brand`, `model_name`, `category` in metadata, NOT price. This is correct.
- If any new activity triggers are added, ensure they never include price data in metadata

**Circle / Members screen:**
- Remove any per-member collection value calculations
- Remove any circle-level total value calculation
- Stats should be: piece count, member count, items on loan — never monetary value

**Borrow flow:**
- The borrow request screen must not display the item's price to the borrower
- The borrow transaction summary card should show brand, model, and status — not price
- The offline borrow recording screen (new) shows price only because the owner is the one recording it

### 1.6 Acceptance Criteria — Pricing Privacy

1. A circle member who is NOT the owner of an item cannot see `purchase_price`, `estimated_value`, `currency`, or `purchase_date` on that item — neither via the app UI nor via direct Supabase queries
2. The activity feed contains zero price references — no dollar amounts, no AED amounts, no "value" fields
3. The circle/members screen shows zero monetary values — no per-member worth, no circle total
4. The collection grid shows zero prices on item cards
5. The item detail screen shows the full price triptych ONLY when the viewer is the owner or a co-owner
6. Co-owner splits (share percentages, amounts paid) are visible only to owners and co-owners
7. The wishlist shows target prices only to the wishlist owner (already handled by `wishlists.is_private` and RLS)

---

## Part 2 — Offline Borrow Flow

### 2.1 The Concept

Trésor currently supports a single borrow mode: **request + approval**. A borrower opens an item, sends a request, the owner approves, the item goes active, and eventually it is returned.

Nasser wants a second mode: **offline borrow**. The owner hands over the item in person (at a dinner, a majlis, a coffee) and then records it in the app as a record/reminder. No request is sent, no approval is needed. The owner simply annotates "X borrowed this from me" and can mark it returned later.

This is IN ADDITION to the existing request+approval flow. Both modes coexist.

### 2.2 Two Borrow Modes — Comparison

| Aspect | Request + Approval (existing) | Offline Borrow (new) |
|---|---|---|
| **Who initiates** | Borrower | Owner (lender) |
| **Approval needed** | Yes — owner must approve | No — owner records directly |
| **Initial status** | `requested` | `active` (immediately) |
| **borrowed_at** | Set when owner approves | Set at creation time |
| **Activity feed text** | "Noor requested to borrow the Birkin 30" | "Maya borrowed the Cartier Love Bracelet" |
| **Entry point** | Item detail → "Request to Borrow" | Item detail → "Record a Borrow" |
| **Timeline states** | Requested → Accepted → Active → Returned | Active → Returned |
| **Use case** | Borrower wants something, asks formally | Owner already lent it in person, records for posterity |

### 2.3 Database Changes Required

#### 2.3.1 New Enum Value

Add a new value to the `borrow_status` enum to distinguish offline borrows from request-based borrows at the data level:

```sql
-- Migration 0017: Offline Borrow Flow

-- 1. Add 'recorded' as a pseudo-status to mark offline borrows
--    We don't need a new status for the lifecycle itself (offline borrows
--    go straight to 'active'), but we add a boolean flag to distinguish
--    the origin of the borrow.
alter table public.borrow_transactions
  add column if not exists is_offline boolean not null default false;

-- 2. Add a column for the optional return date the owner sets at creation
alter table public.borrow_transactions
  add column if not exists expected_return_date date;
```

**Why a boolean flag instead of a new status?**
The borrow lifecycle for offline borrows is simpler (Active → Returned), but both modes end up in the same `active` state once the item is lent. The `is_offline` flag lets us:
- Display the correct timeline (2-state vs 4-state) in the UI
- Generate the correct activity feed text ("borrowed" vs "requested to borrow")
- Filter/report on offline vs request-based borrows
- Keep the existing status enum and all its transitions intact

#### 2.3.2 New Activity Type

```sql
-- 3. Add new activity type for offline borrows
alter type public.activity_type add value if not exists 'borrow_recorded';
```

This is distinct from `borrow_active` (which fires when a request is approved). `borrow_recorded` fires when an owner records an offline lend.

#### 2.3.3 RLS Policy Update

Currently, only the borrower can create a borrow transaction:

```sql
create policy "borrow_insert_borrower"
  on public.borrow_transactions for insert
  with check (borrower_id = auth.uid());
```

For offline borrows, the **lender** (owner) creates the transaction, not the borrower. We need to allow owners to create borrow transactions for their own items:

```sql
-- 4. Update the insert policy to allow lenders (owners) to create offline borrows
drop policy if exists "borrow_insert_borrower" on public.borrow_transactions;

create policy "borrow_insert_borrower_or_lender"
  on public.borrow_transactions for insert
  with check (
    borrower_id = auth.uid()
    -- OR: lender is the item owner creating an offline borrow
    or (
      lender_id = auth.uid()
      and exists (
        select 1 from public.items i
        where i.id = item_id
        and i.owner_id = auth.uid()
      )
    )
  );
```

#### 2.3.4 Activity Feed Trigger

Create a trigger that fires when an offline borrow is inserted (status = 'active', is_offline = true):

```sql
-- 5. Trigger: create activity entry when an offline borrow is recorded
create or replace function public.create_offline_borrow_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _borrower_name text;
  _item_brand    text;
  _item_model    text;
  _item_display  text;
  _circle_id     uuid;
begin
  -- Only fire for offline borrows (not request-based)
  if new.is_offline = false then
    return new;
  end if;

  -- Only fire on insert (the borrow is recorded)
  if TG_OP != 'INSERT' then
    return new;
  end if;

  -- Resolve borrower name
  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = new.borrower_id;

  -- Resolve item info
  select brand, coalesce(model_name, ''), circle_id
  into _item_brand, _item_model, _circle_id
  from public.items where id = new.item_id;

  _item_display := concat_ws(' ', _item_brand, _item_model);

  -- Activity summary: "Maya borrowed the Cartier Love Bracelet"
  -- (No price — pricing privacy)
  insert into public.activity_feed (circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata)
  values (
    _circle_id,
    new.lender_id,  -- the owner who recorded the borrow is the actor
    'borrow_recorded'::public.activity_type,
    new.item_id,
    new.id,
    _borrower_name,  -- the borrower's name appears in the summary
    concat(_borrower_name, ' borrowed the ', _item_display),
    jsonb_build_object(
      'borrower_name', _borrower_name,
      'brand', _item_brand,
      'model_name', _item_model,
      'is_offline', true
    )
  );

  return new;
end;
$$;

create trigger trg_offline_borrow_activity
  after insert on public.borrow_transactions
  for each row
  execute function public.create_offline_borrow_activity();
```

#### 2.3.5 Return Activity Trigger

When an offline borrow is marked as returned, create a return activity:

```sql
-- 6. Trigger: create activity when an offline borrow is returned
create or replace function public.create_borrow_returned_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _borrower_name text;
  _item_brand    text;
  _item_model    text;
  _item_display  text;
  _circle_id     uuid;
begin
  -- Only fire when status transitions to returned_pending or completed
  if new.status not in ('returned_pending', 'completed') then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  -- Resolve borrower name
  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = new.borrower_id;

  -- Resolve item info
  select brand, coalesce(model_name, ''), circle_id
  into _item_brand, _item_model, _circle_id
  from public.items where id = new.item_id;

  _item_display := concat_ws(' ', _item_brand, _item_model);

  insert into public.activity_feed (circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata)
  values (
    _circle_id,
    new.lender_id,
    'borrow_returned'::public.activity_type,
    new.item_id,
    new.id,
    _borrower_name,
    concat(_borrower_name, ' returned the ', _item_display),
    jsonb_build_object(
      'borrower_name', _borrower_name,
      'brand', _item_brand,
      'model_name', _item_model,
      'is_offline', new.is_offline
    )
  );

  return new;
end;
$$;

create trigger trg_borrow_returned_activity
  after update of status on public.borrow_transactions
  for each row
  execute function public.create_borrow_returned_activity();
```

#### 2.3.6 Complete Migration Summary

The full migration file (`supabase/migrations/0017_offline_borrow.sql`):

```sql
-- ============================================================================
-- Migration 0017: Offline Borrow Flow
-- Adds: is_offline flag, expected_return_date, borrow_recorded activity type,
--       updated RLS for lender-initiated borrows, activity triggers.
-- ============================================================================

-- 1. Add columns
alter table public.borrow_transactions
  add column if not exists is_offline boolean not null default false;

alter table public.borrow_transactions
  add column if not exists expected_return_date date;

-- 2. Add activity type
alter type public.activity_type add value if not exists 'borrow_recorded';

-- 3. Update insert RLS policy
drop policy if exists "borrow_insert_borrower" on public.borrow_transactions;

create policy "borrow_insert_borrower_or_lender"
  on public.borrow_transactions for insert
  with check (
    borrower_id = auth.uid()
    or (
      lender_id = auth.uid()
      and exists (
        select 1 from public.items i
        where i.id = item_id
        and i.owner_id = auth.uid()
      )
    )
  );

-- 4. Activity trigger for offline borrow creation
create or replace function public.create_offline_borrow_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _borrower_name text;
  _item_brand    text;
  _item_model    text;
  _item_display  text;
  _circle_id     uuid;
begin
  if new.is_offline = false then
    return new;
  end if;

  if TG_OP != 'INSERT' then
    return new;
  end if;

  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = new.borrower_id;

  select brand, coalesce(model_name, ''), circle_id
  into _item_brand, _item_model, _circle_id
  from public.items where id = new.item_id;

  _item_display := concat_ws(' ', _item_brand, _item_model);

  insert into public.activity_feed (circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata)
  values (
    _circle_id,
    new.lender_id,
    'borrow_recorded'::public.activity_type,
    new.item_id,
    new.id,
    _borrower_name,
    concat(_borrower_name, ' borrowed the ', _item_display),
    jsonb_build_object(
      'borrower_name', _borrower_name,
      'brand', _item_brand,
      'model_name', _item_model,
      'is_offline', true
    )
  );

  return new;
end;
$$;

create trigger trg_offline_borrow_activity
  after insert on public.borrow_transactions
  for each row
  execute function public.create_offline_borrow_activity();

-- 5. Activity trigger for borrow returns (applies to both modes)
create or replace function public.create_borrow_returned_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _borrower_name text;
  _item_brand    text;
  _item_model    text;
  _item_display  text;
  _circle_id     uuid;
begin
  if new.status not in ('returned_pending', 'completed') then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = new.borrower_id;

  select brand, coalesce(model_name, ''), circle_id
  into _item_brand, _item_model, _circle_id
  from public.items where id = new.item_id;

  _item_display := concat_ws(' ', _item_brand, _item_model);

  insert into public.activity_feed (circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata)
  values (
    _circle_id,
    new.lender_id,
    'borrow_returned'::public.activity_type,
    new.item_id,
    new.id,
    _borrower_name,
    concat(_borrower_name, ' returned the ', _item_display),
    jsonb_build_object(
      'borrower_name', _borrower_name,
      'brand', _item_brand,
      'model_name', _item_model,
      'is_offline', new.is_offline
    )
  );

  return new;
end;
$$;

create trigger trg_borrow_returned_activity
  after update of status on public.borrow_transactions
  for each row
  execute function public.create_borrow_returned_activity();

-- 6. Index for filtering offline borrows
create index if not exists idx_borrow_is_offline
  on public.borrow_transactions (is_offline) where is_offline = true;
```

### 2.4 Application Layer — TypeScript

#### 2.4.1 New Function: `recordOfflineBorrow()`

Add to `src/lib/borrow.ts`:

```typescript
/**
 * Record an offline borrow — owner lends an item in person and records it.
 * No request or approval needed. Status goes directly to 'active'.
 *
 * @param params.itemId - The item being lent
 * @param params.borrowerId - The circle member who is borrowing
 * @param params.lenderId - The owner recording the borrow (must be auth.uid())
 * @param params.circleId - The circle context
 * @param params.note - Optional note ("For the gala, handed over at dinner")
 * @param params.expectedReturnDate - Optional expected return date
 */
export async function recordOfflineBorrow(params: {
  itemId: string;
  borrowerId: string;
  lenderId: string;
  circleId?: string | null;
  note?: string | null;
  expectedReturnDate?: Date | null;
}): Promise<BorrowTransactionEnriched> {
  const now = new Date().toISOString();

  const insert: BorrowInsert = {
    item_id: params.itemId,
    borrower_id: params.borrowerId,
    lender_id: params.lenderId,
    circle_id: params.circleId ?? null,
    status: 'active',           // Immediately active — no approval step
    is_offline: true,            // Flag as offline borrow
    borrower_note: params.note ?? null,
    expected_return_date: params.expectedReturnDate
      ? params.expectedReturnDate.toISOString().split('T')[0]
      : null,
    approved_at: now,            // Mark as approved (by the owner, at creation)
    borrowed_at: now,            // Mark as borrowed immediately
  };

  const { data, error } = await supabase
    .from('borrow_transactions')
    .insert(insert)
    .select(
      `*,
      items!borrow_transactions_item_id_fkey(brand, model_name, primary_image_url),
      borrower:profiles!borrow_transactions_borrower_id_fkey(display_name),
      lender:profiles!borrow_transactions_lender_id_fkey(display_name)
      `
    )
    .single();

  if (error) throw error;
  return {
    ...data,
    item_brand: (data as any).items?.brand ?? 'Unknown',
    item_model: (data as any).items?.model_name ?? null,
    item_primary_image_url: (data as any).items?.primary_image_url ?? null,
    borrower_name: (data as any).borrower?.display_name ?? 'Unknown',
    lender_name: (data as any).lender?.display_name ?? 'Unknown',
  };
}
```

#### 2.4.2 Existing Function: `markReturned()`

The existing `markReturned()` function in `src/lib/borrow.ts` (line 106) already sets status to `returned_pending`. This works for both borrow modes — the owner marks the item as returned whether it was a request-based or offline borrow.

For offline borrows, the return flow is simpler:
- Owner calls `markReturned(transactionId)` → status becomes `returned_pending`
- The `update_custodian_on_borrow` trigger (migration 0015) sets the item status back to `available`
- The `create_borrow_returned_activity` trigger (new) creates the "returned" activity entry

**No changes needed to `markReturned()`** — it already works for both modes.

#### 2.4.3 Types Update

Update the `Database` type to include the new columns:

In `src/types.ts` (or wherever the generated types live), add to the `borrow_transactions` table:

```typescript
borrow_transactions: {
  Row: {
    // ... existing fields ...
    is_offline: boolean;
    expected_return_date: string | null;
  };
  Insert: {
    // ... existing fields ...
    is_offline?: boolean;
    expected_return_date?: string | null;
  };
  Update: {
    // ... existing fields ...
    is_offline?: boolean;
    expected_return_date?: string | null;
  };
};
```

Also update the `activity_type` to include `'borrow_recorded'`.

### 2.5 UI States

#### 2.5.1 Entry Point

On the **Item Detail screen**, when the current user is the item owner, show TWO action buttons:

1. **Primary:** "Request to Borrow" — this is the existing flow, but relabelled. Actually, the owner doesn't request to borrow their own item. The primary action for the owner is different.

Revised entry points:

| Viewer role | Primary CTA on Item Detail | Secondary CTA |
|---|---|---|
| Owner | "Record a Borrow" (new) | "Edit Item" |
| Co-owner | "Request from Custodian" | "Record a Borrow" (if custodian) |
| Circle member (not owner) | "Request to Borrow" (existing) | — |

**"Record a Borrow" button:**
- Style: `btn-ghost` (secondary, not the primary gold button)
- Only visible when `current_user_id === item.owner_id`
- Tapping opens the "Record a Borrow" flow

#### 2.5.2 Record a Borrow Flow — Screen States

**State 1 — Borrower Selection:**
- Header: "Record a Borrow" kicker, item name as title
- Item summary card (thumbnail, brand, model — NO price per privacy rules)
- "Who is borrowing?" section
- Horizontal scroll of circle member avatars (monogram initials, no photos)
- User taps a member to select them (gold ring highlight)
- "Next" button (disabled until a member is selected)

**State 2 — Details and Confirm:**
- Selected borrower shown at top (avatar + name)
- Optional note field: "A note (optional)" — text input with placeholder
- Expected return: duration chips ("No set date" / "3 days" / "1 week" / "2 weeks" / "Custom")
  - "No set date" is the default (offline borrows are often open-ended)
  - Selecting a duration sets `expected_return_date` to now + duration
- "Record Borrow" primary button (btn-dark)
- Helper text: "The piece will be marked as borrowed immediately. You can mark it returned at any time."

**State 3 — Confirmation:**
- Brief success state: "Borrow recorded" with a checkmark
- Auto-dismiss after 1.5s or tap to dismiss
- Returns to Item Detail, which now shows status "Borrowed by [member name]"

#### 2.5.3 Timeline Display

The item detail's borrow history timeline should adapt based on `is_offline`:

**For request-based borrows (is_offline = false):**
- 4-state timeline: Requested → Accepted → Active → Returned
- (Existing behavior, no change)

**For offline borrows (is_offline = true):**
- 2-state timeline: Active → Returned
- The "Requested" and "Accepted" nodes are omitted
- A small note: "Recorded offline by the owner"

#### 2.5.4 Active Borrow Display

When an item has an active offline borrow, the Item Detail screen shows:
- Status badge: "Borrowed" (amber)
- Borrower info: "[Name] has this piece" with their monogram avatar
- "Mark Returned" button (visible to owner only)
- Expected return date (if set): "Expected back [date]" or "No set return date"

### 2.6 Activity Feed Integration

#### 2.6.1 Activity Entry for Offline Borrow Creation

When an offline borrow is recorded, the `create_offline_borrow_activity` trigger fires and creates:

```
type: 'borrow_recorded'
actor_name: 'Maya'  (the borrower's name)
summary: 'Maya borrowed the Cartier Love Bracelet'
metadata: { borrower_name: 'Maya', brand: 'Cartier', model_name: 'Love Bracelet', is_offline: true }
```

**Display in activity feed:**
- Avatar: borrower's monogram (or the borrower's profile avatar if they have one)
- Text: "Maya borrowed the Cartier Love Bracelet" (item name in Playfair italic)
- Thumbnail: item image
- Timestamp: "1 hour ago"
- **No price** — the activity feed never shows prices

This is distinct from request-based borrows which display as:
- "Noor requested to borrow the Hermès Birkin 30" (type: `borrow_requested`)

#### 2.6.2 Activity Entry for Offline Borrow Return

When the owner marks an offline borrow as returned, the `create_borrow_returned_activity` trigger fires:

```
type: 'borrow_returned'
actor_name: 'Maya'  (the borrower's name)
summary: 'Maya returned the Cartier Love Bracelet'
metadata: { borrower_name: 'Maya', brand: 'Cartier', model_name: 'Love Bracelet', is_offline: true }
```

**Display in activity feed:**
- Avatar: borrower's monogram
- Text: "Maya returned the Cartier Love Bracelet"
- Thumbnail: item image
- Timestamp

#### 2.6.3 Feed Rendering

In `src/lib/activity.ts` (or wherever activity entries are rendered), add handling for the new `borrow_recorded` type:

```typescript
const activityConfig: Record<ActivityType, { icon: string; label: string }> = {
  // ... existing types ...
  borrow_recorded: {
    icon: 'handover',  // a simple arrow or hand-off icon
    label: 'borrowed',
  },
  borrow_returned: {
    icon: 'return',
    label: 'returned',
  },
};
```

The summary text is pre-built by the database trigger, so the frontend just renders `activity.summary` with the item name in Playfair italic.

### 2.7 Edge Cases and Considerations

#### 2.7.1 Item Already Borrowed

If the owner tries to record an offline borrow for an item that is already `borrowed` (has an active borrow transaction), the app should:
- Show an error: "This piece is already on loan to [borrower name]. Mark it returned first."
- Block the creation of a second active borrow for the same item

**Database-level protection:** The existing `update_custodian_on_borrow` trigger (migration 0015) sets `items.status = 'borrowed'` when a borrow goes active. The frontend should check `item.status` before allowing a new borrow. Consider adding a database constraint:

```sql
-- Optional: prevent two active borrows on the same item
-- This is a partial unique index that ensures only one active borrow per item
create unique index if not exists idx_one_active_borrow_per_item
  on public.borrow_transactions (item_id)
  where status = 'active';
```

#### 2.7.2 Offline Borrow for Co-Owned Items

For co-owned items, the custodian (the owner who currently holds the item) can record an offline borrow. The `co_borrow_approval` setting on the item determines whether any co-owner can lend or only the custodian:

- If `co_borrow_approval = 'custodian'`: only the current custodian can record an offline borrow
- If `co_borrow_approval = 'any_owner'`: any active co-owner can record an offline borrow

The RLS policy should check this:

```sql
-- Update the insert policy to handle co-owned items
create policy "borrow_insert_borrower_or_lender"
  on public.borrow_transactions for insert
  with check (
    -- Borrower creates a request-based borrow
    borrower_id = auth.uid()
    -- OR: sole owner records an offline borrow
    or (
      lender_id = auth.uid()
      and exists (
        select 1 from public.items i
        where i.id = item_id
        and i.owner_id = auth.uid()
      )
    )
    -- OR: co-owner records an offline borrow (if they have permission)
    or (
      lender_id = auth.uid()
      and exists (
        select 1 from public.items i
        where i.id = item_id
        and i.ownership_type = 'co_owned'
        and (
          i.co_borrow_approval = 'any_owner'
          or i.current_custodian_id = auth.uid()
        )
        and exists (
          select 1 from public.item_owners io
          where io.item_id = i.id
          and io.user_id = auth.uid()
          and io.is_active = true
        )
      )
    )
  );
```

#### 2.7.3 Borrower Must Be a Circle Member

The borrower selected for an offline borrow must be a member of the same circle as the item. The frontend should:
- Fetch circle members for the item's circle
- Present only valid members in the borrower selection UI
- The database doesn't enforce this (the RLS just checks that the lender is the owner), so the frontend is responsible

Consider adding a database check constraint or trigger to validate that the borrower is a circle member.

#### 2.7.4 Notifications

When an offline borrow is recorded, should the borrower be notified? Yes — a push notification:

> "Mariam recorded that you borrowed the Cartier Love Bracelet. You can view the details in Trésor."

This uses the existing notification system (migration 0008). The notification type would be a new value: `borrow_recorded_notification`.

When the borrow is marked returned, notify the borrower:

> "Mariam marked the Cartier Love Bracelet as returned. Thank you."

### 2.8 Acceptance Criteria — Offline Borrow

1. An owner can record an offline borrow from the Item Detail screen by tapping "Record a Borrow"
2. The owner selects a borrower from circle members, adds an optional note and expected return date
3. The borrow is created with `status = 'active'`, `is_offline = true`, `borrowed_at = now()` — no approval step
4. The item's status changes to `borrowed` (via existing trigger)
5. The activity feed shows "Maya borrowed the Cartier Love Bracelet" (type: `borrow_recorded`) — no price
6. The owner can mark the borrow as returned from the Item Detail screen or Activity Feed
7. When returned, the activity feed shows "Maya returned the Cartier Love Bracelet" (type: `borrow_returned`)
8. The item's status returns to `available` (via existing trigger)
9. The borrow history timeline on the Item Detail shows a 2-state timeline (Active → Returned) for offline borrows, and a 4-state timeline for request-based borrows
10. Two active borrows cannot exist for the same item simultaneously (database constraint)
11. Co-owned items respect the `co_borrow_approval` setting for offline borrows
12. The borrower receives a push notification when the borrow is recorded and when it is marked returned

---

## Part 3 — Implementation Order

### Phase 1: Database Migrations (Nigel)
1. Migration 0016: Pricing privacy views and RLS updates
2. Migration 0017: Offline borrow columns, activity type, triggers, RLS policy

### Phase 2: TypeScript Layer (Dev team)
1. Update `src/types.ts` with new columns and activity type
2. Add `recordOfflineBorrow()` to `src/lib/borrow.ts`
3. Update `src/lib/items.ts` to query `items_visible` view
4. Update `src/lib/activity.ts` to handle `borrow_recorded` and `borrow_returned` types
5. Update `src/lib/feed.ts` to ensure no price data leaks into share cards

### Phase 3: UI Components (Dev team)
1. Update `ItemCard.tsx` — remove price display from grid cards
2. Update `CoOwnersPanel.tsx` — gate share/amount display behind ownership check
3. Create `RecordBorrowScreen.tsx` — the offline borrow flow (borrower selection, note, confirm)
4. Update `ItemDetailScreen.tsx` — add "Record a Borrow" button for owners, adapt timeline for offline borrows
5. Update `ActivityFeed` — render `borrow_recorded` and `borrow_returned` entries
6. Update `CircleScreen` — remove all monetary values, show non-financial stats only

### Phase 4: Testing
1. Verify a non-owner circle member cannot see prices via Supabase queries (direct table access blocked)
2. Verify the activity feed contains zero price references
3. Verify offline borrow creation, activity entry, and return flow end-to-end
4. Verify co-owned item offline borrow permissions
5. Verify the two-active-borrows constraint

---

## Appendix A — Current Schema Reference

Key tables and their relevant columns:

**`items`** — `purchase_price`, `estimated_value`, `currency`, `purchase_date` (subject to pricing privacy)
**`borrow_transactions`** — `status` (enum: requested, approved, active, returned_pending, completed, declined, cancelled), `borrower_id`, `lender_id`, `is_offline` (new), `expected_return_date` (new)
**`activity_feed`** — `type` (enum including `borrow_recorded` new), `summary`, `metadata` (jsonb, never contains prices)
**`item_owners`** — `share_percentage`, `amount_paid` (subject to pricing privacy)
**`ownership_ledger`** — `amount` (subject to pricing privacy)
**`price_history`** — `price` (subject to pricing privacy)

Current borrow flow (request-based):
```
Borrower → requestBorrow() → status: 'requested'
Owner   → acceptBorrow()   → status: 'active', borrowed_at set
Owner   → markReturned()   → status: 'returned_pending', returned_at set
Borrower→ confirmReceived()→ status: 'completed', completed_at set
```

New offline borrow flow:
```
Owner   → recordOfflineBorrow() → status: 'active', is_offline: true, borrowed_at set
Owner   → markReturned()         → status: 'returned_pending', returned_at set
```

---

## Appendix B — Assignments

| Task | Owner | Status |
|---|---|---|
| Mockup v4 (all 6 refinements) | Muaath | Briefed — see `design/briefs/enriched-brief-muaath-v4.md` |
| Migration 0016 (pricing privacy) | Nigel | Spec written above |
| Migration 0017 (offline borrow) | Nigel | Spec written above |
| TypeScript: `recordOfflineBorrow()` | Dev team | Spec written above |
| TypeScript: items_visible integration | Dev team | Spec written above |
| TypeScript: activity type handling | Dev team | Spec written above |
| UI: RecordBorrowScreen | Dev team | Spec written above |
| UI: ItemCard price removal | Dev team | Spec written above |
| UI: Circle screen price removal | Dev team | Spec written above |
| UI: Activity feed rendering | Dev team | Spec written above |
| Testing: pricing privacy | Dev team | Criteria defined above |
| Testing: offline borrow flow | Dev team | Criteria defined above |
