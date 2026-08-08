-- ============================================================================
-- Migration 0019: Feed Interactions — likes, comments, and votes
--
-- Creates three tables for social interactions on feed activities:
--   feed_likes    — one like per user per activity
--   feed_comments — text comments on activities
--   feed_votes    — "love" | "want" | "been_there" votes on items
--
-- RLS: circle members can like/comment/vote on activities within their circle.
-- Each user can have at most one like and one vote per activity.
-- ============================================================================

-- ── feed_likes ──
create table if not exists public.feed_likes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  activity_id  uuid not null references public.activity_feed(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, activity_id)
);

create index if not exists idx_feed_likes_activity on public.feed_likes (activity_id);
create index if not exists idx_feed_likes_user     on public.feed_likes (user_id);

alter table public.feed_likes enable row level security;

-- RLS: circle members can see likes on activities in their circle
create policy "feed_likes_select_circle"
  on public.feed_likes for select
  using (
    exists (
      select 1 from public.activity_feed af
      where af.id = feed_likes.activity_id
      and af.circle_id in (
        select cm.circle_id from public.circle_members cm
        where cm.user_id = auth.uid()
      )
    )
  );

-- RLS: authenticated users can like activities in their circle
create policy "feed_likes_insert_circle"
  on public.feed_likes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.activity_feed af
      where af.id = feed_likes.activity_id
      and af.circle_id in (
        select cm.circle_id from public.circle_members cm
        where cm.user_id = auth.uid()
      )
    )
  );

-- RLS: users can unlike (delete their own likes)
create policy "feed_likes_delete_own"
  on public.feed_likes for delete
  using (user_id = auth.uid());

-- ── feed_comments ──
create table if not exists public.feed_comments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  activity_id   uuid not null references public.activity_feed(id) on delete cascade,
  comment_text  text not null check (length(trim(comment_text)) > 0 and length(comment_text) <= 1000),
  created_at    timestamptz not null default now()
);

create index if not exists idx_feed_comments_activity on public.feed_comments (activity_id, created_at desc);
create index if not exists idx_feed_comments_user     on public.feed_comments (user_id);

alter table public.feed_comments enable row level security;

-- RLS: circle members can see comments on activities in their circle
create policy "feed_comments_select_circle"
  on public.feed_comments for select
  using (
    exists (
      select 1 from public.activity_feed af
      where af.id = feed_comments.activity_id
      and af.circle_id in (
        select cm.circle_id from public.circle_members cm
        where cm.user_id = auth.uid()
      )
    )
  );

-- RLS: authenticated users can comment on activities in their circle
create policy "feed_comments_insert_circle"
  on public.feed_comments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.activity_feed af
      where af.id = feed_comments.activity_id
      and af.circle_id in (
        select cm.circle_id from public.circle_members cm
        where cm.user_id = auth.uid()
      )
    )
  );

-- RLS: users can delete their own comments
create policy "feed_comments_delete_own"
  on public.feed_comments for delete
  using (user_id = auth.uid());

-- ── feed_votes ──
-- Use DO block for idempotency (CREATE TYPE IF NOT EXISTS not supported in all PG versions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_type') THEN
    CREATE TYPE public.vote_type AS ENUM ('love', 'want', 'been_there');
  END IF;
END
$$;

create table if not exists public.feed_votes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  activity_id  uuid not null references public.activity_feed(id) on delete cascade,
  vote_type    public.vote_type not null,
  created_at   timestamptz not null default now(),
  unique (user_id, activity_id)
);

create index if not exists idx_feed_votes_activity  on public.feed_votes (activity_id);
create index if not exists idx_feed_votes_user      on public.feed_votes (user_id);
create index if not exists idx_feed_votes_type      on public.feed_votes (activity_id, vote_type);

alter table public.feed_votes enable row level security;

-- RLS: circle members can see votes on activities in their circle
create policy "feed_votes_select_circle"
  on public.feed_votes for select
  using (
    exists (
      select 1 from public.activity_feed af
      where af.id = feed_votes.activity_id
      and af.circle_id in (
        select cm.circle_id from public.circle_members cm
        where cm.user_id = auth.uid()
      )
    )
  );

-- RLS: authenticated users can vote on activities in their circle
create policy "feed_votes_insert_circle"
  on public.feed_votes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.activity_feed af
      where af.id = feed_votes.activity_id
      and af.circle_id in (
        select cm.circle_id from public.circle_members cm
        where cm.user_id = auth.uid()
      )
    )
  );

-- RLS: users can remove their own vote (change or unvote)
create policy "feed_votes_delete_own"
  on public.feed_votes for delete
  using (user_id = auth.uid());

-- ── Realtime: enable for all three tables ──
alter table public.feed_likes   replica identity full;
alter table public.feed_comments replica identity full;
alter table public.feed_votes   replica identity full;

-- ── Grants ──
grant select, insert, delete on public.feed_likes   to authenticated;
grant select, insert, delete on public.feed_comments to authenticated;
grant select, insert, delete on public.feed_votes   to authenticated;
