import './vehicle-search-ui.css';
import { searchCompatibleListings, isVin } from './vehicle-compatibility-search.js';
import { searchPartCatalog } from './part-catalog-search.js';

const input = document.querySelector('#searchInput');
const grid = document.querySelector('#listingGrid');
const esc = (value) => String(value ?? '').replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[c]));

function looksLikeEngineCode(value) {
  const v = String(value || '').trim();
  return /^[A-Z0-9][A-Z0-9._-]{2,15}$/i.test(v) && /[A-Z]/i.test(v) && /\d/.test(v) && !/\s/.test(v);
}

function render(items, label) {
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<div class="empty"><strong>' + esc(label) + ' için uyumlu aktif ilan bulunamadı.</strong><span>Parça talebi oluşturabilir veya farklı bir araç/motor kodu deneyebilirsin.</span></div>';
    return;
  }
  window.dispatchEvent(new CustomEvent('parca:compatibility-results', { detail: { items, label } }));
}

function ensureCatalogContainer() {
  if (!grid) return null;
  let container = document.querySelector('#catalogCompatibility');
  if (!container) {
    container = document.createElement('section');
    container.id = 'catalogCompatibility';
    container.className = 'catalog-compatibility';
    grid.parentNode.insertBefore(container, grid);
  }
  return container;
}

function renderCatalog(items, vehicle) {
  const container = ensureCatalogContainer();
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="catalog-compatibility-empty"><strong>Seçtiğin araç için katalog eşleşmesi bulunamadı.</strong><span>Motor kodu veya daha spesifik kasa/versiyon seçerek tekrar deneyebilirsin.</span></div>';
    return;
  }
  const unique = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(String(item.id))) continue;
    seen.add(String(item.id));
    unique.push(item);
  }
  const vehicleLabel = [vehicle.make, vehicle.model, vehicle.year, vehicle.engine].filter(Boolean).join(' ');
  container.innerHTML = '<div class="catalog-compatibility-head"><div><span class="eyebrow">KATALOG UYUMLULUĞU</span><h2>' + esc(vehicleLabel) + ' için uygun parçalar</h2><p>' + unique.length + ' katalog eşleşmesi bulundu. Bunlar parça kataloğundaki uyumluluk kayıtlarıdır; aktif satış ilanı değildir.</p></div></div><div class="catalog-part-grid">' + unique.map((item) => {
    const app = item.matched_application || {};
    const appText = app.model || app.model_type || app.raw_text || '';
    const engine = app.engine_code ? ' · Motor: ' + app.engine_code : '';
    return '<article class="catalog-part-card"><div class="catalog-part-icon">⚙</div><div><span class="catalog-part-category">' + esc(item.category || 'Otomotiv Yedek Parça') + '</span><h3>' + esc(item.part_name || item.part_number || 'Parça') + '</h3><strong>' + esc(item.part_number || 'Parça no yok') + '</strong><p>' + esc(appText) + esc(engine) + '</p><small>Marka: ' + esc(item.brand || '—') + '</small></div></article>';
  }).join('') + '</div>';
}

async function searchSelectedVehicle() {
  const fields = {};
  document.querySelectorAll('[data-vehicle-field]').forEach((select) => { fields[select.dataset.vehicleField] = select.value || ''; });
  if (!fields.make || !fields.model) return;
  const container = ensureCatalogContainer();
  if (container) container.innerHTML = '<div class="catalog-compatibility-loading"><span class="eyebrow">KATALOG ARAMASI</span><strong>Uyumlu parçalar aranıyor…</strong></div>';
  try {
    const items = await searchPartCatalog({ make: fields.make, model: fields.model, year: fields.year, engine: fields.engine, limit: 60 });
    renderCatalog(items, fields);
  } catch (error) {
    console.warn('Katalog uyumluluk araması başarısız:', error);
    if (container) container.innerHTML = '<div class="catalog-compatibility-empty"><strong>Katalog araması şu anda tamamlanamadı.</strong><span>Aktif ilan araması kullanılabilir; daha sonra tekrar deneyebilirsin.</span></div>';
  }
}

async function compatibleSearch(raw) {
  const value = String(raw || '').trim();
  if (!isVin(value) && !looksLikeEngineCode(value)) return false;
  try {
    const items = await searchCompatibleListings({ identifier: isVin(value) ? value : '', engine: isVin(value) ? '' : value, limit: 48 });
    render(items, isVin(value) ? 'VIN ile belirlenen aracın' : value);
    return true;
  } catch (error) {
    console.warn('Araç uyumluluk araması başarısız:', error);
    return false;
  }
}

let timer;
async function handleSearch() {
  const value = input?.value?.trim() || '';
  if (!isVin(value) && !looksLikeEngineCode(value)) return;
  clearTimeout(timer);
  timer = setTimeout(() => compatibleSearch(value), 350);
}

function enableVinUi() {
  const paths = document.querySelector('.search-paths');
  if (!paths || !input) return;
  const notice = paths.querySelector('small');
  if (notice) notice.remove();
  let button = paths.querySelector('[data-focus-vin]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.dataset.focusVin = '';
    button.textContent = 'VIN / Şase No Ara';
    paths.appendChild(button);
  }
  if (button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    input.focus();
    input.placeholder = '17 haneli VIN / şase numarası gir...';
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

input?.addEventListener('input', handleSearch);
input?.addEventListener('change', handleSearch);
document.querySelector('#vehicleHierarchy')?.addEventListener('submit', () => {
  window.setTimeout(searchSelectedVehicle, 0);
});
window.__vehicleCompatibilitySearch = { search: compatibleSearch, searchSelectedVehicle };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enableVinUi);
else enableVinUi();
