-- ============================================================================
-- Migration 0013: Borrow status transitions + invite code expiry
-- From production readiness audit (should-fix #19, #20)
--
-- 1. Enforce valid borrow_transactions status transitions via a BEFORE UPDATE
--    trigger. Invalid transitions (e.g. requested → completed) are rejected.
--
-- 2. Add expires_at column to circles table for invite code expiry.
--    Default: 7 days from creation. Expired codes are rejected at validation.
-- ============================================================================

-- ============================================================================
-- 1. Borrow status transition enforcement
-- ============================================================================

-- Allowed transitions map:
--   requested     → approved, active, declined, cancelled
--   approved      → active, cancelled
--   active        → returned_pending, cancelled
--   returned_pending → completed, active (re-open if return rejected)
--   completed     → (terminal — no further transitions)
--   declined      → (terminal)
--   cancelled     → (terminal)
--
-- INSERTs are not restricted (initial status set by application logic).
-- Only UPDATEs that change the status are validated.

create or replace function public.validate_borrow_status_transition()
returns trigger
language plpgsql
as $$
begin
  -- Only enforce when status is being changed
  if new.status = old.status then
    return new;
  end if;

  -- Define allowed transitions
  if not (
    (old.status = 'requested'          and new.status in ('approved', 'active', 'declined', 'cancelled'))
    or
    (old.status = 'approved'           and new.status in ('active', 'cancelled'))
    or
    (old.status = 'active'             and new.status in ('returned_pending', 'cancelled'))
    or
    (old.status = 'returned_pending'   and new.status in ('completed', 'active'))
  ) then
    raise exception 'Invalid borrow status transition: % → %',
      old.status, new.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Drop existing trigger if it was created by a previous run (idempotent)
drop trigger if exists trg_borrow_status_transition on public.borrow_transactions;

create trigger trg_borrow_status_transition
  before update of status on public.borrow_transactions
  for each row
  execute function public.validate_borrow_status_transition();


-- ============================================================================
-- 2. Invite code expiry
-- ============================================================================

-- Add expires_at column to circles table.
-- NULL means "no expiry" (backward compatible with existing circles).
-- New circles default to 7-day expiry (set via default + application can override).
alter table public.circles
  add column if not exists expires_at timestamptz;

-- Backfill: set expires_at for existing circles to 7 days from their created_at.
-- This ensures existing invite codes don't live forever.
update public.circles
  set expires_at = created_at + interval '7 days'
  where expires_at is null;

-- Add an index for expiry lookups (used by invite validation queries)
create index if not exists idx_circles_invite_code_expiry
  on public.circles (invite_code)
  where expires_at is not null;

-- Add a check constraint: expires_at must be after created_at (if set)
alter table public.circles
  add constraint circles_expires_at_after_created check (
    expires_at is null or expires_at > created_at
  );
