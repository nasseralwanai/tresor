-- ============================================================================
-- Migration 0012: Fix RPC auth checks + add pagination limits
-- From production readiness audit (blockers B2, B3)
-- ============================================================================

-- B2: create_co_owned_item and process_buyout accept user IDs as parameters
-- without verifying auth.uid(). Fix: add auth checks.

-- 1. Fix create_co_owned_item — require caller to be one of the owners
CREATE OR REPLACE FUNCTION public.create_co_owned_item(
  p_brand text,
  p_model_name text,
  p_category text,
  p_circle_id uuid,
  p_owners jsonb,
  p_image_url text DEFAULT NULL,
  p_estimated_value numeric DEFAULT NULL,
  p_currency text DEFAULT 'AED',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_item_id     uuid;
  v_owner       jsonb;
  v_total_shares numeric(6,2) := 0;
  v_total_paid   decimal(12,2) := 0;
  v_actor_name  text;
  v_caller_is_owner boolean := false;
begin
  -- Auth check: caller must be authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate shares sum to 100
  foreach v_owner in array (
    select array_agg(value) from jsonb_array_elements(p_owners)
  )
  loop
    v_total_shares := v_total_shares + (v_owner->>'share_percentage')::numeric;
    v_total_paid := v_total_paid + (v_owner->>'amount_paid')::decimal;
    -- Check if caller is one of the owners
    if (v_owner->>'user_id')::uuid = auth.uid() then
      v_caller_is_owner := true;
    end if;
  end loop;

  if v_total_shares <> 100 then
    raise exception 'Shares must sum to 100. Got: %', v_total_shares;
  end if;

  if not v_caller_is_owner then
    raise exception 'Caller must be one of the co-owners';
  end if;

  -- Get primary owner (first in array)
  v_actor_name := (
    select coalesce(display_name, phone)
    from profiles where id = (p_owners->0->>'user_id')::uuid
  );

  -- Create the item
  insert into items (brand, model_name, category, circle_id, owner_id,
    co_owned, total_shares, primary_custodian_id,
    primary_image_url, estimated_value, currency, notes, status)
  values (p_brand, p_model_name, p_category, p_circle_id,
    (p_owners->0->>'user_id')::uuid, true, 100,
    (p_owners->0->>'user_id')::uuid,
    p_image_url, p_estimated_value, p_currency, p_notes, 'available')
  returning id into v_item_id;

  -- Insert owners
  foreach v_owner in array (
    select array_agg(value) from jsonb_array_elements(p_owners)
  )
  loop
    insert into item_owners (item_id, user_id, share_percentage, amount_paid, is_primary_custodian)
    values (v_item_id, (v_owner->>'user_id')::uuid,
      (v_owner->>'share_percentage')::numeric,
      (v_owner->>'amount_paid')::decimal,
      (v_owner->>'is_primary')::boolean);
  end loop;

  -- Log to ownership ledger
  insert into ownership_ledger (item_id, payer_id, entry_type, amount, currency, description, created_by)
  values (v_item_id, auth.uid(), 'purchase', v_total_paid, p_currency,
    'Initial co-ownership purchase', auth.uid());

  return v_item_id;
end;
$$;

-- 2. Fix process_buyout — require caller to be the buyer
CREATE OR REPLACE FUNCTION public.process_buyout(
  p_item_id uuid,
  p_buyer_id uuid,
  p_seller_id uuid,
  p_buyout_amount decimal(12,2)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_seller_share numeric(5,2);
  v_buyer_new_share numeric(5,2);
begin
  -- Auth check: caller must be the buyer
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if auth.uid() <> p_buyer_id then
    raise exception 'Only the buyer can initiate a buyout';
  end if;

  -- Get seller's current share
  select share_percentage into v_seller_share
  from item_owners
  where item_id = p_item_id and user_id = p_seller_id and is_active = true;

  if v_seller_share is null then
    raise exception 'Seller is not an active owner of this item';
  end if;

  -- Get buyer's current share
  select coalesce(sum(share_percentage), 0) into v_buyer_new_share
  from item_owners
  where item_id = p_item_id and user_id = p_buyer_id and is_active = true;

  v_buyer_new_share := v_buyer_new_share + v_seller_share;

  -- Deactivate seller's ownership
  update item_owners set is_active = false
  where item_id = p_item_id and user_id = p_seller_id;

  -- Update buyer's share
  if exists (select 1 from item_owners where item_id = p_item_id and user_id = p_buyer_id and is_active = true) then
    update item_owners set share_percentage = v_buyer_new_share
    where item_id = p_item_id and user_id = p_buyer_id and is_active = true;
  else
    insert into item_owners (item_id, user_id, share_percentage, amount_paid, is_primary_custodian)
    values (p_item_id, p_buyer_id, v_seller_share, p_buyout_amount, false);
  end if;

  -- Log to ledger
  insert into ownership_ledger (item_id, payer_id, entry_type, amount, currency, description, affected_owner_id, new_share_percentage, created_by)
  values (p_item_id, p_buyer_id, 'buyout', p_buyout_amount, 'AED',
    'Buyout of ' || v_seller_share || '% share', p_seller_id, v_buyer_new_share, auth.uid());

end;
$$;

-- 3. Fix transfer_custody — require caller to be a co-owner
CREATE OR REPLACE FUNCTION public.transfer_custody(
  p_item_id uuid,
  p_to_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  -- Auth check: caller must be an active co-owner
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_item_co_owner(p_item_id, auth.uid()) then
    raise exception 'Only co-owners can transfer custody';
  end if;

  -- Update primary custodian
  update items set primary_custodian_id = p_to_user_id
  where id = p_item_id;

  -- Log to custody_transfers
  insert into custody_transfers (item_id, from_user_id, to_user_id, status, requested_at, completed_at)
  values (p_item_id, auth.uid(), p_to_user_id, 'completed', now(), now());
end;
$$;

-- B3: Add default pagination limits to prevent unbounded queries
-- Add a safe default limit to getItems and similar queries via a helper function
CREATE OR REPLACE FUNCTION public.safe_limit(p_requested integer DEFAULT 50)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(GREATEST(p_requested, 1), 200);
$$;

GRANT EXECUTE ON FUNCTION public.safe_limit(integer) TO authenticated;
