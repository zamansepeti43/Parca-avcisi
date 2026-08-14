-- Listing metadata: category, subcategory and vehicle label columns.
-- Additive only; idempotent (add column if not exists).

alter table public.listings add column if not exists category text;
alter table public.listings add column if not exists subcategory text;
alter table public.listings add column if not exists vehicle text;

create index if not exists listings_category_idx on public.listings(category);
