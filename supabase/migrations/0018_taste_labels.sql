-- ============================================================================
-- Migration 0018: Taste-Based Member Labels
--
-- Circle members get a personality-driven taste label on their member card,
-- auto-generated from their collection composition. Replaces the old
-- "N pieces · $value" stat line.
--
-- Spec: docs/TASTE_LABELS_SPEC.md
-- ============================================================================

-- 1. Add taste label columns to profiles
alter table public.profiles
  add column if not exists taste_label text;
alter table public.profiles
  add column if not exists taste_label_custom text;
alter table public.profiles
  add column if not exists taste_label_auto text;
alter table public.profiles
  add column if not exists taste_label_updated_at timestamptz;

-- 2. Function: compute a taste label from a user's collection
--    Evaluates signals in priority order:
--    A) Dominant brand (≥40%) → brand-specific label
--    B) Aesthetic signal (≥30% bold/experimental, classic, vintage) → aesthetic label
--    C) Dominant category (≥50%) → category label
--    D) Collection diversity → diversity label
--    New members (≤2 items) → "New to the Circle"
create or replace function public.compute_taste_label(_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _total_items     int;
  _unique_brands   int;
  _dominant_brand  text;
  _brand_count     int;
  _brand_pct       numeric;
  _dominant_cat    text;
  _cat_count       int;
  _cat_pct         numeric;
  _diversity       numeric;
  _bold_pct        numeric;
  _classic_pct     numeric;
  _vintage_pct     numeric;
  _label           text;
begin
  -- Count total items
  select count(*) into _total_items
  from public.items where owner_id = _user_id;

  -- New members (≤2 items)
  if _total_items <= 2 then
    return 'New to the Circle';
  end if;

  -- Check dominant brand (≥40%)
  select brand, count(*) into _dominant_brand, _brand_count
  from public.items
  where owner_id = _user_id and brand is not null
  group by brand
  order by count(*) desc
  limit 1;

  _brand_pct := case when _total_items > 0 then _brand_count::numeric / _total_items else 0 end;

  if _brand_pct >= 0.40 then
    _label := case _dominant_brand
      when 'Dior' then 'The Dior Devotee'
      when 'Hermès' then 'Hermès Loyalist'
      when 'Chanel' then 'Quilted Classicist'
      when 'Louis Vuitton' then 'The Monogrammer'
      when 'Bottega Veneta' then 'The Woven One'
      else 'The Connoisseur'
    end;
    return _label;
  end if;

  -- Check aesthetic signals (≥30%)
  select
    count(*) filter (where ai_identification ? 'tags' and (ai_identification->'tags')::text ~* 'bold|experimental')::numeric / _total_items,
    count(*) filter (where ai_identification ? 'tags' and (ai_identification->'tags')::text ~* 'classic|timeless')::numeric / _total_items,
    count(*) filter (where ai_identification ? 'tags' and (ai_identification->'tags')::text ~* 'vintage|heritage')::numeric / _total_items
  into _bold_pct, _classic_pct, _vintage_pct
  from public.items where owner_id = _user_id;

  if _bold_pct >= 0.30 then
    return 'The Risk Taker';
  end if;
  if _classic_pct >= 0.30 then
    return 'The Classicist';
  end if;
  if _vintage_pct >= 0.30 then
    return 'The Archivist';
  end if;

  -- Check dominant category (≥50%)
  select category, count(*) into _dominant_cat, _cat_count
  from public.items
  where owner_id = _user_id and category is not null
  group by category
  order by count(*) desc
  limit 1;

  _cat_pct := case when _total_items > 0 then _cat_count::numeric / _total_items else 0 end;

  if _cat_pct >= 0.50 then
    _label := case _dominant_cat
      when 'watch' then 'The Horologist'
      when 'bag' then 'The Handbag Hunter'
      when 'jewelry' then 'The Gem Keeper'
      when 'shoes' then 'The Stiletto Collector'
      when 'scarf' then 'The Silk Curator'
      else 'The Collector'
    end;
    return _label;
  end if;

  -- Diversity fallback
  select count(distinct brand) into _unique_brands
  from public.items where owner_id = _user_id and brand is not null;

  _diversity := case when _total_items > 0 then _unique_brands::numeric / _total_items else 0 end;

  if _diversity >= 0.50 then
    return 'The Curator';
  elsif _diversity >= 0.31 then
    return 'The Connoisseur';
  else
    return 'The Collector';
  end if;
end;
$$;

-- 3. Trigger: recompute taste_label_auto on item changes
create or replace function public.recompute_taste_label()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _affected_user uuid;
begin
  _affected_user := case
    when TG_OP = 'DELETE' then old.owner_id
    else new.owner_id
  end;

  if _affected_user is null then
    return coalesce(new, old);
  end if;

  -- Recompute auto label
  update public.profiles
  set taste_label_auto = public.compute_taste_label(_affected_user),
      taste_label_updated_at = now()
  where id = _affected_user;

  -- Update resolved label if no custom override
  update public.profiles
  set taste_label = taste_label_custom
  where id = _affected_user and taste_label_custom is not null;

  update public.profiles
  set taste_label = taste_label_auto
  where id = _affected_user and taste_label_custom is null;

  return coalesce(new, old);
end;
$$;

create trigger trg_recompute_taste_label_insert
  after insert on public.items
  for each row
  execute function public.recompute_taste_label();

create trigger trg_recompute_taste_label_update
  after update of brand, category on public.items
  for each row
  execute function public.recompute_taste_label();

create trigger trg_recompute_taste_label_delete
  after delete on public.items
  for each row
  execute function public.recompute_taste_label();

-- 4. Allow users to update their own taste label override
create policy "profiles_update_own_taste_label"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
