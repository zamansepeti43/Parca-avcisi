-- Parça Avcısı MVP — "Parça Arıyorum" matching system migration.
-- Adds part_requests (buyer wants) + part_request_responses (seller "Bende Var"),
-- part_request_images (optional request photos), request-based messaging support
-- (messages.request_id + nullable listing_id), delivery preference columns, and
-- the notification flow for request responses.
-- Additive & idempotent: existing tables are preserved, nothing is duplicated.
-- Run after 20260815_listing_photos_storage.sql / 20260815_vehicle_catalog_expansion.sql.

-- ============================= Request tables =============================
create table if not exists public.part_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  vehicle_version text,
  part_category text,
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

-- ============================= Delivery preference =============================
alter table public.listings add column if not exists delivery text;

-- ============================= Request-based messaging =============================
-- Request conversations have no listing; listing_id becomes optional and a
-- request_id link is added so the existing messages UI can render them.
alter table public.messages alter column listing_id drop not null;
alter table public.messages add column if not exists request_id uuid references public.part_requests(id) on delete cascade;

-- ============================= Notifications extension =============================
-- New types: request_response (seller "Bende Var" -> buyer), part_request (future
-- request->seller matching). New related_request_id links to the request.
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
create index if not exists part_request_responses_request_idx on public.part_request_responses(request_id);
create index if not exists part_request_images_request_idx on public.part_request_images(request_id, sort_order);
create index if not exists messages_request_idx on public.messages(request_id);

-- ============================= Row Level Security =============================
alter table public.part_requests enable row level security;
alter table public.part_request_responses enable row level security;
alter table public.part_request_images enable row level security;

-- part_requests:
--   SELECT: owner always; everyone may see active/answered (sellers browse).
--   INSERT/UPDATE: only the owner.
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

-- part_request_responses:
--   SELECT: request owner or the responding seller only.
--   INSERT: a seller responding to an open request they do not own.
--   (unique(request_id, seller_id) blocks duplicate "Bende Var" rows.)
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
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and pr.user_id <> auth.uid()
        and pr.status in ('active','answered')
    )
  );

-- Let request parties read each other's profiles (buyer <-> responders).
drop policy if exists "part request parties read profiles" on public.profiles;
create policy "part request parties read profiles" on public.profiles
  for select using (
    id in (select seller_id from public.part_request_responses where request_id in (select id from public.part_requests where user_id = auth.uid()))
    or id in (select user_id from public.part_requests where id in (select request_id from public.part_request_responses where seller_id = auth.uid()))
  );

-- part_request_images:
--   SELECT: owner; everyone may see photos of open requests.
--   All writes: owner only.
drop policy if exists "public can read open request images" on public.part_request_images;create policy "public can read open request images" on public.part_request_images
  for select using (
    exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and (pr.user_id = auth.uid() or pr.status in ('active','answered'))
    )
  );

drop policy if exists "owners manage own request images" on public.part_request_images;
create policy "owners manage own request images" on public.part_request_images
  for all using (
    exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and pr.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and pr.user_id = auth.uid()
    )
  );

-- ============================= Triggers =============================
-- 1) Seller "Bende Var" -> notify the request owner + mark the request "answered".
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
  select user_id, coalesce(part_name, 'parça')
    into v_requester, v_part
    from public.part_requests where id = new.request_id;

  update public.part_requests
    set status = 'answered', updated_at = now()
    where id = new.request_id and status = 'active';

  if v_requester is null then
    return new;
  end if;

  select coalesce(full_name, 'Bir satıcı')
    into v_seller
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

-- 2) Request-based messages get their own "Bende Var" notification; skip the
-- generic "Yeni mesaj" one so buyers are not double-notified.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text;
  v_request text;
begin
  if new.sender_id = new.receiver_id then
    return new;
  end if;
  if new.request_id is not null then
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
