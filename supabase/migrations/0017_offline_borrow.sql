-- ============================================================================
-- Migration 0017: Offline Borrow Flow
--
-- Adds: is_offline flag, expected_return_date, borrow_recorded activity type,
--       updated RLS for lender-initiated borrows, activity triggers,
--       partial unique index (one active borrow per item).
-- ============================================================================

-- 1. Add columns to borrow_transactions
alter table public.borrow_transactions
  add column if not exists is_offline boolean not null default false;

alter table public.borrow_transactions
  add column if not exists expected_return_date date;

-- 2. Add new activity type for offline borrows
alter type public.activity_type add value if not exists 'borrow_recorded';

-- 3. Update insert RLS policy: allow lenders (owners) to create offline borrows
drop policy if exists "borrow_insert_borrower" on public.borrow_transactions;

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
    -- OR: co-owner records an offline borrow (if permitted)
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

-- 4. Trigger: create activity entry when an offline borrow is recorded
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

-- 5. Trigger: create activity when a borrow is returned (both modes)
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

-- 6. Partial unique index: only one active borrow per item
create unique index if not exists idx_one_active_borrow_per_item
  on public.borrow_transactions (item_id)
  where status = 'active';

-- 7. Index for filtering offline borrows
create index if not exists idx_borrow_is_offline
  on public.borrow_transactions (is_offline) where is_offline = true;
