# Task Brief: Co-Ownership DB Migration (0009)

**Author:** Dwight (Dev Lead)
**Assignee:** Sonny
**Created:** 2026-08-08
**Spec:** `/Users/nasseralnuaimi/Projects/personal/tresor/docs/CO_OWNERSHIP_SPEC.md`
**Phase:** Phase 1 — Foundation (data model + core RPC functions + TypeScript types)

---

## Objective

Create migration `0009_co_ownership.sql` that adds 3 new tables (`item_owners`, `ownership_ledger`, `custody_transfers`), 3 new columns on `items`, 1 new column on `borrow_transactions`, 4 new enum types, 6 new `activity_type` values, 2 RPC functions, 4 triggers, and RLS policies for all new tables. Then update TypeScript types to match. Migration must apply cleanly on the running local Supabase and `npx tsc --noEmit` must pass.

---

## Critical: Migration Number

The spec says `0008_co_ownership.sql` but migration 0008 already exists (notifications + nudges). **Use `0009_co_ownership.sql`** as the filename. This is non-negotiable.

---

## Project Context

- **Project dir:** `/Users/nasseralnuaimi/Projects/personal/tresor/`
- **App dir:** `/Users/nasseralnuaimi/Projects/personal/tresor/app/`
- **Migrations dir:** `supabase/migrations/`
- **Types file:** `app/src/types/database.types.ts` (manually authored, 778 lines)
- **Domain types:** `app/src/types/items.ts` (UI-facing interfaces)
- **Type re-exports:** `app/src/types/index.ts`
- **GitHub:** `nasseralwanai/tresor` — main is protected. Create branch `feat/co-ownership-db`, open PR.
- **Supabase:** Running locally at `http://127.0.0.1:54321`
- **Seed data:** 6 users (Sarah=1111, Layla=2222, Maya=3333, Noor=4444, Aisha=5555, Mona=6666), 15 items, 1 circle (The Vault, id `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`), 4 borrows, 37 activities, 4 wishlists.
- **TypeScript:** `strict: true`, path alias `@/*` → `./src/*`. Currently `npx tsc --noEmit` passes clean (exit 0).

---

## Existing Patterns to Follow

### Migration file conventions (from 0001, 0005, 0008)

```
-- ============================================================================
-- Migration 0009: Co-Ownership
-- Based on CO_OWNERSHIP_SPEC.md §3, §8, §9.2
-- ============================================================================
```

- Header comment block with migration number and spec reference.
- Section dividers with `--` banner comments.
- `create table if not exists` / `add column if not exists` / `create index if not exists` — all idempotent.
- Enums wrapped in `do $$ begin ... exception when duplicate_object then null; end $$;`.
- `alter table ... enable row level security;` after each table creation.
- Policy names: `"{table}_{verb}_{scope}"` (e.g. `"item_owners_select_co_owners_or_circle"`).
- GRANT statements at the end for `anon`, `authenticated`, `service_role`.

### RLS style (from 0001)

- Helper functions `is_circle_member()` and `is_circle_admin()` already exist as `security definer` — reuse them.
- Policies use `auth.uid()` directly.
- `for all` policies use both `using` and `with check`.
- Select policies for circle-scoped data use `public.is_circle_member(circle_id)`.

### Trigger style (from 0001)

- `updated_at` auto-maintenance via `public.tg_set_updated_at()` function (already exists from 0001).
- Trigger naming: `trg_{table}_{purpose}` (e.g. `trg_items_updated_at`, `trg_custody_updated_at`).
- Activity-creation functions are `security definer`, `set search_path = public`.
- RPC functions are `security definer`, `set search_path = public`, `language plpgsql`.

### Index naming (from 0001, 0008)

- Format: `idx_{table_short}_{columns}` (e.g. `idx_item_owners_item_id`, `idx_ledger_item_id`, `idx_custody_status`).
- All use `create index if not exists`.
- Partial indexes for common filters: `where is_active = true`, `where read_at is null`.

### TypeScript types style (from database.types.ts)

- Each table has `Row`, `Insert`, `Update`, `Relationships` interfaces.
- `Insert`: required fields are non-optional, DB-defaulted fields are `?`.
- `Update`: all fields `?`.
- Enums go in `Database['public']['Enums']`.
- Functions go in `Database['public']['Functions']` with `Args` and `Returns`.
- `Relationships` array entries: `{ foreignKeyName, columns, referencedRelation, referencedColumns }`.

