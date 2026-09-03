import { requireSupabase } from './supabase.js';

export async function searchPartCatalog({ query = '', make = '', model = '', year = '', engine = '', category = '', limit = 48 } = {}) {
  const supabase = requireSupabase();
  const parsedYear = year === '' || year == null ? null : Number(year);
  const { data, error } = await supabase.rpc('search_part_catalog', {
    p_query: String(query || '').trim() || null,
    p_make: String(make || '').trim() || null,
    p_model: String(model || '').trim() || null,
    p_year: Number.isInteger(parsedYear) ? parsedYear : null,
    p_engine: String(engine || '').trim() || null,
    p_category: String(category || '').trim() || null,
    p_limit: Math.min(Math.max(Number(limit) || 48, 1), 100),
  });
  if (error) throw error;
  return data || [];
}
