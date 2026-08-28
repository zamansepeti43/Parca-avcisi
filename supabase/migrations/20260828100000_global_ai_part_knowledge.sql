-- Global part knowledge for Parça Avcısı.
-- Verified knowledge is shared platform-wide, while writes are restricted to trusted backend roles.

create table if not exists public.ai_part_knowledge (
  id uuid primary key default gen_random_uuid(),
  part_key text not null unique,
  canonical_part jsonb not null default '{}'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  verified_count integer not null default 1 check (verified_count >= 1),
  source_count integer not null default 1 check (source_count >= 1),
  confidence numeric(5,4) not null default 0.5000 check (confidence >= 0 and confidence <= 1),
  source_type text not null default 'user_verified',
  first_seen_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_part_knowledge_last_verified_idx
  on public.ai_part_knowledge(last_verified_at desc);

create index if not exists ai_part_knowledge_oem_idx
  on public.ai_part_knowledge using gin ((canonical_part -> 'oemNumber'));

alter table public.ai_part_knowledge enable row level security;

drop policy if exists "public read ai part knowledge" on public.ai_part_knowledge;
create policy "public read ai part knowledge"
  on public.ai_part_knowledge for select
  using (true);

-- No client INSERT/UPDATE policy: authenticated users can propose learning data
-- through ai_learning_examples, but global knowledge must be promoted by trusted
-- server-side logic after validation. This prevents one bad listing from poisoning
-- the shared AI memory.

drop policy if exists "authenticated create ai part knowledge" on public.ai_part_knowledge;
drop policy if exists "authenticated update ai part knowledge" on public.ai_part_knowledge;
