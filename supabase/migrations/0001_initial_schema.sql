-- ============================================================================
-- Trésor — Initial Schema
-- Luxury item inventory app: profiles, circles, items, borrowing, wishlists,
-- activity feed, and price history. All tables use UUID PKs, TIMESTAMPTZ
-- defaults, and AED currency. RLS is enabled on every table.
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type item_category as enum ('bag','jewelry','watch','shoes','clothing','accessories','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_condition as enum ('new','like_new','good','fair','poor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_status as enum ('available','borrowed','unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type borrow_status as enum ('requested','approved','active','returned_pending','completed','declined','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum (
    'item_added','item_updated','item_removed',
    'borrow_requested','borrow_approved','borrow_active','borrow_returned',
    'borrow_completed','borrow_declined',
    'wishlist_item_added','price_alert',
    'member_joined','member_left'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Tables
-- ============================================================================

-- profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  phone        text unique not null,
  display_name text,
  avatar_url   text,
  push_token   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- circles --------------------------------------------------------------------
create table if not exists public.circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  invite_code text unique not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- circle_members -------------------------------------------------------------
create table if not exists public.circle_members (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references public.circles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('admin','member')) default 'member',
  joined_at  timestamptz not null default now(),
  unique (circle_id, user_id)
);

-- items ----------------------------------------------------------------------
create table if not exists public.items (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null references public.profiles(id) on delete cascade,
  circle_id              uuid references public.circles(id) on delete set null,
  brand                  text not null,
  model_name             text,
  category               item_category,
  color                  text,
  size                   text,
  material               text,
  condition              item_condition not null default 'good',
  status                 item_status not null default 'available',
  purchase_price         decimal(10,2),
  purchase_date          date,
  estimated_value        decimal(10,2),
  currency               text not null default 'AED',
  serial_number          text,
  authenticity_verified  boolean not null default false,
  notes                  text,
  ai_brand_confidence    float,
  ai_identification      jsonb,
  source_url             text,
  primary_image_url      text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- item_photos ----------------------------------------------------------------
create table if not exists public.item_photos (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  storage_path  text not null,
  display_order int not null default 0,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- borrow_transactions --------------------------------------------------------
create table if not exists public.borrow_transactions (
  id                    uuid primary key default gen_random_uuid(),
  item_id               uuid not null references public.items(id) on delete cascade,
  borrower_id           uuid not null references public.profiles(id) on delete cascade,
  lender_id             uuid not null references public.profiles(id) on delete cascade,
  circle_id             uuid references public.circles(id) on delete set null,
  status                borrow_status not null default 'requested',
  requested_at          timestamptz not null default now(),
  approved_at           timestamptz,
  borrowed_at           timestamptz,
  due_date              date,
  returned_at           timestamptz,
  completed_at          timestamptz,
  borrower_note         text,
  lender_note           text,
  return_condition_note text,
  condition_before      item_condition,
  condition_after       item_condition,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- wishlists ------------------------------------------------------------------
create table if not exists public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null default 'My Wishlist',
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

-- wishlist_items -------------------------------------------------------------
create table if not exists public.wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_id     uuid references public.items(id) on delete set null,
  brand       text,
  model_name  text,
  category    item_category,
  max_price   decimal(10,2),
  notes       text,
  source_url  text,
  priority    int not null default 0,
  fulfilled   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- activity_feed --------------------------------------------------------------
create table if not exists public.activity_feed (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid references public.circles(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  type       activity_type not null,
  item_id    uuid references public.items(id) on delete set null,
  borrow_id  uuid references public.borrow_transactions(id) on delete set null,
  actor_name text,
  summary    text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- price_history --------------------------------------------------------------
create table if not exists public.price_history (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  price         decimal(10,2) not null,
  currency      text not null default 'AED',
  source        text,
  source_url    text,
  recorded_at   timestamptz not null default now(),
  ai_confidence float,
  metadata      jsonb
);

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_items_owner_id     on public.items (owner_id);
create index if not exists idx_items_circle_id    on public.items (circle_id);
create index if not exists idx_items_brand        on public.items (brand);
create index if not exists idx_items_category     on public.items (category);
create index if not exists idx_items_status       on public.items (status);
create index if not exists idx_item_photos_item_id on public.item_photos (item_id);
create index if not exists idx_borrow_item_id     on public.borrow_transactions (item_id);
create index if not exists idx_borrow_borrower_id on public.borrow_transactions (borrower_id);
create index if not exists idx_borrow_lender_id   on public.borrow_transactions (lender_id);
create index if not exists idx_borrow_status      on public.borrow_transactions (status);
create index if not exists idx_wishlist_items_user_id on public.wishlist_items (user_id);
create index if not exists idx_price_history_item_id  on public.price_history (item_id);
create index if not exists idx_price_history_recorded on public.price_history (recorded_at desc);
create index if not exists idx_activity_circle     on public.activity_feed (circle_id, created_at desc);
create index if not exists idx_activity_user       on public.activity_feed (user_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.circles             enable row level security;
alter table public.circle_members      enable row level security;
alter table public.items               enable row level security;
alter table public.item_photos         enable row level security;
alter table public.borrow_transactions enable row level security;
alter table public.wishlists           enable row level security;
alter table public.wishlist_items      enable row level security;
alter table public.activity_feed       enable row level security;
alter table public.price_history       enable row level security;

-- Helper: is the current user a member of a given circle? ---------------------
create or replace function public.is_circle_member(_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = _circle_id and user_id = auth.uid()
  );
$$;

-- Helper: is the current user an admin of a given circle? --------------------
create or replace function public.is_circle_admin(_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = _circle_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- profiles -------------------------------------------------------------------
create policy "profiles_select_own_or_circle_members"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.circle_members cm
      where cm.user_id = auth.uid()
        and cm.circle_id in (
          select cm2.circle_id from public.circle_members cm2
          where cm2.user_id = profiles.id
        )
    )
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- circles --------------------------------------------------------------------
create policy "circles_select_members"
  on public.circles for select
  using (public.is_circle_member(id));

create policy "circles_insert_any"
  on public.circles for insert
  with check (true);

create policy "circles_update_creator_or_admin"
  on public.circles for update
  using (created_by = auth.uid() or public.is_circle_admin(id))
  with check (created_by = auth.uid() or public.is_circle_admin(id));

-- circle_members -------------------------------------------------------------
create policy "circle_members_select_own_circle"
  on public.circle_members for select
  using (public.is_circle_member(circle_id));

create policy "circle_members_insert_self_or_admin"
  on public.circle_members for insert
  with check (
    user_id = auth.uid()
    or public.is_circle_admin(circle_id)
  );

create policy "circle_members_delete_admin_or_self"
  on public.circle_members for delete
  using (
    user_id = auth.uid()
    or public.is_circle_admin(circle_id)
  );

-- items ----------------------------------------------------------------------
create policy "items_owner_all"
  on public.items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "items_circle_members_select"
  on public.items for select
  using (
    circle_id is not null
    and public.is_circle_member(circle_id)
  );

-- item_photos ----------------------------------------------------------------
create policy "item_photos_owner_all"
  on public.item_photos for all
  using (
    exists (select 1 from public.items where items.id = item_photos.item_id and items.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.items where items.id = item_photos.item_id and items.owner_id = auth.uid())
  );

create policy "item_photos_circle_members_select"
  on public.item_photos for select
  using (
    exists (
      select 1 from public.items i
      where i.id = item_photos.item_id
        and i.circle_id is not null
        and public.is_circle_member(i.circle_id)
    )
  );

-- borrow_transactions --------------------------------------------------------
create policy "borrow_select_parties_or_circle"
  on public.borrow_transactions for select
  using (
    borrower_id = auth.uid()
    or lender_id = auth.uid()
    or (circle_id is not null and public.is_circle_member(circle_id))
  );

create policy "borrow_insert_borrower"
  on public.borrow_transactions for insert
  with check (borrower_id = auth.uid());

create policy "borrow_update_parties"
  on public.borrow_transactions for update
  using (borrower_id = auth.uid() or lender_id = auth.uid())
  with check (borrower_id = auth.uid() or lender_id = auth.uid());

-- wishlists ------------------------------------------------------------------
create policy "wishlists_owner_all"
  on public.wishlists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wishlists_circle_members_select_nonprivate"
  on public.wishlists for select
  using (
    user_id = auth.uid()
    or (not is_private and exists (
      select 1 from public.profiles p
      where p.id = wishlists.user_id
        and exists (
          select 1 from public.circle_members cm1
          where cm1.user_id = auth.uid()
            and cm1.circle_id in (
              select cm2.circle_id from public.circle_members cm2
              where cm2.user_id = wishlists.user_id
            )
        )
    ))
  );

-- wishlist_items -------------------------------------------------------------
create policy "wishlist_items_owner_all"
  on public.wishlist_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- activity_feed --------------------------------------------------------------
create policy "activity_feed_circle_members_select"
  on public.activity_feed for select
  using (public.is_circle_member(circle_id));

create policy "activity_feed_insert_any"
  on public.activity_feed for insert
  with check (true);

-- price_history --------------------------------------------------------------
create policy "price_history_owner_all"
  on public.price_history for all
  using (
    exists (select 1 from public.items where items.id = price_history.item_id and items.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.items where items.id = price_history.item_id and items.owner_id = auth.uid())
  );

create policy "price_history_circle_members_select"
  on public.price_history for select
  using (
    exists (
      select 1 from public.items i
      where i.id = price_history.item_id
        and i.circle_id is not null
        and public.is_circle_member(i.circle_id)
    )
  );

-- ============================================================================
-- Activity feed trigger: fires AFTER INSERT on items
-- ============================================================================
create or replace function public.create_activity_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor_name text;
  _circle_id  uuid;
  _summary    text;
  _display    text;
begin
  -- Resolve actor display name
  select coalesce(display_name, phone) into _actor_name
  from public.profiles where id = new.owner_id;

  _circle_id := new.circle_id;

  -- Human-readable item label: "Chanel Classic Flap" or just "Chanel"
  _display := concat_ws(' ', new.brand, new.model_name);

  _summary := concat(_actor_name, ' added a ', _display);

  insert into public.activity_feed (circle_id, user_id, type, item_id, actor_name, summary, metadata)
  values (
    _circle_id,
    new.owner_id,
    'item_added'::public.activity_type,
    new.id,
    _actor_name,
    _summary,
    jsonb_build_object('brand', new.brand, 'model_name', new.model_name, 'category', new.category)
  );

  return new;
end;
$$;

create trigger trg_items_create_activity
  after insert on public.items
  for each row
  execute function public.create_activity_entry();

-- ============================================================================
-- updated_at auto-maintenance (optional, kept simple)
-- ============================================================================
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create trigger trg_circles_updated_at
  before update on public.circles
  for each row execute function public.tg_set_updated_at();

create trigger trg_items_updated_at
  before update on public.items
  for each row execute function public.tg_set_updated_at();

create trigger trg_borrow_updated_at
  before update on public.borrow_transactions
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- Storage bucket for item photos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('items', 'items', false)
on conflict (id) do nothing;

-- Storage policies: owners manage their own item photos ----------------------
create policy "item_photos_storage_owner_all"
  on storage.objects for all
  using (
    bucket_id = 'items'
    and exists (
      select 1 from public.item_photos ip
      join public.items i on i.id = ip.item_id
      where ip.storage_path = name and i.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'items'
    and exists (
      select 1 from public.item_photos ip
      join public.items i on i.id = ip.item_id
      where ip.storage_path = name and i.owner_id = auth.uid()
    )
  );

create policy "item_photos_storage_circle_select"
  on storage.objects for select
  using (
    bucket_id = 'items'
    and exists (
      select 1 from public.item_photos ip
      join public.items i on i.id = ip.item_id
      where ip.storage_path = name
        and i.circle_id is not null
        and public.is_circle_member(i.circle_id)
    )
  );
