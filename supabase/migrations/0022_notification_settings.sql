-- ============================================================================
-- Migration 0022: Notification Settings
-- Adds notification_settings JSONB column to profiles table.
-- Stores per-user preferences for which notification types to receive.
-- Default: all notification types enabled.
-- ============================================================================

-- Add notification_settings column with default all-true
alter table public.profiles
  add column if not exists notification_settings jsonb not null default '{
    "borrow_requests": true,
    "borrow_nudges": true,
    "circle_activity": true,
    "item_shares": true
  }'::jsonb;

-- Backfill existing rows that may have NULL (shouldn't happen with NOT NULL DEFAULT,
-- but just in case any rows were inserted before the default was set)
update public.profiles
  set notification_settings = '{
    "borrow_requests": true,
    "borrow_nudges": true,
    "circle_activity": true,
    "item_shares": true
  }'::jsonb
  where notification_settings is null;

-- Add a comment documenting the structure
comment on column public.profiles.notification_settings is
  'Per-user notification preferences. JSONB with keys: borrow_requests (bool), borrow_nudges (bool), circle_activity (bool), item_shares (bool). Default: all true.';
