// Kategori menüsü — sıfırdan, izole ve dokunmatik uyumlu.
import './categories-menu.css';
import { getMainCategories, getSubcategories } from './part-catalog.js';
import { signOut } from './auth.js';

const TYPES = [
  ['Otomobil', ''], ['Kamyon', 'Kamyon'], ['Otobüs', 'Otobüs'],
  ['Motosiklet', 'Motosiklet'], ['Pickup / Kamyonet', 'Pickup / Kamyonet'],
];

const ACCOUNT_ITEMS = [
  ['profilim', 'Profilim', '👤'], ['ilanlarim', 'İlanlarım', '▤'], ['taleplerim', 'Taleplerim', '⌕'],
  ['mesajlarim', 'Mesajlarım', '✉'], ['favorilerim', 'Favorilerim', '♡'], ['kayitli-aramalar', 'Kayıtlı Aramalarım', '⌑'],
  ['bildirimler', 'Bildirimler', '♢'], ['musterilerim', 'Müşterilerim', '♙'], ['hesap-bilgileri', 'Hesap Bilgileri', '⚙'],
  ['ayarlar', 'Ayarlar', '⚙'], ['yardim', 'Yardım & Destek', '?'],
];

const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));

let isOpen = false;
let vehicleType = '';
let expanded = new Set();
let accountExpanded = false;

const backdrop = document.createElement('div');
backdrop.className = 'category-layer-backdrop';
const drawer = document.createElement('aside');
drawer.className = 'category-drawer';
drawer.setAttribute('role', 'dialog');
drawer.setAttribute('aria-label', 'Parça Avcısı menüsü');
drawer.innerHTML = `
  <div class="category-drawer-head">
    <div class="category-drawer-title-row"><div><div class="category-eyebrow">PARÇA AVCISI</div><h2>Menü</h2></div><button type="button" class="category-close" aria-label="Kapat">×</button></div>
    <p>Araç tipini seç, ardından parça kategorisini seç.</p>
    <div class="category-types" role="tablist">${TYPES.map(([label, type]) => `<button type="button" role="tab" data-vehicle-type="${esc(type)}">${esc(label)}</button>`).join('')}</div>
  </div>
  <div class="category-list-title"><strong>Parça Kategorileri</strong><span>Seçmek için dokun</span></div>
  <div class="category-list"></div>
  <div class="account-menu-section">
    <button type="button" class="account-menu-toggle" data-toggle-account aria-expanded="false"><span class="account-menu-icon">♙</span><span class="account-menu-label"><strong>Hesabım</strong><small>Profil, ilanlar, mesajlar ve ayarlar</small></span><b aria-hidden="true">›</b></button>
    <div class="account-menu-list" hidden>
      ${ACCOUNT_ITEMS.map(([key, label, icon]) => `<button type="button" class="account-menu-link" data-account-pane="${esc(key)}"><span>${esc(icon)}</span><strong>${esc(label)}</strong></button>`).join('')}
      <button type="button" class="account-menu-link account-signout-link" data-account-signout-menu><span>↪</span><strong>Çıkış Yap</strong></button>
    </div>
  </div>`;

document.body.append(backdrop, drawer);
const list = drawer.querySelector('.category-list');
const closeButton = drawer.querySelector('.category-close');
const accountToggle = drawer.querySelector('[data-toggle-account]');
const accountList = drawer.querySelector('.account-menu-list');

function render() {
  drawer.querySelectorAll('[data-vehicle-type]').forEach((button) => {
    const active = button.dataset.vehicleType === vehicleType;
    button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active));
  });
  list.innerHTML = getMainCategories(vehicleType).map((category) => {
    const isExpanded = expanded.has(category); const subs = getSubcategories(vehicleType, category);
    return `<div class="category-item ${isExpanded ? 'expanded' : ''}"><button type="button" class="category-main-button" data-category="${esc(category)}" aria-expanded="${isExpanded}"><span>${esc(category)}</span><b aria-hidden="true">›</b></button><div class="category-sub-list" ${isExpanded ? '' : 'hidden'}>${subs.map((sub) => `<button type="button" class="category-sub-button" data-subcategory="${esc(sub)}">${esc(sub)}</button>`).join('')}</div></div>`;
  }).join('');
  accountToggle.classList.toggle('expanded', accountExpanded); accountToggle.setAttribute('aria-expanded', String(accountExpanded)); accountList.hidden = !accountExpanded;
}
function setOpen(next) { isOpen = next; drawer.classList.toggle('is-visible', isOpen); backdrop.classList.toggle('is-visible', isOpen); drawer.setAttribute('aria-hidden', String(!isOpen)); document.body.classList.toggle('category-drawer-open', isOpen); document.querySelectorAll('[data-open-categories]').forEach((el) => el.setAttribute('aria-expanded', String(isOpen))); if (isOpen) render(); }
function selectType(type) { vehicleType = type || ''; expanded = new Set(); render(); }
function toggleCategory(category) { const next = new Set(expanded); next.has(category) ? next.delete(category) : next.add(category); expanded = next; render(); }
function goToCategory(category, subcategory) { const params = new URLSearchParams({ category }); if (subcategory) params.set('subcategory', subcategory); if (vehicleType) params.set('vehicleType', vehicleType); setOpen(false); window.location.assign(`/ilanlar?${params.toString()}`); }
function openAccountPane(pane) { setOpen(false); if (typeof window.__openAccountCenter === 'function') window.__openAccountCenter(pane); else window.setTimeout(() => window.__openAccountCenter?.(pane), 0); }
async function handleSignOut() { try { await signOut(); setOpen(false); window.location.reload(); } catch (error) { console.error('Çıkış yapılamadı', error); } }

const consumePointer = (event) => event.stopPropagation();
drawer.addEventListener('pointerdown', consumePointer); drawer.addEventListener('mousedown', consumePointer); drawer.addEventListener('touchstart', consumePointer, { passive: false });
drawer.addEventListener('click', (event) => {
  event.stopPropagation();
  const typeButton = event.target.closest('[data-vehicle-type]'); if (typeButton) { event.preventDefault(); selectType(typeButton.dataset.vehicleType || ''); return; }
  const mainButton = event.target.closest('[data-category]'); if (mainButton) { event.preventDefault(); toggleCategory(mainButton.dataset.category || ''); return; }
  const subButton = event.target.closest('[data-subcategory]'); if (subButton) { event.preventDefault(); const item = subButton.closest('.category-item'); goToCategory(item?.querySelector('[data-category]')?.dataset.category || '', subButton.dataset.subcategory || ''); return; }
  const toggle = event.target.closest('[data-toggle-account]'); if (toggle) { event.preventDefault(); accountExpanded = !accountExpanded; render(); return; }
  const accountPane = event.target.closest('[data-account-pane]'); if (accountPane) { event.preventDefault(); openAccountPane(accountPane.dataset.accountPane || 'profilim'); return; }
  const signout = event.target.closest('[data-account-signout-menu]'); if (signout) { event.preventDefault(); handleSignOut(); }
});
closeButton.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); });
backdrop.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); });
document.addEventListener('click', (event) => { const trigger = event.target.closest?.('[data-open-categories]'); if (!trigger) return; event.preventDefault(); event.stopPropagation(); setOpen(!isOpen); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isOpen) setOpen(false); });
render();
