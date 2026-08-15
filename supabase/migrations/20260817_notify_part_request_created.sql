-- Parça Avcısı MVP — "Parça Arıyorum" satıcı bildirimi (Faz 12) + realtime (Faz 13).
-- A buyer request notifies matching sellers (part_request notification type).
-- Also registers part_requests / part_request_responses on the
-- supabase_realtime publication so the seller pane refreshes live.
-- Additive & idempotent: run AFTER 20260816_part_requests.sql.
-- No destructive operations; nothing is dropped except the trigger being (re)created.

-- ============================= Notification trigger =============================
-- Matching rule (documented, MVP-scope):
--   * sellers = distinct seller_id of active listings, excluding the requester;
--   * if the request has a part_category, match sellers with an active listing
--     in the same category;
--   * otherwise if the request has a city, match sellers with an active listing
--     in that city;
--   * otherwise notify every active seller (request has neither category nor city).
-- The seller's notify_requests profile setting (default true) is respected, same
-- pattern as the existing notify_messages/notify_listings/notify_favorites flags.
create or replace function public.notify_part_request_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_settings jsonb;
begin
  if new.status <> 'active' then
    return new;
  end if;

  for r in
    select distinct l.seller_id as seller_id
    from public.listings l
    where l.status = 'active'
      and l.seller_id <> new.user_id
      and (
        (new.part_category is not null and l.category = new.part_category)
        or (new.part_category is null and new.city is not null and l.city = new.city)
        or (new.part_category is null and new.city is null)
      )
  loop
    select settings into v_settings from public.profiles where id = r.seller_id;
    if coalesce((v_settings ->> 'notify_requests')::boolean, true) then
      insert into public.notifications (user_id, type, title, body, related_request_id)
      values (
        r.seller_id,
        'part_request',
        'Yeni parça talebi',
        coalesce(new.part_name, 'Parça') || ' için yeni bir talep var.',
        new.id
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_part_request_created_trigger on public.part_requests;
create trigger notify_part_request_created_trigger
after insert on public.part_requests
for each row execute procedure public.notify_part_request_created();

-- ============================= Realtime (Faz 13) =============================
-- INSERT events on these tables drive the seller pane / buyer pane refresh via
-- the `parca:requests-updated` event dispatched by src/lib/request-realtime.js.
-- (ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS, so guard each one.)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'part_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.part_requests';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'part_request_responses'
  ) then
    execute 'alter publication supabase_realtime add table public.part_request_responses';
  end if;
end $$;
