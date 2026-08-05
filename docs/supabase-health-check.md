# Supabase Local Health Check Report

**Date:** 2026-08-05  
**Performed by:** Mauricio (DevOps)  
**Project:** Trésor — Luxury Item Inventory  
**Supabase URL:** http://127.0.0.1:54321

---

## 1. Container Status

All 12 Supabase containers are running and healthy. No unhealthy or restarting containers.

| Container | Status | Ports |
|---|---|---|
| supabase_db_tresor (Postgres) | ✅ Up 2h (healthy) | 54322→5432 |
| supabase_auth_tresor (GoTrue) | ✅ Up 2h (healthy) | 9999 |
| supabase_rest_tresor (PostgREST) | ✅ Up 2h | 3000 |
| supabase_storage_tresor (Storage API) | ✅ Up 2h (healthy) | 5000 |
| supabase_realtime_tresor | ✅ Up 2h (healthy) | 4000 |
| supabase_kong_tresor (API Gateway) | ✅ Up 2h (healthy) | 54321→8000 |
| supabase_studio_tresor | ✅ Up 2h (healthy) | 54323→3000 |
| supabase_inbucket_tresor (Mailpit) | ✅ Up 2h (healthy) | 54324→8025 |
| supabase_edge_runtime_tresor | ✅ Up 2h | — |
| supabase_pg_meta_tresor | ✅ Up 2h (healthy) | 8080 |
| supabase_vector_tresor | ✅ Up 2h (healthy) | — |
| supabase_analytics_tresor | ✅ Up 2h (healthy) | 54327→4000 |

---

## 2. Migration Status

| Migration | Status |
|---|---|
| 0001_initial_schema | ✅ Applied |
| 0002_wishlist_fixes | ✅ Applied |
| 0003_remove_due_date | ✅ Applied (manually applied + registered during health check) |

**Note:** Migration 0003 was not in the `supabase_migrations.schema_migrations` table at the start of the health check. It was applied via `psql` and manually registered. The migration drops `due_date` from `borrow_transactions` (was already absent — idempotent).

---

## 3. Seed Data Verification

