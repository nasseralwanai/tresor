-- Migration 0015: Update item status to 'borrowed' when actively borrowed
-- Problem: update_custodian_on_borrow trigger only updated current_custodian_id,
-- never items.status. Items with active borrows showed 'available'.
-- Fix: Modify trigger to also set status='borrowed' on active, 'available' on return.

-- 1. Replace the trigger function with updated logic
CREATE OR REPLACE FUNCTION public.update_custodian_on_borrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Borrow became active: borrower now holds the item
  IF new.status = 'active' AND (old.status IS DISTINCT FROM new.status) THEN
    UPDATE public.items
    SET current_custodian_id = new.borrower_id,
        status = 'borrowed'
    WHERE id = new.item_id;

  -- Borrow ended (returned, completed, cancelled, or declined): item back with lender
  ELSIF new.status IN ('returned_pending', 'completed', 'cancelled', 'declined')
    AND (old.status IS DISTINCT FROM new.status) THEN
    UPDATE public.items
    SET current_custodian_id = new.lender_id,
        status = 'available'
    WHERE id = new.item_id;
  END IF;

  RETURN new;
END;
$$;

-- 2. Backfill: fix any items with active borrows that still show 'available'
UPDATE public.items
SET status = 'borrowed'
WHERE id IN (
  SELECT item_id FROM public.borrow_transactions WHERE status = 'active'
)
AND status = 'available';

-- 3. Fix any items with no active borrows that incorrectly show 'borrowed'
UPDATE public.items
SET status = 'available'
WHERE status = 'borrowed'
AND id NOT IN (
  SELECT item_id FROM public.borrow_transactions WHERE status = 'active'
);