### Domain types style (from items.ts)

- UI-facing interfaces in `items.ts` with enriched fields (e.g. `owner_name`, `co_owners`).
- Enum aliases at top: `export type OwnershipType = Database['public']['Enums']['ownership_type'];`

---

## Exact Schema to Implement

### 1. New Enum Types (spec §3.1)

```sql
-- ownership_type: 'sole' | 'co_owned'
do $$ begin
  create type ownership_type as enum ('sole', 'co_owned');
exception when duplicate_object then null; end $$;

-- co_borrow_approval: 'custodian' | 'any_owner'
do $$ begin
  create type co_borrow_approval as enum ('custodian', 'any_owner');
exception when duplicate_object then null; end $$;

-- ledger_entry_type: 7 values
do $$ begin
  create type ledger_entry_type as enum (
    'purchase', 'maintenance', 'insurance', 'storage',
    'buyout', 'resale_proceeds', 'adjustment'
  );
exception when duplicate_object then null; end $$;

-- custody_status: 6 values
do $$ begin
  create type custody_status as enum (
    'requested', 'approved', 'active', 'completed', 'declined', 'cancelled'
  );
exception when duplicate_object then null; end $$;
```

### 2. New activity_type values (spec §3.1)

```sql
do $$ begin
  alter type activity_type add value if not exists 'co_ownership_created';
  alter type activity_type add value if not exists 'custody_requested';
  alter type activity_type add value if not exists 'custody_transferred';
  alter type activity_type add value if not exists 'co_owner_added';
  alter type activity_type add value if not exists 'co_owner_removed';
  alter type activity_type add value if not exists 'share_buyout';
exception when duplicate_object then null; end $$;
```

**⚠️ PITFALL:** `alter type ... add value` cannot run inside a transaction block in older Postgres. Supabase local runs PG15+ which supports this, but if you hit "cannot alter type ... inside transaction block", wrap each `add value` in its own `do $$ begin ... end $$;` block separately. The spec wraps all 6 in one block — test and split if needed.

### 3. New columns on `items` (spec §3.2)

```sql
alter table public.items
  add column if not exists ownership_type        ownership_type not null default 'sole',
  add column if not exists current_custodian_id   uuid references public.profiles(id) on delete set null,
  add column if not exists co_borrow_approval     co_borrow_approval not null default 'custodian';
```

**Trigger: default custodian on insert**

```sql
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

**Backfill existing items** (spec §10.2):

```sql
update public.items
set current_custodian_id = owner_id
where current_custodian_id is null;
```

### 4. New column on `borrow_transactions` (spec §3.6)

```sql
alter table public.borrow_transactions
  add column if not exists is_co_owned_borrow boolean not null default false;
```

### 5. Table: `item_owners` (spec §3.3)

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
```

**Indexes:**
```sql
create index if not exists idx_item_owners_item_id  on public.item_owners (item_id);
create index if not exists idx_item_owners_user_id  on public.item_owners (user_id);
create index if not exists idx_item_owners_active   on public.item_owners (item_id) where is_active = true;
```

**⚠️ FK change (spec §7.5):** The spec's CREATE TABLE uses `on delete cascade` on `user_id`. The spec §7.5 recommends changing to `on delete set null` to prevent breaking share totals on account deletion. **Implement the SET NULL variant directly in CREATE TABLE** to avoid needing a post-creation ALTER:

```sql
  user_id uuid references public.profiles(id) on delete set null,
```

**Trigger: validate shares sum to 100 for co_owned items (spec §3.3)**

```sql
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
```

Three triggers (insert, update, delete):
```sql
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

**Trigger: updated_at** (reuses existing `tg_set_updated_at()`):
```sql
create trigger trg_item_owners_updated_at
  before update on public.item_owners
  for each row execute function public.tg_set_updated_at();
