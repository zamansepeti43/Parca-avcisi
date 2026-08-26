-- Configurable platform settings for the free launch period and future monetization.
-- No listing quota is enabled by this migration. These settings only prepare the switch.

create table if not exists public.platform_settings (
  key text primary key,
  value_text text not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value_text)
values
  ('monetization_enabled', 'false'),
  ('free_member_target', '1000')
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

-- Public app configuration is intentionally read-only from the client.
-- Writes must be performed by an admin/service role.
drop policy if exists "platform_settings_read" on public.platform_settings;
create policy "platform_settings_read"
  on public.platform_settings
  for select
  to anon, authenticated
  using (true);
