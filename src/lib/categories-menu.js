// Kategori menüsü — sıfırdan, izole ve dokunmatik uyumlu.
import './categories-menu.css';
import { getMainCategories, getSubcategories } from './part-catalog.js';

const TYPES = [
  ['Otomobil', ''], ['Kamyon', 'Kamyon'], ['Otobüs', 'Otobüs'],
  ['Motosiklet', 'Motosiklet'], ['Pickup / Kamyonet', 'Pickup / Kamyonet'],
];

const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
}[c]));

let isOpen = false;
let vehicleType = '';
let expanded = new Set();

const backdrop = document.createElement('div');
backdrop.className = 'category-layer-backdrop';

const drawer = document.createElement('aside');
drawer.className = 'category-drawer';
drawer.setAttribute('role', 'dialog');
drawer.setAttribute('aria-label', 'Parça kategorileri');
drawer.innerHTML = `
  <div class="category-drawer-head">
    <div class="category-drawer-title-row">
      <div><div class="category-eyebrow">KATEGORİLER</div><h2>Parça kategorileri</h2></div>
      <button type="button" class="category-close" aria-label="Kapat">×</button>
    </div>
    <p>Araç tipini seç, ardından parça kategorisini seç.</p>
    <div class="category-types" role="tablist">
      ${TYPES.map(([label, type]) => `<button type="button" role="tab" data-vehicle-type="${esc(type)}">${esc(label)}</button>`).join('')}
    </div>
  </div>
  <div class="category-list-title"><strong>Ana kategoriler</strong><span>Seçmek için dokun</span></div>
  <div class="category-list"></div>
`;

document.body.append(backdrop, drawer);
const list = drawer.querySelector('.category-list');
const closeButton = drawer.querySelector('.category-close');

function render() {
  drawer.querySelectorAll('[data-vehicle-type]').forEach((button) => {
    const active = button.dataset.vehicleType === vehicleType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  list.innerHTML = getMainCategories(vehicleType).map((category) => {
    const isExpanded = expanded.has(category);
    const subs = getSubcategories(vehicleType, category);
    return `<div class="category-item ${isExpanded ? 'expanded' : ''}">
      <button type="button" class="category-main-button" data-category="${esc(category)}" aria-expanded="${isExpanded}">
        <span>${esc(category)}</span><b aria-hidden="true">›</b>
      </button>
      <div class="category-sub-list" ${isExpanded ? '' : 'hidden'}>
        ${subs.map((sub) => `<button type="button" class="category-sub-button" data-subcategory="${esc(sub)}">${esc(sub)}</button>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function setOpen(next) {
  isOpen = next;
  drawer.classList.toggle('is-visible', isOpen);
  backdrop.classList.toggle('is-visible', isOpen);
  drawer.setAttribute('aria-hidden', String(!isOpen));
  document.body.classList.toggle('category-drawer-open', isOpen);
  document.querySelectorAll('[data-open-categories]').forEach((el) => el.setAttribute('aria-expanded', String(isOpen)));
  if (isOpen) render();
}

function selectType(type) {
  vehicleType = type || '';
  expanded = new Set();
  render();
}

function toggleCategory(category) {
  const next = new Set(expanded);
  next.has(category) ? next.delete(category) : next.add(category);
  expanded = next;
  render();
}

function goToCategory(category, subcategory) {
  const params = new URLSearchParams({ category });
  if (subcategory) params.set('subcategory', subcategory);
  if (vehicleType) params.set('vehicleType', vehicleType);
  setOpen(false);
  window.location.assign(`/ilanlar?${params.toString()}`);
}

// Menü içindeki tüm pointer/click olaylarını tüket. Global UI handler'ları etkilenmez.
const consumePointer = (event) => event.stopPropagation();
drawer.addEventListener('pointerdown', consumePointer);
drawer.addEventListener('mousedown', consumePointer);
drawer.addEventListener('touchstart', consumePointer, { passive: false });
drawer.addEventListener('click', (event) => {
  event.stopPropagation();
  const typeButton = event.target.closest('[data-vehicle-type]');
  if (typeButton) { event.preventDefault(); selectType(typeButton.dataset.vehicleType || ''); return; }
  const mainButton = event.target.closest('[data-category]');
  if (mainButton) { event.preventDefault(); toggleCategory(mainButton.dataset.category || ''); return; }
  const subButton = event.target.closest('[data-subcategory]');
  if (subButton) {
    event.preventDefault();
    const item = subButton.closest('.category-item');
    goToCategory(item?.querySelector('[data-category]')?.dataset.category || '', subButton.dataset.subcategory || '');
  }
});

closeButton.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  setOpen(false);
});

backdrop.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  setOpen(false);
});

document.addEventListener('click', (event) => {
  const trigger = event.target.closest?.('[data-open-categories]');
  if (!trigger) return;
  event.preventDefault();
  event.stopPropagation();
  setOpen(!isOpen);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isOpen) setOpen(false);
});

render();
