-- Global part knowledge for Parça Avcısı.
-- The same verified part identity is learned once per platform, regardless of listing.

create table if not exists public.ai_part_knowledge (
  id uuid primary key default gen_random_uuid(),
  part_key text not null unique,
  canonical_part jsonb not null default '{}'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  verified_count integer not null default 1 check (verified_count >= 1),
  first_seen_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_part_knowledge_last_verified_idx
  on public.ai_part_knowledge(last_verified_at desc);

alter table public.ai_part_knowledge enable row level security;

drop policy if exists "public read ai part knowledge" on public.ai_part_knowledge;
create policy "public read ai part knowledge"
  on public.ai_part_knowledge for select using (true);

drop policy if exists "authenticated create ai part knowledge" on public.ai_part_knowledge;
create policy "authenticated create ai part knowledge"
  on public.ai_part_knowledge for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated update ai part knowledge" on public.ai_part_knowledge;
create policy "authenticated update ai part knowledge"
  on public.ai_part_knowledge for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
