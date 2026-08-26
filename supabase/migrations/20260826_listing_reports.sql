-- Parça Avcısı — Listing reports / moderation foundation
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('wrong_part','fake_or_scam','wrong_price','duplicate','offensive','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

create index if not exists listing_reports_status_idx on public.listing_reports(status, created_at desc);
create index if not exists listing_reports_listing_idx on public.listing_reports(listing_id);

alter table public.listing_reports enable row level security;

drop policy if exists "users read own listing reports" on public.listing_reports;
create policy "users read own listing reports" on public.listing_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "users create listing reports" on public.listing_reports;
create policy "users create listing reports" on public.listing_reports
  for insert to authenticated
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id <> auth.uid()
    )
  );

drop policy if exists "users update own open listing reports" on public.listing_reports;
create policy "users update own open listing reports" on public.listing_reports
  for update using (auth.uid() = reporter_id and status = 'open')
  with check (auth.uid() = reporter_id);