```

**RLS:**
```sql
alter table public.item_owners enable row level security;
```
Policies from spec §8.1 — see RLS section below.

### 6. Table: `ownership_ledger` (spec §3.4)

```sql
create table if not exists public.ownership_ledger (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  payer_id      uuid not null references public.profiles(id) on delete cascade,
  entry_type    ledger_entry_type not null,
  amount        decimal(12,2) not null check (amount >= 0),
  currency      text not null default 'AED',
  description   text,
  splits        jsonb,
  affected_owner_id uuid references public.profiles(id) on delete set null,
  new_share_percentage numeric(5,2),
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null
);
```

**Indexes:**
```sql
create index if not exists idx_ledger_item_id    on public.ownership_ledger (item_id, created_at desc);
create index if not exists idx_ledger_payer_id   on public.ownership_ledger (payer_id);
create index if not exists idx_ledger_entry_type on public.ownership_ledger (entry_type);
```

**RLS:** `alter table public.ownership_ledger enable row level security;`

**No updated_at trigger** — ledger is an immutable audit trail (no UPDATE/DELETE policies = blocked by RLS).

### 7. Table: `custody_transfers` (spec §3.5)

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
```

**Indexes:**
```sql
create index if not exists idx_custody_item_id    on public.custody_transfers (item_id);
create index if not exists idx_custody_from_user  on public.custody_transfers (from_user_id);
create index if not exists idx_custody_to_user    on public.custody_transfers (to_user_id);
create index if not exists idx_custody_status     on public.custody_transfers (status);
```

**Trigger: updated_at:**
```sql
create trigger trg_custody_updated_at
  before update on public.custody_transfers
  for each row execute function public.tg_set_updated_at();
```

**RLS:** `alter table public.custody_transfers enable row level security;`

### 8. RPC Functions (spec §9.2)

Two `security definer` functions:

**`create_co_owned_item`** — atomically creates item + ownership shares + purchase ledger entries + activity feed entry. Full SQL in spec §9.2 lines 1792–1904. Copy verbatim.

**`process_buyout`** — handles share buyout: updates shares, creates ledger entry, optionally converts to sole ownership if one active owner remains. Full SQL in spec §9.2 lines 1906–2015. Copy verbatim.

### 9. Borrow custodian trigger (spec §9.2)

```sql
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

### 10. RLS Policies (spec §8)

#### item_owners (§8.1)

```sql
create policy "item_owners_select_co_owners_or_circle"
  on public.item_owners for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.item_owners io2
      where io2.item_id = item_owners.item_id
        and io2.user_id = auth.uid()
        and io2.is_active = true
    )
    or exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.circle_id is not null
        and not i.is_private
        and public.is_circle_member(i.circle_id)
    )
  );

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

#### ownership_ledger (§8.2)

```sql
create policy "ledger_select_co_owners"
  on public.ownership_ledger for select
  using (
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
  );

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

-- No UPDATE/DELETE policies = immutable audit trail
```

#### custody_transfers (§8.3)

```sql
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

create policy "custody_update_parties"
  on public.custody_transfers for update
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());
```

#### items — co-owner access (§8.4)

This **supplements** the existing `items_owner_all` policy (does NOT replace it):

```sql
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

#### borrow_transactions — co-owner visibility (§8.5)

The spec creates a new `borrow_select_co_owners` policy. **⚠️ PITFALL:** The existing `borrow_select_parties_or_circle` policy already covers `borrower_id = auth.uid() or lender_id = auth.uid() or (circle_id is not null and is_circle_member(circle_id))`. The new policy adds `or exists (select 1 from item_owners ...)`.

Since Postgres ORs multiple SELECT policies, you can either:
1. Create a new supplementary policy (simplest, matches spec), OR
2. Drop and recreate the existing policy with the extra clause.

**Use option 1** — create a new supplementary policy to match the spec exactly:

```sql
create policy "borrow_select_co_owners"
  on public.borrow_transactions for select
  using (
    exists (
      select 1 from public.item_owners io
      where io.item_id = borrow_transactions.item_id
        and io.user_id = auth.uid()
        and io.is_active = true
    )
  );
