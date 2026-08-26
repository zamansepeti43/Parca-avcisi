-- Parça Avcısı — Public seller profile access
-- Exposes only fields that are safe to show on public listing/seller pages.
-- Private profile fields (phone, address, settings) remain protected by profiles RLS.

create or replace function public.get_public_seller_profile(p_seller_id uuid)
returns table (
  id uuid,
  full_name text,
  city text,
  avatar_url text,
  role text,
  created_at timestamptz,
  active_listing_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.city,
    p.avatar_url,
    p.role,
    p.created_at,
    count(l.id)::bigint as active_listing_count
  from public.profiles p
  left join public.listings l
    on l.seller_id = p.id
   and l.status = 'active'
  where p.id = p_seller_id
    and exists (
      select 1
      from public.listings visible_listing
      where visible_listing.seller_id = p.id
        and visible_listing.status = 'active'
    )
  group by p.id, p.full_name, p.city, p.avatar_url, p.role, p.created_at;
$$;

grant execute on function public.get_public_seller_profile(uuid) to anon, authenticated;
