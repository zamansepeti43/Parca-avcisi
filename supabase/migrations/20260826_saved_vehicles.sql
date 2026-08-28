-- Parça Avcısı — Saved vehicles (2026-08-26)
-- One account can save multiple vehicles. No buyer/seller role is required.

create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_type text,
  make text not null,
  model text not null,
  year text,
  version text,
  nickname text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_vehicles_user_idx on public.user_vehicles(user_id, created_at desc);
create unique index if not exists user_vehicles_unique_vehicle_idx
  on public.user_vehicles(user_id, make, model, coalesce(year, ''), coalesce(version, ''));

alter table public.user_vehicles enable row level security;

drop policy if exists "users read own vehicles" on public.user_vehicles;
create policy "users read own vehicles" on public.user_vehicles
  for select using (auth.uid() = user_id);

drop policy if exists "users create own vehicles" on public.user_vehicles;
create policy "users create own vehicles" on public.user_vehicles
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own vehicles" on public.user_vehicles;
create policy "users update own vehicles" on public.user_vehicles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete own vehicles" on public.user_vehicles;
create policy "users delete own vehicles" on public.user_vehicles
  for delete using (auth.uid() = user_id);

create or replace function public.search_saved_vehicle_listings(p_user_vehicle_id uuid, p_limit integer default 100)
returns table (
  id uuid,
  title text,
  description text,
  condition text,
  price numeric,
  city text,
  district text,
  category text,
  subcategory text,
  vehicle text,
  delivery text,
  oem_number text,
  stock_count integer,
  status text,
  created_at timestamptz,
  seller_id uuid,
  seller_name text,
  image_path text,
  matched_vehicle text
)
language sql
security definer
set search_path = public
as $$
  with saved as (
    select uv.*
    from public.user_vehicles uv
    where uv.id = p_user_vehicle_id and uv.user_id = auth.uid()
  ),
  matched as (
    select distinct on (l.id)
      l.id, l.title, l.description, l.condition, l.price, l.city, l.district,
      l.category, l.subcategory, l.vehicle, l.delivery, l.oem_number,
      l.stock_count, l.status, l.created_at, l.seller_id,
      p.full_name as seller_name,
      li.storage_path as image_path,
      concat(v.make, ' · ', v.model,
        case when v.year_from is not null or v.year_to is not null then concat(' · ', coalesce(v.year_from::text,''), case when v.year_to is not null then concat('–',v.year_to::text) else '' end) else '' end,
        case when v.engine is not null then concat(' · ', v.engine) else '' end) as matched_vehicle
    from saved s
    join public.listing_vehicles lv on true
    join public.vehicles v on v.id = lv.vehicle_id
    join public.listings l on l.id = lv.listing_id and l.status = 'active'
    left join public.profiles p on p.id = l.seller_id
    left join lateral (
      select storage_path from public.listing_images x
      where x.listing_id = l.id order by x.is_cover desc, x.sort_order asc limit 1
    ) li on true
    where lower(trim(v.make)) = lower(trim(s.make))
      and lower(trim(v.model)) = lower(trim(s.model))
      and (s.year is null or s.year = '' or v.year_from is null or s.year::integer >= v.year_from)
      and (s.year is null or s.year = '' or v.year_to is null or s.year::integer <= v.year_to)
      and (s.version is null or s.version = '' or v.engine is null or lower(v.engine) = lower(s.version) or lower(v.engine_code) = lower(s.version))
    order by l.id, li.storage_path nulls last
  )
  select * from matched order by created_at desc limit greatest(1, least(coalesce(p_limit,100),200));
$$;

grant execute on function public.search_saved_vehicle_listings(uuid, integer) to authenticated;
