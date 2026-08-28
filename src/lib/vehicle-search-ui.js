import { requireSupabase, supabaseConfigured } from './supabase.js';
import { getListingThumbnailUrl } from './listing-images.js';

const input = document.querySelector('#searchInput');
const grid = document.querySelector('#listingGrid');
const money = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0) + ' TL';
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));

function isVin(value) { return /^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value).replace(/\s+/g,'')); }
function looksLikeEngineCode(value) {
  const v = String(value).trim();
  return /^[A-Z0-9][A-Z0-9._-]{2,15}$/i.test(v) && /[A-Z]/i.test(v) && /\d/.test(v) && !/\s/.test(v);
}

async function decodeVin(vin) {
  const response = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/' + encodeURIComponent(vin) + '?format=json');
  if (!response.ok) throw new Error('Şase numarası çözülemedi.');
  const json = await response.json();
  const row = json?.Results?.[0];
  if (!row) throw new Error('Şase numarası için araç bilgisi bulunamadı.');
  return { make: row.Make || null, model: row.Model || null, year: Number(row.ModelYear) || null, engine: row.EngineModel || row.EngineConfiguration || null };
}

function render(items, vehicleLabel) {
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<div class="empty"><strong>' + esc(vehicleLabel) + ' için uyumlu aktif ilan bulunamadı.</strong><span>Parça talebi oluşturabilir veya farklı bir araç/motor kodu deneyebilirsin.</span></div>';
    return;
  }
  grid.innerHTML = items.map((item) => {
    const photo = item.image_path ? '<img class="listing-photo" src="' + esc(getListingThumbnailUrl(item.image_path)) + '" alt="' + esc(item.title) + '" loading="lazy">' : '';
    return '<article class="listing-card"><div class="listing-image engine">' + photo + '<span class="condition">' + esc(item.condition || '') + '</span><div class="part-art">⚙</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>' + esc(item.category || 'Oto Parça') + '</span><span>⌖ ' + esc(item.city || 'Türkiye') + '</span></div><h3>' + esc(item.title) + '</h3><p>' + esc(item.vehicle || vehicleLabel) + '</p><strong class="price">' + money(item.price) + '</strong><div class="seller-line"><span>✓ ' + esc(item.seller || 'Satıcı') + '</span><button class="detail-btn" data-detail="' + esc(item.id) + '">İncele</button></div></div></article>';
  }).join('');
}

async function compatibleSearch(raw) {
  const value = String(raw || '').trim();
  if (!supabaseConfigured || !value) return false;
  let vehicle;
  if (isVin(value)) {
    vehicle = await decodeVin(value.replace(/\s+/g,''));
  } else if (looksLikeEngineCode(value)) {
    vehicle = { make: null, model: null, year: null, engine: value };
  } else {
    return false;
  }
  const { data, error } = await requireSupabase().rpc('search_compatible_listing_cards', {
    p_make: vehicle.make,
    p_model: vehicle.model,
    p_year: vehicle.year,
    p_engine: vehicle.engine,
    p_limit: 100,
  });
  if (error) throw error;
  const label = [vehicle.make, vehicle.model, vehicle.year, vehicle.engine].filter(Boolean).join(' · ');
  render(data || [], label || value);
  return true;
}

let timer;
async function handleSearch() {
  const value = input?.value?.trim() || '';
  if (!isVin(value) && !looksLikeEngineCode(value)) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      await compatibleSearch(value);
    } catch (error) {
      console.warn('Araç uyumluluk araması başarısız:', error);
    }
  }, 350);
}

input?.addEventListener('input', handleSearch);
input?.addEventListener('change', handleSearch);
window.__vehicleCompatibilitySearch = { search: compatibleSearch, decodeVin };