```

### 11. Grants (spec §10.1 step 11)

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_owners TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.ownership_ledger TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.custody_transfers TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

Also grant EXECUTE on the new RPC functions:
```sql
GRANT EXECUTE ON FUNCTION public.create_co_owned_item(...) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_buyout(...) TO anon, authenticated, service_role;
```

---

## TypeScript Types to Update

### `app/src/types/database.types.ts`

1. **Add new enums** to `Database['public']['Enums']`:
   ```typescript
   ownership_type: 'sole' | 'co_owned';
   co_borrow_approval: 'custodian' | 'any_owner';
   ledger_entry_type: 'purchase' | 'maintenance' | 'insurance' | 'storage' | 'buyout' | 'resale_proceeds' | 'adjustment';
   custody_status: 'requested' | 'approved' | 'active' | 'completed' | 'declined' | 'cancelled';
   ```

2. **Add new activity_type values** to the existing `activity_type` enum:
   ```typescript
   activity_type:
     | 'item_added' | 'item_updated' | 'item_removed'
     | 'borrow_requested' | 'borrow_approved' | 'borrow_active'
     | 'borrow_returned' | 'borrow_completed' | 'borrow_declined'
     | 'wishlist_item_added' | 'price_alert'
     | 'member_joined' | 'member_left'
     // NEW co-ownership activity types:
     | 'co_ownership_created' | 'custody_requested' | 'custody_transferred'
     | 'co_owner_added' | 'co_owner_removed' | 'share_buyout';
   ```

3. **Add new columns to `items`** Row/Insert/Update:
   - `ownership_type: Database['public']['Enums']['ownership_type']` (not null, default 'sole')
   - `current_custodian_id: string | null`
   - `co_borrow_approval: Database['public']['Enums']['co_borrow_approval']` (not null, default 'custodian')

4. **Add new column to `borrow_transactions`** Row/Insert/Update:
   - `is_co_owned_borrow: boolean` (not null, default false)
   - Add to Insert as `is_co_owned_borrow?: boolean;`
   - **⚠️ PITFALL:** The existing `Update` for borrow_transactions is missing `last_nudged_at` and `nudge_count` in the Update type (lines 316–336 of database.types.ts). This is a pre-existing bug. **Do NOT fix it in this PR** — keep the scope clean. Just add `is_co_owned_borrow?: boolean;` to the Update type.

5. **Add `item_owners` table** with Row/Insert/Update/Relationships (follow the pattern of `circle_members`):
   ```typescript
   item_owners: {
     Row: {
       id: string;
       item_id: string;
       user_id: string | null;  // nullable because ON DELETE SET NULL
       share_percentage: number;
       amount_paid: number;
       currency: string;
       joined_at: string;
       is_active: boolean;
       created_at: string;
       updated_at: string;
     };
     Insert: {
       id?: string;
       item_id: string;
       user_id: string;
       share_percentage: number;
       amount_paid?: number;
       currency?: string;
       joined_at?: string;
       is_active?: boolean;
       created_at?: string;
       updated_at?: string;
     };
     Update: {
       id?: string;
       item_id?: string;
       user_id?: string | null;
       share_percentage?: number;
       amount_paid?: number;
       currency?: string;
       joined_at?: string;
       is_active?: boolean;
       created_at?: string;
       updated_at?: string;
     };
     Relationships: [
       { foreignKeyName: 'item_owners_item_id_fkey'; columns: ['item_id']; referencedRelation: 'items'; referencedColumns: ['id']; },
       { foreignKeyName: 'item_owners_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id']; },
     ];
   };
   ```

6. **Add `ownership_ledger` table**:
   ```typescript
   ownership_ledger: {
     Row: {
       id: string;
       item_id: string;
       payer_id: string;
       entry_type: Database['public']['Enums']['ledger_entry_type'];
       amount: number;
       currency: string;
       description: string | null;
       splits: Json | null;
       affected_owner_id: string | null;
       new_share_percentage: number | null;
       created_at: string;
       created_by: string | null;
     };
     Insert: {
       id?: string;
       item_id: string;
       payer_id: string;
       entry_type: Database['public']['Enums']['ledger_entry_type'];
       amount: number;
       currency?: string;
       description?: string | null;
       splits?: Json | null;
       affected_owner_id?: string | null;
       new_share_percentage?: number | null;
       created_at?: string;
       created_by?: string | null;
     };
     Update: {
       id?: string;
       item_id?: string;
       payer_id?: string;
       entry_type?: Database['public']['Enums']['ledger_entry_type'];
       amount?: number;
       currency?: string;
       description?: string | null;
       splits?: Json | null;
       affected_owner_id?: string | null;
       new_share_percentage?: number | null;
       created_at?: string;
       created_by?: string | null;
     };
     Relationships: [
       { foreignKeyName: 'ownership_ledger_item_id_fkey'; columns: ['item_id']; referencedRelation: 'items'; referencedColumns: ['id']; },
       { foreignKeyName: 'ownership_ledger_payer_id_fkey'; columns: ['payer_id']; referencedRelation: 'profiles'; referencedColumns: ['id']; },
       { foreignKeyName: 'ownership_ledger_affected_owner_id_fkey'; columns: ['affected_owner_id']; referencedRelation: 'profiles'; referencedColumns: ['id']; },
       { foreignKeyName: 'ownership_ledger_created_by_fkey'; columns: ['created_by']; referencedRelation: 'profiles'; referencedColumns: ['id']; },
     ];
   };
   ```

7. **Add `custody_transfers` table**:
   ```typescript
   custody_transfers: {
     Row: {
       id: string;
       item_id: string;
       from_user_id: string;
       to_user_id: string;
       circle_id: string | null;
       status: Database['public']['Enums']['custody_status'];
       requested_at: string;
       approved_at: string | null;
       handed_off_at: string | null;
       completed_at: string | null;
       requester_note: string | null;
       approver_note: string | null;
       created_at: string;
       updated_at: string;
     };
     Insert: {
       id?: string;
       item_id: string;
       from_user_id: string;
       to_user_id: string;
       circle_id?: string | null;
       status?: Database['public']['Enums']['custody_status'];
       requested_at?: string;
       approved_at?: string | null;
       handed_off_at?: string | null;
       completed_at?: string | null;
       requester_note?: string | null;
       approver_note?: string | null;
       created_at?: string;
       updated_at?: string;
     };
     Update: {
       id?: string;
       item_id?: string;
       from_user_id?: string;
       to_user_id?: string;
       circle_id?: string | null;
       status?: Database['public']['Enums']['custody_status'];
       requested_at?: string;
       approved_at?: string | null;
       handed_off_at?: string | null;
       completed_at?: string | null;
       requester_note?: string | null;
       approver_note?: string | null;
       created_at?: string;
       updated_at?: string;
     };
     Relationships: [
       { foreignKeyName: 'custody_transfers_item_id_fkey'; columns: ['item_id']; referencedRelation: 'items'; referencedColumns: ['id']; },
       { foreignKeyName: 'custody_transfers_from_user_id_fkey'; columns: ['from_user_id']; referencedRelation: 'profiles'; referencedColumns: ['id']; },
       { foreignKeyName: 'custody_transfers_to_user_id_fkey'; columns: ['to_user_id']; referencedRelation: 'profiles'; referencedColumns: ['id']; },
       { foreignKeyName: 'custody_transfers_circle_id_fkey'; columns: ['circle_id']; referencedRelation: 'circles'; referencedColumns: ['id']; },
     ];
   };
   ```

8. **Add new functions** to `Database['public']['Functions']`:
   ```typescript
   create_co_owned_item: {
     Args: {
       p_brand: string;
       p_model_name: string | null;
       p_category: Database['public']['Enums']['item_category'] | null;
       p_color: string | null;
       p_condition: Database['public']['Enums']['item_condition'] | null;
       p_estimated_value: number | null;
       p_currency: string | null;
       p_notes: string | null;
       p_is_private: boolean | null;
       p_is_lendable: boolean | null;
       p_primary_image_url: string | null;
       p_purchase_price: number | null;
       p_purchase_date: string | null;
       p_circle_id: string | null;
       p_co_borrow_approval: Database['public']['Enums']['co_borrow_approval'] | null;
       p_owners: Json;
     };
     Returns: Json;
   };
   process_buyout: {
     Args: {
       p_item_id: string;
       p_buyer_id: string;
       p_seller_id: string;
       p_shares_bought: number;
       p_buyout_amount: number;
       p_currency: string | null;
       p_notes: string | null;
     };
     Returns: Json;
   };
   set_default_custodian: { Args: Record<string, never>; Returns: void; };
   validate_item_ownership_shares: { Args: Record<string, never>; Returns: void; };
   update_custodian_on_borrow: { Args: Record<string, never>; Returns: void; };
   ```

   **⚠️ NOTE on function args:** The RPC function signatures in the spec use specific Postgres types (`item_category`, `item_condition`, `decimal(10,2)`, etc.) and some params have no default (are required). The TypeScript `Args` should reflect what the Supabase JS client would send. Check the actual function signature after applying the migration — if `supabase gen types` gives different nullability, match that. When in doubt, use `string | null` for optional params and let the DB handle defaults. The function uses `p_owners` as `jsonb` — in TS that's `Json`.

### `app/src/types/items.ts`

Add the co-ownership domain types from spec §3.7:

```typescript
// ── New enums ──
export type OwnershipType = Database['public']['Enums']['ownership_type'];
export type CoBorrowApproval = Database['public']['Enums']['co_borrow_approval'];
export type LedgerEntryType = Database['public']['Enums']['ledger_entry_type'];
export type CustodyStatus = Database['public']['Enums']['custody_status'];

