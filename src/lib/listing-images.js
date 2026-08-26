import { requireSupabase, supabaseConfigured } from './supabase.js';

const BUCKET = 'listing-images';
const MAX_IMAGES_PER_LISTING = 5;
const TARGET_BYTES = 900 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1800;

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
    .select('id, listing_id, storage_path, sort_order, is_cover, file_size, created_at')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ ...row, url: publicUrl(row.storage_path) }));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Fotoğraf dönüştürülemedi.')), type, quality);
  });
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch (_) { /* Image fallback below. */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotoğraf okunamadı.')); };
    image.src = url;
  });
}

function scaledSize(width, height, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Kullanıcıdan gelen fotoğrafları yüklemeden önce otomatik optimize eder.
 * Hedef yaklaşık 900 KB'dır; 1 MB üstüne çıkma ihtimalini azaltır.
 * Zaten küçük ve boyutları uygun görseller gereksiz yere yeniden kodlanmaz.
 */
export async function optimizeListingImage(file) {
  if (!(file instanceof File) || !file.size) throw new Error('Geçerli bir fotoğraf seçmelisin.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('Yalnızca görsel dosyaları yüklenebilir.');

  const image = await loadImage(file);
  const naturalWidth = image.width || image.naturalWidth;
  const naturalHeight = image.height || image.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('Fotoğraf boyutları okunamadı.');

  if (file.size <= TARGET_BYTES && Math.max(naturalWidth, naturalHeight) <= MAX_DIMENSION) {
    return file;
  }

  const maxDimensions = [MAX_DIMENSION, 1600, 1400, 1200, 1000];
  const qualities = [0.82, 0.75, 0.68, 0.60, 0.52];
  let bestBlob = null;

  for (const maxDimension of maxDimensions) {
    const { width, height } = scaledSize(naturalWidth, naturalHeight, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Fotoğraf işleme desteklenmiyor.');
    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, 'image/webp', quality);
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= TARGET_BYTES) {
        const baseName = (file.name || 'foto').replace(/\.[^.]+$/, '');
        return new File([blob], baseName + '.webp', { type: 'image/webp', lastModified: Date.now() });
      }
    }
  }

  if (bestBlob) {
    const baseName = (file.name || 'foto').replace(/\.[^.]+$/, '');
    return new File([bestBlob], baseName + '.webp', { type: 'image/webp', lastModified: Date.now() });
  }
  throw new Error('Fotoğraf optimize edilemedi.');
}

export async function attachImagesToListing(listingId, files) {
  if (!supabaseConfigured) return [];
  const list = [...(files || [])].filter((file) => file && typeof file.name === 'string' && file.size > 0);
  if (!list.length) return [];

  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Fotoğraf yüklemek için giriş yapmalısın.');

  const { data: existing, error: existingError } = await client
    .from('listing_images')
    .select('id, storage_path, file_size')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });
  if (existingError) throw existingError;

  const existingCount = existing?.length || 0;
  if (existingCount + list.length > MAX_IMAGES_PER_LISTING) {
    throw new Error('Bir ilanda en fazla ' + MAX_IMAGES_PER_LISTING + ' fotoğraf olabilir.');
  }

  const existingBytes = (existing || []).reduce((sum, row) => sum + Number(row.file_size || 0), 0);
  if (existingBytes >= MAX_TOTAL_BYTES) {
    throw new Error('Bu ilanın fotoğraf depolama sınırına ulaşıldı.');
  }

  const hasCover = existingCount > 0;
  const uploaded = [];
  let totalUploadedBytes = existingBytes;
  try {
    for (let i = 0; i < list.length; i++) {
      const sourceFile = list[i];
      const file = await optimizeListingImage(sourceFile);
      if (totalUploadedBytes + file.size > MAX_TOTAL_BYTES) {
        throw new Error('Fotoğrafların toplam boyutu 5 MB sınırını aşamaz. Daha az veya daha küçük fotoğraf seç.');
      }

      const sortOrder = existingCount + i;
      const extension = file.type === 'image/webp' ? 'webp' : fileExtension(file.name);
      const contentType = file.type || 'image/' + extension;
      const path = [
        authData.user.id,
        listingId,
        Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 8) + '.' + extension
      ].join('/');

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType,
          cacheControl: '31536000',
          upsert: false
        });
      if (uploadError) {
        throw new Error('Fotoğraf yüklenemedi (' + (sourceFile.name || i + 1) + '): ' + uploadError.message);
      }

      const { data: row, error: insertError } = await client
        .from('listing_images')
        .insert({
          listing_id: listingId,
          storage_path: path,
          sort_order: sortOrder,
          is_cover: !hasCover && i === 0,
          file_size: file.size
        })
        .select()
        .single();
      if (insertError) {
        try { await client.storage.from(BUCKET).remove([path]); } catch (_) { /* best effort */ }
        throw new Error('Fotoğraf kaydı oluşturulamadı: ' + insertError.message);
      }
      uploaded.push({ ...row, url: publicUrl(row.storage_path) });
      totalUploadedBytes += file.size;
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
    .select('id, storage_path')
    .eq('listing_id', listingId);
  if (error) throw error;

  const paths = (rows || []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await client.storage.from(BUCKET).remove(paths);
    if (storageError) throw storageError;
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
  if (row.storage_path) {
    const { error: storageError } = await client.storage.from(BUCKET).remove([row.storage_path]);
    if (storageError) throw storageError;
  }
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
  if (orderedIds.length > MAX_IMAGES_PER_LISTING) throw new Error('Bir ilanda en fazla ' + MAX_IMAGES_PER_LISTING + ' fotoğraf olabilir.');
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
