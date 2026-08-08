-- ============================================================================
-- Migration 0009: Co-Ownership
-- Based on CO_OWNERSHIP_SPEC.md §3
-- ============================================================================

-- 3.1 Enums
create type if not exists public.ownership_type as enum ('sole', 'co_owned');
create type if not exists public.co_borrow_approval as enum ('custodian', 'any_owner');
create type if not exists public.ledger_entry_type as enum (
  'purchase', 'maintenance', 'insurance', 'storage',
  'buyout', 'resale_proceeds', 'adjustment'
);
create type if not exists public.custody_status as enum (
  'requested', 'approved', 'active', 'completed', 'declined', 'cancelled'
);

-- 3.2 Add ownership columns to items
alter table public.items
  add column if not exists ownership_type public.ownership_type not null default 'sole';
alter table public.items
  add column if not exists co_borrow_approval public.co_borrow_approval not null default 'custodian';
alter table public.items
  add column if not exists current_custodian_id uuid references public.profiles(id) on delete set null;

-- 3.3 item_owners — ownership shares junction table
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

create index if not exists idx_item_owners_item_id  on public.item_owners (item_id);
create index if not exists idx_item_owners_user_id  on public.item_owners (user_id);
create index if not exists idx_item_owners_active   on public.item_owners (item_id) where is_active = true;

alter table public.item_owners enable row level security;

-- RLS: circle members can view item_owners for items in their circle
create policy "item_owners_select_circle"
  on public.item_owners for select
  using (
    exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
      and exists (
        select 1 from public.circle_members cm
        where cm.circle_id = i.circle_id
        and cm.user_id = auth.uid()
      )
    )
  );

-- RLS: only the item owner or co-owners can insert/update
create policy "item_owners_insert_owner"
  on public.item_owners for insert
  with check (
    exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
      and i.owner_id = auth.uid()
    )
  );

create policy "item_owners_update_owner"
  on public.item_owners for update
  using (
    exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
      and (i.owner_id = auth.uid() or item_owners.user_id = auth.uid())
    )
  );

-- Trigger: validate shares sum to 100 for co-owned items
create or replace function public.validate_item_ownership_shares()
returns trigger
language plpgsql
as $$
declare
  _total numeric(6,2);
  _ownership_type public.ownership_type;
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

create trigger trg_validate_ownership_shares_insert
  after insert on public.item_owners
  for each row execute function public.validate_item_ownership_shares();

create trigger trg_validate_ownership_shares_update
  after update of share_percentage, is_active on public.item_owners
  for each row execute function public.validate_item_ownership_shares();

create trigger trg_validate_ownership_shares_delete
  after delete on public.item_owners
  for each row execute function public.validate_item_ownership_shares();

-- 3.4 ownership_ledger — financial audit trail
create table if not exists public.ownership_ledger (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  payer_id      uuid not null references public.profiles(id) on delete cascade,
  entry_type    public.ledger_entry_type not null,
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

-- RLS: co-owners and item owner can view ledger
create policy "ledger_select_owners"
  on public.ownership_ledger for select
  using (
    exists (
      select 1 from public.items i
      where i.id = ownership_ledger.item_id
      and (i.owner_id = auth.uid()
           or exists (
             select 1 from public.item_owners io
             where io.item_id = i.id
             and io.user_id = auth.uid()
             and io.is_active = true
           ))
    )
  );

-- RLS: co-owners and item owner can insert ledger entries
create policy "ledger_insert_owners"
  on public.ownership_ledger for insert
  with check (
    exists (
      select 1 from public.items i
      where i.id = ownership_ledger.item_id
      and (i.owner_id = auth.uid()
           or exists (
             select 1 from public.item_owners io
             where io.item_id = i.id
             and io.user_id = auth.uid()
             and io.is_active = true
           ))
    )
  );

-- 3.5 custody_transfers — co-owner possession handoffs
create table if not exists public.custody_transfers (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.items(id) on delete cascade,
  from_user_id    uuid not null references public.profiles(id) on delete cascade,
  to_user_id      uuid not null references public.profiles(id) on delete cascade,
  circle_id       uuid references public.circles(id) on delete set null,
  status          public.custody_status not null default 'requested',
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

-- RLS: from_user and to_user can see custody transfers
create policy "custody_select_parties"
  on public.custody_transfers for select
  using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
    or exists (
      select 1 from public.items i
      where i.id = custody_transfers.item_id
      and exists (
        select 1 from public.item_owners io
        where io.item_id = i.id
        and io.user_id = auth.uid()
        and io.is_active = true
      )
    )
  );

-- RLS: co-owners can create custody requests
create policy "custody_insert_owners"
  on public.custody_transfers for insert
  with check (
    to_user_id = auth.uid()
    and exists (
      select 1 from public.items i
      where i.id = custody_transfers.item_id
      and i.ownership_type = 'co_owned'
      and exists (
        select 1 from public.item_owners io
        where io.item_id = i.id
        and io.user_id = auth.uid()
        and io.is_active = true
      )
    )
  );

-- RLS: from_user can update (approve/decline/complete)
create policy "custody_update_from_user"
  on public.custody_transfers for update
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- 3.6 borrow_transactions — add co-ownership flag
alter table public.borrow_transactions
  add column if not exists is_co_owned_borrow boolean not null default false;

-- Grant access
grant select, insert, update on public.item_owners to authenticated;
grant select, insert on public.ownership_ledger to authenticated;
grant select, insert, update on public.custody_transfers to authenticated;
