-- Vehicle catalog normalization for Parça Avcısı MVP.
-- This migration adds catalog entities without replacing existing listing data.

create table if not exists public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  vehicle_type_id uuid not null references public.vehicle_types(id) on delete restrict,
  name text not null,
  unique (vehicle_type_id, name)
);

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes(id) on delete restrict,
  name text not null,
  unique (make_id, name)
);

create table if not exists public.vehicle_generations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete restrict,
  name text not null,
  year_from int,
  year_to int,
  unique (model_id, name)
);

create table if not exists public.vehicle_engines (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.vehicle_generations(id) on delete restrict,
  name text not null,
  fuel text,
  displacement_cc int,
  power_hp int,
  unique (generation_id, name)
);

alter table public.vehicles add column if not exists vehicle_type_id uuid references public.vehicle_types(id);
alter table public.vehicles add column if not exists make_id uuid references public.vehicle_makes(id);
alter table public.vehicles add column if not exists model_id uuid references public.vehicle_models(id);
alter table public.vehicles add column if not exists generation_id uuid references public.vehicle_generations(id);
alter table public.vehicles add column if not exists engine_id uuid references public.vehicle_engines(id);

alter table public.vehicle_types enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_generations enable row level security;
alter table public.vehicle_engines enable row level security;

create policy "public read vehicle types" on public.vehicle_types for select using (true);
create policy "public read vehicle makes" on public.vehicle_makes for select using (true);
create policy "public read vehicle models" on public.vehicle_models for select using (true);
create policy "public read vehicle generations" on public.vehicle_generations for select using (true);
create policy "public read vehicle engines" on public.vehicle_engines for select using (true);

create policy "authenticated create parts" on public.parts for insert to authenticated with check (true);