| Data | Expected | Found | Status |
|---|---|---|---|
| Profiles | 3 | 3 (Sarah, Layla, Maya) | ✅ |
| Items | 3 | 3 (Chanel, Rolex, Hermès) | ✅ |
| Circles | 1 | 1 (The Vault) | ✅ |
| Borrow Transactions | 1 | 1 (Layla borrowing Sarah's Chanel) | ✅ |
| Auth Users | 3 | 3 (sarah/layla/maya @test.local) | ✅ |

---

## 4. RLS Status

Row Level Security is **enabled on all 10 public tables**.

| Table | RLS Enabled |
|---|---|
| activity_feed | ✅ |
| borrow_transactions | ✅ |
| circle_members | ✅ |
| circles | ✅ |
| item_photos | ✅ |
| items | ✅ |
| price_history | ✅ |
| profiles | ✅ |
| wishlist_items | ✅ |
| wishlists | ✅ |

### RLS Test Results

| Test | Expected | Result | Status |
|---|---|---|---|
| Anon key → items | `[]` (blocked by RLS) | `[]` HTTP 200 | ✅ |
| Sarah's JWT → items | 3 items (circle member) | 3 items (Chanel, Rolex, Hermès) HTTP 200 | ✅ |
| Service role key → items | All 3 items (bypasses RLS) | 3 items HTTP 200 | ✅ |

---

## 5. REST API Test Results

| Test | Endpoint | Key | Result | Status |
|---|---|---|---|---|
| Anon | `/rest/v1/items?select=*` | anon | `[]` HTTP 200 | ✅ |
| Authenticated (Sarah) | `/rest/v1/items?select=*` | Sarah's JWT | 3 items HTTP 200 | ✅ |
| Service Role | `/rest/v1/items?select=*` | service_role | 3 items HTTP 200 | ✅ |
| App credentials | `/rest/v1/items?select=*` | app .env.local anon key | `[]` HTTP 200 | ✅ |

---

## 6. Auth Test Results

| Test | Result | Status |
|---|---|---|
| Seed users in auth.users | 3 users (sarah, layla, maya @test.local) | ✅ |
| Signup endpoint | Created test user, returned JWT HTTP 200 | ✅ |
| Login as Sarah (password login) | Returned JWT (896 chars) HTTP 200 | ✅ |
| Auth identities for seed users | 3 identities created | ✅ |

---

## 7. Storage Test Results

| Test | Result | Status |
|---|---|---|
| Storage API running | HTTP 200 on `/storage/v1/bucket` | ✅ |
| `items` bucket | Exists (private) | ✅ |
| `item-photos` bucket | Created during health check (was missing) | ✅ |

---

## 8. App Connection Test Results

| Test | Result | Status |
|---|---|---|
| `.env.local` Supabase URL | `http://localhost:54321` | ✅ |
| `.env.local` anon key | Updated to actual key (was placeholder) | ✅ |
| REST API with app credentials | HTTP 200, `[]` (RLS blocks anon) | ✅ |
| `npx tsc --noEmit` | Exit code 0, no type errors | ✅ |

---

## 9. Issues Found and Fixes Applied

### Issue 1: Migration 0003 Not Applied ⚠️ → Fixed

**Problem:** Migration `0003_remove_due_date` was not registered in the migrations table.  
**Fix:** Applied the migration SQL via `psql` and manually inserted the version into `supabase_migrations.schema_migrations`.

### Issue 2: Missing Table Privileges (GRANT) 🔴 → Fixed

**Problem:** The `anon`, `authenticated`, and `service_role` roles had no `SELECT/INSERT/UPDATE/DELETE` privileges on public tables. The REST API returned `permission denied for table items` (HTTP 401/403). Migration 0001 created tables and RLS policies but never granted DML privileges to the API roles.  
**Fix Applied:**  
- Immediate: Ran `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon/authenticated/service_role`  
- Permanent: Added GRANT statements to the end of `supabase/migrations/0001_initial_schema.sql` so future `db reset` includes them.

### Issue 3: Seed Users Couldn't Log In (Auth) 🔴 → Fixed

**Problem:** Seed users in `auth.users` could not authenticate via GoTrue's password login. Three root causes:  
1. **Missing `instance_id`** — GoTrue filters users by `instance_id = '00000000-0000-0000-0000-000000000000'`. Seed users had empty `instance_id`.  
2. **Missing `auth.identities` entries** — GoTrue requires an identity row for password login. Seed users had none.  
3. **NULL text columns** — GoTrue's Go scanner cannot convert NULL to string. Columns like `confirmation_token`, `recovery_token`, etc. were NULL instead of empty string.  
4. **Wrong bcrypt cost factor** — Seed used `$2a$06$` (cost 6), GoTrue expects `$2a$10$` (cost 10).  
5. **Missing `raw_app_meta_data` provider** — GoTrue expects `{"provider": "email", "providers": ["email"]}`.  

**Fix Applied:**  
- Immediate: Updated all 3 seed users in `auth.users` with correct `instance_id`, bcrypt cost 10, `raw_app_meta_data`, `raw_user_meta_data`, empty strings for nullable text columns, and created `auth.identities` entries.  
- Permanent: Updated `supabase/seed.sql` with all required fields so future `db reset` produces working auth users.

### Issue 4: App `.env.local` Had Placeholder Key ⚠️ → Fixed

**Problem:** `app/.env.local` contained `EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...fqgM` (a placeholder, not the actual local key).  
**Fix:** Updated with the actual anon key from `supabase status`: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`.

### Issue 5: Missing `item-photos` Storage Bucket ⚠️ → Fixed

**Problem:** The `item-photos` bucket did not exist in storage (only `items` bucket was present).  
**Fix:** Created the `item-photos` bucket via the Storage API.

---

## 10. Files Modified

| File | Change |
|---|---|
| `supabase/migrations/0001_initial_schema.sql` | Added GRANT statements for anon/authenticated/service_role roles |
| `supabase/seed.sql` | Fixed auth.users insert with all GoTrue-required fields + added auth.identities insert |
| `app/.env.local` | Updated anon key from placeholder to actual local key |
| `docs/supabase-health-check.md` | This report (new file) |

---

## 11. Summary

**Overall Status: ✅ All systems healthy after fixes.**

The Supabase local stack is fully operational. All containers are healthy, all 3 migrations are applied, seed data is present, RLS is enabled and working correctly (anon blocked, authenticated users see circle items), the REST API is functional, auth login works for seed users, storage is running with both buckets, and the Expo app can connect with correct credentials and passes type checking.

**3 critical issues were found and fixed:**
1. Missing table GRANTs (REST API was completely broken)
2. Seed users couldn't log in (5 separate auth.users field issues)
3. App had a placeholder API key

All fixes have been applied both immediately (in the running database) and permanently (in the migration and seed SQL files) so they survive a `supabase db reset`.
