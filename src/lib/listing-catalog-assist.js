import { searchPartCatalog } from './part-catalog-search.js';

const esc = (value) => String(value ?? '').replace(/[&<>'\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
let activeForm = null;
let resultsBox = null;
let timer = null;
let requestId = 0;

function ensureUI(form) {
  if (activeForm === form && resultsBox?.isConnected) return resultsBox;
  activeForm = form;
  const partInput = form.elements.partName;
  if (!partInput) return null;
  const wrapper = partInput.parentElement || partInput;
  wrapper.classList.add('listing-catalog-field');
  let box = wrapper.querySelector('[data-catalog-assist]');
  if (!box) {
    box = document.createElement('div');
    box.dataset.catalogAssist = '';
    box.className = 'catalog-assist';
    box.setAttribute('aria-live', 'polite');
    wrapper.appendChild(box);
  }
  resultsBox = box;
  return box;
}

function clear(box) {
  if (box) box.innerHTML = '';
}

function vehicleValues(form) {
  return {
    make: form.elements.formMake?.value || '',
    model: form.elements.formModel?.value || '',
    year: form.elements.formYear?.value || '',
    engine: form.elements.formEngine?.value || '',
    category: form.elements.category?.value || '',
  };
}

function render(box, items, query) {
  if (!box) return;
  if (!items.length) {
    box.innerHTML = '<div class="catalog-assist-empty">Katalogda eşleşme bulunamadı. İlanı manuel olarak oluşturmaya devam edebilirsin.</div>';
    return;
  }
  box.innerHTML = '<div class="catalog-assist-head">Katalogdan hızlı seçim</div>' + items.slice(0, 8).map((item) =>
    '<button type="button" class="catalog-assist-item" data-catalog-assist-id="' + esc(item.id) + '">' +
      '<span><strong>' + esc(item.part_name || item.part_number || 'Parça') + '</strong><small>' + esc(item.brand || 'Marka belirtilmemiş') + ' · ' + esc(item.part_number || 'Parça no yok') + '</small></span>' +
      '<b>Seç</b>' +
    '</button>'
  ).join('');
  box.dataset.query = query;
  box._items = items;
}

async function search(form, query) {
  const box = ensureUI(form);
  if (!box) return;
  const id = ++requestId;
  const vehicle = vehicleValues(form);
  if (query.length < 2 && !vehicle.make && !vehicle.model) {
    clear(box);
    return;
  }
  box.innerHTML = '<div class="catalog-assist-loading">Katalog aranıyor…</div>';
  try {
    const items = await searchPartCatalog({ query, make: vehicle.make, model: vehicle.model, year: vehicle.year, engine: vehicle.engine, category: vehicle.category, limit: 8 });
    if (id !== requestId || activeForm !== form) return;
    render(box, items, query);
  } catch (_) {
    if (id === requestId) clear(box);
  }
}

document.addEventListener('input', (event) => {
  const form = event.target.closest('#listingForm');
  if (!form || event.target.name !== 'partName') return;
  const query = event.target.value.trim();
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { void search(form, query); }, 300);
});

document.addEventListener('change', (event) => {
  const form = event.target.closest('#listingForm');
  if (!form || !['formMake', 'formModel', 'formYear', 'formEngine', 'category'].includes(event.target.name)) return;
  const query = form.elements.partName?.value.trim() || '';
  if (query.length >= 2 || form.elements.formMake?.value || form.elements.formModel?.value) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { void search(form, query); }, 150);
  }
});

document.addEventListener('click', (event) => {
  const itemButton = event.target.closest('[data-catalog-assist-id]');
  if (!itemButton) return;
  const form = itemButton.closest('#listingForm');
  const box = itemButton.closest('[data-catalog-assist]');
  const item = box?._items?.find((entry) => String(entry.id) === String(itemButton.dataset.catalogAssistId));
  if (!form || !item) return;
  const partInput = form.elements.partName;
  const oemInput = form.elements.oemNumber;
  if (partInput) partInput.value = item.part_name || item.part_number || '';
  if (oemInput && !oemInput.value) oemInput.value = item.part_number || '';
  if (form.elements.category && item.category) {
    const option = [...form.elements.category.options].find((entry) => String(entry.value).toLocaleLowerCase('tr-TR') === String(item.category).toLocaleLowerCase('tr-TR'));
    if (option) form.elements.category.value = option.value;
    form.elements.category.dispatchEvent(new Event('change', { bubbles: true }));
  }
  clear(box);
});
