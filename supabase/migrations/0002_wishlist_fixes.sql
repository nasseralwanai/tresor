-- ============================================================================
-- Trésor — Migration 0002: Wishlist Fixes & Architecture Review (Nigel)
-- Addresses: missing columns, RLS policy fixes, indexes, activity triggers,
-- and updated_at maintenance for wishlist_items.
-- Idempotent: safe to re-run. Does NOT modify 0001_initial_schema.sql.
-- ============================================================================

-- ============================================================================
-- 1. Add missing wishlist_items columns
-- ============================================================================
alter table public.wishlist_items
  add column if not exists target_price    decimal(10,2),
  add column if not exists current_savings decimal(10,2) not null default 0,
  add column if not exists target_date     date,
  add column if not exists image_url       text,
  add column if not exists ai_metadata     jsonb;

-- Add updated_at column so we can maintain it with a trigger (§6)
alter table public.wishlist_items
  add column if not exists updated_at timestamptz not null default now();

-- ============================================================================
-- 2. wishlist_items circle-visibility SELECT policy
--    Allows circle members to see non-private wishlist items owned by
--    members of their own circle.
-- ============================================================================
drop policy if exists "wishlist_items_circle_members_select_nonprivate"
  on public.wishlist_items;

create policy "wishlist_items_circle_members_select_nonprivate"
  on public.wishlist_items for select
  using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from public.wishlists w
        where w.id = wishlist_items.wishlist_id
          and not w.is_private
      )
      and exists (
        select 1 from public.circle_members cm1
        where cm1.user_id = auth.uid()
          and cm1.circle_id in (
            select cm2.circle_id from public.circle_members cm2
            where cm2.user_id = wishlist_items.user_id
          )
      )
    )
  );

-- ============================================================================
-- 3. Fix overly permissive activity_feed INSERT policy
--    Old policy allowed anyone to insert with with check (true).
--    New policy restricts to own user_id or NULL (service_role / triggers).
-- ============================================================================
drop policy if exists "activity_feed_insert_any" on public.activity_feed;

create policy "activity_feed_insert_own"
  on public.activity_feed for insert
  with check (user_id = auth.uid() or user_id is null);
  -- user_id is null allows service_role / triggers to insert system events

-- ============================================================================
-- 4. Missing indexes (Nigel §1.4)
-- ============================================================================
create index if not exists idx_circle_members_user_id
  on public.circle_members (user_id);

create index if not exists idx_items_circle_category
  on public.items (circle_id, category)
  where circle_id is not null;

create index if not exists idx_items_circle_status
  on public.items (circle_id, status)
  where circle_id is not null;

create index if not exists idx_borrow_borrower_status
  on public.borrow_transactions (borrower_id, status);

create index if not exists idx_borrow_lender_status
  on public.borrow_transactions (lender_id, status);

create index if not exists idx_activity_circle_type_created
  on public.activity_feed (circle_id, type, created_at desc);

create index if not exists idx_wishlist_items_wishlist_id
  on public.wishlist_items (wishlist_id);

create index if not exists idx_price_history_item_recorded
  on public.price_history (item_id, recorded_at desc);

-- ============================================================================
-- 5. Missing activity feed triggers (Nigel §1.6)
--    Each function is SECURITY DEFINER, LANGUAGE plpgsql, SET search_path.
--    Each handles NULL lookups gracefully and skips when no circle context.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5a. Borrow lifecycle: AFTER INSERT + AFTER UPDATE OF status
--     Maps borrow_status → activity_type and inserts into activity_feed.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_borrow_insert_activity on public.borrow_transactions;
drop trigger if exists trg_borrow_update_activity on public.borrow_transactions;
drop function if exists public.create_borrow_activity();

create or replace function public.create_borrow_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _activity_type public.activity_type;
  _actor_name    text;
  _summary       text;
  _display       text;
  _item          record;
  _borrower_name text;
  _lender_name   text;
