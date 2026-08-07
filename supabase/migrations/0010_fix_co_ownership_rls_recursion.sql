-- ============================================================================
-- Migration 0010: Fix item_owners RLS infinite recursion (C1 from QA report)
-- ============================================================================
-- Problem: item_owners RLS policy queries item_owners itself (io2),
-- which PostgreSQL detects as infinite recursion (error 42P17).
-- This breaks ALL queries on items, borrow_transactions, and item_owners.
--
-- Fix: Create a SECURITY DEFINER function that checks co-ownership
-- without triggering RLS recursion. Use it in all policies.

-- 1. Create SECURITY DEFINER function to check co-ownership
create or replace function public.is_item_co_owner(_item_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.item_owners
    where item_id = _item_id
      and user_id = _user_id
      and is_active = true
  );
$$;

grant execute on function public.is_item_co_owner(uuid, uuid) to authenticated;

-- 2. Fix item_owners SELECT policy — remove self-referential subquery
drop policy if exists "item_owners_select_co_owners_or_circle" on public.item_owners;
create policy "item_owners_select_co_owners_or_circle"
  on public.item_owners for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.items i
      where i.id = item_owners.item_id
        and i.circle_id is not null
        and not i.is_private
        and public.is_circle_member(i.circle_id)
    )
  );

-- 3. Fix items co-owner policy — use function instead of subquery on item_owners
drop policy if exists "items_co_owner_all" on public.items;
create policy "items_co_owner_all"
  on public.items for all
  using (
    public.is_item_co_owner(items.id, auth.uid())
  )
  with check (
    public.is_item_co_owner(items.id, auth.uid())
  );

-- 4. Fix borrow_transactions co-owner policy — use function instead of subquery
drop policy if exists "borrow_select_co_owners" on public.borrow_transactions;
create policy "borrow_select_co_owners"
  on public.borrow_transactions for select
  using (
    public.is_item_co_owner(borrow_transactions.item_id, auth.uid())
  );
