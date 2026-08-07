-- ============================================================================
-- Migration 0008: Notifications + Borrow Nudges
-- Based on NUDGE_AND_FEED_SPEC.md §5
-- ============================================================================

-- 5.1 Notifications table (general-purpose, not just nudges)
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  circle_id    uuid references public.circles(id) on delete cascade,
  type         text not null check (type in (
    'borrow_nudge', 'borrow_requested', 'borrow_approved',
    'borrow_returned', 'borrow_completed', 'item_shared',
    'feed_reaction', 'feed_comment', 'wishlist_shared',
    'member_joined'
  )),
  title        text not null,
  body         text,
  data         jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists idx_notifications_user_all
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No insert policy: notifications are created by security-definer functions or triggers

-- 5.2 Borrow nudges table (audit + rate limiting)
create table if not exists public.borrow_nudges (
  id              uuid primary key default gen_random_uuid(),
  borrow_id       uuid not null references public.borrow_transactions(id) on delete cascade,
  lender_id       uuid not null references public.profiles(id) on delete cascade,
  borrower_id     uuid not null references public.profiles(id) on delete cascade,
  message_variant text not null default 'standard',
  nudged_at       timestamptz not null default now()
);

create index if not exists idx_nudges_borrow
  on public.borrow_nudges (borrow_id, nudged_at desc);

create index if not exists idx_nudges_lender_date
  on public.borrow_nudges (lender_id, nudged_at desc);

alter table public.borrow_nudges enable row level security;

create policy "nudges_select_parties"
  on public.borrow_nudges for select
  using (
    lender_id = auth.uid()
    or borrower_id = auth.uid()
  );

-- 5.4 Add nudge columns to borrow_transactions
alter table public.borrow_transactions
  add column if not exists last_nudged_at timestamptz;
alter table public.borrow_transactions
  add column if not exists nudge_count int not null default 0;

-- 5.3 nudge_borrower() function — security definer, enforces all rate limits
create or replace function public.nudge_borrower(
  _borrow_id  uuid,
  _lender_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _borrow        record;
  _borrower_name text;
  _lender_name   text;
  _item_display  text;
  _duration_text text;
  _msg_variant   text;
  _nudge_count   int;
  _lender_count  int;
  _last_nudge    timestamptz;
  _borrower_tok  text;
  _notif_id      uuid;
  _days_borrowed int;
begin
  -- 1. Load borrow record (must be active, must belong to this lender)
  select * into _borrow
  from public.borrow_transactions
  where id = _borrow_id
    and lender_id = _lender_id
    and status = 'active';

  if not found then
    return jsonb_build_object('success', false, 'error', 'borrow_not_found_or_not_active');
  end if;

  -- 2. Check 48h grace period
  _days_borrowed := extract(day from now() - coalesce(_borrow.borrowed_at, _borrow.requested_at));
  if _days_borrowed < 2 then
    return jsonb_build_object('success', false, 'error', 'grace_period_active',
      'message', 'Item was borrowed less than 48 hours ago.');
  end if;

  -- 3. Check max 3 nudges per borrow
  select count(*) into _nudge_count
  from public.borrow_nudges
  where borrow_id = _borrow_id;

  if _nudge_count >= 3 then
    return jsonb_build_object('success', false, 'error', 'max_nudges_reached');
  end if;

  -- 4. Check 24h cooldown
  select max(nudged_at) into _last_nudge
  from public.borrow_nudges
  where borrow_id = _borrow_id;

  if _last_nudge is not null and (now() - _last_nudge) < interval '24 hours' then
    return jsonb_build_object('success', false, 'error', 'cooldown_active',
      'next_available_at', _last_nudge + interval '24 hours');
  end if;

  -- 5. Check max 5 nudges per lender per day
  select count(*) into _lender_count
  from public.borrow_nudges
  where lender_id = _lender_id
    and nudged_at > now() - interval '24 hours';

  if _lender_count >= 5 then
    return jsonb_build_object('success', false, 'error', 'daily_limit_reached');
  end if;

  -- 6. Resolve names
  select coalesce(display_name, phone) into _lender_name
  from public.profiles where id = _lender_id;

  select coalesce(display_name, phone) into _borrower_name
  from public.profiles where id = _borrow.borrower_id;

  -- 7. Build item display and duration
  select concat_ws(' ', brand, model_name) into _item_display
  from public.items where id = _borrow.item_id;

  _duration_text := case
    when _days_borrowed < 7 then concat(_days_borrowed, ' days')
    when _days_borrowed < 14 then '1 week'
    when _days_borrowed < 30 then concat(floor(_days_borrowed / 7.0)::int, ' weeks')
    else 'a while'
  end;

  -- 8. Select message variant based on duration
  _msg_variant := case
    when _days_borrowed < 7 then 'early'
    when _days_borrowed < 14 then 'standard'
    when _days_borrowed < 28 then 'extended'
    else 'long'
  end;

  -- 9. Insert nudge record
  insert into public.borrow_nudges (borrow_id, lender_id, borrower_id, message_variant)
  values (_borrow_id, _lender_id, _borrow.borrower_id, _msg_variant);

  -- 10. Update denormalized columns on borrow_transactions
  update public.borrow_transactions
    set last_nudged_at = now(),
        nudge_count = nudge_count + 1
    where id = _borrow_id;

  -- 11. Insert in-app notification
  insert into public.notifications (user_id, circle_id, type, title, body, data)
  values (
    _borrow.borrower_id,
    _borrow.circle_id,
    'borrow_nudge',
    concat(_lender_name, ' sent a gentle reminder'),
    concat('Your ', _item_display, ' has been borrowed for ', _duration_text,
           '. No rush — return it when you can.'),
    jsonb_build_object(
      'borrow_id', _borrow_id,
      'item_display', _item_display,
      'lender_name', _lender_name,
      'borrower_name', _borrower_name
    )
  )
  returning id into _notif_id;

  -- 12. Get push token for edge function
  select push_token into _borrower_tok
  from public.profiles where id = _borrow.borrower_id;

  -- 13. Return success with data for push notification
  return jsonb_build_object(
    'success', true,
    'notification_id', _notif_id,
    'push_token', _borrower_tok,
    'push_title', concat(_lender_name, ' sent a gentle reminder'),
    'push_body', concat('Your ', _item_display, ' has been borrowed for ',
                         _duration_text, '. No rush — return it when you can.'),
    'push_data', jsonb_build_object(
      'type', 'borrow_nudge',
      'borrow_id', _borrow_id,
      'notification_id', _notif_id
    )
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.nudge_borrower(uuid, uuid) to authenticated;