begin
  -- Only fire on INSERT, or on UPDATE when status actually changed
  if (tg_op = 'UPDATE' and new.status is not distinct from old.status) then
    return new;
  end if;

  -- Map borrow_status → activity_type
  _activity_type := case new.status
    when 'requested'        then 'borrow_requested'::public.activity_type
    when 'approved'         then 'borrow_approved'::public.activity_type
    when 'active'           then 'borrow_active'::public.activity_type
    when 'returned_pending' then 'borrow_returned'::public.activity_type
    when 'completed'        then 'borrow_completed'::public.activity_type
    when 'declined'         then 'borrow_declined'::public.activity_type
    when 'cancelled'        then null
    else null
  end;

  if _activity_type is null then
    return new;
  end if;

  -- Look up the item for a readable label
  select brand, model_name into _item
  from public.items where id = new.item_id;

  _display := concat_ws(' ', _item.brand, _item.model_name);

  -- Resolve borrower and lender names
  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = new.borrower_id;

  select coalesce(display_name, phone) into _lender_name
  from public.profiles where id = new.lender_id;

  if _borrower_name is null then _borrower_name := 'Someone'; end if;
  if _lender_name   is null then _lender_name   := 'Someone'; end if;

  -- Build a human-readable summary
  _summary := case _activity_type
    when 'borrow_requested'  then concat(_borrower_name, ' requested to borrow ', _display, ' from ', _lender_name)
    when 'borrow_approved'   then concat(_lender_name, ' approved a borrow request for ', _display)
    when 'borrow_active'     then concat(_borrower_name, ' is now borrowing ', _display)
    when 'borrow_returned'   then concat(_borrower_name, ' returned ', _display, ' to ', _lender_name)
    when 'borrow_completed'  then concat('Borrow transaction completed for ', _display)
    when 'borrow_declined'   then concat(_lender_name, ' declined a borrow request for ', _display)
    else concat('Borrow update for ', _display)
  end;

  -- actor_name is the borrower for request/active/returned; lender for approved/declined
  if _activity_type in ('borrow_approved','borrow_declined') then
    _actor_name := _lender_name;
  else
    _actor_name := _borrower_name;
  end if;

  insert into public.activity_feed (circle_id, user_id, type, item_id, borrow_id, actor_name, summary, metadata)
  values (
    new.circle_id,
    new.borrower_id,
    _activity_type,
    new.item_id,
    new.id,
    _actor_name,
    _summary,
    jsonb_build_object(
      'borrow_id', new.id,
      'item_id', new.item_id,
      'borrower_name', _borrower_name,
      'lender_name', _lender_name,
      'status', new.status,
      'display', _display
    )
  );

  return new;
end;
$$;

create trigger trg_borrow_insert_activity
  after insert on public.borrow_transactions
  for each row
  execute function public.create_borrow_activity();

create trigger trg_borrow_update_activity
  after update of status on public.borrow_transactions
  for each row
  execute function public.create_borrow_activity();

-- ----------------------------------------------------------------------------
-- 5b. Wishlist item added: AFTER INSERT on wishlist_items
--     Looks up the user's circle membership for circle_id context.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_wishlist_items_insert_activity on public.wishlist_items;
drop function if exists public.create_wishlist_item_activity();

create or replace function public.create_wishlist_item_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name text;
  _circle_id  uuid;
  _display    text;
  _summary    text;
