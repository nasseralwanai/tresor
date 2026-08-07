-- ============================================================================
-- Trésor — Seed data for local development
-- ============================================================================

-- Create auth.users entries with all fields GoTrue requires for password login:
--   instance_id, encrypted_password (bcrypt cost 10), raw_app_meta_data with provider,
--   raw_user_meta_data with sub/email, and empty strings for nullable text columns
--   (GoTrue's Go scanner cannot handle NULL → string conversion)
insert into auth.users (
  id, instance_id, is_sso_user, is_anonymous, aud, role, email,
  encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', false, false, 'authenticated', 'authenticated', 'sarah@test.local', crypt('password123', gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"11111111-1111-1111-1111-111111111111","email":"sarah@test.local","email_verified":true,"phone_verified":false}'::jsonb, '', '', '', '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', false, false, 'authenticated', 'authenticated', 'layla@test.local', crypt('password123', gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"22222222-2222-2222-2222-222222222222","email":"layla@test.local","email_verified":true,"phone_verified":false}'::jsonb, '', '', '', '', '', '', '', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', false, false, 'authenticated', 'authenticated', 'maya@test.local', crypt('password123', gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"33333333-3333-3333-3333-333333333333","email":"maya@test.local","email_verified":true,"phone_verified":false}'::jsonb, '', '', '', '', '', '', '', ''),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', false, false, 'authenticated', 'authenticated', 'noor@test.local', crypt('password123', gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"44444444-4444-4444-4444-444444444444","email":"noor@test.local","email_verified":true,"phone_verified":false}'::jsonb, '', '', '', '', '', '', '', ''),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', false, false, 'authenticated', 'authenticated', 'aisha@test.local', crypt('password123', gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"55555555-5555-5555-5555-555555555555","email":"aisha@test.local","email_verified":true,"phone_verified":false}'::jsonb, '', '', '', '', '', '', '', ''),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', false, false, 'authenticated', 'authenticated', 'mona@test.local', crypt('password123', gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"sub":"66666666-6666-6666-6666-666666666666","email":"mona@test.local","email_verified":true,"phone_verified":false}'::jsonb, '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Create auth.identities entries (GoTrue requires an identity for password login)
insert into auth.identities (provider_id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
from auth.users u
where u.email in ('sarah@test.local', 'layla@test.local', 'maya@test.local', 'noor@test.local', 'aisha@test.local', 'mona@test.local')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email')
on conflict do nothing;

-- Test profiles (6 users)
insert into public.profiles (id, phone, display_name, bio) values
  ('11111111-1111-1111-1111-111111111111', '+971501111111', 'Sarah M.', 'Collector of Chanel and Hermes. Based in Dubai.'),
  ('22222222-2222-2222-2222-222222222222', '+971502222222', 'Layla M.', 'Watches and jewelry enthusiast. Cartier and Rolex.'),
  ('33333333-3333-3333-3333-333333333333', '+971503333333', 'Maya A.', 'Bags, shoes, and accessories. Love Dior and Bvlgari.'),
  ('44444444-4444-4444-4444-444444444444', '+971504444444', 'Noor K.', 'Minimalist aesthetic. Van Cleef and Hermès.'),
  ('55555555-5555-5555-5555-555555555555', '+971505555555', 'Aisha R.', 'Statement jewelry and limited edition pieces.'),
  ('66666666-6666-6666-6666-666666666666', '+971506666666', 'Mona A.', 'Vintage luxury collector. Chanel vintage and Louis Vuitton.')
on conflict (id) do nothing;

-- Test circle
insert into public.circles (id, name, description, invite_code, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Vault', 'Sarah and friends sharing luxury pieces in Dubai.', 'VAULT2026', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Circle memberships (6 members)
insert into public.circle_members (circle_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'member')
on conflict (circle_id, user_id) do nothing;

-- ============================================================================
-- Sample items (15 items across 6 users)
-- ============================================================================

insert into public.items (id, owner_id, circle_id, brand, model_name, category, color, condition, status, estimated_value, currency, notes, is_private, is_lendable) values
  -- Sarah's collection (5 items)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chanel', 'Classic Flap Medium', 'bag', 'black', 'like_new', 'available', 42000.00, 'AED', 'Black caviar with gold HW. Acquired in Paris 2023.', false, true),
  ('b0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hermes', 'Birkin 30 Gold Togo', 'bag', 'gold', 'like_new', 'available', 95000.00, 'AED', 'Gold Togo with palladium HW. Acquired spring 2024 in Paris.', false, true),
  ('b0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dior', 'Lady Dior Small', 'bag', 'beige', 'good', 'available', 18000.00, 'AED', 'Beige lambskin. Resting for a while, ready for an outing.', false, true),
  ('b0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cartier', 'Tank Must', 'watch', 'silver', 'like_new', 'available', 22000.00, 'AED', 'Steel bracelet, silver dial.', false, true),
  ('b0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Van Cleef & Arpels', 'Alhambra 5 Motif', 'jewelry', 'gold', 'new', 'available', 28000.00, 'AED', 'Yellow gold, mother of pearl.', false, true),

  -- Layla's collection (3 items)
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rolex', 'Datejust 36', 'watch', 'silver', 'good', 'available', 38000.00, 'AED', '2021, silver dial, Jubilee bracelet.', false, true),
  ('c0000002-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bvlgari', 'Serpenti Tubogas', 'jewelry', 'gold', 'like_new', 'available', 15000.00, 'AED', 'Rose gold, two-coil.', false, true),
  ('c0000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cartier', 'Love Bracelet', 'jewelry', 'gold', 'good', 'available', 12000.00, 'AED', 'Yellow gold, size 17.', false, true),

  -- Maya's collection (2 items)
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hermes', 'Birkin 25', 'bag', 'pink', 'new', 'available', 75000.00, 'AED', 'Rose Azalee Epsom with gold HW.', false, true),
  ('d0000003-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dior', 'Saddle Bag', 'bag', 'brown', 'good', 'available', 9000.00, 'AED', 'Vintage saddle, brown leather.', false, true),

  -- Noor's collection (2 items)
  ('e0000004-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Van Cleef & Arpels', 'Alhambra Long Necklace', 'jewelry', 'gold', 'like_new', 'available', 35000.00, 'AED', 'Yellow gold, 20 motifs.', false, true),
  ('e0000004-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hermes', 'Kelly 28 Sellier', 'bag', 'black', 'like_new', 'available', 85000.00, 'AED', 'Black Box calfskin with gold HW.', false, true),

  -- Aisha's collection (2 items)
  ('f0000005-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Louis Vuitton', 'Capucines BB', 'bag', 'red', 'like_new', 'available', 14000.00, 'AED', 'Red lambskin, gold chain.', false, true),
  ('f0000005-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chanel', 'Boy Bag', 'bag', 'black', 'good', 'available', 26000.00, 'AED', 'Black calfskin with ruthenium HW.', false, true),

  -- Mona's collection (1 item)
  ('a0000006-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chanel', 'Vintage 2.55 Reissue', 'bag', 'black', 'good', 'available', 19000.00, 'AED', 'Vintage 2018, dark gold HW.', false, true)
on conflict (id) do nothing;

-- ============================================================================
-- Borrow transactions (4 borrows: 1 requested, 2 active, 1 returned)
-- ============================================================================

insert into public.borrow_transactions (id, item_id, borrower_id, lender_id, circle_id, status, requested_at, borrower_note) values
  -- Requested (Layla wants Sarah's Chanel Classic Flap)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'requested', now(), 'Would love to borrow for a wedding this weekend.'),
  -- Active (Mona has Sarah's Cartier Tank — 2 weeks)
  ('e0000002-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', now() - interval '14 days', 'For a gallery opening next week.'),
  -- Active (Layla has Sarah's Van Cleef Alhambra — 4 days)
  ('e0000002-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', now() - interval '4 days', 'Matching with a necklace for an event.'),
  -- Returned (Maya borrowed and returned Sarah's Dior Lady Dior)
  ('e0000002-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'completed', now() - interval '30 days', 'For a brunch event.')
on conflict (id) do nothing;

-- Update borrowed_at for active transactions
update public.borrow_transactions set borrowed_at = requested_at where status in ('active', 'completed') and borrowed_at is null;

-- ============================================================================
-- Activity feed (8 entries)
-- ============================================================================

insert into public.activity_feed (id, circle_id, user_id, type, metadata, created_at) values
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'borrow_returned', '{"item_brand":"Cartier","item_model":"Tank Must","item_id":"b0000001-0000-0000-0000-000000000003","borrower_name":"Mona A."}'::jsonb, now() - interval '1 day'),
  ('a0000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'item_added', '{"item_brand":"Bvlgari","item_model":"Serpenti Tubogas","item_id":"c0000002-0000-0000-0000-000000000001"}'::jsonb, now() - interval '2 days'),
  ('a0000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'item_updated', '{"item_brand":"Hermes","item_model":"Birkin 30 Gold Togo","item_id":"b0000001-0000-0000-0000-000000000001","viewer_name":"Noor K."}'::jsonb, now() - interval '3 days'),
  ('a0000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'borrow_active', '{"item_brand":"Dior","item_model":"Lady Dior Small","item_id":"b0000001-0000-0000-0000-000000000002","borrower_name":"Maya A."}'::jsonb, now() - interval '30 days'),
  ('a0000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'borrow_completed', '{"item_brand":"Dior","item_model":"Lady Dior Small","item_id":"b0000001-0000-0000-0000-000000000002","borrower_name":"Maya A."}'::jsonb, now() - interval '5 days'),
  ('a0000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'item_added', '{"item_brand":"Louis Vuitton","item_model":"Capucines BB","item_id":"f0000005-0000-0000-0000-000000000001"}'::jsonb, now() - interval '7 days'),
  ('a0000001-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'borrow_active', '{"item_brand":"Van Cleef & Arpels","item_model":"Alhambra 5 Motif","item_id":"b0000001-0000-0000-0000-000000000004","borrower_name":"Layla M."}'::jsonb, now() - interval '4 days'),
  ('a0000001-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'item_added', '{"item_brand":"Chanel","item_model":"Vintage 2.55 Reissue","item_id":"a0000006-0000-0000-0000-000000000001"}'::jsonb, now() - interval '10 days')
on conflict (id) do nothing;

-- ============================================================================
-- Wishlists + Wishlist items (4 items across 3 users)
-- ============================================================================

insert into public.wishlists (id, user_id, name, is_private) values
  ('a1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Grail Pieces', false),
  ('a1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Dream Collection', false),
  ('a1000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'Future Acquisitions', false),
  ('a1000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'Private Wishes', true)
on conflict (id) do nothing;

insert into public.wishlist_items (id, wishlist_id, user_id, brand, model_name, category, max_price, is_private, notes) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Hermes', 'Kelly 28 Sellier Black', 'bag', 90000.00, false, 'Black Box with gold HW. Saving for the 2026 collection.'),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Patek Philippe', 'Nautilus 5711', 'watch', 180000.00, false, 'Blue dial, steel. The grail watch.'),
  ('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'Hermes', 'Constance 24', 'bag', 45000.00, false, 'Black with gold HW. Classic.'),
  ('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'Chanel', '19 Flap Large', 'bag', 28000.00, true, 'Cream with mixed HW. Private wish.')
on conflict (id) do nothing;

-- ============================================================================
-- Price history (6 entries for tracking value)
-- ============================================================================

insert into public.price_history (item_id, price, currency, source, recorded_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 38000.00, 'AED', 'Vestiaire Collective', '2026-01-15T00:00:00Z'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 42000.00, 'AED', 'The RealReal', '2026-06-01T00:00:00Z'),
  ('b0000001-0000-0000-0000-000000000001', 88000.00, 'AED', 'Madison Avenue Couture', '2026-01-20T00:00:00Z'),
  ('b0000001-0000-0000-0000-000000000001', 95000.00, 'AED', 'Sothebys', '2026-07-01T00:00:00Z'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 35000.00, 'AED', 'Chrono24', '2026-02-01T00:00:00Z'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 38000.00, 'AED', 'WatchBox', '2026-06-15T00:00:00Z')
on conflict do nothing;

-- ============================================================================
-- Co-Ownership: Convert Maya's Dior Saddle Bag to co-owned (Maya 50% / Sarah 50%)
-- ============================================================================

update public.items
set ownership_type = 'co_owned',
    current_custodian_id = '33333333-3333-3333-3333-333333333333'
where id = 'd0000003-0000-0000-0000-000000000001';

insert into public.item_owners (item_id, user_id, share_percentage, amount_paid, currency) values
  ('d0000003-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 50.00, 4500.00, 'AED'),
  ('d0000003-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 50.00, 4500.00, 'AED')
on conflict (item_id, user_id) do nothing;

-- Ledger entries for the purchase
insert into public.ownership_ledger (item_id, payer_id, entry_type, amount, currency, description, created_by) values
  ('d0000003-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'purchase', 4500.00, 'AED', 'Initial purchase contribution', '33333333-3333-3333-3333-333333333333'),
  ('d0000003-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'purchase', 4500.00, 'AED', 'Initial purchase contribution', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;