// ── New interfaces ──
export interface CoOwner {
  id: string;
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
  buyer_id: string;
  seller_id: string;
  shares_bought: number;
  buyout_amount: number;
  currency?: string;
  notes?: string;
}
```

Add new fields to the existing `Item` interface:
```typescript
export interface Item {
  // ... all existing fields ...
  ownership_type: OwnershipType;
  current_custodian_id: string | null;
  co_borrow_approval: CoBorrowApproval;
  // UI-enriched:
  custodian_name: string | null;
  co_owners: CoOwner[] | null;
}
```

### `app/src/types/index.ts`

Add re-exports:
```typescript
export type OwnershipType = Database['public']['Enums']['ownership_type'];
export type CoBorrowApproval = Database['public']['Enums']['co_borrow_approval'];
export type LedgerEntryType = Database['public']['Enums']['ledger_entry_type'];
export type CustodyStatus = Database['public']['Enums']['custody_status'];

export type ItemOwner = Database['public']['Tables']['item_owners']['Row'];
export type OwnershipLedgerEntry = Database['public']['Tables']['ownership_ledger']['Row'];
export type CustodyTransfer = Database['public']['Tables']['custody_transfers']['Row'];
```

---

## Seed Data (Optional but Recommended)

Add a co-owned test item to `supabase/seed.sql` (append at the end). Use Maya's Dior Saddle Bag (already exists as item `d0000003-0000-0000-0000-000000000001`) — convert it to co-owned:

```sql
-- Convert Maya's Dior Saddle Bag to co-owned (Maya 50% / Sarah 50%)
update public.items
set ownership_type = 'co_owned',
    current_custodian_id = '33333333-3333-3333-3333-333333333333'