begin
  -- Resolve actor display name
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = new.user_id;

  if _actor_name is null then
    _actor_name := 'Someone';
  end if;

  -- Look up the user's circle membership (take the first/any circle)
  select cm.circle_id into _circle_id
  from public.circle_members cm
  where cm.user_id = new.user_id
  limit 1;

  -- Human-readable label: "Chanel Classic Flap" or just "Chanel"
  _display := concat_ws(' ', new.brand, new.model_name);

  _summary := concat(_actor_name, ' added a wishlist item: ', _display);

  -- Insert activity (circle_id may be NULL if user not in any circle — that's OK)
  insert into public.activity_feed (circle_id, user_id, type, actor_name, summary, metadata)
  values (
    _circle_id,
    new.user_id,
    'wishlist_item_added'::public.activity_type,
    _actor_name,
    _summary,
    jsonb_build_object(
      'wishlist_item_id', new.id,
      'wishlist_id', new.wishlist_id,
      'brand', new.brand,
      'model_name', new.model_name,
      'category', new.category,
      'max_price', new.max_price,
      'target_price', new.target_price
    )
  );

  return new;
end;
$$;

create trigger trg_wishlist_items_insert_activity
  after insert on public.wishlist_items
  for each row
  execute function public.create_wishlist_item_activity();

-- ----------------------------------------------------------------------------
-- 5c. Wishlist item updated: AFTER UPDATE on wishlist_items
--     Uses 'item_updated' as closest available enum (no wishlist_item_updated).
--     Only fires when substantive columns change, not on every touch.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_wishlist_items_update_activity on public.wishlist_items;
drop function if exists public.create_wishlist_item_update_activity();

create or replace function public.create_wishlist_item_update_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name text;
  _circle_id  uuid;
  _display    text;
  _summary    text;
begin
  -- Only fire if a substantive column changed (avoid noise from updated_at-only updates)
  if new.brand is not distinct from old.brand
     and new.model_name is not distinct from old.model_name
     and new.max_price is not distinct from old.max_price
     and new.target_price is not distinct from old.target_price
     and new.current_savings is not distinct from old.current_savings
     and new.target_date is not distinct from old.target_date
     and new.priority is not distinct from old.priority
     and new.fulfilled is not distinct from old.fulfilled
     and new.notes is not distinct from old.notes
  then
    return new;
  end if;

  -- Resolve actor display name
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = new.user_id;

  if _actor_name is null then
    _actor_name := 'Someone';
  end if;

  -- Look up the user's circle membership
  select cm.circle_id into _circle_id
  from public.circle_members cm
  where cm.user_id = new.user_id
  limit 1;

  _display := concat_ws(' ', new.brand, new.model_name);

  -- Determine what changed for a more informative summary
  if new.current_savings is distinct from old.current_savings then
    _summary := concat(_actor_name, ' updated savings for ', _display);
  elsif new.fulfilled is distinct from old.fulfilled and new.fulfilled = true then
    _summary := concat(_actor_name, ' fulfilled a wishlist item: ', _display);
  elsif new.target_price is distinct from old.target_price then
    _summary := concat(_actor_name, ' updated the target price for ', _display);
  else
    _summary := concat(_actor_name, ' updated a wishlist item: ', _display);
  end if;

  insert into public.activity_feed (circle_id, user_id, type, actor_name, summary, metadata)
  values (
    _circle_id,
    new.user_id,
    'item_updated'::public.activity_type,
    _actor_name,
    _summary,
    jsonb_build_object(
      'wishlist_item_id', new.id,
      'wishlist_id', new.wishlist_id,
      'event_type', 'wishlist_item_updated',
      'brand', new.brand,
      'model_name', new.model_name,
      'current_savings', new.current_savings,
      'target_price', new.target_price,
      'fulfilled', new.fulfilled
    )
  );

  return new;
end;
$$;

create trigger trg_wishlist_items_update_activity
  after update on public.wishlist_items
  for each row
  execute function public.create_wishlist_item_update_activity();

-- ----------------------------------------------------------------------------
-- 5d. Member joined circle: AFTER INSERT on circle_members
-- ----------------------------------------------------------------------------
drop trigger if exists trg_circle_members_insert_activity on public.circle_members;
drop function if exists public.create_member_joined_activity();

create or replace function public.create_member_joined_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name text;
  _summary    text;
begin
  -- Resolve the new member's display name
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = new.user_id;

  if _actor_name is null then
    _actor_name := 'Someone';
  end if;

  _summary := concat(_actor_name, ' joined the circle');

  insert into public.activity_feed (circle_id, user_id, type, actor_name, summary, metadata)
  values (
    new.circle_id,
    new.user_id,
    'member_joined'::public.activity_type,
    _actor_name,
    _summary,
    jsonb_build_object('member_id', new.user_id, 'role', new.role)
  );

  return new;
end;
$$;

create trigger trg_circle_members_insert_activity
  after insert on public.circle_members
  for each row
  execute function public.create_member_joined_activity();

-- ----------------------------------------------------------------------------
-- 5e. Member left circle: AFTER DELETE on circle_members
-- ----------------------------------------------------------------------------
drop trigger if exists trg_circle_members_delete_activity on public.circle_members;
drop function if exists public.create_member_left_activity();

create or replace function public.create_member_left_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name text;
  _summary    text;
begin
  -- Resolve the departing member's display name
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = old.user_id;

  if _actor_name is null then
    _actor_name := 'Someone';
  end if;

  _summary := concat(_actor_name, ' left the circle');

  insert into public.activity_feed (circle_id, user_id, type, actor_name, summary, metadata)
  values (
    old.circle_id,
    old.user_id,
    'member_left'::public.activity_type,
    _actor_name,
    _summary,
    jsonb_build_object('member_id', old.user_id, 'role', old.role)
  );

  return old;
end;
$$;

create trigger trg_circle_members_delete_activity
  after delete on public.circle_members
  for each row
  execute function public.create_member_left_activity();

-- ============================================================================
-- 6. updated_at trigger for wishlist_items
--    Uses the shared tg_set_updated_at() function from 0001.
-- ============================================================================
drop trigger if exists trg_wishlist_items_updated_at on public.wishlist_items;

create trigger trg_wishlist_items_updated_at
  before update on public.wishlist_items
  for each row execute function public.tg_set_updated_at();
