create index if not exists listings_oem_number_search_idx on public.listings (lower(oem_number));
create index if not exists vehicles_make_model_year_idx on public.vehicles (lower(make), lower(model), year_from, year_to);
create index if not exists vehicles_engine_search_idx on public.vehicles (lower(engine));

create or replace function public.search_compatible_listings(
  p_make text default null,
  p_model text default null,
  p_year integer default null,
  p_engine text default null,
  p_limit integer default 48
)
returns setof public.listings
language sql
stable
security invoker
set search_path = public
as $$
  select distinct l.*
  from public.listings l
  left join public.listing_vehicles lv on lv.listing_id = l.id
  left join public.vehicles v on v.id = lv.vehicle_id
  where l.status = 'active'
    and (
      p_make is null or trim(p_make) = ''
      or lower(v.make) = lower(trim(p_make))
      or lower(coalesce(l.vehicle, '')) like '%' || lower(trim(p_make)) || '%'
    )
    and (
      p_model is null or trim(p_model) = ''
      or lower(v.model) = lower(trim(p_model))
      or lower(coalesce(l.vehicle, '')) like '%' || lower(trim(p_model)) || '%'
    )
    and (
      p_year is null
      or (v.year_from is not null and p_year >= v.year_from and (v.year_to is null or p_year <= v.year_to))
    )
    and (
      p_engine is null or trim(p_engine) = ''
      or lower(coalesce(v.engine, '')) = lower(trim(p_engine))
      or lower(coalesce(v.engine, '')) like '%' || lower(trim(p_engine)) || '%'
      or lower(coalesce(l.vehicle, '')) like '%' || lower(trim(p_engine)) || '%'
    )
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 48), 100));
$$;

grant execute on function public.search_compatible_listings(text,text,integer,text,integer) to anon, authenticated;
