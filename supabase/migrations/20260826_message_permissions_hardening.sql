-- Parça Avcısı — message authorization hardening.
-- Prevents arbitrary message injection and message field tampering.
drop policy if exists "message sender creates" on public.messages;
create policy "message sender creates" on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and sender_id <> receiver_id and (
    (listing_id is not null and exists (select 1 from public.listings l where l.id = listing_id and l.status in ('active','sold','paused') and (receiver_id = l.seller_id or exists (select 1 from public.messages m where m.listing_id = listing_id and ((m.sender_id = auth.uid() and m.receiver_id = receiver_id) or (m.receiver_id = auth.uid() and m.sender_id = receiver_id))))))
    or
    (request_id is not null and exists (select 1 from public.part_requests pr where pr.id = request_id and pr.status in ('active','answered') and (auth.uid() = pr.user_id or exists (select 1 from public.part_request_responses prr where prr.request_id = pr.id and prr.seller_id = auth.uid())) and (receiver_id = pr.user_id or exists (select 1 from public.part_request_responses prr where prr.request_id = pr.id and prr.seller_id = receiver_id))))
  )
);
drop policy if exists "message participants update" on public.messages;
create policy "message receiver marks read" on public.messages for update using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
create or replace function public.protect_message_immutable_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id or new.listing_id is distinct from old.listing_id or new.request_id is distinct from old.request_id or new.sender_id is distinct from old.sender_id or new.receiver_id is distinct from old.receiver_id or new.body is distinct from old.body or new.created_at is distinct from old.created_at then raise exception 'Mesajın içeriği ve tarafları değiştirilemez.'; end if;
  return new;
end;
$$;
drop trigger if exists protect_message_immutable_fields_trigger on public.messages;
create trigger protect_message_immutable_fields_trigger before update on public.messages for each row execute procedure public.protect_message_immutable_fields();
drop policy if exists "users insert own notifications" on public.notifications;
