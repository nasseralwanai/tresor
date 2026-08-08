-- Fix: items_visible view was running as SECURITY DEFINER (supabase_admin)
-- which bypasses RLS, leaking private items to all authenticated users.
-- Change to SECURITY INVOKER so it respects the caller's RLS policies.

-- Drop and recreate the view with SECURITY INVOKER
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

-- Set security_invoker = true (PostgreSQL 15+ / Supabase)
alter view public.items_visible SET (security_invoker = true);

-- Also fix the other visible views for consistency
alter view public.price_history_visible SET (security_invoker = true);
alter view public.ownership_ledger_visible SET (security_invoker = true);
alter view public.item_owners_visible SET (security_invoker = true);

-- Ensure grant still works
grant select on public.items_visible to authenticated;
grant select on public.price_history_visible to authenticated;
grant select on public.ownership_ledger_visible to authenticated;
grant select on public.item_owners_visible to authenticated;
