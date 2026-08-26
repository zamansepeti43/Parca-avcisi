-- Phone identity foundation.
-- The actual SMS verification provider is configured in Supabase Auth.
-- This table reserves one verified phone identity for one account and prevents
-- the same verified phone from being attached to multiple accounts.

create table if not exists public.verified_phone_identities (
  phone_e164 text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);

create unique index if not exists verified_phone_identities_user_id_uidx
  on public.verified_phone_identities(user_id);

alter table public.verified_phone_identities enable row level security;

-- No client-side insert/update/delete. A trusted server-side function/service role
-- must claim a phone only after Supabase Auth reports phone verification.
drop policy if exists "verified_phone_identity_select_own" on public.verified_phone_identities;
create policy "verified_phone_identity_select_own"
  on public.verified_phone_identities
  for select
  to authenticated
  using (auth.uid() = user_id);
