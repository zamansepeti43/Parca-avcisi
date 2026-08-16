import './categories-menu.css';
import { getMainCategories, getSubcategories } from './part-catalog.js';

const TYPE_OPTIONS = [
  { label: 'Otomobil', type: '' },
  { label: 'Kamyon', type: 'Kamyon' },
  { label: 'Otobüs', type: 'Otobüs' },
  { label: 'Motosiklet', type: 'Motosiklet' },
  { label: 'Pickup / Kamyonet', type: 'Pickup / Kamyonet' },
];

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const header = document.querySelector('.site-header');
const menu = document.createElement('div');
menu.className = 'cat-menu';
menu.id = 'catMenu';
menu.hidden = true;
menu.setAttribute('aria-label', 'Kategori menüsü');
menu.innerHTML = `
  <div class="container cat-menu-inner">
    <div class="cat-menu-head">
      <span class="eyebrow">KATEGORİLER</span>
      <div class="cat-type-switch" role="tablist" aria-label="Araç tipine göre kategoriler">
        ${TYPE_OPTIONS.map((option) => `<button type="button" role="tab" data-cat-type="${escapeHtml(option.type)}">${escapeHtml(option.label)}</button>`).join('')}
      </div>
    </div>
    <div class="cat-menu-cols" id="catMenuCols"></div>
  </div>
`;
if (header) header.appendChild(menu);

const cols = menu.querySelector('#catMenuCols');
let activeType = '';
let isOpen = false;

function renderColumns() {
  cols.innerHTML = getMainCategories(activeType).map((category) => {
    const subs = getSubcategories(activeType, category);
    return `<div class="cat-col">
      <button type="button" class="cat-main" data-cat-search="${escapeHtml(category)}">${escapeHtml(category)}</button>
      <div class="cat-subs">${subs.map((sub) => `<button type="button" class="cat-sub" data-cat-search="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`).join('')}</div>
    </div>`;
  }).join('');
}

function renderTypeSwitch() {
  menu.querySelectorAll('[data-cat-type]').forEach((button) => {
    const active = button.dataset.catType === activeType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function setType(type) {
  activeType = type;
  renderTypeSwitch();
  renderColumns();
}

function setTriggerState() {
  document.querySelectorAll('[data-open-categories]').forEach((trigger) => trigger.setAttribute('aria-expanded', String(isOpen)));
}

function open() {
  isOpen = true;
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'false');
  setTriggerState();
  renderColumns();
}

function close() {
  isOpen = false;
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  setTriggerState();
}

function toggle() {
  if (isOpen) close();
  else open();
}

function runSearch(query) {
  close();
  if (window.__homeSearch) { window.__homeSearch(query); return; }
  const input = document.querySelector('#searchInput');
  if (input) input.value = query;
  if (window.__listingView) window.__listingView.search(query);
  const target = document.querySelector('#ilanlar');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

renderTypeSwitch();
renderColumns();

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open-categories]');
  if (trigger) { event.preventDefault(); toggle(); return; }
  const typeBtn = event.target.closest('[data-cat-type]');
  if (typeBtn) { event.preventDefault(); setType(typeBtn.dataset.catType); return; }
  const searchBtn = event.target.closest('[data-cat-search]');
  if (searchBtn) { event.preventDefault(); runSearch(searchBtn.dataset.catSearch); return; }
  if (isOpen && !event.target.closest('#catMenu')) close();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isOpen) close();
});
