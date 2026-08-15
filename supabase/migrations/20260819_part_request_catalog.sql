-- Parça Avcısı MVP — Parça taleplerinde katalog (araç tipi + alt kategori) alanları.
-- Marketplace V2: parça arayanların arama/filtre deneyimi için ek kolonlar.
-- Additive + idempotent; mevcut veri/şema bozulmaz. Yalnızca çalıştırıldığında uygulanır.

alter table public.part_requests
  add column if not exists vehicle_type text,
  add column if not exists part_subcategory text;

create index if not exists part_requests_part_subcategory_idx
  on public.part_requests (part_subcategory);
create index if not exists part_requests_vehicle_type_idx
  on public.part_requests (vehicle_type);

comment on column public.part_requests.vehicle_type is 'Araç tipi (Katalog ağacına göre kategori listesi seçilir).';
comment on column public.part_requests.part_subcategory is 'Ana kategorinin alt parça grubu (örn. Kaporta -> Bagaj Kapağı).';
