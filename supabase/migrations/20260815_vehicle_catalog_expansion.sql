-- Vehicle catalog expansion: self-contained, idempotent seed for the normalized catalog tables.
-- Creates the catalog tables (if missing) so this migration does not depend on prior migrations.
-- Additive only; never updates or deletes existing rows (no duplicates).
-- Mirrors the client-side catalog in src/lib/vehicle-catalog.js.

-- 1) Tables (create if not exists; no-op when already present).
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

-- 2) Row-level security (idempotent re-enable).
alter table public.vehicle_types enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;

-- 3) Policies: public read for all catalog tables (dropped/recreated so this can safely rerun).
drop policy if exists "public read vehicle types" on public.vehicle_types;
create policy "public read vehicle types" on public.vehicle_types
  for select using (true);

drop policy if exists "public read vehicle makes" on public.vehicle_makes;
create policy "public read vehicle makes" on public.vehicle_makes
  for select using (true);

drop policy if exists "public read vehicle models" on public.vehicle_models;
create policy "public read vehicle models" on public.vehicle_models
  for select using (true);

-- 4) Seed data.
insert into public.vehicle_types (name)
select name
from (values ('Otomobil'), ('SUV / 4x4'), ('Pickup / Kamyonet'), ('Panelvan'), ('Minibüs'),
             ('Kamyon'), ('Otobüs'), ('Motosiklet'), ('Ticari Araç'), ('Diğer')) as t(name)
on conflict (name) do nothing;

with otomobil as (
  select id from public.vehicle_types where name = 'Otomobil'
),
makes(name) as (values
  ('Tofaş'), ('Ford'), ('Renault'), ('Fiat'), ('Volkswagen'), ('Opel'), ('Peugeot'),
  ('Citroën'), ('Toyota'), ('BMW'), ('Audi'), ('Mercedes-Benz'), ('Honda'), ('Hyundai'),
  ('Kia'), ('Škoda'), ('Nissan'), ('Suzuki')
)
insert into public.vehicle_makes (vehicle_type_id, name)
select otomobil.id, makes.name from otomobil, makes
on conflict (vehicle_type_id, name) do nothing;

with models(make, name) as (values
  ('Tofaş', 'Şahin'), ('Tofaş', 'Doğan'), ('Tofaş', 'Kartal'), ('Tofaş', 'Serçe'),
  ('Tofaş', 'Murat 124'), ('Tofaş', 'Murat 131'), ('Tofaş', 'Murat 132'),
  ('Ford', 'Taunus'), ('Ford', 'Escort'), ('Ford', 'Fiesta'), ('Ford', 'Focus'),
  ('Ford', 'Mondeo'), ('Ford', 'Transit'), ('Ford', 'Transit Connect'), ('Ford', 'Courier'),
  ('Renault', 'R5'), ('Renault', 'R9'), ('Renault', 'R11'), ('Renault', 'R12'),
  ('Renault', 'R19'), ('Renault', 'Clio'), ('Renault', 'Symbol'), ('Renault', 'Megane'),
  ('Renault', 'Laguna'), ('Renault', 'Fluence'), ('Renault', 'Kangoo'), ('Renault', 'Master'),
  ('Fiat', '124'), ('Fiat', 'Uno'), ('Fiat', 'Tipo'), ('Fiat', 'Tempra'), ('Fiat', 'Palio'),
  ('Fiat', 'Siena'), ('Fiat', 'Marea'), ('Fiat', 'Albea'), ('Fiat', 'Punto'), ('Fiat', 'Linea'),
  ('Fiat', 'Egea'), ('Fiat', 'Doblo'), ('Fiat', 'Fiorino'),
  ('Volkswagen', 'Golf'), ('Volkswagen', 'Polo'), ('Volkswagen', 'Passat'), ('Volkswagen', 'Bora'),
  ('Volkswagen', 'Jetta'), ('Volkswagen', 'Vento'), ('Volkswagen', 'Transporter'), ('Volkswagen', 'Caddy'),
  ('Opel', 'Corsa'), ('Opel', 'Astra'), ('Opel', 'Vectra'), ('Opel', 'Omega'), ('Opel', 'Zafira'),
  ('Opel', 'Combo'),
  ('Peugeot', '106'), ('Peugeot', '205'), ('Peugeot', '206'), ('Peugeot', '306'), ('Peugeot', '307'),
  ('Peugeot', '308'), ('Peugeot', '405'), ('Peugeot', '406'), ('Peugeot', '407'), ('Peugeot', 'Partner'),
  ('Citroën', 'Saxo'), ('Citroën', 'Xsara'), ('Citroën', 'C3'), ('Citroën', 'C4'), ('Citroën', 'C5'),
  ('Citroën', 'Berlingo'),
  ('Toyota', 'Corolla'), ('Toyota', 'Carina'), ('Toyota', 'Yaris'), ('Toyota', 'Auris'),
  ('Toyota', 'Avensis'), ('Toyota', 'Camry'), ('Toyota', 'Hilux'), ('Toyota', 'RAV4'),
  ('BMW', '3 Serisi'), ('BMW', '5 Serisi'),
  ('Audi', 'A3'), ('Audi', 'A4'), ('Audi', 'A6'),
  ('Mercedes-Benz', 'C Serisi'), ('Mercedes-Benz', 'E Serisi'),
  ('Honda', 'Civic'), ('Honda', 'Accord'),
  ('Hyundai', 'Accent'), ('Hyundai', 'Elantra'), ('Hyundai', 'i20'),
  ('Kia', 'Rio'), ('Kia', 'Cerato'),
  ('Škoda', 'Fabia'), ('Škoda', 'Octavia'),
  ('Nissan', 'Micra'), ('Nissan', 'Almera'), ('Nissan', 'Qashqai'),
  ('Suzuki', 'Swift'), ('Suzuki', 'Vitara')
)
insert into public.vehicle_models (make_id, name)
select m.id, models.name
from models
join public.vehicle_makes m on m.name = models.make
on conflict (make_id, name) do nothing;
