import { requireSupabase, supabaseConfigured } from './supabase.js';

const REASONS = [
  ['wrong_part', 'Parça/araç bilgisi yanlış'],
  ['fake_or_scam', 'Şüpheli / sahte / dolandırıcılık'],
  ['wrong_price', 'Fiyat bilgisi yanıltıcı'],
  ['duplicate', 'Tekrarlayan ilan'],
  ['offensive', 'Uygunsuz içerik'],
  ['other', 'Diğer'],
];

export async function reportListing(listingId) {
  if (!supabaseConfigured) throw new Error('Bildirim sistemi şu anda kullanılamıyor.');
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('İlan bildirmek için giriş yapmalısın.');

  const labels = REASONS.map(([value, label]) => `${value}: ${label}`).join('\n');
  const selected = window.prompt(`İlanı neden bildirmek istiyorsun?\n\n${labels}\n\nKodunu yaz:`);
  if (!selected) return false;
  const reason = String(selected).trim().toLowerCase();
  if (!REASONS.some(([value]) => value === reason)) {
    throw new Error('Geçerli bir bildirim nedeni seçmelisin.');
  }
  const details = window.prompt('İstersen kısa bir açıklama ekleyebilirsin:') || null;

  const { error } = await client.from('listing_reports').insert({
    listing_id: listingId,
    reporter_id: authData.user.id,
    reason,
    details,
  });
  if (error) {
    if (error.code === '23505') throw new Error('Bu ilanı daha önce bildirdin.');
    throw error;
  }
  return true;
}
