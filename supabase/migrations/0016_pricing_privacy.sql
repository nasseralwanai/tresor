-- ============================================================================
-- Migration 0016: Pricing Privacy — Column-Level Access Control
--
-- Prices (purchase_price, estimated_value, currency, purchase_date) are
-- personal financial information. They must only be visible to the item's
-- owner and co-owners — never to circle members in browsing/social contexts.
--
-- Strategy: create views that NULL price columns for non-owners, revoke
-- direct table access from authenticated, grant view access instead.
-- ============================================================================

-- 1. Helper function: is the current user an owner or co-owner of an item?
create or replace function public.is_item_owner_or_coowner(_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.items i
    where i.id = _item_id
    and (
      i.owner_id = auth.uid()
      or exists (
        select 1 from public.item_owners io
        where io.item_id = i.id
        and io.user_id = auth.uid()
        and io.is_active = true
      )
    )
  );
$$;

-- 2. items_visible: exposes items with price columns NULLed for non-owners
create or replace view public.items_visible as
select
  i.id, i.owner_id, i.circle_id, i.brand, i.model_name, i.category,
  i.color, i.size, i.material, i.condition, i.status,
  i.serial_number, i.authenticity_verified, i.notes,
  i.ai_brand_confidence, i.ai_identification, i.source_url,
  i.primary_image_url, i.created_at, i.updated_at,
  i.ownership_type, i.co_borrow_approval, i.current_custodian_id,
  i.is_private, i.is_lendable,
  case when public.is_item_owner_or_coowner(i.id)
       then i.purchase_price else null end as purchase_price,
  case when public.is_item_owner_or_coowner(i.id)
       then i.estimated_value else null end as estimated_value,
  case when public.is_item_owner_or_coowner(i.id)
       then i.currency else null end as currency,
  case when public.is_item_owner_or_coowner(i.id)
       then i.purchase_date else null end as purchase_date
from public.items i;

-- 3. price_history_visible: only owners/co-owners can see price history
create or replace view public.price_history_visible as
select ph.*
from public.price_history ph
where public.is_item_owner_or_coowner(ph.item_id);

-- 4. ownership_ledger_visible: only owners/co-owners can see ledger amounts
create or replace view public.ownership_ledger_visible as
select ol.*
from public.ownership_ledger ol
where public.is_item_owner_or_coowner(ol.item_id);

-- 5. item_owners_visible: share_percentage and amount_paid gated
create or replace view public.item_owners_visible as
select
  io.id, io.item_id, io.user_id, io.joined_at, io.is_active,
  io.created_at, io.updated_at,
  case when public.is_item_owner_or_coowner(io.item_id)
       then io.share_percentage else null end as share_percentage,
  case when public.is_item_owner_or_coowner(io.item_id)
       then io.amount_paid else null end as amount_paid,
  case when public.is_item_owner_or_coowner(io.item_id)
       then io.currency else null end as currency
from public.item_owners io;

-- 6. Revoke direct SELECT on base tables from authenticated role
revoke select on public.items from authenticated;
revoke select on public.price_history from authenticated;
revoke select on public.ownership_ledger from authenticated;
revoke select on public.item_owners from authenticated;

-- 7. Grant SELECT on the visible views
grant select on public.items_visible to authenticated;
grant select on public.price_history_visible to authenticated;
grant select on public.ownership_ledger_visible to authenticated;
grant select on public.item_owners_visible to authenticated;

-- 8. Owners still need full table access for insert/update/delete
--    The items_owner_all RLS policy restricts mutations to owners only.
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.item_owners to authenticated;
grant select, insert, update, delete on public.ownership_ledger to authenticated;
grant select, insert, update, delete on public.price_history to authenticated;
