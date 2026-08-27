import './categories-menu.css';
import { getMainCategories, getSubcategories } from './part-catalog.js';

const TYPE_OPTIONS = [
  { label: 'Otomobil', type: '' },
  { label: 'Kamyon', type: 'Kamyon' },
  { label: 'Otobüs', type: 'Otobüs' },
  { label: 'Motosiklet', type: 'Motosiklet' },
  { label: 'Pickup / Kamyonet', type: 'Pickup / Kamyonet' },
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;',
}[char]));

const backdrop = document.createElement('div');
backdrop.className = 'cat-backdrop';
backdrop.hidden = true;
backdrop.setAttribute('aria-hidden', 'true');

const menu = document.createElement('aside');
menu.className = 'cat-menu';
menu.id = 'catMenu';
menu.hidden = true;
menu.setAttribute('aria-hidden', 'true');
menu.setAttribute('aria-label', 'Kategori menüsü');
menu.innerHTML = `
  <div class="cat-menu-inner">
    <div class="cat-menu-head">
      <div class="cat-menu-title">
        <div>
          <span class="eyebrow">KATEGORİLER</span>
          <h2>Parça kategorileri</h2>
        </div>
        <button type="button" class="cat-close" data-close-categories aria-label="Kategorileri kapat">×</button>
      </div>
      <p class="cat-menu-hint">Araç tipini seç, ardından ana kategoriden parçanı seç.</p>
      <div class="cat-type-switch" role="tablist" aria-label="Araç tipine göre kategoriler">
        ${TYPE_OPTIONS.map((option) => `<button type="button" role="tab" data-cat-type="${escapeHtml(option.type)}">${escapeHtml(option.label)}</button>`).join('')}
      </div>
    </div>
    <div class="cat-list-head"><span>Ana kategoriler</span><small>Seçmek için dokun</small></div>
    <div class="cat-menu-cols" id="catMenuCols"></div>
  </div>`;

document.body.append(backdrop, menu);

const cols = menu.querySelector('#catMenuCols');
let activeType = '';
let isOpen = false;
const expandedCategories = new Set();

function renderTypeSwitch() {
  menu.querySelectorAll('[data-cat-type]').forEach((button) => {
    const active = button.dataset.catType === activeType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function renderColumns() {
  const categories = getMainCategories(activeType);
  cols.innerHTML = categories.map((category) => {
    const subs = getSubcategories(activeType, category);
    const expanded = expandedCategories.has(category);
    return `<section class="cat-col ${expanded ? 'is-open' : ''}" data-cat-col="${escapeHtml(category)}">
      <button type="button" class="cat-main" data-cat-main="${escapeHtml(category)}" aria-expanded="${expanded}">
        <span class="cat-main-label">${escapeHtml(category)}</span><span class="cat-chevron" aria-hidden="true">›</span>
      </button>
      <div class="cat-subs" ${expanded ? '' : 'hidden'}>
        ${subs.length ? subs.map((sub) => `<button type="button" class="cat-sub" data-cat-sub="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`).join('') : '<span class="cat-empty">Bu kategoride alt parça bulunamadı.</span>'}
      </div>
    </section>`;
  }).join('');
}

function setTriggerState() {
  document.querySelectorAll('[data-open-categories]').forEach((trigger) => trigger.setAttribute('aria-expanded', String(isOpen)));
}

function openMenu() {
  if (isOpen) return;
  isOpen = true;
  menu.hidden = false;
  backdrop.hidden = false;
  menu.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('categories-open');
  setTriggerState();
  renderTypeSwitch();
  renderColumns();
}

function closeMenu() {
  if (!isOpen) return;
  isOpen = false;
  menu.hidden = true;
  backdrop.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('categories-open');
  setTriggerState();
}

function setType(type) {
  activeType = type || '';
  expandedCategories.clear();
  renderTypeSwitch();
  renderColumns();
}

function toggleCategory(category) {
  if (expandedCategories.has(category)) expandedCategories.delete(category);
  else expandedCategories.add(category);
  renderColumns();
}

function applyFilter(category, subcategory) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  if (activeType) params.set('vehicleType', activeType);
  closeMenu();
  window.location.href = `/ilanlar${params.toString() ? `?${params.toString()}` : ''}`;
}

renderTypeSwitch();
renderColumns();

// Capture phase owns category interactions. We stop the event before it reaches
// unrelated page handlers so they cannot immediately close/reset the drawer.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest?.('[data-open-categories]');
  if (trigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isOpen) closeMenu(); else openMenu();
    return;
  }
  if (event.target.closest?.('[data-close-categories]') || event.target === backdrop) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeMenu();
    return;
  }
  const typeButton = event.target.closest?.('[data-cat-type]');
  if (typeButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setType(typeButton.dataset.catType || '');
    return;
  }
  const mainButton = event.target.closest?.('[data-cat-main]');
  if (mainButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleCategory(mainButton.dataset.catMain || '');
    return;
  }
  const subButton = event.target.closest?.('[data-cat-sub]');
  if (subButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const column = subButton.closest('.cat-col');
    applyFilter(column?.dataset.catCol || '', subButton.dataset.catSub || '');
    return;
  }
  if (isOpen && !event.target.closest('#catMenu')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeMenu();
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isOpen) closeMenu();
});
