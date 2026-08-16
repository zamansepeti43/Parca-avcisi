-- Parça Avcısı MVP — profil adresi + kayıt verileri + mesaj canlı takibi.
-- * profiles.address sütunu (teslimat/iletişim adresi).
-- * handle_new_user tetik fonksiyonu kayıtta ad/soyad + telefon + adresi
--   auth.users.raw_user_meta_data üzerinden profiles satırına kopyalar
--   (e-posta doğrulaması açıkken oturum olmadan da kaydın tam olması için).
-- * messages tablosu supabase_realtime publication'a eklenir (Mesajlarım
--   panosunun yeni mesajlarla canlı güncellenmesi için).
-- Katmanlı ve idempotent: veri silmez, DROP içermez, tekrar çalıştırılabilir.
-- SQL Editor'den sırayla çalıştırılır (20260819_part_request_catalog.sql'den sonra).

-- ============================= profiles.address =============================
alter table public.profiles add column if not exists address text;

-- ============================= handle_new_user =============================
-- Yeni üyenin ad/soyad, telefon ve adres bilgisi kayıt anında profiles satırına
-- yazılır. Telefon/adres yalnızca görüşme kurulan tarafla paylaşılır; halka açık
-- okuma politikaları değişmez (public.can read seller profiles sadece isim/şehir
-- gösteriminde kullanılır, yeni sütun bunlara dahil değildir).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================= Realtime: messages =============================
-- Mesajlarım panosundaki açık konuşma, yeni mesaj geldiğinde canlı yenilenir.
-- (ALTER PUBLICATION ... ADD TABLE IF NOT EXISTS yok; aynı guard deseni kullanılır.)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;
