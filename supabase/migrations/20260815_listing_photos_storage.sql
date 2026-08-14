-- Listing photos: storage bucket + RLS + listing_images policies
-- Idempotent. Depends on public.listing_images from 20260814_auth_listings_schema.sql.
-- Run after 20260814_messages_notifications.sql and 20260814_vehicle_catalog.sql.

-- 1) Cover flag on listing_images (first uploaded photo of a listing).
alter table public.listing_images
  add column if not exists is_cover boolean not null default false;

create index if not exists listing_images_listing_order_idx
  on public.listing_images (listing_id, sort_order);

-- 2) Public storage bucket for listing photos.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

-- 3) storage.objects policies.
-- Public read: any client may download listing photos.
drop policy if exists "public read listing images" on storage.objects;
create policy "public read listing images" on storage.objects
  for select
  using (bucket_id = 'listing-images');

-- Authenticated write: each user may only touch files under their own folder.
drop policy if exists "authenticated insert listing images" on storage.objects;
create policy "authenticated insert listing images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated update listing images" on storage.objects;
create policy "authenticated update listing images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated delete listing images" on storage.objects;
create policy "authenticated delete listing images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) listing_images row-level policies.
-- Read: anyone can see images of active listings; the seller sees their own.
drop policy if exists "public read listing images" on public.listing_images;
create policy "public read listing images" on public.listing_images
  for select
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

-- Write: only the seller of the listing manages its images.
drop policy if exists "sellers manage own listing images" on public.listing_images;
create policy "sellers manage own listing images" on public.listing_images
  for all
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );
