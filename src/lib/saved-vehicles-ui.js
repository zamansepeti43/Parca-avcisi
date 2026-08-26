import { getCurrentUser } from './auth.js';
import { VehicleResolver } from './vehicle-resolver.js';
import { getSavedVehicles, saveVehicle, deleteSavedVehicle } from './saved-vehicles.js';

const resolver = new VehicleResolver();
let active = false;
let selection = { type: '', make: '', model: '', year: '', engine: '' };

const esc = (v) => String(v ?? '').replace(/[&<>'\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

function pane() { return document.querySelector('.account-pane'); }
function menu() { return document.querySelector('.account-menu'); }

function options(field) {
  const opts = resolver.getOptions(selection, field) || [];
  const previous = field === 'type' ? '' : ({ make: 'type', model: 'make', year: 'model', engine: 'year' }[field]);
  const disabled = Boolean(previous && !selection[previous]);
  return '<select data-saved-vehicle-field="' + field + '"' + (disabled ? ' disabled' : '') + '><option value="">Seçiniz</option>' +
    opts.map((v) => '<option value="' + esc(v) + '"' + (String(selection[field]) === String(v) ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>';
}

function renderForm() {
  return '<div class="account-pane-head"><div><h2>Araçlarım</h2><p style="margin:4px 0 0;color:#6e747c">Sık kullandığın araçları kaydet. Parça ararken tekrar tekrar seçim yapmana gerek kalmasın.</p></div></div>' +
    '<form id="savedVehicleForm" class="pane-form" style="margin-top:18px">' +
    '<div class="form-grid">' +
    '<label>Araç Tipi' + options('type') + '</label>' +
    '<label>Marka' + options('make') + '</label>' +
    '<label>Model' + options('model') + '</label>' +
    '<label>Yıl' + options('year') + '</label>' +
    '<label>Versiyon' + options('engine') + '</label>' +
    '<label>Takma Ad (opsiyonel)<input name="nickname" placeholder="Örn. Benim Golf" maxlength="60"></label>' +
    '</div><button class="pane-btn primary" type="submit">+ Aracı Kaydet</button></form>';
}

function renderList(items) {
  if (!items.length) return '<div class="pane-empty" style="margin-top:18px"><strong>Henüz kayıtlı aracın yok</strong><span>Yukarıdan ilk aracını ekle.</span></div>';
  return '<div class="pane-list" style="margin-top:18px">' + items.map((item) =>
    '<div class="pane-row"><div class="grow"><strong>' + esc(item.nickname || [item.make, item.model].filter(Boolean).join(' ')) + '</strong><small>' + esc([item.vehicle_type, item.make, item.model, item.year, item.version].filter(Boolean).join(' · ')) + '</small></div>' +
    '<div class="pane-actions"><button class="danger" data-delete-saved-vehicle="' + esc(item.id) + '">Sil</button></div></div>'
  ).join('') + '</div>';
}

async function render() {
  const target = pane();
  if (!target) return;
  target.innerHTML = '<div class="pane-loading">Yükleniyor…</div>';
  try {
    const items = await getSavedVehicles();
    target.innerHTML = renderForm() + renderList(items);
  } catch (error) {
    target.innerHTML = '<div class="pane-empty"><strong>Araçlar yüklenemedi</strong><span>' + esc(error.message) + '</span></div>';
  }
}

async function activate(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const user = await getCurrentUser().catch(() => null);
  if (!user) return;
  active = true;
  document.querySelectorAll('[data-pane]').forEach((button) => button.classList.remove('active'));
  document.querySelector('[data-saved-vehicles]')?.classList.add('active');
  selection = { type: '', make: '', model: '', year: '', engine: '' };
  await render();
}

function ensureMenu() {
  const root = menu();
  if (!root || root.querySelector('[data-saved-vehicles]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.savedVehicles = '';
  button.textContent = 'Araçlarım';
  button.addEventListener('click', activate);
  const profile = root.querySelector('[data-pane="profilim"]');
  if (profile?.parentNode) profile.parentNode.insertBefore(button, profile.nextSibling);
  else root.prepend(button);
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
    await saveVehicle({ vehicleType: selection.type, make: selection.make, model: selection.model, year: selection.year, version: selection.engine, nickname });
    selection = { type: '', make: '', model: '', year: '', engine: '' };
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = 'Araç kaydedildi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
    await render();
  } catch (error) {
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = error.message || 'Araç kaydedilemedi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-saved-vehicle]');
  if (!button || !active) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    await deleteSavedVehicle(button.dataset.deleteSavedVehicle);
    await render();
  } catch (error) {
    const toast = document.querySelector('#toast');
    if (toast) { toast.textContent = error.message || 'Araç silinemedi.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
  }
});

const observer = new MutationObserver(() => ensureMenu());
observer.observe(document.body, { childList: true, subtree: true });
ensureMenu();
