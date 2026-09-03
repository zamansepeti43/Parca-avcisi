import './catalog-part-detail.css';
import { requireSupabase } from './supabase.js';
import { searchCompatibleListings } from './vehicle-compatibility-search.js';
import { toListingCard } from './listings.js';

const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = (v) => new Intl.NumberFormat('tr-TR').format(Number(v) || 0) + ' TL';

async function loadListings(item, vehicle) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('search_catalog_part_listings', {
    p_part_number: item.part_number || null,
    p_part_name: item.part_name || null,
    p_make: vehicle?.make || null,
    p_model: vehicle?.model || null,
    p_year: Number(vehicle?.year) || null,
    p_engine: vehicle?.engine || null,
    p_limit: 24,
  });
  if (!error && data?.length) return data.map(toListingCard);
  if (error) console.warn('Parça ilan eşleşmesi başarısız:', error);
  if (!item.part_number && !item.part_name) return [];
  return searchCompatibleListings({ make: vehicle?.make, model: vehicle?.model, year: vehicle?.year, engine: vehicle?.engine, limit: 24 });
}

function render(container, item, vehicle, listings) {
  const app = item.matched_application || {};
  const vehicleLabel = [vehicle?.make, vehicle?.model, vehicle?.year, vehicle?.engine].filter(Boolean).join(' · ');
  const compat = [app.make, app.model || app.model_type, app.year_from && ('Yıl: ' + app.year_from + (app.year_to ? '–' + app.year_to : '')), app.engine_code && ('Motor: ' + app.engine_code)].filter(Boolean).join(' · ');
  container.innerHTML = `<section class="catalog-part-detail"><button type="button" class="catalog-detail-back" data-catalog-detail-back>← Sonuçlara dön</button><div class="catalog-detail-head"><div class="catalog-detail-icon">⚙</div><div><span class="catalog-detail-eyebrow">KATALOG PARÇA</span><h1>${esc(item.part_name || item.part_number || 'Parça')}</h1><p>${esc(item.brand || '—')} · ${esc(item.part_number || 'Parça numarası belirtilmemiş')}</p></div></div><div class="catalog-detail-grid"><div class="catalog-detail-panel"><h2>Parça bilgileri</h2><dl><div><dt>Marka</dt><dd>${esc(item.brand || '—')}</dd></div><div><dt>Parça No</dt><dd>${esc(item.part_number || '—')}</dd></div><div><dt>Kategori</dt><dd>${esc(item.category || '—')}</dd></div><div><dt>Araç uyumluluğu</dt><dd>${esc(compat || vehicleLabel || 'Katalog kaydı mevcut')}</dd></div></dl></div><div class="catalog-detail-panel"><h2>Seçili araç</h2><p class="catalog-selected-vehicle">${esc(vehicleLabel || 'Araç seçilmedi')}</p><p class="catalog-detail-note">Katalog kaydı ve aktif satış ilanları ayrı doğrulanır. Aşağıdaki ilanlar hem parça eşleşmesine hem de seçili araç uyumluluğuna göre getirilmeye çalışılır.</p></div></div><div class="catalog-detail-listings"><div class="catalog-detail-listings-head"><h2>Bu parçaya ait uyumlu ilanlar</h2><span>${listings.length} ilan</span></div>${listings.length ? '<div class="catalog-detail-listing-grid">' + listings.map(l => `<article class="catalog-detail-listing"><div><span>${esc(l.condition || 'Parça')}</span><h3>${esc(l.title || l.partName || 'Uyumlu parça ilanı')}</h3><p>${esc(l.city || '')}${l.seller ? ' · ' + esc(l.seller) : ''}</p></div><strong>${money(l.price)}</strong><button type="button" data-detail-listing="${esc(l.id)}">İlanı incele</button></article>`).join('') + '</div>' : '<div class="catalog-detail-empty">Seçili araç için bu katalog parçasıyla eşleşen aktif ilan bulunamadı.</div>'}</div></section>`;
  container.querySelector('[data-catalog-detail-back]')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('parca:catalog-detail-back')));
  container.querySelectorAll('[data-detail-listing]').forEach(btn => btn.addEventListener('click', () => { window.location.hash = '#/ilan/' + encodeURIComponent(btn.dataset.detailListing); }));
}

export async function openCatalogPartDetail(item, vehicle = {}) {
  const host = document.querySelector('#catalogPartDetail') || (() => { const el = document.createElement('div'); el.id = 'catalogPartDetail'; const anchor = document.querySelector('#catalogCompatibility'); (anchor || document.querySelector('#listingGrid'))?.parentNode?.appendChild(el); return el; })();
  host.innerHTML = '<div class="catalog-detail-loading">Parça detayı ve uyumlu ilanlar yükleniyor…</div>';
  const listings = await loadListings(item, vehicle).catch(() => []);
  render(host, item, vehicle, listings);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export async function findCatalogPartById(id, vehicle = {}) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('ai_catalog_records').select('id,brand,part_number,part_name,category,source_quality,structured_applications').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const apps = Array.isArray(data.structured_applications) ? data.structured_applications : [];
  const matched = apps.find(a => (!vehicle.make || String(a.make || '').toLowerCase() === String(vehicle.make).toLowerCase()) && (!vehicle.model || String(a.model || '').toLowerCase().includes(String(vehicle.model).toLowerCase()))) || apps[0] || {};
  return {...data, matched_application: matched};
}