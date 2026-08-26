const host = document.querySelector('#listingGrid')?.closest('.container');
const grid = document.querySelector('#listingGrid');
let activeFilters = { minPrice: '', maxPrice: '', city: '', sort: 'relevance' };
let applying = false;

const parsePrice = (value) => {
  const number = Number(String(value ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};
const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR');

function mount() {
  if (!host || !grid || document.querySelector('#advancedFilters')) return;
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

  function applyToGrid() {
    if (!grid || applying) return;
    const cards = Array.from(grid.querySelectorAll('.listing-card'));
    if (!cards.length) return;
    applying = true;
    try {
      const min = parsePrice(activeFilters.minPrice);
      const max = parsePrice(activeFilters.maxPrice);
      const city = normalize(activeFilters.city);
      const matches = [];

      cards.forEach((card) => {
        const price = parsePrice(card.querySelector('.price')?.textContent);
        const cityText = normalize(card.querySelector('.listing-meta span:last-child')?.textContent?.replace(/^⌖\s*/, ''));
        const ok = (min === null || (price !== null && price >= min))
          && (max === null || (price !== null && price <= max))
          && (!city || cityText.includes(city));
        card.hidden = !ok;
        if (ok) matches.push({ card, price: price ?? Infinity });
      });

      if (activeFilters.sort === 'price_asc') matches.sort((a, b) => a.price - b.price);
      if (activeFilters.sort === 'price_desc') matches.sort((a, b) => b.price - a.price);
      if (activeFilters.sort !== 'relevance') matches.forEach(({ card }) => grid.appendChild(card));

      let empty = grid.querySelector('.filter-empty-state');
      if (!matches.length) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'filter-empty-state';
          empty.innerHTML = '<strong>Bu filtrelerle eşleşen ilan yok.</strong><span>Fiyat veya şehir aralığını genişletmeyi deneyebilirsin.</span><br><button type="button" data-clear-advanced>Filtreleri temizle</button>';
          grid.appendChild(empty);
        }
      } else if (empty) empty.remove();
    } finally {
      applying = false;
    }
  }

  panel.querySelector('#filterApply').addEventListener('click', () => {
    activeFilters = values();
    updateSummary(activeFilters);
    applyToGrid();
    drawer.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });

  panel.querySelector('#filterClear').addEventListener('click', () => {
    panel.querySelector('#filterMinPrice').value = '';
    panel.querySelector('#filterMaxPrice').value = '';
    panel.querySelector('#filterCity').value = '';
    panel.querySelector('#filterSort').value = 'relevance';
    activeFilters = values();
    updateSummary(activeFilters);
    applyToGrid();
  });

  grid.addEventListener('click', (event) => {
    if (!event.target.closest('[data-clear-advanced]')) return;
    activeFilters = { minPrice: '', maxPrice: '', city: '', sort: 'relevance' };
    panel.querySelector('#filterMinPrice').value = '';
    panel.querySelector('#filterMaxPrice').value = '';
    panel.querySelector('#filterCity').value = '';
    panel.querySelector('#filterSort').value = 'relevance';
    updateSummary(activeFilters);
    applyToGrid();
  });

  const observer = new MutationObserver(() => {
    if (!applying && (activeFilters.minPrice || activeFilters.maxPrice || activeFilters.city || activeFilters.sort !== 'relevance')) applyToGrid();
  });
  observer.observe(grid, { childList: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
