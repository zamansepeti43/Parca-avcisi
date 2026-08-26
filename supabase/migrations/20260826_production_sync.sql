-- Parça Avcısı — Production schema sync (2026-08-26)
-- Safe, additive and idempotent. This migration consolidates the schema pieces
-- required by the current frontend so an existing Supabase database can be
-- brought to the same shape without dropping or rewriting existing data.
-- Run this file in Supabase SQL Editor after the existing migrations.

create extension if not exists pgcrypto;

-- ============================= Profiles =============================
alter table public.profiles add column if not exists address text;

-- ============================= Listings =============================
alter table public.listings add column if not exists delivery text;

-- ============================= Part requests =============================
create table if not exists public.part_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  vehicle_version text,
  vehicle_type text,
  part_category text,
  part_subcategory text,
  part_name text not null,
  oem_number text,
  description text,
  city text,
  condition text not null default 'any' check (condition in ('new','used','salvage','any')),
  delivery text,
  status text not null default 'active' check (status in ('active','answered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations may have an older part_requests shape.
alter table public.part_requests add column if not exists vehicle_type text;
alter table public.part_requests add column if not exists part_subcategory text;

create table if not exists public.part_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.part_requests(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (request_id, seller_id)
);

create table if not exists public.part_request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.part_requests(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================= Messages =============================
alter table public.messages alter column listing_id drop not null;
alter table public.messages add column if not exists request_id uuid references public.part_requests(id) on delete cascade;

-- ============================= Notifications =============================
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('message','listing_status','favorite','saved_search','system','request_response','part_request'));
alter table public.notifications add column if not exists related_request_id uuid references public.part_requests(id) on delete cascade;

-- ============================= Indexes =============================
create index if not exists part_requests_status_idx on public.part_requests(status, created_at desc);
create index if not exists part_requests_user_idx on public.part_requests(user_id);
create index if not exists part_requests_category_idx on public.part_requests(part_category);
create index if not exists part_requests_city_idx on public.part_requests(city);
create index if not exists part_requests_make_idx on public.part_requests(vehicle_make);
create index if not exists part_requests_part_subcategory_idx on public.part_requests(part_subcategory);
create index if not exists part_requests_vehicle_type_idx on public.part_requests(vehicle_type);
create index if not exists part_request_responses_request_idx on public.part_request_responses(request_id);
create index if not exists part_request_images_request_idx on public.part_request_images(request_id, sort_order);
create index if not exists messages_request_idx on public.messages(request_id);

-- ============================= RLS =============================
alter table public.part_requests enable row level security;
alter table public.part_request_responses enable row level security;
alter table public.part_request_images enable row level security;

-- part_requests: owner access + public access to open requests.
drop policy if exists "users read own part requests" on public.part_requests;
create policy "users read own part requests" on public.part_requests
  for select using (auth.uid() = user_id);

drop policy if exists "public can read open part requests" on public.part_requests;
create policy "public can read open part requests" on public.part_requests
  for select using (status in ('active','answered'));

drop policy if exists "users create own part requests" on public.part_requests;
create policy "users create own part requests" on public.part_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "users manage own part requests" on public.part_requests;
create policy "users manage own part requests" on public.part_requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Responses: requester and responding seller can read; authenticated sellers
-- can answer another user's active/answered request once.
drop policy if exists "parties read request responses" on public.part_request_responses;
create policy "parties read request responses" on public.part_request_responses
  for select using (
    auth.uid() = seller_id
    or auth.uid() = (select user_id from public.part_requests where id = request_id)
  );

drop policy if exists "sellers respond to open requests" on public.part_request_responses;
create policy "sellers respond to open requests" on public.part_request_responses
  for insert to authenticated
  with check (
    auth.uid() = seller_id
    and exists (
      select 1 from public.part_requests pr
      where pr.id = request_id
        and pr.user_id <> auth.uid()
        and pr.status in ('active','answered')
    )
  );

-- Request images: owner manages; open request images are publicly readable.
drop policy if exists "public can read open request images" on public.part_request_images;
create policy "public can read open request images" on public.part_request_images
  for select using (
    exists (
      select 1 from public.part_requests pr
      where pr.id = request_id
        and (pr.user_id = auth.uid() or pr.status in ('active','answered'))
    )
  );

drop policy if exists "owners manage own request images" on public.part_request_images;
create policy "owners manage own request images" on public.part_request_images
  for all using (
    exists (
      select 1 from public.part_requests pr
      where pr.id = request_id and pr.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.part_requests pr
      where pr.id = request_id and pr.user_id = auth.uid()
    )
  );

-- ============================= Realtime =============================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'part_requests'
    ) then
      execute 'alter publication supabase_realtime add table public.part_requests';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'part_request_responses'
    ) then
      execute 'alter publication supabase_realtime add table public.part_request_responses';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
  end if;
end $$;

-- ============================= Request response notification =============================
create or replace function public.notify_request_response()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_requester uuid;
  v_part text;
  v_seller text;
begin
  select user_id, coalesce(part_name, 'parça') into v_requester, v_part
  from public.part_requests where id = new.request_id;

  update public.part_requests
    set status = 'answered', updated_at = now()
    where id = new.request_id and status = 'active';

  if v_requester is null then return new; end if;

  select coalesce(full_name, 'Bir satıcı') into v_seller
  from public.profiles where id = new.seller_id;

  insert into public.notifications (user_id, type, title, body, related_request_id)
  values (
    v_requester,
    'request_response',
    'Parça talebine cevap geldi',
    v_seller || ', aradığınız "' || v_part || '" parçasına sahip olduğunu belirtti.',
    new.request_id
  );
  return new;
end;
$$;

drop trigger if exists notify_request_response_trigger on public.part_request_responses;
create trigger notify_request_response_trigger
after insert on public.part_request_responses
for each row execute procedure public.notify_request_response();

-- ============================= New request notification =============================
-- Keep the seller-side notification trigger in the consolidated production
-- sync so a database that only receives this file does not silently miss the
-- "new part request" notification feature.
create or replace function public.notify_part_request_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_settings jsonb;
begin
  if new.status <> 'active' then
    return new;
  end if;

  for r in
    select distinct l.seller_id as seller_id
    from public.listings l
    where l.status = 'active'
      and l.seller_id <> new.user_id
      and (
        (new.part_category is not null and l.category = new.part_category)
        or (new.part_category is null and new.city is not null and l.city = new.city)
        or (new.part_category is null and new.city is null)
      )
  loop
    select settings into v_settings from public.profiles where id = r.seller_id;
    if coalesce((v_settings ->> 'notify_requests')::boolean, true) then
      insert into public.notifications (user_id, type, title, body, related_request_id)
      values (
        r.seller_id,
        'part_request',
        'Yeni parça talebi',
        coalesce(new.part_name, 'Parça') || ' için yeni bir talep var.',
        new.id
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_part_request_created_trigger on public.part_requests;
create trigger notify_part_request_created_trigger
after insert on public.part_requests
for each row execute procedure public.notify_part_request_created();

-- ============================= Profile creation =============================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
