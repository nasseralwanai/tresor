-- ============================================================================
-- Trésor — Seed data for local development
-- ============================================================================

-- Create auth.users entries (only NOT NULL columns: id, is_sso_user, is_anonymous)
insert into auth.users (id, is_sso_user, is_anonymous, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', false, false, 'authenticated', 'authenticated', 'sarah@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', false, false, 'authenticated', 'authenticated', 'layla@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', false, false, 'authenticated', 'authenticated', 'maya@test.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

-- Test profiles
insert into public.profiles (id, phone, display_name, bio) values
  ('11111111-1111-1111-1111-111111111111', '+971501111111', 'Sarah', 'Collector of Chanel and Hermes.'),
  ('22222222-2222-2222-2222-222222222222', '+971502222222', 'Layla', 'Watches and jewelry enthusiast.'),
  ('33333333-3333-3333-3333-333333333333', '+971503333333', 'Maya', 'Bags, shoes, and accessories.')
on conflict (id) do nothing;

-- Test circle
insert into public.circles (id, name, description, invite_code, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Vault', 'Sarah and friends sharing luxury pieces.', 'VAULT2026', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Circle memberships
insert into public.circle_members (circle_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member')
on conflict (circle_id, user_id) do nothing;

-- Sample items
insert into public.items (id, owner_id, circle_id, brand, model_name, category, color, condition, status, estimated_value, currency, notes) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chanel', 'Classic Flap Medium', 'bag', 'black', 'like_new', 'available', 8500.00, 'AED', 'Black caviar with gold HW.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rolex', 'Datejust 36', 'watch', 'silver', 'good', 'available', 32000.00, 'AED', '2021, silver dial.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hermes', 'Birkin 30', 'bag', 'gold', 'new', 'available', 55000.00, 'AED', 'Togo gold, palladium HW.')
on conflict (id) do nothing;

-- Sample borrow transaction (no dates — informal borrowing)
insert into public.borrow_transactions (id, item_id, borrower_id, lender_id, circle_id, status, requested_at, borrower_note) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'requested', now(), 'Would love to borrow for a wedding this weekend.')
on conflict (id) do nothing;

-- Sample price history
insert into public.price_history (item_id, price, currency, source, recorded_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 8000.00, 'AED', 'Vestiaire Collective', '2026-01-15T00:00:00Z'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 8500.00, 'AED', 'The RealReal', '2026-06-01T00:00:00Z')
on conflict do nothing;
