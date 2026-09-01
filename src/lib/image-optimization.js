const MAX_INLINE_WIDTH = 1600;
const MAX_INLINE_HEIGHT = 1200;
const JPEG_QUALITY = 0.82;

function isImage(file) { return file instanceof Blob && String(file.type || '').startsWith('image/'); }

export async function optimizeImageFile(file) {
  if (!isImage(file) || typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_INLINE_WIDTH / bitmap.width, MAX_INLINE_HEIGHT / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.size <= 900 * 1024) { bitmap.close(); return file; }
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
    if (blob.size >= file.size * 0.95) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch (_) {
    return file;
  }
}

export async function optimizeImageFiles(files) {
  return Promise.all([...files].map(optimizeImageFile));
}

export const imageOptimizationReady = true;
