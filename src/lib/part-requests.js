import { requireSupabase, supabaseConfigured } from './supabase.js';
import { sendMessage } from './messages.js';

const BUCKET = 'listing-images';

export const REQUEST_CONDITION_LABELS = { new: 'Sıfır', used: '2. El', salvage: 'Çıkma', any: 'Farketmez' };
export const REQUEST_STATUS_LABELS = { active: 'Aktif', answered: 'Cevap Geldi', closed: 'Kapalı' };

const requestSelect = 'id, user_id, vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_version, part_category, part_subcategory, part_name, oem_number, description, city, condition, delivery, status, created_at, updated_at, owner:profiles(id, full_name, phone, city), images:part_request_images(id, storage_path, sort_order, is_cover), responses:part_request_responses(id, seller_id, created_at, seller:profiles(id, full_name, phone, city))';

function requestImageUrl(storagePath) {
  if (!supabaseConfigured || !storagePath) return null;
  const { data } = requireSupabase().storage.from(BUCKET).getPublicUrl(storagePath);
  return (data && data.publicUrl) || null;
}

function normalizeRequest(row) {
  const images = (row.images || []).slice().sort((a, b) => Number(b.is_cover ?? 0) - Number(a.is_cover ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return {
    id: row.id,
    userId: row.user_id,
    vehicleType: row.vehicle_type || '',
    vehicleMake: row.vehicle_make || '',
    vehicleModel: row.vehicle_model || '',
    vehicleYear: row.vehicle_year || '',
    vehicleVersion: row.vehicle_version || '',
    partCategory: row.part_category || '',
    partSubcategory: row.part_subcategory || '',
    partName: row.part_name,
    oemNumber: row.oem_number || '',
    description: row.description || '',
    city: row.city || '',
    condition: row.condition || 'any',
    delivery: row.delivery || '',
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: row.owner || null,
    images: images.map((image) => ({ id: image.id, sortOrder: image.sort_order, isCover: image.is_cover, url: requestImageUrl(image.storage_path) })),
    responses: (row.responses || []).map((response) => ({
      id: response.id,
      sellerId: response.seller_id,
      createdAt: response.created_at,
      seller: response.seller || null,
    })),
    vehicleLabel: [row.vehicle_type, row.vehicle_make, row.vehicle_model, row.vehicle_year, row.vehicle_version].filter(Boolean).join(' · '),
  };
}

function cleanRequestFields(fields) {
  const clean = {};
  if (fields.vehicleType !== undefined) clean.vehicle_type = fields.vehicleType || null;
  if (fields.vehicleMake !== undefined) clean.vehicle_make = fields.vehicleMake || null;
  if (fields.vehicleModel !== undefined) clean.vehicle_model = fields.vehicleModel || null;
  if (fields.vehicleYear !== undefined) clean.vehicle_year = fields.vehicleYear || null;
  if (fields.vehicleVersion !== undefined) clean.vehicle_version = fields.vehicleVersion || null;
  if (fields.partCategory !== undefined) clean.part_category = fields.partCategory || null;
  if (fields.partSubcategory !== undefined) clean.part_subcategory = fields.partSubcategory || null;
  if (fields.partName !== undefined) clean.part_name = fields.partName;
  if (fields.oemNumber !== undefined) clean.oem_number = fields.oemNumber || null;
  if (fields.description !== undefined) clean.description = fields.description || null;
  if (fields.city !== undefined) clean.city = fields.city || null;
  if (fields.condition !== undefined) clean.condition = fields.condition;
  if (fields.delivery !== undefined) clean.delivery = fields.delivery || null;
  return clean;
}

function requireUser() {
  return requireSupabase().auth.getUser().then(({ data: authData }) => {
    if (!authData.user) throw new Error('Bu işlem için giriş yapmalısın.');
    return authData.user;
  });
}

export async function getMyPartRequests() {
  if (!supabaseConfigured) return [];
  const user = await requireUser();
  const { data, error } = await requireSupabase()
    .from('part_requests')
    .select(requestSelect)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeRequest);
}

export async function getMyRespondedRequests() {
  if (!supabaseConfigured) return [];
  const user = await requireUser();
  const mySelect = requestSelect.replace('responses:part_request_responses(', 'responses:part_request_responses!inner(');
  const { data, error } = await requireSupabase()
    .from('part_requests')
    .select(mySelect)
    .eq('responses.seller_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeRequest);
}

export async function getActivePartRequests(filters = {}) {
  if (!supabaseConfigured) return [];
  let query = requireSupabase()
    .from('part_requests')
    .select(requestSelect)
    .in('status', ['active', 'answered'])
    .order('created_at', { ascending: false });
  if (filters.vehicleType) query = query.eq('vehicle_type', filters.vehicleType);
  if (filters.make) query = query.ilike('vehicle_make', '%' + filters.make + '%');
  if (filters.model) query = query.ilike('vehicle_model', '%' + filters.model + '%');
  if (filters.year) query = query.ilike('vehicle_year', '%' + String(filters.year) + '%');
  if (filters.category) query = query.eq('part_category', filters.category);
  if (filters.subcategory) query = query.eq('part_subcategory', filters.subcategory);
  if (filters.partName) query = query.ilike('part_name', '%' + filters.partName + '%');
  if (filters.city) query = query.ilike('city', '%' + filters.city + '%');
  if (filters.condition && filters.condition !== 'any') query = query.eq('condition', filters.condition);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeRequest);
}

export async function getPartRequestById(id) {
  if (!supabaseConfigured) return null;
  const { data, error } = await requireSupabase()
    .from('part_requests')
    .select(requestSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeRequest(data) : null;
}

export async function createPartRequest(fields) {
  const user = await requireUser();
  const payload = cleanRequestFields(fields);
  const { data, error } = await requireSupabase()
    .from('part_requests')
    .insert({ user_id: user.id, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function assertPartRequestOwner(id, user) {
  const { data, error } = await requireSupabase()
    .from('part_requests')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Talep bulunamadı.');
  if (String(data.user_id) !== String(user.id)) throw new Error('Bu talebi yalnızca sahibi düzenleyebilir.');
}

export async function updatePartRequest(id, fields) {
  const user = await requireUser();
  await assertPartRequestOwner(id, user);
  const { error } = await requireSupabase()
    .from('part_requests')
    .update({ ...cleanRequestFields(fields), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function setPartRequestStatus(id, status) {
  if (!['active', 'answered', 'closed'].includes(status)) throw new Error('Geçersiz talep durumu.');
  const user = await requireUser();
  await assertPartRequestOwner(id, user);
  const { error } = await requireSupabase()
    .from('part_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function respondToRequest(requestId) {
  const user = await requireUser();
  const { data: request, error: requestError } = await requireSupabase()
    .from('part_requests')
    .select('id, user_id, part_name, status')
    .eq('id', requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) throw new Error('Talep bulunamadı.');
  if (request.user_id === user.id) throw new Error('Kendi talebine cevap veremezsin.');
  if (request.status === 'closed') throw new Error('Bu talep kapatılmış.');

  const { data: response, error: responseError } = await requireSupabase()
    .from('part_request_responses')
    .insert({ request_id: requestId, seller_id: user.id })
    .select()
    .single();
  if (responseError) {
    if (/duplicate|unique/i.test(String(responseError.message || ''))) {
      throw new Error('Bu talebe daha önce cevap verdiniz.');
    }
    throw new Error(responseError.message || 'Cevap oluşturulamadı.');
  }

  try {
    await sendMessage({
      requestId,
      receiverId: request.user_id,
      body: 'Merhaba, "' + String(request.part_name || 'parça') + '" parçası bende var. Detayları konuşalım.',
    });
  } catch (messageError) {
    console.warn('Cevap mesajı gönderilemedi.', messageError);
  }
  return response;
}

// ---- Request photos (optional) ----
function fileExtension(name) {
  const match = /\.(\w+)$/.exec(name || '');
  return match ? match[1].toLowerCase() : 'jpg';
}

export async function attachRequestImages(requestId, files) {
  if (!supabaseConfigured) return [];
  const list = [...(files || [])].filter((file) => file && typeof file.name === 'string');
  if (!list.length) return [];
  const client = requireSupabase();
  const user = await requireUser();

  const { data: existing, error: existingError } = await client
    .from('part_request_images')
    .select('id')
    .eq('request_id', requestId)
    .limit(1);
  if (existingError) throw existingError;
  const hasCover = Boolean(existing && existing.length);

  const uploaded = [];
  try {
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const path = [user.id, 'requests', requestId, Date.now() + '-' + i + '.' + fileExtension(file.name)].join('/');
      const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw new Error('Fotoğraf yüklenemedi (' + (file.name || i + 1) + '): ' + uploadError.message);

      const { data: row, error: insertError } = await client
        .from('part_request_images')
        .insert({ request_id: requestId, storage_path: path, sort_order: i, is_cover: !hasCover && i === 0 })
        .select()
        .single();
      if (insertError) throw new Error('Fotoğraf kaydı oluşturulamadı: ' + insertError.message);
      uploaded.push({ ...row, url: requestImageUrl(row.storage_path) });
    }
    return uploaded;
  } catch (error) {
    for (const item of uploaded) {
      try { await client.storage.from(BUCKET).remove([item.storage_path]); } catch (_) { /* best effort */ }
      try { await client.from('part_request_images').delete().eq('id', item.id); } catch (_) { /* best effort */ }
    }
    throw error;
  }
}

export async function deleteRequestImage(imageId) {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: row, error } = await client
    .from('part_request_images')
    .select('storage_path')
    .eq('id', imageId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return;
  try { await client.storage.from(BUCKET).remove([row.storage_path]); } catch (_) { /* best effort */ }
  const { error: deleteError } = await client.from('part_request_images').delete().eq('id', imageId);
  if (deleteError) throw deleteError;
}
