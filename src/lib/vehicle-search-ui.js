import { searchCompatibleListings, isVin } from './vehicle-compatibility-search.js';

const input = document.querySelector('#searchInput');
const grid = document.querySelector('#listingGrid');
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));

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
window.__vehicleCompatibilitySearch = { search: compatibleSearch };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enableVinUi);
else enableVinUi();
