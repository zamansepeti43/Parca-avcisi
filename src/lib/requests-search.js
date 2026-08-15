// Parça Avcısı MVP — "PARÇA ARAYANI BUL" arama modu.
// Kullanıcı "Parça Arayanı Bul" modunda arama yaptığında aktif parça
// taleplerini akıllı token ayrıştırması + filtre formu ile daraltır ve
// "İncele / Bende Var" kartlarıyla gösterir. Boş sonuçta tüketiciye
// özel CTA (PARÇA ARIYORUM) gösterilir.

import './part-requests.css';
import { getActivePartRequests } from './part-requests.js';
import { getCurrentUser } from './auth.js';
import { vehicleTypes, getMakes, getModels } from './vehicle-catalog.js';
import { getMainCategories, getSubcategories } from './part-catalog.js';
import { requestCardHtml } from './requests-home.js';

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const section = document.querySelector('#arayan-bul');
const filtersBox = document.querySelector('#arayanFilters');
const grid = document.querySelector('#arayanGrid');
const action = document.querySelector('#arayanAction');

let meId = '';

const CONDITION_OPTIONS = [
  ['', 'Durum Farketmez'], ['any', 'Farketmez'], ['new', 'Sıfır'], ['used', '2. El'], ['salvage', 'Çıkma'],
];

function makeOptionsHtml(selected) {
  return '<option value="">Araç Tipi</option>' + vehicleTypes.map((name) => '<option value="' + esc(name) + '"' + (selected === name ? ' selected' : '') + '>' + name + '</option>').join('');
}

function categoryOptionsHtml(vehicleType, selected) {
  return '<option value="">Parça Kategorisi</option>' + getMainCategories(vehicleType).map((name) => '<option value="' + esc(name) + '"' + (selected === name ? ' selected' : '') + '>' + name + '</option>').join('');
}

function subcategoryOptionsHtml(vehicleType, category, selected) {
  return '<option value="">Alt Kategori</option>' + getSubcategories(vehicleType, category).map((name) => '<option value="' + esc(name) + '"' + (selected === name ? ' selected' : '') + '>' + name + '</option>').join('');
}

function filtersFormHtml(filters) {
  const makes = getMakes();
  const models = filters.make ? getModels(filters.make) : [];
  const condition = CONDITION_OPTIONS.map(([value, label]) => '<option value="' + esc(value) + '"' + (String(filters.condition || '') === String(value) ? ' selected' : '') + '>' + label + '</option>').join('');
  return '<form id="arayanFilterForm"><div class="arayan-filter-grid">'
    + '<label>Araç Tipi<select name="vehicleType">' + makeOptionsHtml(filters.vehicleType || '') + '</select></label>'
    + '<label>Marka<input name="make" list="arayanMakes" value="' + esc(filters.make || '') + '" placeholder="Marka"><datalist id="arayanMakes">' + makes.map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('') + '</datalist></label>'
    + '<label>Model<input name="model" list="arayanModels" value="' + esc(filters.model || '') + '" placeholder="Model"><datalist id="arayanModels">' + models.map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('') + '</datalist></label>'
    + '<label>Yıl<input name="year" inputmode="numeric" value="' + esc(filters.year || '') + '" placeholder="Örn. 1997"></label>'
    + '<label>Parça Kategorisi<select name="category">' + categoryOptionsHtml(filters.vehicleType || '', filters.category || '') + '</select></label>'
    + '<label>Alt Kategori<select name="subcategory">' + subcategoryOptionsHtml(filters.vehicleType || '', filters.category || '', filters.subcategory || '') + '</select></label>'
    + '<label>Şehir<input name="city" value="' + esc(filters.city || '') + '" placeholder="Şehir"></label>'
    + '<label>Parça Durumu<select name="condition">' + condition + '</select></label>'
    + '</div>'
    + '<div class="arayan-filter-actions"><button type="submit" class="dark-btn">Filtrele</button><button type="button" class="text-btn" data-arayan-clear>Temizle</button></div></form>';
}

