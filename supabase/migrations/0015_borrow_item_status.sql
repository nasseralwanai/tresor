-- Migration 0015: Fix item status never updating to 'borrowed'
--
-- BUG: The update_custodian_on_borrow trigger updated current_custodian_id but
-- never set items.status. Items with active borrows showed status='available',
-- breaking the 'Available' badge and getCollectionInsights().itemsLent.
--
-- This migration:
-- 1. Replaces the trigger function to also set items.status
-- 2. Backfills existing items with active borrows to status='borrowed'

-- ── 1. Replace the trigger function ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_custodian_on_borrow()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
begin
  -- Borrow became active: borrower now holds the item
  if new.status = 'active' and (old.status is distinct from new.status) then
    update public.items
    set current_custodian_id = new.borrower_id,
        status = 'borrowed'
    where id = new.item_id;

  -- Borrow ended (returned, completed, cancelled, or declined): item back with lender
  elsif new.status in ('returned_pending', 'completed', 'cancelled', 'declined')
    and (old.status is distinct from new.status) then
    update public.items
    set current_custodian_id = new.lender_id,
        status = 'available'
    where id = new.item_id;
  end if;

  return new;
end;
$function$;

-- ── 2. Backfill existing data ─────────────────────────────────────────────────
-- Any item that currently has an active borrow but status='available' must be
-- corrected to 'borrowed'.

UPDATE public.items
SET status = 'borrowed'
WHERE status = 'available'
  AND id IN (
    SELECT bt.item_id
    FROM public.borrow_transactions bt
    WHERE bt.status = 'active'
  );
