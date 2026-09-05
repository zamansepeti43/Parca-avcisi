import { requireSupabase, supabaseConfigured } from './supabase.js';

const CACHE_PREFIX = 'parca-avcisi:saved-vehicles:';
let memoryUserId = null;
let memoryVehicles = null;
let refreshPromise = null;

function cacheKey(userId) {
  return CACHE_PREFIX + String(userId || '');
}

function readCachedVehicles(userId) {
  if (!userId) return [];
  if (memoryUserId === userId && Array.isArray(memoryVehicles)) return memoryVehicles;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      memoryUserId = userId;
      memoryVehicles = parsed;
      return parsed;
    }
  } catch (_) {}
  return [];
}

function writeCachedVehicles(userId, vehicles) {
  if (!userId || !Array.isArray(vehicles)) return;
  memoryUserId = userId;
  memoryVehicles = vehicles;
  try { localStorage.setItem(cacheKey(userId), JSON.stringify(vehicles)); } catch (_) {}
}

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

async function fetchSavedVehicles(userId) {
  const { data, error } = await requireSupabase()
    .from('user_vehicles')
    .select('id, vehicle_id, vehicle_type, make, model, year, version, nickname, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const vehicles = data || [];
  writeCachedVehicles(userId, vehicles);
  return vehicles;
}

export async function getSavedVehicles() {
  if (!supabaseConfigured) return [];
  const user = await getLocalUser();
  const cached = readCachedVehicles(user.id);

  // Stale-while-revalidate: return known vehicles immediately and refresh silently.
  // This removes the 2–3 second blank/loading state when revisiting Araçlarım.
  if (cached.length || (memoryUserId === user.id && Array.isArray(memoryVehicles))) {
    if (!refreshPromise) {
      refreshPromise = fetchSavedVehicles(user.id).catch(() => cached).finally(() => { refreshPromise = null; });
    }
    return cached;
  }

  return fetchSavedVehicles(user.id);
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
  const current = readCachedVehicles(user.id);
  writeCachedVehicles(user.id, [data, ...current]);
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
  const current = readCachedVehicles(user.id);
  writeCachedVehicles(user.id, current.map((item) => String(item.id) === String(id) ? { ...item, ...payload } : item));
}

export async function deleteSavedVehicle(id) {
  const user = await requireUser();
  const { error } = await requireSupabase().from('user_vehicles').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  const current = readCachedVehicles(user.id);
  writeCachedVehicles(user.id, current.filter((item) => String(item.id) !== String(id)));
}