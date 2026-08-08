-- ============================================================================
-- Migration 0023: Cron schedule for overdue borrow checks
-- Sets up pg_cron to run the check-overdue-borrows edge function daily.
-- ============================================================================

-- Enable pg_cron extension if not already enabled
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net extension for HTTP calls from cron
create extension if not exists pg_net with schema extensions;

-- Store the Supabase service role key in vault for cron to use
-- (This is set up automatically in local dev; in production, set via dashboard)
-- Note: The key is injected by Supabase at runtime via SUPABASE_SERVICE_ROLE_KEY env var

-- Schedule the check-overdue-borrows function to run daily at 09:00 UTC
-- Uses pg_net to make an HTTP POST to the edge function endpoint
select cron.schedule(
  'check-overdue-borrows-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'http://127.0.0.1:54321/functions/v1/check-overdue-borrows',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Also enable the cron extension in the extensions schema
-- (pg_cron must be in the extensions schema for Supabase local)
