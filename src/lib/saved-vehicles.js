import { requireSupabase, supabaseConfigured } from './supabase.js';

function requireUser() {
  return requireSupabase().auth.getUser().then(({ data, error }) => {
    if (error) throw error;
    if (!data.user) throw new Error('Bu işlem için giriş yapmalısın.');
    return data.user;
  });
}

async function getLocalUser() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  const user = data?.session?.user;
  if (!user) throw new Error('Bu işlem için giriş yapmalısın.');
  return user;
}

export async function getSavedVehicles() {
  if (!supabaseConfigured) return [];
  const user = await getLocalUser();
  const { data, error } = await requireSupabase()
    .from('user_vehicles')
    .select('id, vehicle_id, vehicle_type, make, model, year, version, nickname, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveVehicle({ vehicleId = null, vehicleType = '', make, model, year = '', version = '', nickname = '' }) {
  if (!make || !model) throw new Error('Marka ve model seçmelisin.');
  const user = await requireUser();
  const { data, error } = await requireSupabase()
    .from('user_vehicles')
    .insert({ user_id: user.id, vehicle_id: vehicleId || null, vehicle_type: vehicleType || null, make, model, year: year || null, version: version || null, nickname: nickname || null })
    .select()
    .single();
  if (error) {
    if (/duplicate|unique/i.test(String(error.message || ''))) throw new Error('Bu araç zaten Araçlarımda kayıtlı.');
    throw error;
  }
  return data;
}

export async function updateSavedVehicle(id, fields) {
  const user = await requireUser();
  const payload = { updated_at: new Date().toISOString() };
  for (const key of ['vehicle_type', 'make', 'model', 'year', 'version', 'nickname', 'vehicle_id']) {
    if (fields[key] !== undefined) payload[key] = fields[key] || null;
  }
  const { error } = await requireSupabase().from('user_vehicles').update(payload).eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function deleteSavedVehicle(id) {
  const user = await requireUser();
  const { error } = await requireSupabase().from('user_vehicles').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}
