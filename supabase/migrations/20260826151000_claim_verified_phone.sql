-- Securely claim a verified phone identity for the signed-in user.
-- The unique primary key makes one verified phone usable by only one account.

create or replace function public.claim_verified_phone_identity(p_phone_e164 text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  verified boolean;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  select (phone = p_phone_e164 and phone_confirmed_at is not null)
    into verified
    from auth.users
   where id = current_user_id;

  if coalesce(verified, false) is not true then
    raise exception 'phone must be verified before it can be claimed';
  end if;

  insert into public.verified_phone_identities (phone_e164, user_id)
  values (p_phone_e164, current_user_id)
  on conflict (phone_e164) do nothing;

  if exists (
    select 1 from public.verified_phone_identities
     where phone_e164 = p_phone_e164
       and user_id = current_user_id
  ) then
    return true;
  end if;

  raise exception 'phone number is already linked to another account';
end;
$$;

revoke all on function public.claim_verified_phone_identity(text) from public;
grant execute on function public.claim_verified_phone_identity(text) to authenticated;
