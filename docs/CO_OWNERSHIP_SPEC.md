# Trésor — Co-Ownership Feature Architecture

**Author:** Nigel, System Architect
**Status:** DRAFT — for Nasser's approval before implementation
**Date:** 2026-08-07
**Migration:** `0008_co_ownership.sql`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Data Model](#3-data-model)
4. [Borrow Logic](#4-borrow-logic)
5. [UI/UX Design](#5-uiux-design)
6. [Ownership Ledger](#6-ownership-ledger)
7. [Edge Cases](#7-edge-cases)
8. [Row Level Security](#8-row-level-security)
9. [API Functions](#9-api-functions)
10. [Migration Plan](#10-migration-plan)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Executive Summary

Nasser's request: *"What if two people want to share and buy something together, so they co-own the piece rather than, for example, they buy it separately or they buy and borrow. So co-owning and tagging that as a co-owned, where it's clear how much each person paid for that item."*

Co-ownership is a **differentiating feature** that no other luxury inventory or lending app offers. It transforms Trésor from "track what I own" into "track what **we** own" — enabling groups of women to collectively purchase, share, and manage high-value pieces that would be impractical for one person to buy alone.

### Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multiple owners per item | Junction table `item_owners` with share percentages | Clean normalization; supports 2–N owners; easy to query |
| `items.owner_id` retention | **Kept** as "primary owner" (listing creator) | Backward compatible with existing RLS, activity triggers, and all current queries |
| Backward compatibility | Existing sole-owned items work unchanged; `ownership_type` defaults to `'sole'` | Zero migration risk for current data |
| Custody tracking | New `items.current_custodian_id` column | Distinguishes "who owns it" from "who physically has it" — essential for co-owned items |
| Co-owner borrowing | Not a "borrow" — it's a **custody transfer** | Co-owners don't borrow their own property; they transfer physical possession |
| Non-owner borrowing | Standard borrow flow; custodian approves; all co-owners notified | Minimal change to existing borrow lifecycle |
| Financial tracking | `ownership_ledger` table for all monetary events | Audit trail for purchases, maintenance, buyouts, resale |
| Consent model | Configurable per-item: `custodian` (default) or `any_owner` | Balances flexibility with simplicity; `all_owners` deferred to phase 2 |

### What this spec covers

- **Database schema**: 3 new tables, 4 new columns on `items`, 2 new enums, updated `borrow_transactions`
- **Borrow logic**: How borrowing changes for co-owned items (custody transfers, multi-party notifications)
- **UI/UX**: Item detail, add flow, cards/badges, profile, activity feed
- **Ledger**: Cost-splitting, maintenance tracking, buyouts, resale proceeds
- **Edge cases**: 3+ owners, circle departure, lending disagreements, share sales
- **Migration**: Zero-downtime migration from single-owner model
- **API functions**: TypeScript lib layer for all co-ownership operations

---

## 2. Current State Analysis

### 2.1 Current data model (relevant tables)

```sql
-- items: one owner per item
create table public.items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  circle_id     uuid references public.circles(id) on delete set null,
  brand         text not null,
  model_name    text,
  category      item_category,
  -- ... other fields
  purchase_price  decimal(10,2),
  estimated_value decimal(10,2),
  currency        text not null default 'AED',
  is_private      boolean not null default false,
  is_lendable     boolean not null default true,
  status          item_status not null default 'available'
);

-- borrow_transactions: borrower ↔ lender (single lender)
create table public.borrow_transactions (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id   uuid not null references public.profiles(id) on delete cascade,
  status      borrow_status not null default 'requested',
  -- ...
);
```

### 2.2 Assumptions baked into the current model

1. **One owner per item** — `items.owner_id` is a single FK. All RLS policies, activity triggers, and UI components assume this.
2. **Owner = custodian** — the owner physically has the item unless it's borrowed (tracked via `borrow_transactions.status = 'active'`).
3. **Lender = owner** — `borrow_transactions.lender_id` is set to `items.owner_id` at request time. The lender approves, tracks, and receives the return.
4. **Purchase price is single-valued** — `items.purchase_price` is one number. There's no concept of "who paid what portion."

### 2.3 What changes

| Current | After |
|---------|-------|
| `owner_id` = sole owner | `owner_id` = primary owner (listing creator); `item_owners` table = all owners with shares |
| `purchase_price` = total | `item_owners.amount_paid` per owner; `items.purchase_price` = total (kept for convenience) |
| Owner always has custody | `current_custodian_id` tracks who physically has it |
| Borrow = non-owner takes temporary possession | Co-owner possession = **custody transfer** (not a borrow); non-owner borrow works as before but custodian approves |
| `lender_id` = `owner_id` | `lender_id` = `current_custodian_id` for co-owned items |
| No financial audit trail | `ownership_ledger` tracks all money events |
| No buyout/sale mechanism | Ledger + share updates support buyouts and resale |

---

## 3. Data Model

### 3.1 New enums

```sql
-- How ownership is structured for an item
do $$ begin
  create type ownership_type as enum ('sole', 'co_owned');
exception when duplicate_object then null; end $$;

-- Who must approve a borrow request for a co-owned item
do $$ begin
  create type co_borrow_approval as enum ('custodian', 'any_owner');
exception when duplicate_object then null; end $$;

-- Types of entries in the ownership ledger
do $$ begin
  create type ledger_entry_type as enum (
    'purchase',        -- initial purchase contribution
    'maintenance',     -- cleaning, repair, restoration
    'insurance',       -- insurance premium
    'storage',         -- storage/climate control
    'buyout',          -- one owner buys another's share
    'resale_proceeds', -- proceeds from selling the item
    'adjustment'       -- manual correction
  );
exception when duplicate_object then null; end $$;

-- Custody transfer status (between co-owners)
do $$ begin
  create type custody_status as enum ('requested', 'approved', 'active', 'completed', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

-- Add new activity types for co-ownership events
do $$ begin
  alter type activity_type add value if not exists 'co_ownership_created';
  alter type activity_type add value if not exists 'custody_requested';
  alter type activity_type add value if not exists 'custody_transferred';
  alter type activity_type add value if not exists 'co_owner_added';
  alter type activity_type add value if not exists 'co_owner_removed';
  alter type activity_type add value if not exists 'share_buyout';
exception when duplicate_object then null; end $$;
```

### 3.2 `items` table — new columns

```sql
alter table public.items
  add column if not exists ownership_type        ownership_type not null default 'sole',
  add column if not exists current_custodian_id   uuid references public.profiles(id) on delete set null,
  add column if not exists co_borrow_approval     co_borrow_approval not null default 'custodian';

-- current_custodian_id defaults to owner_id on insert
create or replace function public.set_default_custodian()
returns trigger
language plpgsql
as $$
begin
  if new.current_custodian_id is null then
    new.current_custodian_id := new.owner_id;
  end if;
  return new;
end;
$$;

create trigger trg_items_set_custodian
  before insert on public.items
  for each row execute function public.set_default_custodian();
```

**Column semantics:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `ownership_type` | `ownership_type` | `'sole'` | Distinguishes sole-owned (existing behavior) from co-owned (new behavior). All existing items get `'sole'` — zero behavior change. |
| `current_custodian_id` | `uuid` → `profiles` | `owner_id` (via trigger) | Who physically possesses the item right now. For sole-owned items, always equals `owner_id` (unless borrowed). For co-owned items, tracks which co-owner (or borrower) has it. |
| `co_borrow_approval` | `co_borrow_approval` | `'custodian'` | For co-owned items: who must approve a non-owner's borrow request. `'custodian'` = only the person who has it. `'any_owner'` = any co-owner can approve. |

### 3.3 `item_owners` — ownership shares junction table

```sql
create table if not exists public.item_owners (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid not null references public.items(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  share_percentage  numeric(5,2) not null check (share_percentage > 0 and share_percentage <= 100),
  amount_paid       decimal(12,2) not null default 0,
  currency          text not null default 'AED',
  joined_at         timestamptz not null default now(),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (item_id, user_id)
);

-- Indexes
create index if not exists idx_item_owners_item_id  on public.item_owners (item_id);
create index if not exists idx_item_owners_user_id  on public.item_owners (user_id);
create index if not exists idx_item_owners_active   on public.item_owners (item_id) where is_active = true;

-- Enable RLS
alter table public.item_owners enable row level security;

-- Trigger: auto-maintain updated_at
create trigger trg_item_owners_updated_at
  before update on public.item_owners
  for each row execute function public.tg_set_updated_at();
```

**Constraint: shares must sum to 100 for co-owned items.**

```sql
-- CHECK constraint via trigger: active shares for an item must sum to 100
create or replace function public.validate_item_ownership_shares()
returns trigger
language plpgsql
as $$
declare
  _total numeric(6,2);
  _ownership_type ownership_type;
begin
  select ownership_type into _ownership_type
  from public.items where id = coalesce(new.item_id, old.item_id);

  -- Only enforce for co_owned items
  if _ownership_type = 'co_owned' then
    select coalesce(sum(share_percentage), 0) into _total
    from public.item_owners
    where item_id = coalesce(new.item_id, old.item_id)
      and is_active = true;

    if _total <> 100 then
      raise exception 'Co-ownership shares must sum to 100. Current total: %', _total;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_validate_ownership_shares_insert
  after insert on public.item_owners
  for each row execute function public.validate_item_ownership_shares();

create trigger trg_validate_ownership_shares_update
  after update of share_percentage, is_active on public.item_owners
  for each row execute function public.validate_item_ownership_shares();

create trigger trg_validate_ownership_shares_delete
  after delete on public.item_owners
  for each row execute function public.validate_item_ownership_shares();
```

**Design notes:**

- `is_active = false` marks a former owner (bought out, left circle). Their row is retained for ledger history but excluded from active ownership.
- `amount_paid` is the amount this owner contributed to the **initial purchase**. Subsequent contributions (maintenance, insurance) go in the `ownership_ledger`.
- `share_percentage` can be updated (e.g., after a buyout). The trigger enforces that active shares always sum to 100 for co-owned items.
- For sole-owned items: `item_owners` is **empty**. The `owner_id` column on `items` is the sole source of truth. This avoids backfilling 100% rows for all existing items and keeps the table clean. (See §10 for the backfill strategy if we later decide to unify.)

### 3.4 `ownership_ledger` — financial audit trail

```sql
create table if not exists public.ownership_ledger (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  payer_id      uuid not null references public.profiles(id) on delete cascade,
  entry_type    ledger_entry_type not null,
  amount        decimal(12,2) not null check (amount >= 0),
  currency      text not null default 'AED',
  description   text,
  -- For cost-splitting: how the amount is divided among owners
  -- e.g., {"splits": {"user-uuid-1": 50.00, "user-uuid-2": 50.00}, "method": "equal"}
  splits        jsonb,
  -- For buyouts: which owner's share was affected
  affected_owner_id uuid references public.profiles(id) on delete set null,
  -- For buyouts: the new share percentage after the transaction
  new_share_percentage numeric(5,2),
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null
);

create index if not exists idx_ledger_item_id    on public.ownership_ledger (item_id, created_at desc);
create index if not exists idx_ledger_payer_id   on public.ownership_ledger (payer_id);
create index if not exists idx_ledger_entry_type on public.ownership_ledger (entry_type);

alter table public.ownership_ledger enable row level security;
```

**Ledger entry types and their meaning:**

| `entry_type` | When | `payer_id` | `amount` | `splits` | `affected_owner_id` |
|--------------|------|------------|----------|----------|---------------------|
| `purchase` | Item is co-purchased | Each owner | Their contribution | `null` (individual entries) | `null` |
| `maintenance` | Cleaning/repair | Who paid the bill | Total bill | `{"method": "by_share", ...}` or `{"method": "equal"}` | `null` |
| `insurance` | Insurance premium | Who paid | Premium amount | Same as maintenance | `null` |
| `storage` | Climate storage | Who paid | Cost | Same | `null` |
| `buyout` | Owner A buys Owner B's share | Owner A (buyer) | Buyout amount | `{"from_owner": "B-uuid", "to_owner": "A-uuid", "shares_bought": 30.00}` | Owner B (seller) |
| `resale_proceeds` | Item sold | Who received proceeds | Total sale price | `{"method": "by_share"}` | `null` |
| `adjustment` | Manual correction | Admin | Amount | Free-form | `null` |

### 3.5 `custody_transfers` — co-owner possession handoffs

Co-owners don't "borrow" from each other — they transfer physical custody of their own shared property. This is tracked separately from `borrow_transactions`.

```sql
create table if not exists public.custody_transfers (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.items(id) on delete cascade,
  from_user_id    uuid not null references public.profiles(id) on delete cascade,
  to_user_id      uuid not null references public.profiles(id) on delete cascade,
  circle_id       uuid references public.circles(id) on delete set null,
  status          custody_status not null default 'requested',
  requested_at    timestamptz not null default now(),
  approved_at     timestamptz,
  handed_off_at   timestamptz,
  completed_at    timestamptz,
  requester_note  text,
  approver_note   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_custody_item_id    on public.custody_transfers (item_id);
create index if not exists idx_custody_from_user  on public.custody_transfers (from_user_id);
create index if not exists idx_custody_to_user    on public.custody_transfers (to_user_id);
create index if not exists idx_custody_status     on public.custody_transfers (status);

alter table public.custody_transfers enable row level security;

create trigger trg_custody_updated_at
  before update on public.custody_transfers
  for each row execute function public.tg_set_updated_at();
```

**Custody transfer lifecycle:**

```
requested → approved → active → completed
                ↓
            declined
   (any point) → cancelled
```

1. Co-owner B requests custody → `requested` (B is `to_user_id`, current custodian is `from_user_id`)
2. Current custodian A approves → `approved`
3. A physically hands off the item → `active` (custodian is now B — `items.current_custodian_id` updated)
4. B confirms receipt → `completed`

### 3.6 `borrow_transactions` — modifications

The existing `borrow_transactions` table needs minimal changes. For co-owned items:

- `lender_id` is set to `items.current_custodian_id` (the co-owner who physically has the item), not `items.owner_id`.
- A new column flags co-owned borrows for UI differentiation.

```sql
alter table public.borrow_transactions
  add column if not exists is_co_owned_borrow boolean not null default false;
```

No other structural changes to `borrow_transactions`. The existing lifecycle (`requested → active → returned_pending → completed`) works unchanged. The only difference is WHO the lender is and WHO gets notified.

### 3.7 Updated TypeScript types

```typescript
// ── New enums ──
export type OwnershipType = 'sole' | 'co_owned';
export type CoBorrowApproval = 'custodian' | 'any_owner';
export type LedgerEntryType =
  | 'purchase' | 'maintenance' | 'insurance'
  | 'storage' | 'buyout' | 'resale_proceeds' | 'adjustment';
export type CustodyStatus =
  | 'requested' | 'approved' | 'active' | 'completed' | 'declined' | 'cancelled';

// ── Updated Item type (additions to existing Item interface) ──
export interface Item {
  // ... all existing fields ...
  ownership_type: OwnershipType;
  current_custodian_id: string | null;
  co_borrow_approval: CoBorrowApproval;
  // UI-enriched:
  custodian_name: string | null;
  co_owners: CoOwner[] | null; // null for sole-owned, array for co-owned
}

// ── New types ──
export interface CoOwner {
  id: string;              // item_owners.id
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  share_percentage: number;
  amount_paid: number;
  currency: string;
  joined_at: string;
  is_active: boolean;
}

export interface OwnershipLedgerEntry {
  id: string;
  item_id: string;
  payer_id: string;
  payer_name: string;
  entry_type: LedgerEntryType;
  amount: number;
  currency: string;
  description: string | null;
  splits: Record<string, any> | null;
  affected_owner_id: string | null;
  new_share_percentage: number | null;
  created_at: string;
  created_by: string | null;
}

export interface CustodyTransfer {
  id: string;
  item_id: string;
  item_brand: string;
  item_model: string | null;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  circle_id: string | null;
  status: CustodyStatus;
  requested_at: string;
  approved_at: string | null;
  handed_off_at: string | null;
  completed_at: string | null;
  requester_note: string | null;
  approver_note: string | null;
  created_at: string;
  updated_at: string;
}

// ── Input types ──
export interface CreateCoOwnedItemInput {
  brand: string;
  model_name?: string | null;
  category?: ItemCategory | null;
  color?: string | null;
  condition?: ItemCondition;
  estimated_value?: number | null;
  currency?: string;
  notes?: string | null;
  is_private?: boolean;
  is_lendable?: boolean;
  primary_image_url?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  circle_id?: string | null;
  co_borrow_approval?: CoBorrowApproval;
  // The co-owners with their shares and contributions
  owners: Array<{
    user_id: string;
    share_percentage: number;
    amount_paid: number;
  }>;
}

export interface AddCoOwnerInput {
  item_id: string;
  user_id: string;
  share_percentage: number;
  amount_paid?: number;
  currency?: string;
}

export interface BuyoutInput {
  item_id: string;
  buyer_id: string;       // the co-owner buying the share
  seller_id: string;      // the co-owner selling their share
  shares_bought: number;  // percentage being bought
  buyout_amount: number;  // how much the buyer paid the seller
  currency?: string;
  notes?: string;
}
```

---

## 4. Borrow Logic

### 4.1 The fundamental distinction

| Scenario | Mechanism | Table |
|----------|-----------|-------|
| Co-owner A has it, co-owner B wants it | **Custody transfer** | `custody_transfers` |
| Non-owner circle member wants to borrow a co-owned item | **Borrow** (existing flow, modified) | `borrow_transactions` |
| Non-owner circle member wants to borrow a sole-owned item | **Borrow** (existing flow, unchanged) | `borrow_transactions` |

Co-owners **never** create `borrow_transactions` for their own co-owned items. They use `custody_transfers` instead. This is semantically correct: you don't borrow your own property.

### 4.2 Co-owner custody transfers

**Flow: Co-owner B wants the item from co-owner A**

```
┌──────────┐                      ┌──────────┐                   ┌──────────┐
│ Co-owner │                      │ Current  │                   │  Items   │
│  B (wants│                      │Custodian │                   │  table   │
│  it)     │                      │  A       │                   │          │
└────┬─────┘                      └────┬─────┘                   └────┬─────┘
     │                                 │                              │
     │ 1. Create custody_transfer      │                              │
     │    (from=A, to=B, status=       │                              │
     │     'requested')                │                              │
     │────────────────────────────────►│                              │
     │                                 │                              │
     │                                 │ 2. Push notification:        │
     │                                 │    "B wants the Chanel       │
     │                                 │     you're holding"          │
     │                                 │                              │
     │                                 │ 3. A approves                │
     │                                 │    status → 'approved'       │
     │ │
     │ 4. A hands off the item         │                              │
     │    status → 'active'            │                              │
     │    UPDATE items SET             │                              │
     │      current_custodian_id = B   │─────────────────────────────►│
     │                                 │                              │
     │ 5. B confirms receipt           │                              │
     │    status → 'completed'         │                              │
     │◄────────────────────────────────│                              │
     │                                 │                              │
```

**Key rules:**
- Only the current custodian can approve a custody transfer (no one else has the item to hand off).
- When the transfer becomes `active`, `items.current_custodian_id` is updated to the `to_user_id`.
- Activity feed entry: `"B is now holding the Chanel Classic Flap"` (type: `custody_transferred`).
- No money changes hands in a custody transfer (it's just physical possession of shared property). If there's a cost (e.g., shipping), that goes in the `ownership_ledger`.

### 4.3 Non-owner borrowing a co-owned item

**Flow: Circle member C (not a co-owner) wants to borrow a co-owned item**

```
┌──────────┐                      ┌──────────────────────────────────────┐
│  Member  │                      │  Co-owned item (A & B own 50/50)     │
│  C (non- │                      │  Current custodian: A                 │
│  owner)  │                      │  co_borrow_approval: 'custodian'     │
└────┬─────┘                      └──────────────────────────────────────┘
     │
     │ 1. Create borrow_transaction
     │    item_id = co-owned item
     │    borrower_id = C
     │    lender_id = A (current_custodian_id)
     │    is_co_owned_borrow = true
     │    status = 'requested'
     │
     │ 2. Notifications:
     │    → A (custodian): "C wants to borrow your shared Chanel"
     │    → B (co-owner): "C wants to borrow the Chanel you co-own with A"
     │       (B is notified but does NOT need to approve if approval = 'custodian')
     │
     │ 3a. If co_borrow_approval = 'custodian':
     │     Only A can approve/decline.
     │
     │ 3b. If co_borrow_approval = 'any_owner':
     │     Either A or B can approve/decline.
     │     First approval wins; the other is notified "C's request was approved by B".
     │
     │ 4. A approves → status = 'active'
     │    UPDATE items SET current_custodian_id = C
     │
     │ 5. C returns the item → status = 'returned_pending'
     │    UPDATE items SET current_custodian_id = A (or whoever receives it)
     │
     │ 6. A confirms → status = 'completed'
```

**`lender_id` semantics for co-owned borrows:**

- `lender_id` is set to `items.current_custodian_id` at the time of the borrow request — the co-owner who physically has the item and must hand it over.
- This is consistent with the existing model where `lender_id` = "the person who has the item and will hand it to the borrower."
- All co-owners can see the borrow transaction (via RLS — they're all "owners" of the item).
- The return flow is the same: borrower marks returned → custodian confirms.

### 4.4 Approval matrix

| `co_borrow_approval` | Who can approve? | Who gets notified? | Use case |
|----------------------|-------------------|-------------------|----------|
| `custodian` (default) | Only `current_custodian_id` | All co-owners | Default — the person who has it decides. Simplest. |
| `any_owner` | Any active co-owner | All co-owners | More flexible — any co-owner can approve if they're comfortable. Good for close-knit groups. |

> **Phase 2 consideration:** `all_owners` mode where every co-owner must approve. This would require a `borrow_approvals` table:
> ```sql
> create table public.borrow_approvals (
>   id              uuid primary key default gen_random_uuid(),
>   borrow_txn_id   uuid not null references public.borrow_transactions(id) on delete cascade,
>   co_owner_id     uuid not null references public.profiles(id) on delete cascade,
>   approved        boolean,
>   responded_at    timestamptz,
>   unique (borrow_txn_id, co_owner_id)
> );
> ```
> Deferred because it adds complexity and friction. For 5–15 close friends, `custodian` or `any_owner` is sufficient.

### 4.5 Borrow request creation logic (pseudo-code)

```typescript
async function requestBorrow(itemId: string, borrowerId: string, note?: string) {
  // 1. Fetch the item
  const item = await getItem(itemId);

  // 2. Determine the lender
  const lenderId = item.current_custodian_id ?? item.owner_id;

  // 3. Check if borrower is a co-owner
  const isCoOwner = item.co_owners?.some(co => co.user_id === borrowerId);
  if (isCoOwner) {
    throw new Error(
      'You are a co-owner of this item. Use "Request Custody" instead of borrowing.'
    );
  }

  // 4. Create the borrow transaction
  const txn = await createBorrowTransaction({
    item_id: itemId,
    borrower_id: borrowerId,
    lender_id: lenderId,
    is_co_owned_borrow: item.ownership_type === 'co_owned',
    status: 'requested',
    borrower_note: note,
  });

  // 5. Notify all co-owners (for co-owned items)
  if (item.ownership_type === 'co_owned') {
    await notifyCoOwners(itemId, {
      title: 'Borrow Request',
      body: `${borrowerName} wants to borrow your shared ${item.brand}`,
      type: 'borrow_requested',
    });
  }

  return txn;
}
```

### 4.6 Custody request creation logic

```typescript
async function requestCustody(itemId: string, toUserId: string, note?: string) {
  const item = await getItem(itemId);

  // 1. Verify requester is an active co-owner
  const isCoOwner = item.co_owners?.some(
    co => co.user_id === toUserId && co.is_active
  );
  if (!isCoOwner) {
    throw new Error('Only co-owners can request custody.');
  }

  // 2. Verify item is not currently borrowed by a non-owner
  const activeBorrow = await getActiveBorrowForItem(itemId);
  if (activeBorrow) {
    throw new Error(
      `Item is currently borrowed by ${activeBorrow.borrower_name}. Wait for it to be returned.`
    );
  }

  // 3. Create custody transfer
  const transfer = await supabase.from('custody_transfers').insert({
    item_id: itemId,
    from_user_id: item.current_custodian_id,
    to_user_id: toUserId,
    circle_id: item.circle_id,
    status: 'requested',
    requester_note: note,
  });

  // 4. Notify the current custodian
  await notifyUser(item.current_custodian_id, {
    title: 'Custody Request',
    body: `${toUserName} wants to take the ${item.brand}`,
  });

  return transfer;
}
```

---

## 5. UI/UX Design

### 5.1 Item detail screen — co-ownership section

For co-owned items, the item detail screen (`app/item/[id].tsx`) shows a new **Co-Owners** section below the owner row:

```
┌─────────────────────────────────────────┐
│          [ Parallax item photo ]         │
│                                          │
│  CHANEL                                  │
│  Classic Flap Bag                        │
│                                          │
│  👩 Aisha  · 👩 Sarah   ← Co-Owned badge │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ CO-OWNERSHIP                        │ │
│  │                                      │ │
│  │  👩 Aisha        50%   AED 12,000   │ │
│  │  ████████████████████░░░░░░░░░░░░░  │ │
│  │                                      │ │
│  │  👩 Sarah        50%   AED 12,000   │ │
│  │  ████████████████████░░░░░░░░░░░░░  │ │
│  │                                      │ │
│  │  Total purchase: AED 24,000          │ │
│  │  Currently with: Aisha               │ │
│  │                                      │ │
│  │  [ Request Custody ]  [ View Ledger ]│ │
│  └─────────────────────────────────────┘ │
│                                          │
│  [ Request to Borrow ]  ← non-owners only│
│                                          │
│  ── Details | History | Lending ──       │
└─────────────────────────────────────────┘
```

**Behavior:**
- **Co-owner viewing:** Sees "Request Custody" button (instead of "Request to Borrow"). Sees "View Ledger" button. Can edit item details (any co-owner can edit).
- **Non-owner circle member:** Sees "Request to Borrow" button. Sees co-owners and percentages (read-only). Does not see ledger (private to co-owners).
- **Sole owner:** No co-ownership section. Existing UI unchanged.

### 5.2 Co-owned badge on item cards

A small badge on `ItemCard` for co-owned items:

```
┌─────────────────────┐
│                     │
│   [ Item photo ]    │
│                     │
│  ┌── Co-Owned ──┐   │  ← badge, gold accent
│                     │
│  CHANEL             │
│  Classic Flap       │
│  👩 Aisha +1        │  ← "+1" indicates 1 other co-owner
└─────────────────────┘
```

The badge uses the existing `Badge` component with a new variant:

```typescript
// Badge variant addition
<Badge variant="co_owned" label="Co-Owned" />

// On the card, show primary owner + "+N" for additional co-owners
// e.g., "👩 Aisha +1" for 2 owners, "👩 Aisha +2" for 3 owners
```

### 5.3 Add item flow — "Add as Co-Owned" option

The manual add screen (`app/add/manual.tsx`) gets a new toggle at the top:

```
┌─────────────────────────────────────────┐
│  ADD ITEM                                │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ Ownership                            │ │
│  │                                      │ │
│  │  [ ● Sole Owner ]  [ ○ Co-Owned ]   │ │
│  │                                      │ │
│  │  (if Co-Owned selected:)             │ │
│  │                                      │ │
│  │  Co-Owners                           │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │ 👩 Aisha (you)     50%  AED ___ │ │ │
│  │  │ ████████████████░░░░░░░░░░░░░░░ │ │ │
│  │  └─────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────┐ │ │
│  │  │ 👩 [Select member]  50%  AED ___│ │ │
│  │  │ ████████████████░░░░░░░░░░░░░░░ │ │ │
│  │  └─────────────────────────────────┘ │ │
│  │                                      │ │
│  │  [ + Add Co-Owner ]                  │ │
│  │                                      │ │
│  │  Total: AED ______                   │ │
│  │  Shares must sum to 100%             │ │
│  │                                      │ │
│  │  Borrow Approval:                    │ │
│  │  [ ● Custodian ]  [ ○ Any Owner ]   │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Brand:     [Chanel          ]           │
│  Model:     [Classic Flap    ]           │
│  ...                                      │
│                                          │
│  [        Save Item         ]            │
└─────────────────────────────────────────┘
```

**Interaction details:**
- When "Co-Owned" is selected, the co-owners section expands.
- The current user is always the first co-owner (they're adding the item).
- Additional co-owners are selected from circle members via a picker.
- Share percentages are set via sliders or text inputs; they must sum to 100%.
- The "Save Item" button is disabled until shares sum to exactly 100%.
- `amount_paid` per owner is optional but recommended (drives the ledger).
- The total purchase price (`items.purchase_price`) is auto-calculated as the sum of all `amount_paid` values, or can be entered manually.

### 5.4 Profile screen — co-owned items

On the profile screen (`app/(tabs)/profile.tsx`), co-owned items appear in the same inventory list but with the co-owned badge. A filter toggle is added:

```
┌─────────────────────────────────────────┐
│  MY TRÉSOR                               │
│                                          │
│  [ All ] [ Sole ] [ Co-Owned ]          │  ← filter tabs
│                                          │
│  Total items: 12   Total value: AED 89k │
│  Co-owned items: 3  Co-owned value: 45k │
│                                          │
│  ┌──────────┐  ┌──────────┐            │
│  │ [photo]  │  │ [photo]  │            │
│  │ CHANEL   │  │ DIOR     │            │
│  │ Co-Owned │  │          │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

**Stats section additions:**
- "Co-owned items: N" — count of items where user is in `item_owners`
- "Co-owned value: AED N" — sum of `(estimated_value × user's share_percentage / 100)` for co-owned items

### 5.5 Activity feed — co-ownership events

New activity feed entries for co-ownership events:

| Event | Activity type | Summary format | Example |
|-------|--------------|----------------|---------|
| Co-owned item added | `co_ownership_created` | `"{actor} co-added a {brand} with {co-owners}"` | "Aisha co-added a Chanel Classic Flap with Sarah" |
| Custody requested | `custody_requested` | `"{requester} requested custody of {brand}"` | "Sarah requested custody of the Chanel Classic Flap" |
| Custody transferred | `custody_transferred` | `"{new_custodian} is now holding {brand}"` | "Sarah is now holding the Chanel Classic Flap" |
| Co-owner added | `co_owner_added` | `"{actor} added {new_owner} as a co-owner of {brand}"` | "Aisha added Maya as a co-owner of the Chanel" |
| Co-owner removed | `co_owner_removed` | `"{actor} removed {removed_owner} from {brand}"` | "Aisha removed Maya from the Chanel" |
| Share buyout | `share_buyout` | `"{buyer} bought {seller}'s share of {brand}"` | "Aisha bought Sarah's 30% share of the Chanel" |

### 5.6 Feed and circle browsing

When browsing the circle feed or a member's collection:
- Co-owned items show the co-owned badge.
- If member A's collection is browsed, co-owned items where A is a co-owner appear, with a note: "Co-owned with B, C".
- A co-owned item appears in **each co-owner's** collection — this is correct because each co-owner legitimately owns a share.

---

## 6. Ownership Ledger

### 6.1 Purpose

The ledger is the financial audit trail for a co-owned item. It tracks every monetary event: initial purchase contributions, ongoing costs (maintenance, insurance, storage), buyouts, and resale proceeds. This provides transparency and prevents disputes.

### 6.2 Cost-splitting scenarios

**Scenario: Maintenance bill (AED 500 cleaning)**

Aisha pays the AED 500 bill. The cost is split by ownership share (50/50):

```json
// ownership_ledger entry
{
  "item_id": "chanel-flap-uuid",
  "payer_id": "aisha-uuid",
  "entry_type": "maintenance",
  "amount": 500.00,
  "currency": "AED",
  "description": "Professional cleaning at Lush Leather Care",
  "splits": {
    "method": "by_share",
    "details": {
      "aisha-uuid": { "share": 50, "amount": 250.00 },
      "sarah-uuid": { "share": 50, "amount": 250.00 }
    }
  }
}
```

Sarah now "owes" Aisha AED 250. The ledger doesn't enforce repayment — it's a record. A separate "balance" can be computed:

```sql
-- Compute each owner's net balance for an item
select
  io.user_id,
  -- Total they've paid (as payer in ledger)
  coalesce(sum(case when ol.payer_id = io.user_id then ol.amount else 0 end), 0) as total_paid,
  -- Total they owe (their share of all ledger entries)
  coalesce(sum(
    case
      when ol.splits->>'method' = 'by_share' then
        ol.amount * io.share_percentage / 100
      when ol.splits->>'method' = 'equal' then
        ol.amount / (select count(*) from item_owners where item_id = io.item_id and is_active)
      else 0
    end
  ), 0) as total_owed
from item_owners io
left join ownership_ledger ol on ol.item_id = io.item_id
where io.item_id = $1 and io.is_active = true
group by io.user_id, io.share_percentage;
```

### 6.3 Buyout flow

**Scenario: Aisha buys Sarah's 30% share (Sarah keeps 20%, Aisha goes from 50% to 80%)**

```
Step 1: Aisha initiates buyout
  → ownership_ledger entry: buyout, amount=buyout_price, payer=Aisha,
    affected_owner=Sarah, new_share_percentage for Sarah = 20%, for Aisha = 80%

Step 2: Update item_owners shares
  → Sarah's share_percentage: 50 → 20
  → Aisha's share_percentage: 50 → 80
  → (trigger validates shares still sum to 100)

Step 3: Activity feed
  → "Aisha bought 30% of Sarah's share of the Chanel Classic Flap"

Step 4: If Sarah sells ALL her shares (full buyout)
  → Sarah's is_active = false
  → If only one active owner remains, optionally convert to sole ownership:
    UPDATE items SET ownership_type = 'sole' WHERE id = $item_id;
```

**Buyout requires mutual consent:** The seller must accept the buyout. The flow is:

1. Buyer proposes buyout (amount, shares) → creates a `buyout_proposal` (stored as a ledger entry with `entry_type = 'buyout'` and a `status` field in splits JSON, or a separate lightweight table).
2. Seller accepts/declines.
3. On accept: shares are updated, ledger entry is finalized.
4. On decline: ledger entry is marked as cancelled.

> For MVP, the buyout proposal can be handled in-app via a simple accept/decline flow. No separate table is needed — the proposal state lives in the `splits` JSON: `{"status": "pending", "proposed_by": "buyer-uuid", "proposed_to": "seller-uuid"}`.

### 6.4 Resale proceeds

**Scenario: Co-owned item is sold for AED 30,000 (Aisha 50%, Sarah 50%)**

```
Step 1: Record resale in ledger
  → entry_type = 'resale_proceeds', amount = 30000,
    splits = {"method": "by_share", "details": {...}}
  → Each owner's share: AED 15,000

Step 2: Mark item as sold
  → UPDATE items SET status = 'unavailable', is_lendable = false
  → (Or add 'sold' to item_status enum in a future migration)

Step 3: Deactivate all ownership shares
  → UPDATE item_owners SET is_active = false WHERE item_id = $item_id

Step 4: Activity feed
  → "Chanel Classic Flap was sold for AED 30,000 (split 50/50)"
```

### 6.5 Ledger UI

The ledger view is accessible from the item detail screen (co-owned items only):

```
┌─────────────────────────────────────────┐
│  OWNERSHIP LEDGER                        │
│  Chanel Classic Flap                     │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ 📦 Purchase    AED 24,000           │ │
│  │ Aisha paid AED 12,000 (50%)         │ │
│  │ Sarah paid AED 12,000 (50%)         │ │
│  │ Aug 5, 2026                         │ │
│  ├─────────────────────────────────────┤ │
│  │ 🧼 Maintenance  AED 500             │ │
│  │ Aisha paid · Split 50/50            │ │
│  │ Sarah owes Aisha AED 250            │ │
│  │ Aug 10, 2026                        │ │
│  ├─────────────────────────────────────┤ │
│  │ 🛡️ Insurance   AED 1,200            │ │
│  │ Sarah paid · Split 50/50            │ │
│  │ Aisha owes Sarah AED 600            │ │
│  │ Sep 1, 2026                         │ │
│  ├─────────────────────────────────────┤ │
│  │ 💰 Buyout      AED 6,000            │ │
│  │ Aisha bought 30% from Sarah         │ │
│  │ New shares: Aisha 80%, Sarah 20%    │ │
│  │ Oct 15, 2026                        │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Current balances:                       │
│  Aisha: +AED 350 (Sarah owes Aisha)     │
│  Sarah: -AED 350                         │
│                                          │
│  [ + Add Expense ]  [ Settle Up ]       │
└─────────────────────────────────────────┘
```

---

## 7. Edge Cases

### 7.1 Three or more co-owners

The `item_owners` junction table supports any number of co-owners. The UI must handle:

- **Add flow:** "Add Co-Owner" button adds additional rows. Share sliders adjust dynamically.
- **Item detail:** Co-owners section shows all owners in a scrollable list.
- **Item card:** "👩 Aisha +2" for 3 owners, "+3" for 4, etc.
- **Notifications:** All co-owners are notified of borrow requests and custody changes.
- **Ledger splits:** "by_share" method uses each owner's `share_percentage`. "equal" method divides by `count(active owners)`.
- **Custody transfers:** Only the current custodian → requesting co-owner. Other co-owners are notified but not involved.

**Example: 3-way split (30/30/40)**

```sql
INSERT INTO item_owners (item_id, user_id, share_percentage, amount_paid) VALUES
  ($item_id, $aisha_id, 30.00, 7200.00),
  ($item_id, $sarah_id, 30.00, 7200.00),
  ($item_id, $maya_id,  40.00, 9600.00);
-- Total: AED 24,000, shares sum to 100% ✓
```

### 7.2 Co-owner leaves the circle

When a circle member leaves (removed from `circle_members`), their co-owned items need resolution.

**Options (presented to the departing member):**

1. **Sell shares to remaining co-owner(s)** — buyout flow. The departing member's shares are transferred to the remaining co-owner(s) proportionally or as agreed.
2. **Sell shares to a new circle member** — the departing member's shares are transferred to a new member who joins.
3. **Keep shares (if still friends)** — the departing member retains ownership but the item is no longer visible in the circle (visibility changes, not ownership).

**Recommended default:** The app prompts remaining co-owners when a member leaves:

```
┌─────────────────────────────────────────┐
│  Sarah is leaving the circle             │
│                                          │
│  She co-owns 2 items with you:           │
│  • Chanel Classic Flap (50%)            │
│  • Dior Saddle Bag (30%)                │
│                                          │
│  What should happen to her shares?       │
│                                          │
│  [ Buy out Sarah's shares ]              │
│  [ Transfer to another member ]          │
│  [ Sarah keeps her shares ]              │
└─────────────────────────────────────────┘
```

**If unresolved:** The departing member's shares remain `is_active = true` but the item is flagged with a `needs_resolution` state (UI warning). The item stays visible to co-owners but borrowing is paused until resolved.

**Implementation:** This is primarily a UI flow + buyout mechanism. No schema change needed — the buyout flow (§6.3) handles the share transfer. A flag on `item_owners` could mark pending departures:

```sql
-- Optional: mark pending departure (not in initial migration)
alter table public.item_owners
  add column if not exists departure_status text check (departure_status in ('pending', 'resolved'));
```

### 7.3 Co-owners disagree on lending

**Scenario:** Non-owner C requests to borrow a co-owned item. Co-owner A wants to approve, co-owner B wants to decline.

**Resolution by `co_borrow_approval` setting:**

| Setting | Behavior on disagreement |
|---------|--------------------------|
| `custodian` | Only the custodian decides. B's opinion doesn't matter (B isn't the custodian). No disagreement possible. |
| `any_owner` | First responder wins. If A approves before B declines, it's approved. B is notified "approved by A." If B declines first, it's declined. A is notified. |

**For true consensus (phase 2):** The `all_owners` mode would require every co-owner to approve. If any declines, the request is declined. This is the safest but slowest model. Implement via `borrow_approvals` table (§4.4). Deferred because it adds friction and complexity for a small group.

**Practical guidance for Nasser:** For 5–15 close friends, `custodian` mode (default) is best. The person who physically has the item decides. If a co-owner is uncomfortable, they can message the custodian directly (outside the app). The app shouldn't over-engineer social dynamics.

### 7.4 One co-owner wants to sell their share

This is a **partial buyout** (§6.3). The flow:

1. Selling co-owner marks their shares as "for sale" (optional UI — could be a simple flag in `item_owners` or just a manual buyout initiation).
2. Other co-owners are notified: "Sarah wants to sell her 30% share of the Chanel."
3. A co-owner (or a new circle member) buys the shares via the buyout flow.
4. If no one buys within a timeframe, the seller can:
   - Lower the asking price.
   - Bring in an outside buyer (who must join the circle first).
   - Convert to "sole ownership" by selling to one remaining co-owner who becomes 100% owner.

**If all shares are sold to one person:** `ownership_type` converts to `'sole'`, `owner_id` updates to the buyer, `item_owners` rows are deactivated.

### 7.5 Co-owner deletes their account

When a user deletes their auth account, `profiles` cascades. We need to handle `item_owners.user_id`:

- `ON DELETE CASCADE` is already set on `item_owners.user_id → profiles.id`. This would delete the ownership row, breaking the "shares sum to 100" constraint.
- **Better approach:** Change to `ON DELETE SET NULL` and handle in app logic:

```sql
-- This should be in the migration, replacing the CASCADE:
-- Note: the initial CREATE TABLE uses ON DELETE CASCADE.
-- We alter it to SET NULL to prevent breaking share totals.
alter table public.item_owners
  drop constraint if exists item_owners_user_id_fkey,
  add constraint item_owners_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null;
```

When `user_id` becomes NULL, the row is effectively orphaned. A trigger or app-level process redistributes the shares or flags the item for resolution. The activity feed entry would read: "A co-owner left; shares need rebalancing."

> **Simpler alternative for MVP:** Keep `ON DELETE CASCADE` but add a `BEFORE DELETE` trigger on `profiles` that converts any co-owned items to sole ownership (remaining co-owner with the highest share becomes the sole owner) before the cascade fires. This is lossy but safe.

### 7.6 Item is borrowed when a custody transfer is requested

If a non-owner is currently borrowing the item (`borrow_transactions.status = 'active'`), custody transfer requests are blocked:

```typescript
const activeBorrow = await getActiveBorrowForItem(itemId);
if (activeBorrow) {
  throw new Error(
    `${activeBorrow.borrower_name} is currently borrowing this item. ` +
    `Wait for it to be returned before requesting custody.`
  );
}
```

### 7.7 Custodian leaves the item somewhere ambiguous

If `current_custodian_id` needs to be set manually (e.g., the custodian left the item at a third party's house), any co-owner can update it via an "Update Custody" action in the item detail. This creates a ledger note but doesn't require the full custody transfer flow.

---

## 8. Row Level Security

### 8.1 `item_owners` policies

```sql
-- Co-owners can see who owns their shared items
create policy "item_owners_select_co_owners_or_circle"
  on public.item_owners for select
  using (
    -- You are an owner of this item
    user_id = auth.uid()
    -- Or you're an owner (any active row for this item with your user_id)
    or exists (
      select 1 from public.item_owners io2
      where io2.item_id = item_owners.item_id
        and io2.user_id = auth.uid()
        and io2.is_active = true
    )
    -- Or you're a circle member viewing a non-private item
    or exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.circle_id is not null
        and not i.is_private
        and public.is_circle_member(i.circle_id)
    )
  );

-- Only co-owners can insert/update ownership shares
create policy "item_owners_insert_co_owners"
  on public.item_owners for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.owner_id = auth.uid()
    )
  );

create policy "item_owners_update_co_owners"
  on public.item_owners for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.owner_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.owner_id = auth.uid()
    )
  );

-- Only the primary owner can delete ownership rows
create policy "item_owners_delete_owner"
  on public.item_owners for delete
  using (
    exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.owner_id = auth.uid()
    )
  );
```

### 8.2 `ownership_ledger` policies

```sql
-- Co-owners can see the ledger for their items
create policy "ledger_select_co_owners"
  on public.ownership_ledger for select
  using (
    exists (
      select 1 from public.item_owners io
      where io.item_id = ownership_ledger.item_id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
    -- Primary owner can also see it
    or exists (
      select 1 from public.items i
      where i.id = ownership_ledger.item_id
        and i.owner_id = auth.uid()
    )
  );

-- Co-owners and primary owner can create ledger entries
create policy "ledger_insert_owners"
  on public.ownership_ledger for insert
  with check (
    payer_id = auth.uid()
    and (
      exists (
        select 1 from public.item_owners io
        where io.item_id = ownership_ledger.item_id
          and io.user_id = auth.uid()
          and io.is_active = true
      )
      or exists (
        select 1 from public.items i
        where i.id = ownership_ledger.item_id
          and i.owner_id = auth.uid()
      )
    )
  );

-- No updates or deletes on ledger entries (immutable audit trail)
-- (No UPDATE/DELETE policies = blocked by RLS)
```

### 8.3 `custody_transfers` policies

```sql
-- Participants and co-owners can see custody transfers
create policy "custody_select_parties_or_co_owners"
  on public.custody_transfers for select
  using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
    or exists (
      select 1 from public.item_owners io
      where io.item_id = custody_transfers.item_id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
    or (
      custody_transfers.circle_id is not null
      and public.is_circle_member(custody_transfers.circle_id)
    )
  );

-- Any co-owner can request custody (they're requesting TO themself)
create policy "custody_insert_co_owners"
  on public.custody_transfers for insert
  with check (
    to_user_id = auth.uid()
    and exists (
      select 1 from public.item_owners io
      where io.item_id = custody_transfers.item_id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
  );

-- From-user (current custodian) and to-user can update
create policy "custody_update_parties"
  on public.custody_transfers for update
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());
```

### 8.4 Updated `items` policies

The existing `items_owner_all` policy uses `owner_id = auth.uid()`. Co-owners who are NOT the primary owner need access too. Add a new policy:

```sql
-- Co-owners have full access to co-owned items
create policy "items_co_owner_all"
  on public.items for all
  using (
    exists (
      select 1 from public.item_owners io
      where io.item_id = items.id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.item_owners io
      where io.item_id = items.id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
  );
```

This supplements (does not replace) the existing `items_owner_all` policy. Both are OR'd together by Postgres.

### 8.5 Updated `borrow_transactions` policies

Co-owners need to see borrow transactions for their co-owned items:

```sql
-- Co-owners can see borrows of their co-owned items
create policy "borrow_select_co_owners"
  on public.borrow_transactions for select
  using (
    borrower_id = auth.uid()
    or lender_id = auth.uid()
    or (circle_id is not null and public.is_circle_member(circle_id))
    -- NEW: co-owners can see borrows of their items
    or exists (
      select 1 from public.item_owners io
      where io.item_id = borrow_transactions.item_id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
  );
```

---

## 9. API Functions

### 9.1 `src/lib/coOwnership.ts` — new file

```typescript
/**
 * Co-Ownership API — manages item_owners, custody transfers,
 * and the ownership ledger.
 *
 * RLS: co-owners have full access to their shared items; circle members
 * can view co-owned items (non-private); ledger is visible to co-owners only.
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';
import type {
  CoOwner,
  OwnershipLedgerEntry,
  CustodyTransfer,
  CreateCoOwnedItemInput,
  AddCoOwnerInput,
  BuyoutInput,
} from '@/types/items';

// ─── Create a co-owned item ───

export async function createCoOwnedItem(
  input: CreateCoOwnedItemInput
): Promise<{ item: any; owners: CoOwner[] }> {
  // Use a Supabase RPC (database function) for atomicity
  const { data, error } = await supabase.rpc('create_co_owned_item', {
    p_brand: input.brand,
    p_model_name: input.model_name,
    p_category: input.category,
    p_color: input.color,
    p_condition: input.condition,
    p_estimated_value: input.estimated_value,
    p_currency: input.currency ?? 'AED',
    p_notes: input.notes,
    p_is_private: input.is_private ?? false,
    p_is_lendable: input.is_lendable ?? true,
    p_primary_image_url: input.primary_image_url,
    p_purchase_price: input.purchase_price,
    p_purchase_date: input.purchase_date,
    p_circle_id: input.circle_id,
    p_co_borrow_approval: input.co_borrow_approval ?? 'custodian',
    p_owners: input.owners, // array of { user_id, share_percentage, amount_paid }
  });

  if (error) throw error;
  return data;
}

// ─── Fetch co-owners for an item ───

export async function getCoOwners(itemId: string): Promise<CoOwner[]> {
  const { data, error } = await supabase
    .from('item_owners')
    .select(`
      *,
      profiles!item_owners_user_id_fkey(display_name, avatar_url)
    `)
    .eq('item_id', itemId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.profiles?.display_name ?? 'Unknown',
    avatar_url: row.profiles?.avatar_url ?? null,
    share_percentage: Number(row.share_percentage),
    amount_paid: Number(row.amount_paid),
    currency: row.currency,
    joined_at: row.joined_at,
    is_active: row.is_active,
  }));
}

// ─── Add a co-owner to an existing sole-owned item ───

export async function addCoOwner(input: AddCoOwnerInput): Promise<CoOwner> {
  // First, convert the item to co_owned
  await supabase
    .from('items')
    .update({ ownership_type: 'co_owned' })
    .eq('id', input.item_id);

  // Insert the new co-owner
  const { data, error } = await supabase
    .from('item_owners')
    .insert({
      item_id: input.item_id,
      user_id: input.user_id,
      share_percentage: input.share_percentage,
      amount_paid: input.amount_paid ?? 0,
      currency: input.currency ?? 'AED',
    })
    .select(`
      *,
      profiles!item_owners_user_id_fkey(display_name, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Also create a row for the primary owner if one doesn't exist
  // (This happens when converting from sole → co_owned)
  const { data: existingOwner } = await supabase
    .from('item_owners')
    .select('id')
    .eq('item_id', input.item_id)
    .eq('user_id', (await supabase.from('items').select('owner_id').eq('id', input.item_id).single()).data?.owner_id)
    .maybeSingle();

  if (!existingOwner) {
    const { data: itemData } = await supabase
      .from('items')
      .select('owner_id, purchase_price, currency')
      .eq('id', input.item_id)
      .single();

    if (itemData) {
      await supabase.from('item_owners').insert({
        item_id: input.item_id,
        user_id: itemData.owner_id,
        share_percentage: 100 - input.share_percentage,
        amount_paid: Number(itemData.purchase_price ?? 0) * (100 - input.share_percentage) / 100,
        currency: itemData.currency,
      });
    }
  }

  return {
    id: data.id,
    user_id: data.user_id,
    display_name: data.profiles?.display_name ?? 'Unknown',
    avatar_url: data.profiles?.avatar_url ?? null,
    share_percentage: Number(data.share_percentage),
    amount_paid: Number(data.amount_paid),
    currency: data.currency,
    joined_at: data.joined_at,
    is_active: data.is_active,
  };
}

// ─── Remove a co-owner (buyout) ───

export async function buyoutShare(input: BuyoutInput): Promise<void> {
  const { error } = await supabase.rpc('process_buyout', {
    p_item_id: input.item_id,
    p_buyer_id: input.buyer_id,
    p_seller_id: input.seller_id,
    p_shares_bought: input.shares_bought,
    p_buyout_amount: input.buyout_amount,
    p_currency: input.currency ?? 'AED',
    p_notes: input.notes,
  });

  if (error) throw error;
}

// ─── Custody transfers ───

export async function requestCustody(params: {
  itemId: string;
  toUserId: string;
  circleId?: string | null;
  note?: string;
}): Promise<CustodyTransfer> {
  const { data: item } = await supabase
    .from('items')
    .select('current_custodian_id, circle_id')
    .eq('id', params.itemId)
    .single();

  if (!item) throw new Error('Item not found');

  const { data, error } = await supabase
    .from('custody_transfers')
    .insert({
      item_id: params.itemId,
      from_user_id: item.current_custodian_id,
      to_user_id: params.toUserId,
      circle_id: params.circleId ?? item.circle_id,
      status: 'requested',
      requester_note: params.note ?? null,
    })
    .select(`
      *,
      items!custody_transfers_item_id_fkey(brand, model_name),
      from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
      to_user:profiles!custody_transfers_to_user_id_fkey(display_name)
    `)
    .single();

  if (error) throw error;
  return enrichCustodyTransfer(data);
}

export async function approveCustody(transferId: string): Promise<CustodyTransfer> {
  const { data, error } = await supabase
    .from('custody_transfers')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', transferId)
    .select(`
      *,
      items!custody_transfers_item_id_fkey(brand, model_name),
      from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
      to_user:profiles!custody_transfers_to_user_id_fkey(display_name)
    `)
    .single();

  if (error) throw error;
  return enrichCustodyTransfer(data);
}

export async function completeCustodyHandoff(transferId: string): Promise<CustodyTransfer> {
  // 1. Mark transfer as active and update item custodian
  const { data: transfer } = await supabase
    .from('custody_transfers')
    .select('item_id, to_user_id')
    .eq('id', transferId)
    .single();

  if (!transfer) throw new Error('Transfer not found');

  // Update item custodian
  await supabase
    .from('items')
    .update({ current_custodian_id: transfer.to_user_id })
    .eq('id', transfer.item_id);

  // Mark transfer as active
  const { data, error } = await supabase
    .from('custody_transfers')
    .update({
      status: 'active',
      handed_off_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .select(`
      *,
      items!custody_transfers_item_id_fkey(brand, model_name),
      from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
      to_user:profiles!custody_transfers_to_user_id_fkey(display_name)
    `)
    .single();

  if (error) throw error;
  return enrichCustodyTransfer(data);
}

export async function confirmCustodyReceived(transferId: string): Promise<CustodyTransfer> {
  const { data, error } = await supabase
    .from('custody_transfers')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .select(`
      *,
      items!custody_transfers_item_id_fkey(brand, model_name),
      from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
      to_user:profiles!custody_transfers_to_user_id_fkey(display_name)
    `)
    .single();

  if (error) throw error;
  return enrichCustodyTransfer(data);
}

export async function declineCustody(transferId: string): Promise<CustodyTransfer> {
  const { data, error } = await supabase
    .from('custody_transfers')
    .update({ status: 'declined' })
    .eq('id', transferId)
    .select(`
      *,
      items!custody_transfers_item_id_fkey(brand, model_name),
      from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
      to_user:profiles!custody_transfers_to_user_id_fkey(display_name)
    `)
    .single();

  if (error) throw error;
  return enrichCustodyTransfer(data);
}

export async function getActiveCustodyTransfers(userId: string): Promise<CustodyTransfer[]> {
  const { data, error } = await supabase
    .from('custody_transfers')
    .select(`
      *,
      items!custody_transfers_item_id_fkey(brand, model_name),
      from_user:profiles!custody_transfers_from_user_id_fkey(display_name),
      to_user:profiles!custody_transfers_to_user_id_fkey(display_name)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .in('status', ['requested', 'approved', 'active'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(enrichCustodyTransfer);
}

// ─── Ownership ledger ───

export async function getOwnershipLedger(itemId: string): Promise<OwnershipLedgerEntry[]> {
  const { data, error } = await supabase
    .from('ownership_ledger')
    .select(`
      *,
      payer:profiles!ownership_ledger_payer_id_fkey(display_name)
    `)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    item_id: row.item_id,
    payer_id: row.payer_id,
    payer_name: row.payer?.display_name ?? 'Unknown',
    entry_type: row.entry_type,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    splits: row.splits,
    affected_owner_id: row.affected_owner_id,
    new_share_percentage: row.new_share_percentage,
    created_at: row.created_at,
    created_by: row.created_by,
  }));
}

export async function addLedgerEntry(params: {
  itemId: string;
  payerId: string;
  entryType: 'maintenance' | 'insurance' | 'storage' | 'adjustment';
  amount: number;
  currency?: string;
  description?: string;
  splitMethod?: 'by_share' | 'equal';
  createdBy?: string;
}): Promise<OwnershipLedgerEntry> {
  const { data, error } = await supabase
    .from('ownership_ledger')
    .insert({
      item_id: params.itemId,
      payer_id: params.payerId,
      entry_type: params.entryType,
      amount: params.amount,
      currency: params.currency ?? 'AED',
      description: params.description ?? null,
      splits: { method: params.splitMethod ?? 'by_share' },
      created_by: params.createdBy ?? params.payerId,
    })
    .select(`
      *,
      payer:profiles!ownership_ledger_payer_id_fkey(display_name)
    `)
    .single();

  if (error) throw error;
  return {
    id: data.id,
    item_id: data.item_id,
    payer_id: data.payer_id,
    payer_name: data.payer?.display_name ?? 'Unknown',
    entry_type: data.entry_type,
    amount: Number(data.amount),
    currency: data.currency,
    description: data.description,
    splits: data.splits,
    affected_owner_id: data.affected_owner_id,
    new_share_percentage: data.new_share_percentage,
    created_at: data.created_at,
    created_by: data.created_by,
  };
}

// ─── Get co-owned items for a user ───

export async function getMyCoOwnedItems(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('item_owners')
    .select(`
      share_percentage,
      amount_paid,
      items!inner(
        *,
        profiles!items_owner_id_fkey(display_name),
        custodian:profiles!items_current_custodian_id_fkey(display_name)
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row.items,
    owner_name: row.items?.profiles?.display_name ?? 'Unknown',
    custodian_name: row.items?.custodian?.display_name ?? null,
    my_share: Number(row.share_percentage),
    my_amount_paid: Number(row.amount_paid),
  }));
}

// ─── Helpers ───

function enrichCustodyTransfer(row: any): CustodyTransfer {
  return {
    id: row.id,
    item_id: row.item_id,
    item_brand: row.items?.brand ?? 'Unknown',
    item_model: row.items?.model_name ?? null,
    from_user_id: row.from_user_id,
    from_user_name: row.from_user?.display_name ?? 'Unknown',
    to_user_id: row.to_user_id,
    to_user_name: row.to_user?.display_name ?? 'Unknown',
    circle_id: row.circle_id,
    status: row.status,
    requested_at: row.requested_at,
    approved_at: row.approved_at,
    handed_off_at: row.handed_off_at,
    completed_at: row.completed_at,
    requester_note: row.requester_note,
    approver_note: row.approver_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
```

### 9.2 Database functions (RPC)

```sql
-- ─── create_co_owned_item ───
-- Atomically creates an item + its ownership shares in a single transaction.
create or replace function public.create_co_owned_item(
  p_brand              text,
  p_model_name         text,
  p_category           item_category,
  p_color              text,
  p_condition          item_condition,
  p_estimated_value    decimal(10,2),
  p_currency           text,
  p_notes              text,
  p_is_private         boolean,
  p_is_lendable        boolean,
  p_primary_image_url  text,
  p_purchase_price     decimal(10,2),
  p_purchase_date      date,
  p_circle_id          uuid,
  p_co_borrow_approval co_borrow_approval,
  p_owners             jsonb  -- [{"user_id":"...","share_percentage":50,"amount_paid":12000}, ...]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id     uuid;
  v_owner       jsonb;
  v_total_shares numeric(6,2) := 0;
  v_total_paid   decimal(12,2) := 0;
  v_actor_name  text;
begin
  -- Validate shares sum to 100
  foreach v_owner in array (
    select array_agg(value) from jsonb_array_elements(p_owners)
  )
  loop
    v_total_shares := v_total_shares + (v_owner->>'share_percentage')::numeric;
    v_total_paid := v_total_paid + (v_owner->>'amount_paid')::decimal;
  end loop;

  if v_total_shares <> 100 then
    raise exception 'Shares must sum to 100. Got: %', v_total_shares;
  end if;

  -- Get primary owner (first in array)
  v_actor_name := (
    select coalesce(display_name, phone)
    from profiles where id = (p_owners->0->>'user_id')::uuid
  );

  -- Create the item
  insert into public.items (
    owner_id, circle_id, brand, model_name, category, color, condition,
    status, purchase_price, purchase_date, estimated_value, currency,
    notes, is_private, is_lendable, primary_image_url,
    ownership_type, co_borrow_approval
  ) values (
    (p_owners->0->>'user_id')::uuid,  -- primary owner = first in array
    p_circle_id, p_brand, p_model_name, p_category, p_color, p_condition,
    'available', p_purchase_price, p_purchase_date, p_estimated_value, p_currency,
    p_notes, p_is_private, p_is_lendable, p_primary_image_url,
    'co_owned', p_co_borrow_approval
  )
  returning id into v_item_id;

  -- Insert ownership shares
  foreach v_owner in array (
    select array_agg(value) from jsonb_array_elements(p_owners)
  )
  loop
    insert into public.item_owners (item_id, user_id, share_percentage, amount_paid, currency)
    values (
      v_item_id,
      (v_owner->>'user_id')::uuid,
      (v_owner->>'share_percentage')::numeric,
      (v_owner->>'amount_paid')::decimal,
      p_currency
    );
  end loop;

  -- Insert purchase ledger entries
  foreach v_owner in array (
    select array_agg(value) from jsonb_array_elements(p_owners)
  )
  loop
    insert into public.ownership_ledger (item_id, payer_id, entry_type, amount, currency, description, created_by)
    values (
      v_item_id,
      (v_owner->>'user_id')::uuid,
      'purchase',
      (v_owner->>'amount_paid')::decimal,
      p_currency,
      'Initial purchase contribution',
      (p_owners->0->>'user_id')::uuid
    );
  end loop;

  -- Create activity feed entry
  insert into public.activity_feed (circle_id, user_id, type, item_id, actor_name, summary, metadata)
  values (
    p_circle_id,
    (p_owners->0->>'user_id')::uuid,
    'co_ownership_created'::activity_type,
    v_item_id,
    v_actor_name,
    concat(v_actor_name, ' co-added a ', concat_ws(' ', p_brand, p_model_name)),
    jsonb_build_object('brand', p_brand, 'co_owners', p_owners)
  );

  return jsonb_build_object('item_id', v_item_id, 'success', true);
end;
$$;

-- ─── process_buyout ───
-- Handles a share buyout: updates shares, creates ledger entry, optionally converts to sole.
create or replace function public.process_buyout(
  p_item_id        uuid,
  p_buyer_id       uuid,
  p_seller_id      uuid,
  p_shares_bought  numeric(5,2),
  p_buyout_amount  decimal(12,2),
  p_currency       text,
  p_notes          text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_share numeric(5,2);
  v_buyer_share  numeric(5,2);
  v_new_seller_share numeric(5,2);
  v_new_buyer_share  numeric(5,2);
  v_active_count int;
  v_actor_name   text;
begin
  -- Get current shares
  select share_percentage into v_seller_share
  from public.item_owners
  where item_id = p_item_id and user_id = p_seller_id and is_active = true;

  if not found then
    raise exception 'Seller is not an active co-owner of this item';
  end if;

  if p_shares_bought > v_seller_share then
    raise exception 'Cannot buy more shares (%) than seller owns (%)', p_shares_bought, v_seller_share;
  end if;

  select share_percentage into v_buyer_share
  from public.item_owners
  where item_id = p_item_id and user_id = p_buyer_id and is_active = true;

  if not found then
    raise exception 'Buyer is not an active co-owner of this item';
  end if;

  v_new_seller_share := v_seller_share - p_shares_bought;
  v_new_buyer_share := v_buyer_share + p_shares_bought;

  -- Update shares
  if v_new_seller_share <= 0 then
    -- Seller sells all shares: deactivate
    update public.item_owners
    set share_percentage = 0, is_active = false
    where item_id = p_item_id and user_id = p_seller_id;
  else
    update public.item_owners
    set share_percentage = v_new_seller_share
    where item_id = p_item_id and user_id = p_seller_id;
  end if;

  update public.item_owners
  set share_percentage = v_new_buyer_share
  where item_id = p_item_id and user_id = p_buyer_id;

  -- Create ledger entry
  select coalesce(display_name, phone) into v_actor_name
  from profiles where id = p_buyer_id;

  insert into public.ownership_ledger (
    item_id, payer_id, entry_type, amount, currency, description,
    splits, affected_owner_id, new_share_percentage, created_by
  ) values (
    p_item_id, p_buyer_id, 'buyout', p_buyout_amount, p_currency,
    coalesce(p_notes, concat('Bought ', p_shares_bought, '% from seller')),
    jsonb_build_object(
      'from_owner', p_seller_id,
      'to_owner', p_buyer_id,
      'shares_bought', p_shares_bought,
      'seller_new_share', v_new_seller_share,
      'buyer_new_share', v_new_buyer_share
    ),
    p_seller_id,
    v_new_buyer_share,
    p_buyer_id
  );

  -- Check if only one active owner remains → convert to sole ownership
  select count(*) into v_active_count
  from public.item_owners
  where item_id = p_item_id and is_active = true;

  if v_active_count = 1 then
    update public.items
    set ownership_type = 'sole',
        owner_id = p_buyer_id,
        current_custodian_id = coalesce(current_custodian_id, p_buyer_id)
    where id = p_item_id;
  end if;

  -- Activity feed
  insert into public.activity_feed (circle_id, user_id, type, item_id, actor_name, summary, metadata)
  select i.circle_id, p_buyer_id, 'share_buyout'::activity_type, p_item_id,
    v_actor_name,
    concat(v_actor_name, ' bought ', p_shares_bought, '% of ', concat_ws(' ', i.brand, i.model_name)),
    jsonb_build_object('buyer', p_buyer_id, 'seller', p_seller_id, 'shares', p_shares_bought)
  from public.items i where i.id = p_item_id;

  return jsonb_build_object('success', true, 'seller_new_share', v_new_seller_share, 'buyer_new_share', v_new_buyer_share);
end;
$$;

-- ─── update_custodian_on_borrow ───
-- Trigger: when a borrow becomes active, set current_custodian_id to borrower.
create or replace function public.update_custodian_on_borrow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and (old.status is distinct from new.status) then
    update public.items
    set current_custodian_id = new.borrower_id
    where id = new.item_id;
  elsif new.status in ('returned_pending', 'completed') and (old.status is distinct from new.status) then
    -- Return custody to the lender (who was the custodian before the borrow)
    update public.items
    set current_custodian_id = new.lender_id
    where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger trg_update_custodian_on_borrow
  after update of status on public.borrow_transactions
  for each row
  when (old.status is distinct from new.status)
  execute function public.update_custodian_on_borrow();
```

### 9.3 Updated `src/lib/borrow.ts`

The existing `requestBorrow` function needs a small update to set `lender_id` to `current_custodian_id` and `is_co_owned_borrow`:

```typescript
export async function requestBorrow(params: {
  itemId: string;
  borrowerId: string;
  note?: string | null;
}): Promise<BorrowTransactionEnriched> {
  // Fetch item to get custodian and ownership type
  const { data: item } = await supabase
    .from('items')
    .select('owner_id, current_custodian_id, ownership_type, circle_id')
    .eq('id', params.itemId)
    .single();

  if (!item) throw new Error('Item not found');

  const lenderId = item.current_custodian_id ?? item.owner_id;
  const isCoOwnedBorrow = item.ownership_type === 'co_owned';

  // Check if borrower is a co-owner (should use custody transfer instead)
  if (isCoOwnedBorrow) {
    const { data: coOwner } = await supabase
      .from('item_owners')
      .select('id')
      .eq('item_id', params.itemId)
      .eq('user_id', params.borrowerId)
      .eq('is_active', true)
      .maybeSingle();

    if (coOwner) {
      throw new Error(
        'You are a co-owner of this item. Use "Request Custody" instead of borrowing.'
      );
    }
  }

  const insert: BorrowInsert = {
    item_id: params.itemId,
    borrower_id: params.borrowerId,
    lender_id: lenderId,
    circle_id: item.circle_id,
    status: 'requested',
    borrower_note: params.note ?? null,
    is_co_owned_borrow: isCoOwnedBorrow,
  };

  // ... rest of existing implementation ...
}
```

### 9.4 Updated `src/lib/items.ts`

The `getItem` and `getItems` functions need to enrich with co-owner data:

```typescript
export async function getItem(id: string): Promise<ItemWithPhotos | null> {
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      item_photos(*),
      profiles!items_owner_id_fkey(display_name),
      custodian:profiles!items_current_custodian_id_fkey(display_name),
      item_owners(
        id, user_id, share_percentage, amount_paid, currency, joined_at, is_active,
        profiles!item_owners_user_id_fkey(display_name, avatar_url)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const coOwners = (data as any).item_owners
    ?.filter((io: any) => io.is_active)
    .map((io: any) => ({
      id: io.id,
      user_id: io.user_id,
      display_name: io.profiles?.display_name ?? 'Unknown',
      avatar_url: io.profiles?.avatar_url ?? null,
      share_percentage: Number(io.share_percentage),
      amount_paid: Number(io.amount_paid),
      currency: io.currency,
      joined_at: io.joined_at,
      is_active: io.is_active,
    })) ?? null;

  return {
    ...data,
    owner_name: (data as any).profiles?.display_name ?? 'Unknown',
    custodian_name: (data as any).custodian?.display_name ?? null,
    co_owners: data.ownership_type === 'co_owned' ? coOwners : null,
  };
}
```

---

## 10. Migration Plan

### 10.1 Migration file: `0008_co_ownership.sql`

The migration is designed to be **zero-downtime and backward-compatible**:

1. All new columns have defaults → existing rows get defaults automatically.
2. `ownership_type` defaults to `'sole'` → all existing items remain sole-owned.
3. `current_custodian_id` defaults to `owner_id` via trigger → existing items unchanged.
4. `item_owners` table is empty for existing items → no backfill needed.
5. New RLS policies are additive (supplements existing policies).
6. No existing column is removed or renamed.

**Migration steps (in order):**

```sql
-- 1. Create new enum types
-- (SQL from §3.1)

-- 2. Add new columns to items
-- (SQL from §3.2)

-- 3. Create item_owners table + constraints + triggers
-- (SQL from §3.3)

-- 4. Create ownership_ledger table
-- (SQL from §3.4)

-- 5. Create custody_transfers table
-- (SQL from §3.5)

-- 6. Add is_co_owned_borrow to borrow_transactions
-- (SQL from §3.6)

-- 7. Add new activity_type enum values
-- (SQL from §3.1)

-- 8. Create database functions (RPCs)
-- (SQL from §9.2)

-- 9. Create triggers (custodian default, custodian update on borrow)
-- (SQL from §3.2 and §9.2)

-- 10. Add RLS policies
-- (SQL from §8)

-- 11. Grant privileges on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_owners TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.ownership_ledger TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.custody_transfers TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

### 10.2 Backfill: `current_custodian_id` for existing items

```sql
-- Set current_custodian_id = owner_id for all existing items where it's NULL
update public.items
set current_custodian_id = owner_id
where current_custodian_id is null;
```

### 10.3 TypeScript types update

Update `src/types/database.types.ts` to add the new tables and columns. Then update `src/types/items.ts` with the new interfaces (§3.7).

### 10.4 Regenerate Supabase types

```bash
supabase gen types typescript --local > app/src/types/database.types.ts
```

### 10.5 Seed data update

Add co-owned test items to `supabase/seed.sql`:

```sql
-- Co-owned item: Sarah & Maya co-own a Dior Saddle Bag (50/50)
insert into public.items (
  owner_id, circle_id, brand, model_name, category, color, condition,
  status, purchase_price, estimated_value, currency, is_private, is_lendable,
  ownership_type, co_borrow_approval
) values (
  (select id from profiles where phone = '+971501111111'),  -- Sarah (primary owner)
  (select id from circles limit 1),
  'Dior', 'Saddle Bag', 'bag', 'Beige', 'like_new',
  'available', 18000.00, 22000.00, 'AED', false, true,
  'co_owned', 'custodian'
)
returning id as co_owned_item_id;

-- Add ownership shares
insert into public.item_owners (item_id, user_id, share_percentage, amount_paid, currency)
select
  co_owned_item_id,
  (select id from profiles where phone = '+971501111111'),
  50.00, 9000.00, 'AED'
from (select id as co_owned_item_id from public.items where brand = 'Dior' and model_name = 'Saddle Bag' order by created_at desc limit 1) t;

insert into public.item_owners (item_id, user_id, share_percentage, amount_paid, currency)
select
  id,
  (select id from profiles where phone = '+971503333333'),  -- Maya
  50.00, 9000.00, 'AED'
from public.items where brand = 'Dior' and model_name = 'Saddle Bag' order by created_at desc limit 1;
```

### 10.6 What does NOT change

| Component | Impact |
|-----------|--------|
| Existing sole-owned items | **None.** `ownership_type = 'sole'`, no `item_owners` rows, `current_custodian_id = owner_id`. All existing queries, RLS, triggers, and UI work unchanged. |
| Existing borrow transactions | **None.** `is_co_owned_borrow` defaults to `false`. Existing lender_id = owner_id is correct. |
| Existing activity feed entries | **None.** New activity types are additive. |
| Existing RLS policies | **Supplemented, not replaced.** New policies are OR'd with existing ones. |
| `items.owner_id` | **Kept.** Still NOT NULL. Becomes "primary owner" semantically. |

---

## 11. Implementation Phases

### Phase 1: Foundation (data model + core API)
- Migration `0008_co_ownership.sql`
- Database functions (`create_co_owned_item`, `process_buyout`)
- TypeScript types update
- `src/lib/coOwnership.ts` — create, fetch co-owners, custody transfers
- Seed data update

### Phase 2: UI — Add flow
- "Sole Owner / Co-Owned" toggle on add item screen
- Co-owner picker with share percentage sliders
- Share validation (must sum to 100%)
- Purchase price per owner

### Phase 3: UI — Item detail + badges
- Co-owners section on item detail
- Co-owned badge on item cards
- Custody request button (co-owners)
- Borrow request button (non-owners) — updated to use `current_custodian_id`
- Custodian display ("Currently with: X")

### Phase 4: Borrow logic update
- Update `requestBorrow` to check co-ownership
- Co-owner → custody transfer (block borrow)
- Non-owner → borrow with custodian as lender
- All-co-owner notifications
- Custody transfer lifecycle UI (request → approve → handoff → confirm)

### Phase 5: Ledger
- Ownership ledger view on item detail
- Add expense entry (maintenance, insurance, storage)
- Balance computation per owner
- Buyout flow UI (propose → accept → shares updated)

### Phase 6: Edge cases + polish
- Circle departure handling (buyout prompt)
- Account deletion handling
- Resale flow (mark sold, distribute proceeds)
- Profile stats (co-owned items count, co-owned value)
- Activity feed entries for all co-ownership events
- Push notifications for custody requests and borrow requests to all co-owners

### Phase 7: Advanced (deferred)
- `all_owners` consent mode with `borrow_approvals` table
- "Settle up" flow (track who owes whom, mark as settled)
- Co-ownership invitation flow (invite someone to co-own an existing sole-owned item)
- Export ledger as PDF/CSV for accounting
- Automated share redistribution when a co-owner leaves

---

## Appendix A: Data Model Diagram

```
┌──────────────────────────┐
│         items            │
├──────────────────────────┤
│ id (PK)                  │
│ owner_id (FK→profiles)   │  ← "primary owner" (listing creator)
│ circle_id (FK→circles)   │
│ brand, model_name, ...   │
│ purchase_price           │
│ ownership_type ← NEW     │  'sole' | 'co_owned'
│ current_custodian_id ←NEW│  FK→profiles (who has it)
│ co_borrow_approval ← NEW │  'custodian' | 'any_owner'
│ is_private, is_lendable  │
│ status                   │
└─────────┬────────────────┘
          │ 1
          │
          │ N
┌─────────┴────────────────┐       ┌──────────────────────────┐
│      item_owners         │       │    ownership_ledger      │
│      (NEW)               │       │    (NEW)                 │
├──────────────────────────┤       ├──────────────────────────┤
│ id (PK)                  │       │ id (PK)                  │
│ item_id (FK→items)       │◄──────│ item_id (FK→items)       │
│ user_id (FK→profiles)    │       │ payer_id (FK→profiles)   │
│ share_percentage (0-100) │       │ entry_type (enum)        │
│ amount_paid              │       │ amount                   │
│ currency                 │       │ currency                 │
│ is_active                │       │ splits (jsonb)           │
│ joined_at                │       │ affected_owner_id        │
└──────────────────────────┘       │ new_share_percentage     │
                                   │ description              │
┌──────────────────────────┐       │ created_by               │
│   custody_transfers      │       └──────────────────────────┘
│   (NEW)                  │
├──────────────────────────┤       ┌──────────────────────────┐
│ id (PK)                  │       │   borrow_transactions    │
│ item_id (FK→items)       │◄──────│ (EXISTING, modified)     │
│ from_user_id (FK→prof)   │       ├──────────────────────────┤
│ to_user_id (FK→prof)     │       │ id (PK)                  │
│ status (enum)            │       │ item_id (FK→items)       │
│ requested_at             │       │ borrower_id (FK→prof)    │
│ approved_at              │       │ lender_id (FK→prof) ← custodian for co-owned
│ handed_off_at            │       │ is_co_owned_borrow ← NEW │
│ completed_at             │       │ status, ...              │
│ notes                    │       └──────────────────────────┘
└──────────────────────────┘
```

## Appendix B: Quick Reference — What Happens When

| Event | Sole-owned item | Co-owned item |
|-------|----------------|---------------|
| Add item | `createItem()` — one owner | `createCoOwnedItem()` — multiple owners with shares |
| Owner views item | "Your item" | "Co-owned with X, Y" — sees shares, ledger |
| Non-owner views item | "Owner: X" | "Co-owned: X (50%), Y (50%)" — no ledger access |
| Non-owner borrows | `requestBorrow()` — lender = owner | `requestBorrow()` — lender = custodian, all co-owners notified |
| Co-owner wants item | N/A | `requestCustody()` — custody transfer, not a borrow |
| Borrow approved by | Owner | Custodian (default) or any co-owner (if configured) |
| Item returned to | Owner | Current custodian (whoever was lender) |
| Maintenance cost | Owner pays, no tracking | Any co-owner pays, split by share in ledger |
| Owner leaves | N/A | Buyout or transfer shares |
| Sell item | Owner gets all proceeds | Proceeds split by share percentage |
| Delete account | Item cascades | Shares need rebalancing; `ON DELETE SET NULL` on FK |

---

*End of specification. Questions, concerns, or proposed changes should be directed to Nigel before implementation begins.*
