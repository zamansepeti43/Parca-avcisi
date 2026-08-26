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
