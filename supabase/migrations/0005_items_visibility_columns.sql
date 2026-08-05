-- Add is_private and is_lendable columns to items table.
-- These columns control item visibility and lending availability within a circle.
-- The UI layer (src/types/items.ts) already expects these fields.

-- is_private: when true, the item is hidden from other circle members.
--             when false, the item is visible to circle members.
alter table public.items
  add column if not exists is_private boolean not null default false;

-- is_lendable: when true, the item can be borrowed by circle members.
--              when false, the item is display-only.
alter table public.items
  add column if not exists is_lendable boolean not null default true;

-- Update RLS policy for items to respect is_private:
-- Circle members can see items that are not private.
-- (The existing policy in 0001 already handles circle membership;
--  this just ensures the is_private filter is applied for non-owners.)
drop policy if exists "Circle members can view non-private items" on public.items;

create policy "Circle members can view non-private items"
  on public.items
  for select
  using (
    auth.uid() = owner_id
    or (
      not is_private
      and exists (
        select 1 from public.circle_members cm
        where cm.user_id = auth.uid()
          and cm.circle_id = items.circle_id
      )
    )
  );
