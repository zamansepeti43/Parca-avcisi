-- Parça Avcısı MVP database schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  city text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year_from int,
  year_to int,
  engine text,
  fuel text,
  created_at timestamptz not null default now()
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  subcategory text,
  oem_number text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  part_id uuid references public.parts(id) on delete set null,
  title text not null,
  description text,
  condition text not null check (condition in ('new','used','salvage')),
  price numeric(12,2) not null check (price >= 0),
  city text,
  district text,
  oem_number text,
  category text,
  subcategory text,
  vehicle text,
  stock_count int not null default 1 check (stock_count >= 0),
  status text not null default 'active' check (status in ('draft','active','sold','paused','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_vehicles (
  listing_id uuid not null references public.listings(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  primary key (listing_id, vehicle_id)
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text,
  make text,
  model text,
  year int,
  condition text,
  category text,
  notify boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

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

create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists listings_seller_idx on public.listings(seller_id);
create index if not exists listings_condition_idx on public.listings(condition);
create index if not exists listings_city_idx on public.listings(city);
create index if not exists listings_oem_idx on public.listings(oem_number);
create index if not exists listings_category_idx on public.listings(category);
create index if not exists listings_part_idx on public.listings(part_id);
create index if not exists messages_listing_created_idx on public.messages(listing_id, created_at);
create index if not exists messages_participants_idx on public.messages(sender_id, receiver_id, created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists listing_images_listing_order_idx on public.listing_images(listing_id, sort_order);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.parts enable row level security;
alter table public.listings enable row level security;
alter table public.listing_vehicles enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Policies are dropped/recreated so this script can be safely rerun.
drop policy if exists "public can read active listings" on public.listings;
create policy "public can read active listings" on public.listings
  for select using (status = 'active');

drop policy if exists "public can read vehicles" on public.vehicles;
create policy "public can read vehicles" on public.vehicles
  for select using (true);

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

drop policy if exists "public can read parts" on public.parts;
create policy "public can read parts" on public.parts
  for select using (true);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "users read message profiles" on public.profiles;
create policy "users read message profiles" on public.profiles
  for select using (
    id = auth.uid()
    or id in (select sender_id from public.messages where receiver_id = auth.uid())
    or id in (select receiver_id from public.messages where sender_id = auth.uid())
  );

drop policy if exists "public can read seller profiles" on public.profiles;
create policy "public can read seller profiles" on public.profiles
  for select using (
    id in (select seller_id from public.listings where status = 'active')
  );

drop policy if exists "users read own favorites" on public.favorites;
create policy "users read own favorites" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "users manage own favorites" on public.favorites;
create policy "users manage own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users manage own saved searches" on public.saved_searches;
create policy "users manage own saved searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sellers manage own listings" on public.listings;
create policy "sellers manage own listings" on public.listings
  for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists "message participants read" on public.messages;
create policy "message participants read" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "message sender creates" on public.messages;
create policy "message sender creates" on public.messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "message participants update" on public.messages;
create policy "message participants update" on public.messages
  for update using (auth.uid() = sender_id or auth.uid() = receiver_id);

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

drop policy if exists "public read listing images" on public.listing_images;
create policy "public read listing images" on public.listing_images
  for select using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

drop policy if exists "sellers manage own listing images" on public.listing_images;
create policy "sellers manage own listing images" on public.listing_images
  for all using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Automatically create a profile row after a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================= Notification triggers =============================
-- Security-definer triggers so notifications can be inserted for other users.
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

-- Listing photos storage bucket (public read, authenticated owner write).
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read listing images" on storage.objects;
create policy "public read listing images" on storage.objects
  for select using (bucket_id = 'listing-images');

drop policy if exists "authenticated insert listing images" on storage.objects;
create policy "authenticated insert listing images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "authenticated update listing images" on storage.objects;
create policy "authenticated update listing images" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "authenticated delete listing images" on storage.objects;
create policy "authenticated delete listing images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
