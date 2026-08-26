-- Parça Avcısı — listing image storage ownership hardening.
-- The previous storage policy only checked the first folder component (user id).
-- That is insufficient by itself: a seller could place a path containing another
-- user's listing id and still satisfy the folder check. Keep public reads, but
-- bind writes/deletes to an existing listing owned by auth.uid().

-- Expected storage path: <user_id>/<listing_id>/<filename>

drop policy if exists "authenticated insert listing images" on storage.objects;
create policy "authenticated insert listing images"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = (storage.foldername(name))[2]
      and l.seller_id = auth.uid()
  )
);

drop policy if exists "authenticated update listing images" on storage.objects;
create policy "authenticated update listing images"
on storage.objects
for update to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = (storage.foldername(name))[2]
      and l.seller_id = auth.uid()
  )
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = (storage.foldername(name))[2]
      and l.seller_id = auth.uid()
  )
);

drop policy if exists "authenticated delete listing images" on storage.objects;
create policy "authenticated delete listing images"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.listings l
    where l.id::text = (storage.foldername(name))[2]
      and l.seller_id = auth.uid()
  )
);
