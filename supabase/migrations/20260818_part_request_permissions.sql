-- Parça Avcısı MVP — Part request yetki modeli kesinleştirme.
-- Yetki kuralları (hem RLS hem uygulama katmanı):
--   Talep sahibi: görüntüle, düzenle, kapat, yeniden aç. (DELETE gerekirse sahibi.)
--   Satıcı / diğer kullanıcı: görüntüle, "Bende Var" (cevap oluştur), mesajlaş.
--     Talebi değiştiremez/kapatamaz/silemez.
--   Anonymous: yalnızca aktif/cevap-geldi taleplerin temel bilgilerini görüntüleyebilir.
-- Idempotent & non-destructive: mevcut politikalar drop-if-exists ile yeniden
-- oluşturulur, tablo/kolon/veriye dokunulmaz. FK hedefleri 20260817_fix_part_request_fks.sql
-- ile çözülmüştür; buraya dokunulmaz.
-- Run order: 20260816_part_requests.sql -> 20260817_fix_part_request_fks.sql
--            -> 20260817_notify_part_request_created.sql -> bu dosya.

-- ============================= Deterministic privileges =============================
-- SQL Editor ile oluşturulan tablolarda rol yetkileri eksik kalabilir. Grant'ler
-- idempotenttir; anonim yalnızca RLS'in izin verdiği satırları görebilir.
grant usage on schema public to anon, authenticated;
grant all on table public.part_requests to anon, authenticated;
grant all on table public.part_request_responses to anon, authenticated;
grant all on table public.part_request_images to anon, authenticated;

-- ============================= RLS aktif (idempotent) =============================
alter table public.part_requests enable row level security;
alter table public.part_request_responses enable row level security;
alter table public.part_request_images enable row level security;

-- ============================= part_requests =============================
-- SELECT: sahibi her zaman; herkes aktif/cevap-geldi talepleri görebilir.
drop policy if exists "users read own part requests" on public.part_requests;
create policy "users read own part requests" on public.part_requests
  for select using (auth.uid() = user_id);

drop policy if exists "public can read open part requests" on public.part_requests;
create policy "public can read open part requests" on public.part_requests
  for select using (status in ('active','answered'));

-- INSERT: yalnızca sahibi (auth.uid() = user_id).
drop policy if exists "users create own part requests" on public.part_requests;
create policy "users create own part requests" on public.part_requests
  for insert with check (auth.uid() = user_id);

-- UPDATE: yalnızca sahibi. Başka kullanıcı talebi değiştiremez.
drop policy if exists "users manage own part requests" on public.part_requests;
create policy "users manage own part requests" on public.part_requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DELETE: yalnızca sahibi (kapatmak için değil, silmek için kullanılırsa).
drop policy if exists "users delete own part requests" on public.part_requests;
create policy "users delete own part requests" on public.part_requests
  for delete using (auth.uid() = user_id);

-- ============================= part_request_responses =============================
-- SELECT: yalnızca talep sahibi ve cevabı veren satıcı görebilir.
drop policy if exists "parties read request responses" on public.part_request_responses;
create policy "parties read request responses" on public.part_request_responses
  for select using (
    auth.uid() = seller_id
    or auth.uid() = (select user_id from public.part_requests where id = request_id)
  );

-- INSERT: satıcı yalnızca KENDİ cevabını, sahibi olmadığı ve açık bir talebe
-- oluşturabilir. (unique(request_id, seller_id) çift cevabı engeller.)
drop policy if exists "sellers respond to open requests" on public.part_request_responses;
create policy "sellers respond to open requests" on public.part_request_responses
  for insert to authenticated
  with check (
    auth.uid() = seller_id
    and exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and pr.user_id <> auth.uid()
        and pr.status in ('active','answered')
    )
  );

-- UPDATE/DELETE: bilinçli olarak hiçbir policy yok -> RLS varsayılan olarak reddeder.
-- Olası gevşek/eski politikalar temizlenir:
drop policy if exists "sellers manage own responses" on public.part_request_responses;
drop policy if exists "sellers update own responses" on public.part_request_responses;
drop policy if exists "users manage own part request responses" on public.part_request_responses;
drop policy if exists "public can manage request responses" on public.part_request_responses;
drop policy if exists "parties manage request responses" on public.part_request_responses;

-- ============================= part_request_images =============================
-- SELECT: sahibi; ayrıca herkes açık taleplerin fotoğraflarını görebilir.
-- Tüm yazma işlemleri: yalnızca talep sahibi.
drop policy if exists "public can read open request images" on public.part_request_images;
create policy "public can read open request images" on public.part_request_images
  for select using (
    exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and (pr.user_id = auth.uid() or pr.status in ('active','answered'))
    )
  );

drop policy if exists "owners manage own request images" on public.part_request_images;
create policy "owners manage own request images" on public.part_request_images
  for all using (
    exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and pr.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.part_requests pr
      where pr.id = request_id
        and pr.user_id = auth.uid()
    )
  );

-- ============================= profiles (parti erişimi) =============================
-- Talep sahibi <-> cevap veren satıcı birbirinin profilini okuyabilir
-- (mesajlaşma sonrası isim/şehir gösterimi için).
drop policy if exists "part request parties read profiles" on public.profiles;
create policy "part request parties read profiles" on public.profiles
  for select using (
    id in (select seller_id from public.part_request_responses where request_id in (select id from public.part_requests where user_id = auth.uid()))
    or id in (select user_id from public.part_requests where id in (select request_id from public.part_request_responses where seller_id = auth.uid()))
  );
