-- Parça Avcısı — storage/usage safeguards (2026-08-26)
-- Additive and idempotent. Keeps the free tier healthy as usage grows.

-- ============================= Listing image limits =============================
alter table public.listing_images
  add column if not exists file_size bigint not null default 0;

create index if not exists listing_images_listing_sort_idx
  on public.listing_images(listing_id, sort_order);

create or replace function public.enforce_listing_image_limits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
  v_bytes bigint;
begin
  select count(*), coalesce(sum(file_size), 0)
    into v_count, v_bytes
    from public.listing_images
   where listing_id = new.listing_id
     and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= 5 then
    raise exception 'Bir ilanda en fazla 5 fotoğraf olabilir.' using errcode = 'check_violation';
  end if;

  if v_bytes + greatest(coalesce(new.file_size, 0), 0) > 5 * 1024 * 1024 then
    raise exception 'Bir ilanın toplam fotoğraf boyutu 5 MB sınırını aşamaz.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_listing_image_limits_trigger on public.listing_images;
create trigger enforce_listing_image_limits_trigger
before insert or update of listing_id, file_size on public.listing_images
for each row execute procedure public.enforce_listing_image_limits();

-- ============================= Notification retention =============================
-- The UI shows only the latest 10. Keep a small server-side history as well,
-- so notification tables do not grow forever for active users.
create or replace function public.trim_user_notifications()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.notifications n
   where n.user_id = new.user_id
     and n.id in (
       select id
         from public.notifications
        where user_id = new.user_id
        order by created_at desc
        offset 50
     );
  return new;
end;
$$;

drop trigger if exists trim_user_notifications_trigger on public.notifications;
create trigger trim_user_notifications_trigger
after insert on public.notifications
for each row execute procedure public.trim_user_notifications();

-- Helpful indexes for the notification badge/list queries.
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at)
  where read_at is null;

-- ============================= Listing query indexes =============================
create index if not exists listings_active_created_idx
  on public.listings(created_at desc)
  where status = 'active';
create index if not exists listings_active_category_idx
  on public.listings(category, created_at desc)
  where status = 'active';
create index if not exists listings_active_city_idx
  on public.listings(city, created_at desc)
  where status = 'active';
create index if not exists listings_oem_idx
  on public.listings(oem_number)
  where oem_number is not null;

-- Part/OEM searches benefit from case-insensitive trigram matching when the
-- pg_trgm extension is available. The index is intentionally optional so an
-- existing free-tier database can run the migration safely.
do $$
begin
  create extension if not exists pg_trgm;
exception when others then
  raise notice 'pg_trgm extension could not be enabled; continuing safely.';
end $$;

create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);
create index if not exists listings_oem_trgm_idx
  on public.listings using gin (oem_number gin_trgm_ops);
