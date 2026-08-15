-- Parça Avcısı MVP — ACİL DÜZELTME: part_requests FK ilişkileri.
-- Kök neden: 20260816_part_requests.sql, part_requests.user_id ve
-- part_request_responses.seller_id FK'larını public.profiles yerine
-- auth.users'a bağladı. Uygulama `owner:profiles(...)` / `seller:profiles(...)`
-- embed'i kullandığı için PostgREST ilişkiyi bulamadı (PGRST200) ve talep
-- detay/liste SELECT'leri HTTP 400 döndü -> "Talep bulunamadı".
--
-- Düzeltme: FK'ları public.profiles'a yeniden bağla. Veri/tablo silinmez;
-- yalnızca yanlış hedefli FK kısıtı yeniden oluşturulur. Guard'lar sayesinde
-- idempotenttir (migration istenildiği kadar çalıştırılabilir).

-- 1) public.part_requests.user_id -> public.profiles(id)
--    (mevcut FK auth.users'a bakıyorsa bırak/aç, public.profiles'a bağla)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_class t2 on t2.oid = c.confrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_namespace n2 on n2.oid = t2.relnamespace
    where t.relname = 'part_requests' and n.nspname = 'public'
      and t2.relname = 'profiles' and n2.nspname = 'public'
  ) then
    if exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where c.conname = 'part_requests_user_id_fkey'
        and t.relname = 'part_requests'
        and n.nspname = 'public'
    ) then
      alter table public.part_requests drop constraint part_requests_user_id_fkey;
    end if;
    alter table public.part_requests
      add constraint part_requests_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- 2) public.part_request_responses.seller_id -> public.profiles(id)
--    (aynı yaklaşım)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_class t2 on t2.oid = c.confrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_namespace n2 on n2.oid = t2.relnamespace
    where t.relname = 'part_request_responses' and n.nspname = 'public'
      and t2.relname = 'profiles' and n2.nspname = 'public'
  ) then
    if exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where c.conname = 'part_request_responses_seller_id_fkey'
        and t.relname = 'part_request_responses'
        and n.nspname = 'public'
    ) then
      alter table public.part_request_responses drop constraint part_request_responses_seller_id_fkey;
    end if;
    alter table public.part_request_responses
      add constraint part_request_responses_seller_id_fkey
      foreign key (seller_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
