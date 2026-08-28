-- Non-zero starting knowledge for the local AI layer.
-- This is vehicle identity/reference data, not fabricated OEM/fitment claims.
-- Part-specific facts should only enter ai_part_knowledge from a verified source or verified user listing.

create table if not exists public.ai_vehicle_knowledge (
  id uuid primary key default gen_random_uuid(),
  vehicle_key text not null unique,
  vehicle_type text not null,
  make text not null,
  model text not null,
  generation text,
  years integer[] not null default '{}',
  engines text[] not null default '{}',
  source text not null default 'Parça Avcısı vehicle catalog',
  source_license text,
  confidence numeric(4,3) not null default 0.80 check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_vehicle_knowledge_make_model_idx
  on public.ai_vehicle_knowledge(make, model);

alter table public.ai_vehicle_knowledge enable row level security;

drop policy if exists "public read ai vehicle knowledge" on public.ai_vehicle_knowledge;
create policy "public read ai vehicle knowledge"
  on public.ai_vehicle_knowledge for select using (true);

-- Safe seed examples already represented in the application's verified vehicle catalog.
insert into public.ai_vehicle_knowledge (vehicle_key, vehicle_type, make, model, generation, years, engines, source, source_license, confidence)
values
  ('tofas|sahin', 'Otomobil', 'Tofaş', 'Şahin', 'Şahin', '{1989,1990,1991,1992,1993,1994,1995,1996,1997,1998,1999}', '{1.4 L,1.6 L}', 'Parça Avcısı vehicle catalog', 'VehiclesDB attribution noted in vehicle-catalog.js', 0.85),
  ('ford|focus', 'Otomobil', 'Ford', 'Focus', 'Focus', '{1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023}', '{1.6 L,1.5 TDCi,2.0 L}', 'Parça Avcısı vehicle catalog', 'VehiclesDB attribution noted in vehicle-catalog.js', 0.85),
  ('renault|clio', 'Otomobil', 'Renault', 'Clio', 'Clio', '{1990,1991,1992,1993,1994,1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019}', '{1.2 L,1.4 L,1.5 dCi,1.6 L}', 'Parça Avcısı vehicle catalog', 'VehiclesDB attribution noted in vehicle-catalog.js', 0.85),
  ('fiat|egea', 'Otomobil', 'Fiat', 'Egea', 'Egea', '{2015,2016,2017,2018,2019,2020,2021,2022,2023,2024}', '{1.4 Fire,1.3 Multijet,1.6 E-Torq}', 'Parça Avcısı vehicle catalog', 'VehiclesDB attribution noted in vehicle-catalog.js', 0.85),
  ('volkswagen|golf', 'Otomobil', 'Volkswagen', 'Golf', 'Golf', '{1974,1975,1976,1977,1978,1979,1980,1981,1982,1983,1984,1985,1986,1987,1988,1989,1990,1991,1992,1993,1994,1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024}', '{1.4 TSI,1.6 TDI,2.0 GTI,1.6 L}', 'Parça Avcısı vehicle catalog', 'VehiclesDB attribution noted in vehicle-catalog.js', 0.85),
  ('opel|astra', 'Otomobil', 'Opel', 'Astra', 'Astra', '{1991,1992,1993,1994,1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023}', '{1.4 L,1.6 L,1.7 CDTi}', 'Parça Avcısı vehicle catalog', 'VehiclesDB attribution noted in vehicle-catalog.js', 0.85)
on conflict (vehicle_key) do update set
  vehicle_type = excluded.vehicle_type,
  generation = excluded.generation,
  years = excluded.years,
  engines = excluded.engines,
  updated_at = now();
