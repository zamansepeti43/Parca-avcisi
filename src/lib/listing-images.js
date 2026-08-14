import { requireSupabase, supabaseConfigured } from './supabase.js';

const BUCKET = 'listing-images';

function fileExtension(name) {
  const match = /\.(\w+)$/.exec(name || '');
  return match ? match[1].toLowerCase() : 'jpg';
}

function publicUrl(storagePath) {
  if (!supabaseConfigured || !storagePath) return null;
  const { data } = requireSupabase().storage.from(BUCKET).getPublicUrl(storagePath);
  return (data && data.publicUrl) || null;
}

export function getListingImageUrl(storagePath) {
  return publicUrl(storagePath);
}

export async function getListingImages(listingId) {
  if (!supabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('listing_images')
    .select('id, listing_id, storage_path, sort_order, is_cover, created_at')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ ...row, url: publicUrl(row.storage_path) }));
}

export async function attachImagesToListing(listingId, files) {
  if (!supabaseConfigured) return [];
  const list = [...(files || [])].filter((file) => file && typeof file.name === 'string');
  if (!list.length) return [];

  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Fotoğraf yüklemek için giriş yapmalısın.');

  const { data: existing, error: existingError } = await client
    .from('listing_images')
    .select('id')
    .eq('listing_id', listingId)
    .limit(1);
  if (existingError) throw existingError;
  const hasCover = Boolean(existing && existing.length);

  const uploaded = [];
  try {
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const path = [
        authData.user.id,
        listingId,
        Date.now() + '-' + i + '.' + fileExtension(file.name)
      ].join('/');

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });
      if (uploadError) {
        throw new Error('Fotoğraf yüklenemedi (' + (file.name || i + 1) + '): ' + uploadError.message);
      }

      const { data: row, error: insertError } = await client
        .from('listing_images')
        .insert({
          listing_id: listingId,
          storage_path: path,
          sort_order: i,
          is_cover: !hasCover && i === 0
        })
        .select()
        .single();
      if (insertError) {
        throw new Error('Fotoğraf kaydı oluşturulamadı: ' + insertError.message);
      }
      uploaded.push({ ...row, url: publicUrl(row.storage_path) });
    }
    return uploaded;
  } catch (error) {
    for (const item of uploaded) {
      try { await client.storage.from(BUCKET).remove([item.storage_path]); } catch (_) { /* best effort */ }
      try { await client.from('listing_images').delete().eq('id', item.id); } catch (_) { /* best effort */ }
    }
    throw error;
  }
}

export async function deleteListingImages(listingId) {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: rows, error } = await client
    .from('listing_images')
    .select('storage_path')
    .eq('listing_id', listingId);
  if (error) throw error;
  for (const row of rows || []) {
    try { await client.storage.from(BUCKET).remove([row.storage_path]); } catch (_) { /* best effort */ }
  }
  const { error: deleteError } = await client
    .from('listing_images')
    .delete()
    .eq('listing_id', listingId);
  if (deleteError) throw deleteError;
}

export async function deleteListingImage(imageId) {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { data: row, error } = await client
    .from('listing_images')
    .select('storage_path, listing_id')
    .eq('id', imageId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return;
  try { await client.storage.from(BUCKET).remove([row.storage_path]); } catch (_) { /* best effort */ }
  const { error: deleteError } = await client.from('listing_images').delete().eq('id', imageId);
  if (deleteError) throw deleteError;
}

export async function setListingCover(listingId, imageId) {
  if (!supabaseConfigured) return;
  const client = requireSupabase();
  const { error: resetError } = await client
    .from('listing_images')
    .update({ is_cover: false })
    .eq('listing_id', listingId);
  if (resetError) throw resetError;
  const { error: coverError } = await client
    .from('listing_images')
    .update({ is_cover: true })
    .eq('id', imageId)
    .eq('listing_id', listingId);
  if (coverError) throw coverError;
}

export async function reorderListingImages(listingId, orderedIds) {
  if (!supabaseConfigured) return;
  if (!orderedIds.length) return;
  const client = requireSupabase();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await client
      .from('listing_images')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('listing_id', listingId);
    if (error) throw error;
  }
}