where id = 'd0000003-0000-0000-0000-000000000001';

insert into public.item_owners (item_id, user_id, share_percentage, amount_paid, currency) values
  ('d0000003-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 50.00, 4500.00, 'AED'),
  ('d0000003-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 50.00, 4500.00, 'AED')
on conflict (item_id, user_id) do nothing;

-- Ledger entries for the purchase
insert into public.ownership_ledger (item_id, payer_id, entry_type, amount, currency, description, created_by) values
  ('d0000003-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'purchase', 4500.00, 'AED', 'Initial purchase contribution', '33333333-3333-3333-3333-333333333333'),
  ('d0000003-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'purchase', 4500.00, 'AED', 'Initial purchase contribution', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;
```

---

## Execution Steps

1. **Create branch:** `git checkout -b feat/co-ownership-db` from `main`
2. **Write migration:** `supabase/migrations/0009_co_ownership.sql` — all SQL in the order specified above (enums → columns → tables → triggers → functions → RLS → grants)
3. **Apply migration:** `supabase db reset` (this drops and re-applies all migrations + seed). Verify no errors.
4. **Verify migration applied:** Check tables exist with:
   ```bash
   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\dt public.item_owners public.ownership_ledger public.custody_transfers"
   ```
5. **Update TypeScript types:**
   - `app/src/types/database.types.ts` — add enums, tables, functions, columns
   - `app/src/types/items.ts` — add co-ownership interfaces and update `Item`
   - `app/src/types/index.ts` — add re-exports
6. **Run type check:** `cd app && npx tsc --noEmit` — must pass with exit 0
7. **Update seed data** (optional): append co-owned item to `supabase/seed.sql`
8. **Commit and push:** `git add -A && git commit -m "feat: co-ownership DB migration 0009 + TypeScript types" && git push origin feat/co-ownership-db`
9. **Create PR:** `gh pr create --title "feat: co-ownership DB migration (0009)" --body "..." --base main`

---

## Acceptance Criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | Migration file `0009_co_ownership.sql` exists | `ls supabase/migrations/0009*` |
| 2 | `supabase db reset` completes without errors | Exit code 0, no SQL errors in output |
| 3 | Tables `item_owners`, `ownership_ledger`, `custody_transfers` exist | `\dt public.item_owners public.ownership_ledger public.custody_transfers` |
| 4 | `items` table has new columns `ownership_type`, `current_custodian_id`, `co_borrow_approval` | `\d public.items` |
| 5 | `borrow_transactions` has `is_co_owned_borrow` column | `\d public.borrow_transactions` |
| 6 | Enums `ownership_type`, `co_borrow_approval`, `ledger_entry_type`, `custody_status` exist | `\dT+ public.ownership_type public.co_borrow_approval public.ledger_entry_type public.custody_status` |
| 7 | `activity_type` has 6 new values | `select enum_range(null::activity_type);` |
| 8 | All 3 new tables have RLS enabled | `select relname, relrowsecurity from pg_class where relname in ('item_owners','ownership_ledger','custody_transfers');` |
| 9 | RLS policies exist on all new tables | `select * from pg_policies where tablename in ('item_owners','ownership_ledger','custody_transfers');` |
| 10 | RPC functions `create_co_owned_item` and `process_buyout` exist | `select proname from pg_proc where proname in ('create_co_owned_item','process_buyout');` |
| 11 | Triggers exist: `trg_items_set_custodian`, `trg_validate_ownership_shares_*` (3), `trg_custody_updated_at`, `trg_item_owners_updated_at`, `trg_update_custodian_on_borrow` | `select tgname from pg_trigger where tgname like 'trg_%';` |
| 12 | Existing items have `ownership_type = 'sole'` and `current_custodian_id = owner_id` | `select count(*) from items where ownership_type = 'sole' and current_custodian_id = owner_id;` — should be 15 |
| 13 | `database.types.ts` has new enums, tables, functions, columns | `npx tsc --noEmit` passes |
| 14 | `items.ts` has new interfaces (CoOwner, OwnershipLedgerEntry, CustodyTransfer, input types) | `npx tsc --noEmit` passes |
| 15 | `npx tsc --noEmit` passes with exit 0 | `cd app && npx tsc --noEmit; echo $?` |
| 16 | Branch `feat/co-ownership-db` pushed to GitHub | `git branch -r | grep feat/co-ownership-db` |
| 17 | PR opened against `main` | `gh pr view --json url` |

---

## Pitfalls and Warnings

1. **`alter type ... add value` in transaction:** PG15+ supports this but if you see "cannot alter type inside transaction block", split each `add value` into its own `do $$ begin ... end $$;`.

2. **Share validation trigger timing:** The `validate_item_ownership_shares` trigger fires AFTER insert/update/delete. When inserting multiple owners in a single RPC (`create_co_owned_item`), the first insert will fail because shares don't sum to 100 yet. **Solution:** The `create_co_owned_item` RPC function is `security definer` and inserts all shares inside a single function — but the AFTER INSERT trigger fires per-row. **The trigger will block the second owner insert because after the first insert, total = 50 ≠ 100.**

   **Fix options (pick one):**
   - **Option A (recommended):** Use `SET CONSTRAINTS ALL DEFERRED` or make the trigger a DEFERRED constraint trigger. Change `for each row` to `for each row` but create it as `create constraint trigger ... initially deferred`.
   - **Option B:** Only validate on the FINAL state — change the trigger to fire `after statement` instead of `for each row`, so it checks the total after all rows in the statement are processed.
   - **Option C:** Disable the trigger inside `create_co_owned_item` with `set session_replication_role = 'replica'` (bypasses triggers), do the inserts, then restore. Since the function is `security definer`, this works.
   - **Option D (simplest):** Change the trigger to `after statement` (statement-level, not row-level). This way it only fires once after all rows in an INSERT are done.

   **Use Option D or B** — change the trigger to statement-level:
   ```sql
   create trigger trg_validate_ownership_shares_insert
     after insert on public.item_owners
     for each statement execute function public.validate_item_ownership_shares();

   create trigger trg_validate_ownership_shares_update
     after update of share_percentage, is_active on public.item_owners
     for each statement execute function public.validate_item_ownership_shares();

   create trigger trg_validate_ownership_shares_delete
     after delete on public.item_owners
     for each statement execute function public.validate_item_ownership_shares();
   ```
   And update the function to not use `new`/`old` (since statement-level triggers don't have row data):
   ```sql
   create or replace function public.validate_item_ownership_shares()
   returns trigger
   language plpgsql
   as $$
   declare
     _rec record;
   begin
     for _rec in
       select distinct i.id, i.ownership_type
       from public.items i
       join public.item_owners io on io.item_id = i.id
     loop
       if _rec.ownership_type = 'co_owned' then
         declare
           _total numeric(6,2);
         begin
           select coalesce(sum(share_percentage), 0) into _total
           from public.item_owners
           where item_id = _rec.id and is_active = true;

           if _total <> 100 then
             raise exception 'Co-ownership shares for item % must sum to 100. Current total: %', _rec.id, _total;
           end if;
         end;
       end if;
     end loop;
     return null;
   end;
   $$;
   ```
   Note: statement-level AFTER triggers should return NULL.

3. **`item_owners.user_id` nullability:** With `ON DELETE SET NULL`, `user_id` can become NULL. The `unique(item_id, user_id)` constraint allows multiple NULLs (Postgres semantics), so this is fine. But the RLS policies that check `user_id = auth.uid()` will naturally exclude NULL rows.

4. **`process_buyout` share validation:** When `process_buyout` updates shares, the validation trigger fires. If the seller is fully bought out (`is_active = false`, `share_percentage = 0`), the trigger checks active shares only. The buyer's share becomes `v_buyer_share + p_shares_bought`. If this equals 100 (sole remaining owner), the trigger passes. If there are other active owners, their shares + buyer's new share must = 100. Since the trigger checks `is_active = true` and the seller is now `is_active = false`, this works correctly — BUT only if the trigger fires AFTER both updates (seller + buyer) complete. With statement-level triggers (Option D above), this is guaranteed.

5. **`borrow_transactions` Update type bug:** The existing `database.types.ts` Update type for `borrow_transactions` (lines 316–336) is missing `last_nudged_at` and `nudge_count`. This is a pre-existing issue. **Do not fix it** — just add `is_co_owned_borrow?: boolean;` to keep the diff clean.

6. **RPC function parameter types:** The spec's `create_co_owned_item` uses Postgres-native types like `item_category`, `item_condition`, `decimal(10,2)`. These are NOT nullable by default in Postgres function params. If the Supabase JS client calls the RPC with `null` for optional params, it will work (Postgres allows passing NULL to non-nullable params in function calls). But for TypeScript types, mark them as nullable (`| null`) since the client may send null.

7. **`supabase db reset` vs `supabase migration up`:** Use `supabase db reset` for testing — it drops everything and reapplies all migrations + seed. This is the safest way to verify the migration applies cleanly. Do NOT use `supabase migration up` which only applies new migrations (it can leave the DB in an inconsistent state if prior migrations were modified).

8. **GRANT on functions:** The `create_co_owned_item` and `process_buyout` functions are `security definer`. They need `GRANT EXECUTE` for `authenticated` role. Without this, the API will return "permission denied for function".

9. **`current_custodian_id` FK and the `set_default_custodian` trigger:** The trigger sets `current_custodian_id = owner_id` on insert if NULL. But `owner_id` is NOT NULL, so this always works. The backfill (`update items set current_custodian_id = owner_id where current_custodian_id is null`) handles existing rows that were inserted before the trigger existed.

10. **`is_private` column reference in RLS:** The `item_owners` select policy references `not i.is_private`. The `is_private` column was added in migration 0005. It exists on all items. This is safe.

---

## Out of Scope (Do NOT implement)

- `src/lib/coOwnership.ts` (API layer — Phase 2)
- `src/lib/borrow.ts` updates (Phase 4)
- `src/lib/items.ts` updates (Phase 3)
- UI components (Phase 2+)
- `all_owners` consent mode with `borrow_approvals` table (Phase 7)
- Circle departure handling (Phase 6)
- Account deletion handling (Phase 6)
- Resale flow (Phase 6)

**This PR is ONLY: migration SQL + TypeScript types + seed data update. No application code changes.**
