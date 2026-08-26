const host = document.querySelector('#listingGrid')?.closest('.container');

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

function mount() {
  if (!host || document.querySelector('#advancedFilters')) return;
  const panel = document.createElement('div');
  panel.id = 'advancedFilters';
  panel.className = 'advanced-filters';
  panel.innerHTML = `
    <button type="button" class="advanced-filter-toggle" id="advancedFilterToggle" aria-expanded="false">
      <span>⚙ Filtrele</span><span class="advanced-filter-summary" id="advancedFilterSummary">Tüm ilanlar</span><span>⌄</span>
    </button>
    <div class="advanced-filter-panel" id="advancedFilterPanel" hidden>
      <div class="advanced-filter-grid">
        <label>Min. fiyat<input id="filterMinPrice" inputmode="numeric" placeholder="0 TL"></label>
        <label>Max. fiyat<input id="filterMaxPrice" inputmode="numeric" placeholder="100.000 TL"></label>
        <label>Şehir<input id="filterCity" autocomplete="address-level2" placeholder="İstanbul, Ankara..."></label>
        <label>Sıralama<select id="filterSort"><option value="relevance">Alaka düzeyi</option><option value="newest">En yeni</option><option value="price_asc">Fiyat: düşükten yükseğe</option><option value="price_desc">Fiyat: yüksekten düşüğe</option></select></label>
      </div>
      <div class="advanced-filter-actions"><button type="button" class="filter-clear" id="filterClear">Temizle</button><button type="button" class="filter-apply" id="filterApply">İlanları göster</button></div>
    </div>`;
  const sectionHead = host.querySelector('.section-head');
  if (sectionHead) sectionHead.insertAdjacentElement('afterend', panel);

  const toggle = panel.querySelector('#advancedFilterToggle');
  const drawer = panel.querySelector('#advancedFilterPanel');
  toggle.addEventListener('click', () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });

  const values = () => ({
    minPrice: panel.querySelector('#filterMinPrice').value,
    maxPrice: panel.querySelector('#filterMaxPrice').value,
    city: panel.querySelector('#filterCity').value,
    sort: panel.querySelector('#filterSort').value,
  });

  function updateSummary(filters) {
    const parts = [];
    if (filters.minPrice) parts.push(`${filters.minPrice} TL+`);
    if (filters.maxPrice) parts.push(`≤ ${filters.maxPrice} TL`);
    if (filters.city) parts.push(filters.city);
    if (filters.sort !== 'relevance') parts.push(panel.querySelector('#filterSort').selectedOptions[0].textContent);
    panel.querySelector('#advancedFilterSummary').textContent = parts.length ? parts.join(' · ') : 'Tüm ilanlar';
  }

  panel.querySelector('#filterApply').addEventListener('click', () => {
    const filters = values();
    window.__listingView?.setAdvancedFilters?.(filters);
    updateSummary(filters);
    drawer.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });

  panel.querySelector('#filterClear').addEventListener('click', () => {
    panel.querySelector('#filterMinPrice').value = '';
    panel.querySelector('#filterMaxPrice').value = '';
    panel.querySelector('#filterCity').value = '';
    panel.querySelector('#filterSort').value = 'relevance';
    const filters = values();
    window.__listingView?.setAdvancedFilters?.(filters);
    updateSummary(filters);
  });

  ['filterMinPrice','filterMaxPrice','filterCity'].forEach((id) => panel.querySelector(`#${id}`).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') panel.querySelector('#filterApply').click();
  }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
