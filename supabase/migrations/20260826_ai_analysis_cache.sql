-- Parça Avcısı — AI image analysis cache
-- Stores only a SHA-256 image hash and the structured analysis result.
-- The original image is never stored in this table.

create table if not exists public.ai_image_analysis_cache (
  image_hash text primary key,
  model text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

alter table public.ai_image_analysis_cache enable row level security;

create index if not exists ai_image_analysis_cache_last_used_idx
  on public.ai_image_analysis_cache(last_used_at desc);

-- Cache is server-side only. No client RLS policy is intentionally granted.
-- The Vercel API uses SUPABASE_SERVICE_ROLE_KEY for cache reads/writes.

create or replace function public.cleanup_ai_image_analysis_cache(p_days integer default 180)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.ai_image_analysis_cache
   where last_used_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics removed = row_count;
  return removed;
end;
$$;
