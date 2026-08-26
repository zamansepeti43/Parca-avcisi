-- Parça Avcısı — AI usage guard (2026-08-26)
-- Initial free-stage policy: 10 Vision AI analyses per user per day.
-- The limit can be changed later without changing the frontend.

create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  analysis_count integer not null default 0 check (analysis_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;

drop policy if exists "users read own ai usage" on public.ai_usage_daily;
create policy "users read own ai usage" on public.ai_usage_daily
  for select using (auth.uid() = user_id);

create or replace function public.consume_ai_analysis(p_daily_limit integer default 10)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date := current_date;
  v_count integer;
begin
  if v_user is null then
    raise exception 'AI kullanımı için giriş yapmalısın.' using errcode = '42501';
  end if;

  if p_daily_limit < 1 or p_daily_limit > 100 then
    raise exception 'Geçersiz AI günlük limiti.' using errcode = '22023';
  end if;

  insert into public.ai_usage_daily (user_id, usage_date, analysis_count)
  values (v_user, v_date, 1)
  on conflict (user_id, usage_date)
  do update set
    analysis_count = public.ai_usage_daily.analysis_count + 1,
    updated_at = now()
  where public.ai_usage_daily.analysis_count < p_daily_limit
  returning analysis_count into v_count;

  if v_count is null then
    select analysis_count into v_count
      from public.ai_usage_daily
     where user_id = v_user and usage_date = v_date;
    return jsonb_build_object('allowed', false, 'count', coalesce(v_count, 0), 'limit', p_daily_limit);
  end if;

  return jsonb_build_object('allowed', true, 'count', v_count, 'limit', p_daily_limit);
end;
$$;

grant execute on function public.consume_ai_analysis(integer) to authenticated;
