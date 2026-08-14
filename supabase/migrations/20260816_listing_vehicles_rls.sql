-- Fix: public.listing_vehicles had RLS enabled with no read policy, so the
-- `listing_vehicles(vehicle:vehicles(...))` embed in listing queries always
-- returned [] and the Make/Model/Yıl/Versiyon fields never reached the
-- listing detail page. Additive read-only policies (no schema changes).
alter table public.listing_vehicles enable row level security;

drop policy if exists "public can read listing vehicles" on public.listing_vehicles;
create policy "public can read listing vehicles" on public.listing_vehicles
  for select using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

drop policy if exists "sellers can read own listing vehicles" on public.listing_vehicles;
create policy "sellers can read own listing vehicles" on public.listing_vehicles
  for select using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );
