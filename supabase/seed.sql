-- ============================================================================
-- Trésor — Seed data for local development
-- Run automatically by `supabase db reset` (seed.sql is applied after
-- migrations). Creates test profiles, a circle, memberships, sample items,
-- and a borrow transaction so the app has data to render on first launch.
--
-- NOTE: These profiles use fixed UUIDs for deterministic joins. They are NOT
-- real auth.users; for local dev only. If you need working auth, sign up via
-- the Auth UI instead and the matching profile row will be created by the
-- app. These seed rows let you test RLS and UI without auth.
-- ============================================================================

-- Test profiles (fixed UUIDs) ------------------------------------------------
insert into public.profiles (id, phone, display_name, bio) values
  ('11111111-1111-1111-1111-111111111111', '+971501111111', 'Sarah', 'Collector of Chanel and Hermès.'),
  ('22222222-2222-2222-2222-222222222222', '+971502222222', 'Layla', 'Watches and jewelry enthusiast.'),
  ('33333333-3333-3333-3333-333333333333', '+971503333333', 'Maya', 'Bags, shoes, and accessories.')
on conflict (id) do nothing;

-- Test circle ----------------------------------------------------------------
insert into public.circles (id, name, description, invite_code, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Vault', 'Sarah and friends sharing luxury pieces.', 'VAULT2026', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Circle memberships ---------------------------------------------------------
insert into public.circle_members (circle_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member')
on conflict (circle_id, user_id) do nothing;

-- Sample items ---------------------------------------------------------------
-- NOTE: inserted with explicit owner_id to bypass the activity trigger's
-- profile lookup (which works here since profiles exist above).
insert into public.items (id, owner_id, circle_id, brand, model_name, category, color, condition, status, estimated_value, currency, notes) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chanel', 'Classic Flap Medium', 'bag', 'black', 'like_new', 'available', 8500.00, 'AED', 'Black caviar with gold HW.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rolex', 'Datejust 36', 'watch', 'silver', 'good', 32000.00, 'AED', '2021, silver dial.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hermès', 'Birkin 30', 'bag', 'gold', 'new', 55000.00, 'AED', 'Togo gold, palladium HW.')
on conflict (id) do nothing;

-- Sample borrow transaction --------------------------------------------------
insert into public.borrow_transactions (id, item_id, borrower_id, lender_id, circle_id, status, requested_at, due_date, borrower_note) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'requested', now(), (now() + interval '7 days')::date, 'Would love to borrow for a wedding this weekend.')
on conflict (id) do nothing;

-- Sample price history -------------------------------------------------------
insert into public.price_history (item_id, price, currency, source, recorded_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 8000.00, 'AED', 'Vestiaire Collective', '2026-01-15T00:00:00Z'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 8500.00, 'AED', 'The RealReal', '2026-06-01T00:00:00Z')
on conflict do nothing;
