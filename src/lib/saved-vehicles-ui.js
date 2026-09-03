import { getCurrentUser } from './auth.js';
import { VehicleResolver } from './vehicle-resolver.js';
import { getSavedVehicles, saveVehicle, updateSavedVehicle, deleteSavedVehicle } from './saved-vehicles.js';
import { requireSupabase, supabaseConfigured } from './supabase.js';
import { getListingThumbnailUrl } from './listing-images.js';

const resolver = new VehicleResolver();
let active = false;
let selection = { type: '', make: '', model: '', year: '', engine: '' };
let editingId = null;

const esc = (v) => String(v ?? '').replace(/[&<>'\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const money = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0) + ' TL';

function pane() { return document.querySelector('.account-pane'); }
function menu() { return document.querySelector('.account-menu'); }

function options(field) {
  const opts = resolver.getOptions(selection, field) || [];
  const previous = field === 'type' ? '' : ({ make: 'type', model: 'make', year: 'model', engine: 'year' }[field]);
  const blocked = Boolean(previous && !selection[previous]);
  const hasNoData = !blocked && field !== 'type' && opts.length === 0;
  const placeholder = blocked ? 'Önce ' + ({ make: 'araç tipini', model: 'markayı', year: 'modeli', engine: 'yılı' }[field] || 'önceki alanı') + ' seç' : hasNoData ? 'Katalogda veri yok — isteğe bağlı' : 'Seçiniz';
  return '<select data-saved-vehicle-field="' + field + '"' + (blocked ? ' disabled' : '') + '><option value="">' + placeholder + '</option>' + opts.map((v) => '<option value="' + esc(v) + '"' + (String(selection[field]) === String(v) ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>';
}

function renderForm(editItem = null) {
  const editing = Boolean(editItem);
  if (editItem) selection = { type: editItem.vehicle_type || '', make: editItem.make || '', model: editItem.model || '', year: editItem.year || '', engine: editItem.version || '' };
  return '<div class="account-pane-head"><div><h2>' + (editing ? 'Aracı Düzenle' : 'Araçlarım') + '</h2><p style="margin:4px 0 0;color:#6e747c">' + (editing ? 'Araç bilgilerini güncelle. Uyumlu parça eşleşmeleri korunur.' : 'Aracını kaydet. Tek dokunuşla o araca uyumlu parçaları ve aktif ilanları bul.') + '</p></div></div>' +
    '<form id="savedVehicleForm" class="pane-form" style="margin-top:18px">' +
    '<div class="form-grid">' +
    '<label>Araç Tipi' + options('type') + '</label><label>Marka' + options('make') + '</label><label>Model' + options('model') + '</label><label>Yıl' + options('year') + '</label><label>Versiyon' + options('engine') + '</label>' +
    '<label>Takma Ad (opsiyonel)<input name="nickname" value="' + esc(editItem?.nickname || '') + '" placeholder="Örn. Benim Golf" maxlength="60"></label>' +
    '</div><div style="margin:10px 0 0;color:#737b84;font-size:12px">Yıl veya versiyon katalogda yoksa boş bırakıp aracı yine de kaydedebilirsin.</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="pane-btn primary" type="submit">' + (editing ? 'Değişiklikleri Kaydet' : '+ Aracı Kaydet') + '</button>' + (editing ? '<button class="pane-btn" type="button" data-cancel-edit>Vazgeç</button>' : '') + '</div></form>';
}

function renderList(items) {
  if (!items.length) return '<div class="pane-empty" style="margin-top:18px"><strong>Henüz kayıtlı aracın yok</strong><span>Yukarıdan ilk aracını ekle.</span></div>';
  return '<div class="pane-list" style="margin-top:18px">' + items.map((item) =>
    '<div class="pane-row saved-vehicle-row" data-open-saved-vehicle="' + esc(item.id) + '" role="button" tabindex="0" title="Aracıma ait parçaları göster"><div class="grow"><strong>' + esc(item.nickname || [item.make, item.model].filter(Boolean).join(' ')) + '</strong><small>' + esc([item.vehicle_type, item.make, item.model, item.year, item.version].filter(Boolean).join(' · ')) + '</small></div><div class="pane-actions"><button class="pane-btn" type="button" data-open-saved-vehicle="' + esc(item.id) + '">Aracıma Ait Parçaları Bul</button><button class="pane-btn" type="button" data-edit-saved-vehicle="' + esc(item.id) + '">Düzenle</button><button class="danger" type="button" data-delete-saved-vehicle="' + esc(item.id) + '">Sil</button></div></div>'
  ).join('') + '</div>';
}

function renderCompatible(items, label) {
  const grid = document.querySelector('#listingGrid');
  const section = document.querySelector('#ilanlar');
  if (!grid || !section) return;
  if (!items.length) grid.innerHTML = '<div class="empty"><strong>' + esc(label) + ' için uyumlu aktif ilan bulunamadı.</strong><span>Uyumluluk ağı ve yeni ilanlar güncellendikçe sonuçlar genişleyecek.</span></div>';
  else grid.innerHTML = items.map((item) => { const photo = item.image_path ? '<img class="listing-photo" src="' + esc(getListingThumbnailUrl(item.image_path)) + '" alt="' + esc(item.title) + '" loading="lazy">' : ''; return '<article class="listing-card"><div class="listing-image engine">' + photo + '<span class="condition">' + esc(item.condition === 'new' ? 'Sıfır' : item.condition === 'used' ? '2. El' : item.condition === 'salvage' ? 'Çıkma' : item.condition || '') + '</span><div class="part-art">⚙</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>' + esc(item.category || 'Oto Parça') + '</span><span>⌖ ' + esc(item.city || 'Türkiye') + '</span></div><h3>' + esc(item.title) + '</h3><p>' + esc(item.matched_vehicle || label) + '</p><strong class="price">' + money(item.price) + '</strong><div class="seller-line"><span>✓ ' + esc(item.seller_name || 'Satıcı') + '</span><button class="detail-btn" data-detail="' + esc(item.id) + '">İncele</button></div></div></article>'; }).join('');
  section.querySelector('.section-head h2')?.replaceChildren(document.createTextNode(label + ' için uyumlu parçalar ve ilanlar'));
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function openCompatibleVehicle(id) {
  if (!supabaseConfigured) return;
  try {
    const { data: saved, error: savedError } = await requireSupabase().from('user_vehicles').select('id, vehicle_id, make, model, year, version, nickname').eq('id', id).maybeSingle();
    if (savedError) throw savedError;
    if (!saved) throw new Error('Kayıtlı araç bulunamadı.');
    const { data, error } = await requireSupabase().rpc('search_saved_vehicle_listings', { p_user_vehicle_id: id, p_limit: 100 });
    if (error) throw error;
    const label = [saved.nickname, saved.make, saved.model, saved.year, saved.version].filter(Boolean).join(' · ');
    renderCompatible(data || [], label);
  } catch (error) {
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = error.message || 'Aracına ait parçalar yüklenemedi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
  }
}

async function render() {
  const target = pane();
  if (!target) return;
  target.innerHTML = '<div class="pane-loading">Yükleniyor…</div>';
  try {
    const items = await getSavedVehicles();
    const editingItem = editingId ? items.find((item) => String(item.id) === String(editingId)) : null;
    if (editingId && !editingItem) editingId = null;
    target.innerHTML = renderForm(editingItem) + renderList(items);
  } catch (error) {
    target.innerHTML = '<div class="pane-empty"><strong>Araçlar yüklenemedi</strong><span>' + esc(error.message) + '</span></div>';
  }
}

async function activate(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    window.location.assign('/giris');
    return;
  }
  active = true;
  editingId = null;
  document.querySelectorAll('[data-pane]').forEach((button) => button.classList.remove('active'));
  document.querySelector('[data-saved-vehicles], [data-pane="araclarim"]')?.classList.add('active');
  selection = { type: '', make: '', model: '', year: '', engine: '' };
  await render();
}
window.__openSavedVehicles = activate;

function goToSavedVehiclesPage(event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (window.location.pathname !== '/araclarim') window.location.assign('/araclarim');
}

function ensureMenu() {
  const root = menu();
  if (!root || root.querySelector('[data-saved-vehicles], [data-pane="araclarim"]')) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'account-menu-link'; button.dataset.accountPane = 'araclarim'; button.dataset.pane = 'araclarim'; button.dataset.savedVehicles = ''; button.innerHTML = '<span aria-hidden="true">🚗</span><strong>Araçlarım</strong>';
  listInsert(root, button);
  const nav = document.querySelector('.desktop-nav');
  if (nav && !nav.querySelector('[data-open-saved-vehicles]') && !nav.querySelector('#headerVehicleLink')) {
    const navButton = document.createElement('a');
    navButton.className = 'nav-drop saved-vehicles-nav'; navButton.dataset.openSavedVehicles = ''; navButton.href = '/araclarim'; navButton.textContent = 'Araçlarım';
    nav.appendChild(navButton);
  }
}
function listInsert(root, button) {
  const profile = root.querySelector('[data-pane="profilim"]');
  if (profile?.parentNode) profile.parentNode.insertBefore(button, profile.nextSibling); else root.prepend(button);
  button.addEventListener('click', goToSavedVehiclesPage);
}

document.addEventListener('change', (event) => {
  const field = event.target?.dataset?.savedVehicleField;
  if (!field || !active) return;
  selection[field] = event.target.value;
  const order = ['type', 'make', 'model', 'year', 'engine'];
  const index = order.indexOf(field);
  order.slice(index + 1).forEach((key) => { selection[key] = ''; });
  render().catch(() => {});
});

document.addEventListener('submit', async (event) => {
  if (event.target?.id !== 'savedVehicleForm') return;
  event.preventDefault();
  if (!selection.make || !selection.model) return;
  const nickname = event.target.elements.nickname?.value || '';
  try {
    const resolved = resolver.resolve?.(selection) || null;
    if (editingId) await updateSavedVehicle(editingId, { vehicle_id: resolved?.id || null, vehicle_type: selection.type, make: selection.make, model: selection.model, year: selection.year, version: selection.engine, nickname });
    else await saveVehicle({ vehicleId: resolved?.id || null, vehicleType: selection.type, make: selection.make, model: selection.model, year: selection.year, version: selection.engine, nickname });
    const wasEditing = Boolean(editingId);
    editingId = null;
    selection = { type: '', make: '', model: '', year: '', engine: '' };
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = wasEditing ? 'Araç güncellendi.' : 'Araç kaydedildi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
    await render();
  } catch (error) {
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = error.message || 'Araç kaydedilemedi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
  }
});

document.addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit-saved-vehicle]');
  if (edit && active) { event.preventDefault(); event.stopPropagation(); editingId = edit.dataset.editSavedVehicle; await render(); pane()?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const cancel = event.target.closest('[data-cancel-edit]');
  if (cancel && active) { event.preventDefault(); event.stopPropagation(); editingId = null; selection = { type: '', make: '', model: '', year: '', engine: '' }; await render(); return; }
  const open = event.target.closest('[data-open-saved-vehicle]');
  if (open && active) { if (event.target.closest('[data-delete-saved-vehicle]') || event.target.closest('[data-edit-saved-vehicle]')) return; event.preventDefault(); event.stopPropagation(); await openCompatibleVehicle(open.dataset.openSavedVehicle); return; }
  const button = event.target.closest('[data-delete-saved-vehicle]');
  if (!button || !active) return;
  event.preventDefault(); event.stopPropagation();
  try { await deleteSavedVehicle(button.dataset.deleteSavedVehicle); if (String(editingId) === String(button.dataset.deleteSavedVehicle)) editingId = null; await render(); }
  catch (error) { const toast = document.querySelector('#toast'); if (toast) { toast.textContent = error.message || 'Araç silinemedi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); } }
});

document.addEventListener('keydown', (event) => { if (event.key !== 'Enter' && event.key !== ' ') return; const row = event.target.closest?.('[data-open-saved-vehicle]'); if (!row || event.target.closest('button')) return; event.preventDefault(); openCompatibleVehicle(row.dataset.openSavedVehicle); });

const observer = new MutationObserver(() => ensureMenu());
observer.observe(document.body, { childList: true, subtree: true });
ensureMenu();
