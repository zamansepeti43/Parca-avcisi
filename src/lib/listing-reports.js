import { requireSupabase, supabaseConfigured } from './supabase.js';

export const REPORT_REASONS = [
  ['wrong_part', 'Parça / araç bilgisi yanlış'],
  ['fake_or_scam', 'Şüpheli / sahte / dolandırıcılık'],
  ['wrong_price', 'Fiyat bilgisi yanıltıcı'],
  ['duplicate', 'Tekrarlayan ilan'],
  ['offensive', 'Uygunsuz içerik'],
  ['other', 'Diğer'],
];

export async function submitListingReport(listingId, reason, details = null) {
  if (!supabaseConfigured) throw new Error('Bildirim sistemi şu anda kullanılamıyor.');
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('İlan bildirmek için giriş yapmalısın.');
  if (!REPORT_REASONS.some(([value]) => value === reason)) throw new Error('Geçerli bir bildirim nedeni seçmelisin.');
  const { error } = await client.from('listing_reports').insert({ listing_id: listingId, reporter_id: authData.user.id, reason, details: details?.trim() || null });
  if (error) { if (error.code === '23505') throw new Error('Bu ilanı daha önce bildirdin.'); throw error; }
  return true;
}
