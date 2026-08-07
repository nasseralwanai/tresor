-- ============================================================================
-- Migration 0011: Fix critical RLS bugs from Vlad's RLS test report
-- ============================================================================

-- 1. CRITICAL: items private item leak
-- Migration 0001's policy items_circle_members_select doesn't check is_private.
-- RLS OR semantics means it overrides the correct policy from migration 0005.
-- Fix: drop the old policy and recreate with is_private check.
drop policy if exists "items_circle_members_select" on public.items;
create policy "items_circle_members_select"
  on public.items for select
  using (
    owner_id = auth.uid()
    or (
      circle_id is not null
      and not is_private
      and public.is_circle_member(circle_id)
    )
  );

-- 2. CRITICAL: notifications missing GRANT
-- Migration 0008 creates the table + RLS but never grants API access.
grant select, update on public.notifications to anon, authenticated;

-- 3. CRITICAL: borrow_nudges missing GRANT
-- Same issue — table created but no API access.
grant select on public.borrow_nudges to anon, authenticated;

-- 4. MEDIUM: borrow_transactions over-permissive
-- borrow_select_parties_or_circle lets ALL circle members see ALL borrows.
-- Fix: restrict to lender, borrower, and co-owners only.
drop policy if exists "borrow_select_parties_or_circle" on public.borrow_transactions;
create policy "borrow_select_parties_or_circle"
  on public.borrow_transactions for select
  using (
    lender_id = auth.uid()
    or borrower_id = auth.uid()
    or public.is_item_co_owner(item_id, auth.uid())
  );

-- 5. LOW: wishlist_items missing circle membership check
-- The visibility policy doesn't verify the requester shares a circle with the owner.
-- Fix: add circle membership check via the parent wishlist's owner.
drop policy if exists "wishlist_items_select" on public.wishlist_items;
create policy "wishlist_items_select"
  on public.wishlist_items for select
  using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_items.wishlist_id
        and (
          w.user_id = auth.uid()
          or (
            not w.is_private
            and exists (
              select 1 from public.circle_members cm_owner
              join public.circle_members cm_viewer on cm_viewer.circle_id = cm_owner.circle_id
              where cm_owner.user_id = w.user_id
                and cm_viewer.user_id = auth.uid()
            )
          )
        )
    )
  );
