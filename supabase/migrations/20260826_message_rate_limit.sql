-- Parça Avcısı — message anti-spam guard (2026-08-26)
-- Prevents accidental/bot floods without changing normal marketplace chat.

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_recent integer;
begin
  if new.sender_id = new.receiver_id then
    raise exception 'Kendine mesaj gönderemezsin.' using errcode = 'check_violation';
  end if;

  select count(*) into v_recent
    from public.messages
   where sender_id = new.sender_id
     and created_at > now() - interval '1 minute';

  if v_recent >= 20 then
    raise exception 'Çok hızlı mesaj gönderiyorsun. Lütfen biraz bekleyip tekrar dene.' using errcode = 'too_many_requests';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_message_rate_limit_trigger on public.messages;
create trigger enforce_message_rate_limit_trigger
before insert on public.messages
for each row execute procedure public.enforce_message_rate_limit();

create index if not exists messages_sender_created_idx
  on public.messages(sender_id, created_at desc);
