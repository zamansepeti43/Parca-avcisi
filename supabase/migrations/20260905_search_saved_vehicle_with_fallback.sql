-- Enhanced saved vehicle search with text fallback
-- This RPC searches for listings compatible with a user's saved vehicle,
-- including both structured vehicle matches and text-based fallback.

drop function if exists public.search_saved_vehicle_listings(uuid, int);

create or replace function public.search_saved_vehicle_listings(
  p_user_vehicle_id uuid,
  p_limit int default 100
)
returns table (
  id uuid,
  title text,
  price numeric,
  condition text,
  city text,
  image_path text,
  category text,
  vehicle text,
  seller_id uuid,
  seller_name text
) as $$
declare
  v_vehicle record;
  v_make text;
  v_model text;
  v_year int;
  v_vehicle_id uuid;
begin
  -- Get the user's vehicle
  select vehicle_id, make, model, year
    into v_vehicle_id, v_make, v_model, v_year
    from public.user_vehicles
    where id = p_user_vehicle_id;
  
  if v_make is null or v_model is null then
    return query select null::uuid, null::text, null::numeric, null::text, null::text, null::text, null::text, null::text, null::uuid, null::text limit 0;
    return;
  end if;

  -- First priority: structured vehicle matches via listing_vehicles
  return query
  select distinct
    l.id,
    l.title,
    l.price,
    l.condition,
    l.city,
    (select storage_path from public.listing_images where listing_id = l.id order by is_cover desc, sort_order limit 1) as image_path,
    l.category,
    l.vehicle,
    l.seller_id,
    p.full_name as seller_name
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  join public.listing_vehicles lv on lv.listing_id = l.id
  join public.vehicles v on v.id = lv.vehicle_id
  where l.status = 'active'
    and (v_vehicle_id is null or v.id = v_vehicle_id
         or (v.make ilike v_make and v.model ilike v_model
             and (v_year is null or v.year_from is null or v.year_to is null
                  or (v.year_from <= v_year and v_year <= v.year_to))))
  order by l.created_at desc
  limit p_limit;

  -- If no structured matches, fall back to text matching
  if not found then
    return query
    select distinct
      l.id,
      l.title,
      l.price,
      l.condition,
      l.city,
      (select storage_path from public.listing_images where listing_id = l.id order by is_cover desc, sort_order limit 1) as image_path,
      l.category,
      l.vehicle,
      l.seller_id,
      p.full_name as seller_name
    from public.listings l
    join public.profiles p on p.id = l.seller_id
    where l.status = 'active'
      and (l.vehicle ilike '%' || v_make || '%' or l.vehicle ilike '%' || v_model || '%'
           or l.title ilike '%' || v_make || '%' or l.title ilike '%' || v_model || '%'
           or l.category ilike '%part%' or l.category ilike '%parça%')
    order by l.created_at desc
    limit p_limit;
  end if;
end;
$$ language plpgsql stable security definer;