function wireFilters(form) {
  form.addEventListener('change', (event) => {
    if (event.target.name === 'vehicleType') {
      const type = event.target.value;
      form.querySelector('[name="category"]').innerHTML = categoryOptionsHtml(type, '');
      form.querySelector('[name="subcategory"]').innerHTML = subcategoryOptionsHtml(type, '', '');
      return;
    }
    if (event.target.name === 'category') {
      const type = form.querySelector('[name="vehicleType"]').value;
      const category = event.target.value;
      form.querySelector('[name="subcategory"]').innerHTML = subcategoryOptionsHtml(type, category, '');
      return;
    }
    if (event.target.name === 'make') {
      const models = getModels(event.target.value);
      const datalist = form.querySelector('#arayanModels');
      if (datalist) datalist.innerHTML = models.map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('');
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const filters = {
      vehicleType: data.get('vehicleType') || '',
      make: data.get('make') || '',
      model: data.get('model') || '',
      year: data.get('year') || '',
      category: data.get('category') || '',
      subcategory: data.get('subcategory') || '',
      city: data.get('city') || '',
      condition: data.get('condition') || '',
    };
    runSearch(filters);
  });
  const clear = form.querySelector('[data-arayan-clear]');
  if (clear) {
    clear.addEventListener('click', () => {
      form.reset();
      form.querySelector('[name="category"]').innerHTML = categoryOptionsHtml('', '');
      form.querySelector('[name="subcategory"]').innerHTML = subcategoryOptionsHtml('', '', '');
      runSearch({});
    });
  }
}

// ---- Akıllı ayrıştırma: sorgu → filtreler ----
function parseQueryToFilters(query) {
  const filters = {};
  const tokens = String(query || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) return filters;
  const rest = [];
  for (const token of tokens) {
    if (/^(19|20)\d{2}$/.test(token)) { filters.year = token; continue; }
    rest.push(token);
  }
  const lower = rest.map((token) => token.toLocaleLowerCase('tr-TR'));
  const type = vehicleTypes.find((name) => lower.includes(name.toLocaleLowerCase('tr-TR')));
  if (type) { filters.vehicleType = type; lower.splice(lower.indexOf(type.toLocaleLowerCase('tr-TR')), 1); }
  const makes = getMakes();
  const make = makes.find((name) => lower.includes(name.toLocaleLowerCase('tr-TR')));
  if (make) {
    filters.make = make;
    lower.splice(lower.indexOf(make.toLocaleLowerCase('tr-TR')), 1);
    const allModels = getModels(make);
    const model = allModels.find((name) => lower.includes(name.toLocaleLowerCase('tr-TR')));
    if (model) { filters.model = model; lower.splice(lower.indexOf(model.toLocaleLowerCase('tr-TR')), 1); }
  }
  if (!filters.model) {
    const known = new Set();
    makes.forEach((m) => getModels(m).forEach((model) => known.add(model)));
    const modelFound = [...known].find((name) => lower.includes(name.toLocaleLowerCase('tr-TR')));
    if (modelFound) { filters.model = modelFound; lower.splice(lower.indexOf(modelFound.toLocaleLowerCase('tr-TR')), 1); }
  }
  const categories = getMainCategories(filters.vehicleType || '');
  const category = categories.find((name) => lower.includes(name.toLocaleLowerCase('tr-TR')));
  if (category) { filters.category = category; lower.splice(lower.indexOf(category.toLocaleLowerCase('tr-TR')), 1); }
  const part = lower.filter(Boolean).join(' ');
  if (part) filters.partName = part;
  return filters;
}

function renderResults(requests, query) {
  if (!requests.length) {
    grid.innerHTML = '<div class="empty"><strong>Bu parçayı arayan aktif müşteri bulamadık.</strong><span>Arama kriterlerini genişleterek tekrar deneyebilir veya sen de parça talebi oluşturabilirsin.</span></div>';
    action.innerHTML = query
      ? '<button class="dark-btn" data-open-request data-request-prefill="' + esc(query) + '">PARÇA ARIYORUM</button>'
      : '<button class="dark-btn" data-open-request>PARÇA ARIYORUM</button>';
    return;
  }
  grid.innerHTML = requests.map((request) => requestCardHtml(request, meId)).join('');
  action.innerHTML = '';
}

async function runSearch(filters) {
  let requests = [];
  try {
    requests = (await getActivePartRequests(filters)) || [];
  } catch (error) {
    console.error('Talep araması yapılamadı.', error);
  }
  renderResults(requests, filters.__query || '');
}

export function showArayanSection() {
  if (!section) return;
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function hideArayanSection() {
  if (section) section.hidden = true;
}

async function searchRequests(query) {
  if (!grid) return;
  if (!filtersBox.innerHTML) {
    filtersBox.innerHTML = filtersFormHtml({});
    wireFilters(filtersBox.querySelector('form'));
  }
  showArayanSection();
  const filters = parseQueryToFilters(query);
  filters.__query = query;
  await runSearch(filters);
}

(async function init() {
  try {
    const user = await getCurrentUser().catch(() => null);
    meId = user ? user.id : '';
  } catch { /* giriş yapılmamış olabilir */ }
})();

window.__searchRequests = searchRequests;
window.__hideArayanSection = hideArayanSection;

export { searchRequests };
