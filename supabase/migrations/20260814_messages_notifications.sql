-- Parça Avcısı MVP — account center migration.
-- Adds profile settings + saved-search notification flags, the notifications
-- table with RLS, message/listing/favorite/saved-search notification triggers,
-- and the extra profile read/insert policies needed by the account center.
-- Idempotent: safe to rerun on a database where schema.sql / the base listing
-- migration was already applied.
--
-- NOTE: this file sorts AFTER 20260814_auth_listings_schema.sql (it alters
-- tables and references listings) and BEFORE 20260814_vehicle_catalog.sql.

-- ============================= Column additions =============================
alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.saved_searches
  add column if not exists notify boolean not null default false;

-- ============================= Notifications table =============================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('message','listing_status','favorite','saved_search','system')),
  title text not null,
  body text,
  related_listing_id uuid references public.listings(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================= Indexes =============================
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists messages_participants_idx
  on public.messages(sender_id, receiver_id, created_at);

-- ============================= Row Level Security =============================
alter table public.notifications enable row level security;

-- Notifications are inserted by security-definer triggers; users only read,
-- update (mark read) and delete their own rows.
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

drop policy if exists "users insert own notifications" on public.notifications;
create policy "users insert own notifications" on public.notifications
  for insert with check (auth.uid() = user_id);

-- ============================= Profile policies =============================
-- Allow profile upsert (the profile row is pre-created by handle_new_user,
-- but upsert needs an insert policy).
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Let message participants read each other's profiles so conversation names
-- resolve. The subquery hits messages (whose policies never reference profiles),
-- so there is no RLS recursion.
drop policy if exists "users read message profiles" on public.profiles;
create policy "users read message profiles" on public.profiles
  for select using (
    id = auth.uid()
    or id in (select sender_id from public.messages where receiver_id = auth.uid())
    or id in (select receiver_id from public.messages where sender_id = auth.uid())
  );

-- Let the public read seller names on active listings (used on listing cards
-- and favorites).
drop policy if exists "public can read seller profiles" on public.profiles;
create policy "public can read seller profiles" on public.profiles
  for select using (
    id in (select seller_id from public.listings where status = 'active')
  );

-- ============================= Notification triggers =============================
-- Each trigger is security definer so it can insert a notification row on
-- behalf of another user, bypassing RLS on notifications.

-- 1) New message -> notify receiver (respects receiver notify_messages setting).
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text;
begin
  if new.sender_id = new.receiver_id then
    return new;
  end if;
  if coalesce(
    (select (settings->>'notify_messages')::boolean from public.profiles where id = new.receiver_id),
    true
  ) then
    select coalesce(title, 'İlan') into v_title from public.listings where id = new.listing_id;
    insert into public.notifications (user_id, type, title, body, related_listing_id)
    values (
      new.receiver_id,
      'message',
      'Yeni mesaj',
      'İlanın için yeni bir mesajın var: ' || v_title,
      new.listing_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_new_message_trigger on public.messages;
create trigger notify_new_message_trigger
after insert on public.messages
for each row execute procedure public.notify_new_message();

-- 2) Listing status change -> notify seller (respects notify_listings setting).
create or replace function public.notify_listing_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  select coalesce(title, 'İlan') into v_title from public.listings where id = new.id;
  if new.status = 'active' then
    v_body := 'İlanın yayında: ' || v_title;
  elsif new.status = 'sold' then
    v_body := 'İlanın satıldı olarak işaretlendi: ' || v_title;
  elsif new.status = 'paused' then
    v_body := 'İlanın yayını durduruldu: ' || v_title;
  elsif new.status = 'removed' then
    v_body := 'İlanın kaldırıldı: ' || v_title;
  else
    return new;
  end if;
  if coalesce(
    (select (settings->>'notify_listings')::boolean from public.profiles where id = new.seller_id),
    true
  ) then
    insert into public.notifications (user_id, type, title, body, related_listing_id)
    values (new.seller_id, 'listing_status', 'İlan durumu güncellendi', v_body, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_listing_status_trigger on public.listings;
create trigger notify_listing_status_trigger
after update on public.listings
for each row execute procedure public.notify_listing_status();

-- 3) New favorite -> notify seller (respects notify_favorites setting).
create or replace function public.notify_favorite_added()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_seller uuid;
  v_title text;
begin
  select seller_id, coalesce(title, 'İlan')
    into v_seller, v_title
    from public.listings where id = new.listing_id;
  if v_seller is null or v_seller = new.user_id then
    return new;
  end if;
  if coalesce(
    (select (settings->>'notify_favorites')::boolean from public.profiles where id = v_seller),
    true
  ) then
    insert into public.notifications (user_id, type, title, body, related_listing_id)
    values (v_seller, 'favorite', 'İlanın favorilere eklendi', 'İlanın bir kullanıcı tarafından favorilere eklendi: ' || v_title, new.listing_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_favorite_added_trigger on public.favorites;
create trigger notify_favorite_added_trigger
after insert on public.favorites
for each row execute procedure public.notify_favorite_added();

-- 4) New/activated listing matching a saved search (notify = true) -> notify owner.
create or replace function public.notify_saved_search_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_category text;
  v_vehicle record;
begin
  if new.status <> 'active' or (old is not null and old.status is not distinct from new.status) then
    return new;
  end if;
  select category into v_category from public.parts where id = new.part_id;
  select v.* into v_vehicle
  from public.listing_vehicles lv
  join public.vehicles v on v.id = lv.vehicle_id
  where lv.listing_id = new.id
  limit 1;
  for r in
    select id, user_id, query
    from public.saved_searches
    where notify = true
      and (category is null or category = v_category)
      and (condition is null or condition = new.condition)
      and (make is null or (v_vehicle is not null and v_vehicle.make = make))
      and (model is null or (v_vehicle is not null and v_vehicle.model = model))
  loop
    insert into public.notifications (user_id, type, title, body, related_listing_id)
    values (
      r.user_id,
      'saved_search',
      'Kayıtlı aramana uygun yeni ilan',
      coalesce(r.query, 'Kayıtlı arama') || ' için yeni ilan: ' || new.title,
      new.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_saved_search_match_insert on public.listings;
create trigger notify_saved_search_match_insert
after insert on public.listings
for each row execute procedure public.notify_saved_search_match();

drop trigger if exists notify_saved_search_match_update on public.listings;
create trigger notify_saved_search_match_update
after update on public.listings
for each row execute procedure public.notify_saved_search_match();
