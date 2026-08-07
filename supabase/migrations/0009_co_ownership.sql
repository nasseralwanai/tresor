-- ============================================================================
-- Migration 0009: Co-Ownership
-- Based on CO_OWNERSHIP_SPEC.md §3, §8, §9.2
-- ============================================================================

-- ============================================================================
-- 1. New Enum Types (spec §3.1)
-- ============================================================================

do $$ begin
  create type ownership_type as enum ('sole', 'co_owned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type co_borrow_approval as enum ('custodian', 'any_owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_entry_type as enum (
    'purchase', 'maintenance', 'insurance', 'storage',
    'buyout', 'resale_proceeds', 'adjustment'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type custody_status as enum (
    'requested', 'approved', 'active', 'completed', 'declined', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. New activity_type values (spec §3.1)
-- ============================================================================
-- NOTE: alter type ... add value cannot run inside a transaction block in
-- older Postgres. PG15+ (Supabase local) supports it, but we wrap each in its
-- own DO block to be safe.

do $$ begin
  alter type activity_type add value if not exists 'co_ownership_created';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type activity_type add value if not exists 'custody_requested';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type activity_type add value if not exists 'custody_transferred';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type activity_type add value if not exists 'co_owner_added';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type activity_type add value if not exists 'co_owner_removed';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type activity_type add value if not exists 'share_buyout';
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 3. New columns on items (spec §3.2)
-- ============================================================================

alter table public.items
  add column if not exists ownership_type        ownership_type not null default 'sole',
  add column if not exists current_custodian_id   uuid references public.profiles(id) on delete set null,
  add column if not exists co_borrow_approval     co_borrow_approval not null default 'custodian';

-- Trigger: default custodian on insert
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

drop trigger if exists trg_items_set_custodian on public.items;
create trigger trg_items_set_custodian
  before insert on public.items
  for each row execute function public.set_default_custodian();

-- Backfill existing items (spec §10.2)
update public.items
set current_custodian_id = owner_id
where current_custodian_id is null;

-- ============================================================================
-- 4. New column on borrow_transactions (spec §3.6)
-- ============================================================================

alter table public.borrow_transactions
  add column if not exists is_co_owned_borrow boolean not null default false;

-- ============================================================================
-- 5. Table: item_owners (spec §3.3)
-- ============================================================================

create table if not exists public.item_owners (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid not null references public.items(id) on delete cascade,
  user_id           uuid references public.profiles(id) on delete set null,
  share_percentage  numeric(5,2) not null check (share_percentage >= 0 and share_percentage <= 100),
  amount_paid       decimal(12,2) not null default 0,
  currency          text not null default 'AED',
  joined_at         timestamptz not null default now(),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (item_id, user_id)
);

create index if not exists idx_item_owners_item_id  on public.item_owners (item_id);
create index if not exists idx_item_owners_user_id  on public.item_owners (user_id);
create index if not exists idx_item_owners_active   on public.item_owners (item_id) where is_active = true;

alter table public.item_owners enable row level security;

-- ============================================================================
-- 6. Table: ownership_ledger (spec §3.4)
-- ============================================================================

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

create index if not exists idx_ledger_item_id    on public.ownership_ledger (item_id, created_at desc);
create index if not exists idx_ledger_payer_id   on public.ownership_ledger (payer_id);
create index if not exists idx_ledger_entry_type on public.ownership_ledger (entry_type);

alter table public.ownership_ledger enable row level security;

-- ============================================================================
-- 7. Table: custody_transfers (spec §3.5)
-- ============================================================================

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

-- ============================================================================
-- 8. Triggers
-- ============================================================================

-- 8.1 updated_at on item_owners (reuses existing tg_set_updated_at())
drop trigger if exists trg_item_owners_updated_at on public.item_owners;
create trigger trg_item_owners_updated_at
  before update on public.item_owners
  for each row execute function public.tg_set_updated_at();

-- 8.2 updated_at on custody_transfers
drop trigger if exists trg_custody_updated_at on public.custody_transfers;
create trigger trg_custody_updated_at
  before update on public.custody_transfers
  for each row execute function public.tg_set_updated_at();

-- 8.3 Share validation trigger (STATEMENT-LEVEL — see Pitfall #2)
-- Using for each statement so that inserting multiple owners in a single
-- statement (as create_co_owned_item does) doesn't fail mid-way.
create or replace function public.validate_item_ownership_shares()
returns trigger
language plpgsql
as $$
declare
  _rec record;
  _total numeric(6,2);
begin
  for _rec in
    select distinct i.id, i.ownership_type
    from public.items i
    join public.item_owners io on io.item_id = i.id
  loop
    if _rec.ownership_type = 'co_owned' then
      select coalesce(sum(share_percentage), 0) into _total
      from public.item_owners
      where item_id = _rec.id and is_active = true;

      if _total <> 100 then
        raise exception 'Co-ownership shares for item % must sum to 100. Current total: %', _rec.id, _total;
      end if;
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_validate_ownership_shares_insert on public.item_owners;
create trigger trg_validate_ownership_shares_insert
  after insert on public.item_owners
  for each statement execute function public.validate_item_ownership_shares();

drop trigger if exists trg_validate_ownership_shares_update on public.item_owners;
create trigger trg_validate_ownership_shares_update
  after update of share_percentage, is_active on public.item_owners
  for each statement execute function public.validate_item_ownership_shares();

drop trigger if exists trg_validate_ownership_shares_delete on public.item_owners;
create trigger trg_validate_ownership_shares_delete
  after delete on public.item_owners
  for each statement execute function public.validate_item_ownership_shares();

-- 8.4 Borrow custodian trigger (spec §9.2)
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

drop trigger if exists trg_update_custodian_on_borrow on public.borrow_transactions;
create trigger trg_update_custodian_on_borrow
  after update of status on public.borrow_transactions
  for each row
  when (old.status is distinct from new.status)
  execute function public.update_custodian_on_borrow();

-- ============================================================================
-- 9. RPC Functions (spec §9.2)
-- ============================================================================

-- 9.1 create_co_owned_item — atomically creates item + shares + ledger + activity
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
  p_owners             jsonb
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
    (p_owners->0->>'user_id')::uuid,
    p_circle_id, p_brand, p_model_name, p_category, p_color, p_condition,
    'available', p_purchase_price, p_purchase_date, p_estimated_value, p_currency,
    p_notes, p_is_private, p_is_lendable, p_primary_image_url,
    'co_owned', p_co_borrow_approval
  )
  returning id into v_item_id;

  -- Insert ownership shares (single statement so statement-level trigger
  -- validates the final state, not the intermediate per-owner state)
  insert into public.item_owners (item_id, user_id, share_percentage, amount_paid, currency)
  select
    v_item_id,
    (o.value->>'user_id')::uuid,
    (o.value->>'share_percentage')::numeric,
    (o.value->>'amount_paid')::decimal,
    p_currency
  from jsonb_array_elements(p_owners) as o(value);

  -- Insert purchase ledger entries
  insert into public.ownership_ledger (item_id, payer_id, entry_type, amount, currency, description, created_by)
  select
    v_item_id,
    (o.value->>'user_id')::uuid,
    'purchase',
    (o.value->>'amount_paid')::decimal,
    p_currency,
    'Initial purchase contribution',
    (p_owners->0->>'user_id')::uuid
  from jsonb_array_elements(p_owners) as o(value);

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

-- 9.2 process_buyout — handles share buyout, ledger entry, optional sole conversion
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

  -- Update shares in a single statement so the statement-level trigger
  -- validates the final state (both seller and buyer updated together)
  with updated_seller as (
    update public.item_owners
    set share_percentage = case when v_new_seller_share <= 0 then 0 else v_new_seller_share end,
        is_active = case when v_new_seller_share <= 0 then false else is_active end
    where item_id = p_item_id and user_id = p_seller_id
  )
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

-- ============================================================================
-- 10. RLS Policies (spec §8)
-- ============================================================================

-- 10.1 item_owners (spec §8.1)

drop policy if exists "item_owners_select_co_owners_or_circle" on public.item_owners;
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

drop policy if exists "item_owners_insert_co_owners" on public.item_owners;
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

drop policy if exists "item_owners_update_co_owners" on public.item_owners;
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

drop policy if exists "item_owners_delete_owner" on public.item_owners;
create policy "item_owners_delete_owner"
  on public.item_owners for delete
  using (
    exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.owner_id = auth.uid()
    )
  );

-- 10.2 ownership_ledger (spec §8.2)

drop policy if exists "ledger_select_co_owners" on public.ownership_ledger;
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

drop policy if exists "ledger_insert_owners" on public.ownership_ledger;
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

-- 10.3 custody_transfers (spec §8.3)

drop policy if exists "custody_select_parties_or_co_owners" on public.custody_transfers;
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

drop policy if exists "custody_insert_co_owners" on public.custody_transfers;
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

drop policy if exists "custody_update_parties" on public.custody_transfers;
create policy "custody_update_parties"
  on public.custody_transfers for update
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());

-- 10.4 items — co-owner access (spec §8.4)
-- This SUPPLEMENTS the existing items policies (does NOT replace them)

drop policy if exists "items_co_owner_all" on public.items;
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

-- 10.5 borrow_transactions — co-owner visibility (spec §8.5)
-- Supplementary policy (does NOT replace existing borrow_select_parties_or_circle)

drop policy if exists "borrow_select_co_owners" on public.borrow_transactions;
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

-- ============================================================================
-- 11. Grants (spec §10.1 step 11)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_owners TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.ownership_ledger TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.custody_transfers TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_co_owned_item(
  text, text, item_category, text, item_condition, decimal,
  text, text, boolean, boolean, text, decimal, date, uuid,
  co_borrow_approval, jsonb
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.process_buyout(
  uuid, uuid, uuid, numeric, decimal, text, text
) TO anon, authenticated, service_role;
