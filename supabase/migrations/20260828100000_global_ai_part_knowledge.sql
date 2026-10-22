create table if not exists public.ai_part_knowledge (
  id uuid primary key default gen_random_uuid(),
  part_key text not null unique,
  canonical_part jsonb not null default '{}'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  verified_count integer not null default 0,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_part_knowledge_oem_idx on public.ai_part_knowledge ((canonical_part->>'oemNumber'));
alter table public.ai_part_knowledge enable row level security;
drop policy if exists "ai_part_knowledge_read_authenticated" on public.ai_part_knowledge;
create policy "ai_part_knowledge_read_authenticated" on public.ai_part_knowledge for select to authenticated using (true);
drop policy if exists "ai_part_knowledge_client_insert" on public.ai_part_knowledge;
drop policy if exists "ai_part_knowledge_client_update" on public.ai_part_knowledge;
