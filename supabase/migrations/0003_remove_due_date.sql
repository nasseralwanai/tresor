-- ============================================================================
-- Trésor — Remove due_date from borrow_transactions
-- Nasser's product decision: borrowing is informal, no dates or durations.
-- ============================================================================

alter table public.borrow_transactions
  drop column if exists due_date;
