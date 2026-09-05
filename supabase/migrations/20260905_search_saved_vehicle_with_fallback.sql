-- Search ALL active listings for a saved vehicle's MAKE + MODEL.
-- Year/version are intentionally not listing filters.

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
  v_make text;
  v_model text;
begin
  select uv.make, uv.model
    into v_make, v_model
    from public.user_vehicles uv
    where uv.id = p_user_vehicle_id;

  if v_make is null or v_model is null then
    return query select null::uuid, null::text, null::numeric, null::text,
      null::text, null::text, null::text, null::text, null::uuid, null::text
      limit 0;
    return;
  end if;

  -- Return every active listing that can be associated with the saved
  -- vehicle's make + model. Structured vehicle links and legacy/text-only
  -- listings are combined in ONE result set, so structured matches do not
  -- hide additional text-only listings.
  return query
  select distinct
    l.id,
    l.title,
    l.price,
    l.condition,
    l.city,
    (select storage_path
       from public.listing_images
      where listing_id = l.id
      order by is_cover desc, sort_order
      limit 1) as image_path,
    l.category,
    l.vehicle,
    l.seller_id,
    p.full_name as seller_name
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  where l.status = 'active'
    and (
      exists (
        select 1
          from public.listing_vehicles lv
          join public.vehicles v on v.id = lv.vehicle_id
         where lv.listing_id = l.id
           and v.make ilike v_make
           and v.model ilike v_model
      )
      or (
        (l.vehicle ilike '%' || v_make || '%' and l.vehicle ilike '%' || v_model || '%')
        or (l.title ilike '%' || v_make || '%' and l.title ilike '%' || v_model || '%')
        or (
          (coalesce(l.vehicle, '') || ' ' || coalesce(l.title, '')) ilike '%' || v_make || '%'
          and (coalesce(l.vehicle, '') || ' ' || coalesce(l.title, '')) ilike '%' || v_model || '%'
        )
      )
    )
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$ language plpgsql stable security definer;
