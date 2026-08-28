-- Centralized AI learning dataset for Parça Avcısı.
-- Candidate examples are collected separately from production listings and
-- only verified examples are eligible for future model training.

create table if not exists public.ai_learning_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  source text not null default 'manual' check (source in ('ai', 'manual')),
  status text not null default 'verified' check (status in ('pending', 'verified', 'rejected')),
  example_key text not null,
  ai_prediction jsonb,
  verified_listing jsonb not null default '{}'::jsonb,
  corrections jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) not null default 0 check (confidence >= 0 and confidence <= 100),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, example_key)
);

create index if not exists ai_learning_examples_status_idx
  on public.ai_learning_examples(status, created_at desc);

create index if not exists ai_learning_examples_user_idx
  on public.ai_learning_examples(user_id, created_at desc);

create index if not exists ai_learning_examples_listing_idx
  on public.ai_learning_examples(listing_id);

alter table public.ai_learning_examples enable row level security;

drop policy if exists "users read own ai learning examples" on public.ai_learning_examples;
create policy "users read own ai learning examples"
  on public.ai_learning_examples
  for select
  using (auth.uid() = user_id);

drop policy if exists "users create own ai learning examples" on public.ai_learning_examples;
create policy "users create own ai learning examples"
  on public.ai_learning_examples
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own ai learning examples" on public.ai_learning_examples;
create policy "users update own ai learning examples"
  on public.ai_learning_examples
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own ai learning examples" on public.ai_learning_examples;
create policy "users delete own ai learning examples"
  on public.ai_learning_examples
  for delete
  using (auth.uid() = user_id);
