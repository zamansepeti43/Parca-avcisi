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

create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists listings_seller_idx on public.listings(seller_id);
create index if not exists listings_condition_idx on public.listings(condition);
create index if not exists listings_city_idx on public.listings(city);
create index if not exists listings_oem_idx on public.listings(oem_number);
create index if not exists listings_part_idx on public.listings(part_id);
create index if not exists messages_listing_created_idx on public.messages(listing_id, created_at);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.parts enable row level security;
alter table public.listings enable row level security;
alter table public.listing_vehicles enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.messages enable row level security;

-- Policies are dropped/recreated so this script can be safely rerun.
drop policy if exists "public can read active listings" on public.listings;
create policy "public can read active listings" on public.listings
  for select using (status = 'active');

drop policy if exists "public can read vehicles" on public.vehicles;
create policy "public can read vehicles" on public.vehicles
  for select using (true);

drop policy if exists "public can read parts" on public.parts;
create policy "public can read parts" on public.parts
  for select using (true);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

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
