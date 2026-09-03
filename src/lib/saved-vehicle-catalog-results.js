import { requireSupabase, supabaseConfigured } from './supabase.js';
import { searchPartCatalog } from './part-catalog-search.js';
import { openCatalogPartDetail } from './catalog-part-detail.js';

const esc = (v) => String(v ?? '').replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[c]));

function ensureSection() {
  const listingGrid = document.querySelector('#listingGrid');
  if (!listingGrid?.parentNode) return null;
  let section = document.querySelector('#savedVehicleCatalogCompatibility');
  if (!section) {
    section = document.createElement('section');
    section.id = 'savedVehicleCatalogCompatibility';
    section.className = 'catalog-compatibility';
    listingGrid.parentNode.insertBefore(section, listingGrid);
  }
  return section;
}

function render(items, vehicle) {
  const section = ensureSection();
  if (!section) return;
  const label = [vehicle.make, vehicle.model, vehicle.year, vehicle.version].filter(Boolean).join(' · ');
  if (!items.length) {
    section.innerHTML = '<div class="catalog-compatibility-empty"><strong>' + esc(label) + ' için katalog parçası bulunamadı.</strong><span>Motor/versiyon bilgisini ekleyerek daha kesin eşleşme alabilirsin.</span></div>';
    return;
  }
  const unique = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(String(item.id))) continue;
    seen.add(String(item.id));
    unique.push(item);
  }
  section.innerHTML = '<div class="catalog-compatibility-head"><div><span class="eyebrow">KAYITLI ARAÇ · KATALOG</span><h2>' + esc(label) + ' için uygun parçalar</h2><p>' + unique.length + ' katalog eşleşmesi bulundu. Bir parçaya dokunarak uyumluluk ve aktif ilanları açabilirsin.</p></div></div><div class="catalog-part-grid">' + unique.map((item) => {
    const app = item.matched_application || {};
    const appText = app.model || app.model_type || app.raw_text || '';
    const engine = app.engine_code ? ' · Motor: ' + app.engine_code : '';
    return '<article class="catalog-part-card" tabindex="0" role="button" data-saved-catalog-part="' + esc(item.id) + '"><div class="catalog-part-icon">⚙</div><div><span class="catalog-part-category">' + esc(item.category || 'Otomotiv Yedek Parça') + '</span><h3>' + esc(item.part_name || item.part_number || 'Parça') + '</h3><strong>' + esc(item.part_number || 'Parça no yok') + '</strong><p>' + esc(appText) + esc(engine) + '</p><small>Marka: ' + esc(item.brand || '—') + '</small></div></article>';
  }).join('') + '</div>';
  const open = (card) => {
    const item = unique.find((x) => String(x.id) === String(card.dataset.savedCatalogPart));
    if (item) void openCatalogPartDetail(item, vehicle);
  };
  section.querySelectorAll('[data-saved-catalog-part]').forEach((card) => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(card); }
    });
  });
}

async function loadForSavedVehicle(id) {
  if (!supabaseConfigured || !id) return;
  const section = ensureSection();
  if (section) section.innerHTML = '<div class="catalog-compatibility-loading"><span class="eyebrow">KAYITLI ARAÇ</span><strong>Uyumlu katalog parçaları aranıyor…</strong></div>';
  try {
    const client = requireSupabase();
    const { data: saved, error: savedError } = await client.from('user_vehicles').select('id,make,model,year,version,nickname').eq('id', id).maybeSingle();
    if (savedError) throw savedError;
    if (!saved) return;
    const items = await searchPartCatalog({ make: saved.make, model: saved.model, year: saved.year, engine: saved.version, limit: 60 });
    render(items, saved);
  } catch (error) {
    console.warn('Kayıtlı araç katalog araması başarısız:', error);
    if (section) section.innerHTML = '<div class="catalog-compatibility-empty"><strong>Katalog eşleşmesi şu anda alınamadı.</strong><span>Mevcut aktif ilan sonuçları kullanılmaya devam ediyor.</span></div>';
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-saved-vehicle]');
  if (!button) return;
  const id = button.dataset.openSavedVehicle;
  window.setTimeout(() => loadForSavedVehicle(id), 450);
});

window.__savedVehicleCatalogSearch = { load: loadForSavedVehicle };
