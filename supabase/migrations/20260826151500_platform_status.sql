-- Centralized launch/monetization status.
-- This does not impose any current listing limit.

create or replace function public.get_platform_status()
returns table (
  member_count bigint,
  free_member_target integer,
  monetization_enabled boolean
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from auth.users),
    coalesce((select value_text::integer from public.platform_settings where key = 'free_member_target'), 1000),
    coalesce((select value_text::boolean from public.platform_settings where key = 'monetization_enabled'), false);
$$;

revoke all on function public.get_platform_status() from public;
grant execute on function public.get_platform_status() to anon, authenticated;
