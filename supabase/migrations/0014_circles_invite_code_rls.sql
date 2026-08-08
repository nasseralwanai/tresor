-- ============================================================================
-- Migration 0014: Allow reading circles by invite_code (for onboarding)
-- Problem: circles_select_members requires is_circle_member() but new users
-- aren't members yet. They need to read the circle to validate the invite code.
-- ============================================================================

-- Allow anyone (including anon) to read circles by invite_code
-- This is safe because invite codes are public — that's the whole point
drop policy if exists "circles_select_by_invite_code" on public.circles;
create policy "circles_select_by_invite_code"
  on public.circles for select
  using (
    invite_code is not null
  );

-- Also grant anon select on circles (needed for pre-auth invite validation)
grant select on public.circles to anon;
