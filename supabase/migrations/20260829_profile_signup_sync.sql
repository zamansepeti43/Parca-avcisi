-- Parça Avcısı — keep signup metadata synchronized with profiles.
-- Copies name, phone, city, address and avatar from auth.users metadata.

alter table public.profiles
  add column if not exists address text;

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, city, address, avatar_url)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', new.phone, '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'address', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), '')
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name),
    phone = coalesce(nullif(trim(excluded.phone), ''), public.profiles.phone),
    city = coalesce(nullif(trim(excluded.city), ''), public.profiles.city),
    address = coalesce(nullif(trim(excluded.address), ''), public.profiles.address),
    avatar_url = coalesce(nullif(trim(excluded.avatar_url), ''), public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill existing accounts from Auth metadata without overwriting
-- values that users may already have entered in their profile.
update public.profiles p
set
  full_name = coalesce(nullif(trim(p.full_name), ''), nullif(trim(u.raw_user_meta_data->>'full_name'), '')),
  phone = coalesce(nullif(trim(p.phone), ''), nullif(trim(u.raw_user_meta_data->>'phone'), ''), u.phone),
  city = coalesce(nullif(trim(p.city), ''), nullif(trim(u.raw_user_meta_data->>'city'), '')),
  address = coalesce(nullif(trim(p.address), ''), nullif(trim(u.raw_user_meta_data->>'address'), '')),
  avatar_url = coalesce(nullif(trim(p.avatar_url), ''), nullif(trim(u.raw_user_meta_data->>'avatar_url'), '')),
  updated_at = now()
from auth.users u
where u.id = p.id;
