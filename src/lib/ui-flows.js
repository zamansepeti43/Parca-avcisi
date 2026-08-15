import './flows.css';
import { VehicleResolver } from './vehicle-resolver.js';
import { getCurrentUser, onAuthStateChange, signIn, signUp, signOut, resetPassword, updatePassword } from './auth.js';
import { createListing, getListingById, getMyListings } from './listings.js';
import { attachImagesToListing } from './listing-images.js';
import { getMainCategories, getSubcategories } from './part-catalog.js';
import { DELIVERY_OPTIONS, deliveryLabel } from './delivery.js';
import { sendMessage } from './messages.js';
import { supabaseConfigured } from './supabase.js';

const resolver = new VehicleResolver();
let selection = { type: '', make: '', model: '', generation: '', year: '', engine: '' };
let pendingAction = null;
let selectedPhotos = [];
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const isPhotoFile = (file) => file instanceof File && file.size > 0 && (ACCEPTED_PHOTO_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name));
const photoUrl = (file) => URL.createObjectURL(file);

const vehicleSection = document.querySelector('#aracini-sec');
vehicleSection.innerHTML = '<div class="container vehicle-card vehicle-picker"><div><span class="eyebrow">AKILLI ARAÇ SEÇİCİ</span><h2>Aracını seç, uyumlu parçayı bul.</h2><p>Araç tipiyle başla; katalog kapsamı olan alanlar sırayla açılır.</p></div><form class="vehicle-form vehicle-hierarchy" id="vehicleHierarchy"></form></div>';

const fields = [
  ['type', 'Araç Tipi'], ['make', 'Marka'], ['model', 'Model'],
  ['year', 'Yıl'], ['engine', 'Versiyon'],
];

function optionsHtml(field) {
  const options = field === 'type' ? resolver.getOptions({}, 'type') : resolver.getOptions(selection, field);
  const disabled = field !== 'type' && !selection[fields[fields.findIndex(([key]) => key === field) - 1]?.[0]];
  const unavailable = field === 'engine' && options.length === 0 && selection.year;
  return '<label><span>' + fields.find(([key]) => key === field)[1] + '</span><select data-vehicle-field="' + field + '" ' + (disabled ? 'disabled' : '') + '><option value="">' + (unavailable ? 'Bu kaynakta veri yok' : 'Seçiniz') + '</option>' + options.map((item) => '<option value="' + item + '" ' + (selection[field] === String(item) ? 'selected' : '') + '>' + item + '</option>').join('') + '</select></label>';
}

function renderPicker() {
  const form = document.querySelector('#vehicleHierarchy');
  form.innerHTML = fields.map(([field]) => optionsHtml(field)).join('') + '<button type="submit">Uyumlu Parçaları Göster</button>';
}

renderPicker();

document.querySelector('#vehicleHierarchy').addEventListener('change', (event) => {
  const field = event.target.dataset.vehicleField;
  if (!field) return;
  selection[field] = event.target.value;
  const index = fields.findIndex(([key]) => key === field);
  fields.slice(index + 1).forEach(([key]) => { selection[key] = ''; });
  renderPicker();
});

document.querySelector('#vehicleHierarchy').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!selection.model) return showToast('Lütfen araç tipi, marka ve model seç.');
  const query = [selection.make, selection.model, selection.year, selection.engine].filter(Boolean).join(' ');
  document.querySelector('#searchInput').value = query;
  document.querySelector('#searchForm').dispatchEvent(new Event('submit', { cancelable: true }));
});

document.querySelector('.search-box').insertAdjacentHTML('afterend', '<div class="search-paths"><button type="button" data-open-picker>Aracını Seç</button><span>veya</span><button type="button" data-focus-oem>Parça / OEM No Ara</button><small>VIN ile arama yakında</small></div>');

document.body.insertAdjacentHTML('beforeend', '<div class="app-modal" id="appModal" aria-hidden="true"><div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="Kapat">×</button><div id="modalContent"></div></div></div>');
const modal = document.querySelector('#appModal');
const content = document.querySelector('#modalContent');

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}
const money = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0) + ' TL';
const statusLabels = { draft: 'Taslak', active: 'Yayınlandı', sold: 'Satıldı', paused: 'Yayında Değil', removed: 'Kaldırıldı' };
function openModal(html) { content.innerHTML = html; modal.querySelector('.modal-card').classList.remove('account-wide'); modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); pendingAction = null; }
async function requireMember(action) {
  const user = await getCurrentUser().catch(() => null);
  if (user) return action();
  pendingAction = action;
  openAuth();
}

function openAuth() {
  if (!supabaseConfigured) {
    openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Üyelik yakında açılacak</h2><p>Üyelik sistemi için Supabase bağlantısı henüz yapılandırılmadı. <code>VITE_SUPABASE_URL</code> ve <code>VITE_SUPABASE_ANON_KEY</code> ortam değişkenlerini ayarlayın.</p>');
    pendingAction = null;
    return;
  }
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Devam etmek için giriş yap.</h2><p>İlan detaylarını görmek, favori kaydetmek ve ilan vermek için ücretsiz hesabını kullan.</p><div class="auth-choices"><button data-open-login>Giriş Yap</button><button data-open-signup class="secondary">Ücretsiz Kayıt Ol</button></div>');
}
function openLoginForm() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Giriş yap</h2><p>Hesabınla devam et.</p><form id="loginForm" class="stack-form"><input name="email" type="email" required autocomplete="email" placeholder="E-posta"><input name="password" type="password" required autocomplete="current-password" placeholder="Şifre"><button>Giriş Yap</button></form><div class="form-links"><button type="button" data-open-forgot>Şifremi unuttum</button><button type="button" data-open-signup>Hesabın yok mu? Kayıt ol</button></div>');
}
function openSignupForm() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Ücretsiz kayıt ol</h2><p>İlan vermek, favori kaydetmek ve satıcılarla iletişim kurmak için üye ol.</p><form id="signupForm" class="stack-form"><input name="fullName" required autocomplete="name" placeholder="Ad soyad"><input name="email" type="email" required autocomplete="email" placeholder="E-posta"><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Şifre (en az 6 karakter)"><button>Kayıt Ol</button></form><div class="form-links"><button type="button" data-open-login>Hesabın var mı? Giriş yap</button></div>');
}
function openForgotPassword() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Şifreni mi unuttun?</h2><p>E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.</p><form id="forgotForm" class="stack-form"><input name="email" type="email" required autocomplete="email" placeholder="E-posta"><button>Bağlantı Gönder</button></form><div class="form-links"><button type="button" data-open-login>Girişe dön</button></div>');
}
function openResetPassword() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Yeni şifre belirle</h2><p>Yeni şifreni gir ve kaydet.</p><form id="resetPasswordForm" class="stack-form"><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Yeni şifre (en az 6 karakter)"><input name="confirm" type="password" required minlength="6" autocomplete="new-password" placeholder="Yeni şifre (tekrar)"><button>Şifreyi Güncelle</button></form>');
}
function openEmailVerify() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>E-postanı doğrula</h2><p>Sana bir doğrulama e-postası gönderdik. İçindeki bağlantıya tıklayarak hesabını aktifleştir, ardından giriş yap.</p><div class="auth-choices"><button data-open-login>Giriş Yap</button><button data-open-signup class="secondary">Kayıt ekranına dön</button></div>');
}
async function openAccount() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) { openAuth(); return; }
  if (window.__openAccountCenter) window.__openAccountCenter('profilim');
}
async function signOutUser() {
  try { await signOut(); showToast('Çıkış yapıldı.'); }
  catch (error) { showToast(error.message || 'Çıkış yapılamadı.'); }
  closeModal();
  renderAuthUI(null);
}
function renderAuthUI(user) {
  const slot = document.querySelector('#authSlot');
  if (slot) {
    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hesap';
      const initial = escapeHtml(name.charAt(0).toLocaleUpperCase('tr-TR'));
      slot.innerHTML = '<button class="notif-bell" id="notifBell" type="button" aria-label="Bildirimler"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="notif-badge" id="notifBadge"></span></button><button class="auth-account" id="accountBtn" type="button" aria-label="Hesabım"><b>' + initial + '</b><span>' + escapeHtml(name) + '</span></button>';
    } else {
      slot.innerHTML = '<button class="outline-btn auth-btn" id="loginBtn" type="button">Giriş Yap</button><button class="outline-btn auth-btn gold" id="signupBtn" type="button">Kayıt Ol</button>';
    }
  }
  const accountLabel = document.querySelector('#accountLabel');
  if (accountLabel) {
    const name = user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hesabım').split(' ')[0] : 'Hesabım';
    accountLabel.textContent = name;
  }
}

function photoPickerHtml() {
  return '<div class="photo-picker"><div class="photo-picker-head"><span class="eyebrow">FOTOĞRAFLAR</span><small>İlk fotoğraf kapak olur · JPG, JPEG, PNG, WEBP</small></div>'
    + '<div class="photo-dropzone" data-photo-add role="button" tabindex="0" aria-label="Fotoğraf ekle"><span class="photo-dropzone-icon">＋</span><b>Fotoğraf Ekle</b><small>Birden fazla fotoğraf seçebilirsin</small></div>'
    + '<div class="photo-previews" data-photo-previews hidden></div>'
    + '<p class="photo-count" data-photo-count hidden></p>'
    + '<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-photo-input></div>';
}
function photoPreviewsHtml() {
  return selectedPhotos.map((file, index) => {
    const isFirst = index === 0;
    const isLast = index === selectedPhotos.length - 1;
    return '<div class="photo-thumb' + (isFirst ? ' is-cover' : '') + '" data-photo-index="' + index + '">'
      + '<img src="' + photoUrl(file) + '" alt="' + escapeHtml(file.name) + '">'
      + (isFirst ? '<span class="photo-cover-badge">Kapak</span>' : '')
      + '<div class="photo-thumb-actions">'
      + '<button type="button" data-photo-move data-dir="-1"' + (isFirst ? ' disabled' : '') + ' aria-label="Sola taşı">‹</button>'
      + '<button type="button" data-photo-move data-dir="1"' + (isLast ? ' disabled' : '') + ' aria-label="Sağa taşı">›</button>'
      + (!isFirst ? '<button type="button" data-photo-cover title="Kapak yap">★</button>' : '')
      + '<button type="button" data-photo-remove aria-label="Fotoğrafı kaldır">×</button>'
      + '</div></div>';
  }).join('');
}
function syncPhotoPreviews(form) {
  const grid = form.querySelector('[data-photo-previews]');
  if (!grid) return;
  grid.innerHTML = photoPreviewsHtml();
  grid.hidden = !selectedPhotos.length;
  const count = form.querySelector('[data-photo-count]');
  if (count) {
    count.hidden = !selectedPhotos.length;
    count.textContent = selectedPhotos.length === 1
      ? '1 fotoğraf seçildi — ilki kapak fotoğrafı olarak kullanılır.'
      : selectedPhotos.length + ' fotoğraf seçildi — ilki kapak fotoğrafı olarak kullanılır.';
  }
}
function wirePhotoPicker(form) {
  const input = form.querySelector('[data-photo-input]');
  if (!input) return;
  input.addEventListener('change', (event) => {
    const all = [...event.target.files];
    const valid = all.filter(isPhotoFile);
    if (valid.length !== all.length) showToast('Yalnızca JPG, JPEG, PNG ve WEBP fotoğraflar eklenebilir.');
    if (valid.length) { selectedPhotos.push(...valid); syncPhotoPreviews(form); }
    input.value = '';
  });
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-photo-add]')) { event.preventDefault(); input.click(); return; }
    const thumb = event.target.closest('[data-photo-index]');
    if (!thumb) return;
    const index = Number(thumb.dataset.photoIndex);
    const move = event.target.closest('[data-photo-move]');
    if (move) {
      const target = index + Number(move.dataset.dir);
      if (target >= 0 && target < selectedPhotos.length) {
        const [item] = selectedPhotos.splice(index, 1);
        selectedPhotos.splice(target, 0, item);
      }
    }
    if (event.target.closest('[data-photo-remove]')) selectedPhotos.splice(index, 1);
    if (event.target.closest('[data-photo-cover]') && index > 0) {
      const [item] = selectedPhotos.splice(index, 1);
      selectedPhotos.unshift(item);
    }
    syncPhotoPreviews(form);
  });
  form.addEventListener('keydown', (event) => {
    if (event.target.closest('[data-photo-add]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); input.click();
    }
  });
  syncPhotoPreviews(form);
}
function vehicleFieldsHtml() {
  const sel = (field, value) => selection[field] === String(value);
  const opt = (values, field) => values.map((value) => '<option value="' + escapeHtml(String(value)) + '"' + (sel(field, value) ? ' selected' : '') + '>' + escapeHtml(String(value)) + '</option>').join('');
  const types = resolver.getOptions({}, 'type');
  const makes = selection.type ? resolver.getOptions({ type: selection.type }, 'make') : [];
  const models = selection.type && selection.make ? resolver.getOptions(selection, 'model') : [];
  const years = selection.type && selection.make && selection.model ? resolver.getOptions(selection, 'year') : [];
  const engines = selection.type && selection.make && selection.model ? resolver.getOptions(selection, 'engine') : [];
  const modelDisabled = !selection.make;
  const yearDisabled = !selection.model;
  const engineDisabled = !selection.model;
  return '<label>Araç Tipi<select name="formType" data-form-vehicle="type"><option value="">Araç Tipi Seçiniz</option>' + opt(types, 'type') + '</select></label>'
    + '<div class="field-row"><label>Araç Markası<select name="formMake" data-form-vehicle="make"' + (selection.type ? '' : ' disabled') + '><option value="">Marka Seçiniz</option>' + opt(makes, 'make') + '</select></label>'
    + '<label>Araç Modeli<select name="formModel" data-form-vehicle="model"' + (modelDisabled ? ' disabled' : '') + '><option value="">Model Seçiniz</option>' + opt(models, 'model') + '</select></label></div>'
    + '<div class="field-row"><label>Yıl<select name="formYear" data-form-vehicle="year"' + (yearDisabled ? ' disabled' : '') + '><option value="">Yıl Seçiniz</option>' + opt(years, 'year') + '</select></label>'
    + '<label>Versiyon<select name="formEngine" data-form-vehicle="engine"' + (engineDisabled ? ' disabled' : '') + '><option value="">Versiyon (opsiyonel)</option>' + opt(engines, 'engine') + '</select></label></div>';
}
function subcategorySlotHtml(category) {
  const subs = getSubcategories(selection.type || '', category);
  if (!category || !subs.length) return '<label>Alt Kategori<select name="subCategory" disabled><option value="">Önce kategori seç</option></select></label>';
  return '<label>Alt Kategori<select name="subCategory"><option value="">Alt kategori (opsiyonel)</option>' + subs.map((name) => '<option value="' + name + '">' + name + '</option>').join('') + '</select></label>';
}
function categoryFieldsHtml() {
  const categories = getMainCategories(selection.type || '');
  return '<label>Parça Kategorisi<span class="category-search"><input type="text" data-category-search placeholder="Kategori ara (örn. aydınlatma)"></span><select name="category" required><option value="">Parça Kategorisi Seçiniz</option>' + categories.map((name) => '<option value="' + name + '">' + name + '</option>').join('') + '</select></label>'
    + '<div data-subcategory-slot>' + subcategorySlotHtml('') + '</div>';
}
function wireListingFormFields(form) {
  form.addEventListener('change', (event) => {
    const vf = event.target.closest('[data-form-vehicle]');
    if (vf) {
      const changed = vf.dataset.formVehicle;
      selection[changed] = vf.value;
      const order = ['type', 'make', 'model', 'year', 'engine'];
      order.slice(order.indexOf(changed) + 1).forEach((key) => { selection[key] = ''; });
      const container = form.querySelector('[data-vehicle-fields]');
      if (container) container.innerHTML = vehicleFieldsHtml();
      if (changed === 'type') {
        const categorySelect = form.querySelector('[name="category"]');
        if (categorySelect) {
          categorySelect.innerHTML = '<option value="">Parça Kategorisi Seçiniz</option>'
            + getMainCategories(selection.type || '').map((name) => '<option value="' + name + '">' + name + '</option>').join('');
        }
        const slot = form.querySelector('[data-subcategory-slot]');
        if (slot) slot.innerHTML = subcategorySlotHtml('');
      }
      return;
    }
    if (event.target.matches('[name="category"]')) {
      const slot = form.querySelector('[data-subcategory-slot]');
      if (slot) slot.innerHTML = subcategorySlotHtml(event.target.value);
      return;
    }
  });
  form.addEventListener('input', (event) => {
    if (!event.target.matches('[data-category-search]')) return;
    const q = event.target.value.trim().toLocaleLowerCase('tr-TR');
    const select = form.querySelector('[name="category"]');
    if (!select) return;
    for (const option of select.options) {
      if (!option.value) continue;
      option.hidden = Boolean(q) && !option.text.toLocaleLowerCase('tr-TR').includes(q);
    }
  });
}
function openSellChoice() {
  openModal('<span class="eyebrow">PARÇA AVCISI</span><h2>Ne yapmak istiyorsun?</h2><div class="sell-choice-grid">'
    + '<button type="button" class="sell-choice" data-choice-sell><b>🔧</b><strong>Parça Satıyorum</strong><span>Sıfır, 2. el veya çıkma parçanı ilanla.</span></button>'
    + '<button type="button" class="sell-choice" data-choice-request><b>🔎</b><strong>Parça Arıyorum</strong><span>Bulamadığın parçayı talep et; satıcılar sana ulaşsın.</span></button>'
    + '</div>'
    + '<button type="button" class="sell-choice-alt" data-easy-listing>📸 Fotoğraftan ilan oluşturmayı tercih ediyorsan burayı kullan</button>');
}
function openListingForm() {
  selectedPhotos = [];
  const deliveryOptions = '<option value="">Teslimat tercihi (opsiyonel)</option>' + DELIVERY_OPTIONS.map((option) => '<option value="' + option.value + '">' + option.label + '</option>').join('');
  openModal('<span class="eyebrow">YENİ İLAN</span><h2>İlanını hazırla</h2><form id="listingForm" class="stack-form"><select name="condition" required><option value="">Durum</option><option value="new">Sıfır</option><option value="used">2. El</option><option value="salvage">Çıkma</option></select><div data-vehicle-fields>' + vehicleFieldsHtml() + '</div>' + categoryFieldsHtml() + '<input name="partName" placeholder="Parça adı" required><input name="oemNumber" placeholder="OEM / parça numarası"><textarea name="description" placeholder="Açıklama"></textarea><div class="field-row"><input name="price" type="number" min="0" required placeholder="Fiyat"><input name="city" required placeholder="Şehir"></div><label>Teslimat<select name="delivery">' + deliveryOptions + '</select></label>' + photoPickerHtml() + '<button>Önizlemeye Geç</button></form>');
  const form = document.querySelector('#listingForm');
  wirePhotoPicker(form);
  wireListingFormFields(form);
}
function previewPhotosHtml(files) {
  const list = Array.isArray(files) ? files.filter((file) => file instanceof File && file.size > 0) : [];
  if (!list.length) return '';
  return '<div class="preview-photos"><span class="eyebrow">FOTOĞRAFLAR</span><div class="preview-photos-grid">'
    + list.map((file, index) => '<figure class="preview-photo' + (index === 0 ? ' is-cover' : '') + '"><img src="' + photoUrl(file) + '" alt="' + escapeHtml(file.name) + '"><figcaption>' + (index === 0 ? 'Kapak' : 'Fotoğraf ' + (index + 1)) + '</figcaption></figure>').join('')
    + '</div></div>';
}
function conditionKeyLabel(key) {
  return { new: 'Sıfır', used: '2. El', salvage: 'Çıkma' }[key] || key || '';
}
function previewDetailsHtml(data) {
  const delivery = deliveryLabel(data.delivery || '');
  return '<div class="preview-grid">'
    + '<b>' + escapeHtml(data.vehicle || 'Araç belirtilmedi') + '</b>'
    + '<span>' + escapeHtml(data.category || 'Kategori seçilmedi') + (data.subCategory ? ' › ' + escapeHtml(data.subCategory) : '') + '</span>'
    + '<span>' + escapeHtml(conditionKeyLabel(data.condition)) + ' · ' + escapeHtml(data.partName) + (data.oemNumber ? ' · OEM: ' + escapeHtml(data.oemNumber) : '') + '</span>'
    + '<strong>' + Number(data.price).toLocaleString('tr-TR') + ' TL</strong>'
    + '<span>⌖ ' + escapeHtml(data.city) + '</span>'
    + (delivery ? '<span>Kargo: ' + escapeHtml(delivery) + '</span>' : '')
    + '</div>';
}
function openPreview(data) {
  openModal('<span class="eyebrow">İLAN ÖNİZLEME</span><h2>' + escapeHtml(data.partName) + '</h2>' + previewPhotosHtml(data.photos) + previewDetailsHtml(data) + '<p>' + escapeHtml(data.description || 'Açıklama eklenmedi.') + '</p><button id="publishListing">İlanı Yayınla</button><button id="saveDraftListing" class="secondary">Taslak Kaydet</button>');
  document.querySelector('#publishListing').onclick = () => createListingWithPhotos(data, 'active');
  document.querySelector('#saveDraftListing').onclick = () => createListingWithPhotos(data, 'draft');
}
async function createListingWithPhotos(data, status) {
  try {
    const listing = await createListing({
      title: data.partName,
      description: data.description,
      condition: data.condition,
      price: data.price,
      city: data.city,
      oemNumber: data.oemNumber,
      category: data.category || null,
      subcategory: data.subCategory || null,
      vehicle: data.vehicle || null,
      delivery: data.delivery || null,
      status,
    });
    window.dispatchEvent(new CustomEvent('parca:listings-updated'));
    const photos = Array.isArray(data.photos) ? data.photos.filter((file) => file instanceof File && file.size > 0) : [];
    let photoError = '';
    if (photos.length) {
      try { await attachImagesToListing(listing.id, photos); }
      catch (imgError) { photoError = imgError.message || 'Fotoğraf yüklenemedi.'; }
    }
    closeModal();
    const verb = status === 'active' ? 'İlan yayınlandı ve listeye eklendi.' : 'Taslak kaydedildi.';
    showToast(photoError ? verb + ' Fotoğraf yüklenemedi: ' + photoError : verb);
    openDetail(listing.id);
  } catch (error) { showToast(error.message || 'İlan oluşturulamadı.'); }
}
function galleryHtml(images = []) {
  const urls = images.filter((image) => image.url).map((image) => image.url);
  if (!urls.length) return '<div class="detail-photo">PARÇA AVCISI</div>';
  const main = '<div class="gallery-main"><img class="gallery-main-img" src="' + escapeHtml(urls[0]) + '" alt="İlan fotoğrafı" loading="lazy"></div>';
  const thumbs = urls.length > 1
    ? '<div class="gallery-thumbs">' + urls.map((url, index) => '<button type="button" class="gallery-thumb' + (index === 0 ? ' active' : '') + '" data-gallery="' + index + '"><img class="gallery-thumb-img" src="' + escapeHtml(url) + '" alt="" loading="lazy"></button>').join('') + '</div>'
    : '';
  return '<div class="detail-gallery">' + main + thumbs + '</div>';
}
function renderListingDetail(listing) {
  const statusText = statusLabels[listing.status] || '';
  const contactBtn = listing.sellerId
    ? '<button data-contact data-seller="' + escapeHtml(listing.sellerId) + '" data-listing="' + escapeHtml(listing.id) + '">Satıcıyla iletişim başlat</button>'
    : '<button data-contact>Satıcıyla iletişim başlat</button>';
  openModal('<span class="eyebrow">İLAN DETAYI</span><h2>' + escapeHtml(listing.title) + (statusText ? '<span class="status-badge ' + escapeHtml(listing.status) + '">' + statusText + '</span>' : '') + '</h2>' + galleryHtml(listing.images) + '<p>' + escapeHtml(listing.vehicle) + '</p><p><strong>' + money(listing.price) + '</strong> · ' + escapeHtml(listing.condition) + ' · ' + escapeHtml(listing.category) + (listing.subcategory ? ' › ' + escapeHtml(listing.subcategory) : '') + ' · ⌖ ' + escapeHtml(listing.city) + '</p>' + (listing.description ? '<p>' + escapeHtml(listing.description) + '</p>' : '') + '<div class="seller-line"><span>✓ ' + escapeHtml(listing.seller) + '</span><small>OEM: ' + escapeHtml(listing.oemNumber || '—') + '</small></div>' + contactBtn);
}

function openContactForm(sellerId, listingId, listingTitle) {
  openModal('<span class="eyebrow">MESAJ</span><h2>' + escapeHtml(listingTitle || 'Satıcıyla iletişim') + '</h2><p>Mesajını yaz, satıcıya iletelim. Konuşmaların Hesabım → Mesajlarım bölümünde görünür.</p><form id="contactForm" class="stack-form" data-seller="' + escapeHtml(sellerId) + '" data-listing="' + escapeHtml(listingId) + '"><textarea name="body" required placeholder="Merhaba, ilanla ilgileniyorum..."></textarea><button>Gönder</button></form>');
}
function openDetail(id) {
  const target = '#/ilan/' + encodeURIComponent(String(id));
  if (window.__closeModal) window.__closeModal();
  if (window.location.hash === target) {
    if (window.__openListingDetailPage) window.__openListingDetailPage(String(id));
  } else {
    window.location.hash = target;
  }
}
window.__openListingDetail = openDetail;
window.__openListingForm = openListingForm;
window.__requireMember = requireMember;
window.__showToast = showToast;
window.__closeModal = closeModal;
window.__openAuth = openAuth;
window.__signOutUser = signOutUser;
async function openMyListings() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) { openAuth(); return; }
  if (window.__openAccountCenter) window.__openAccountCenter('ilanlarim');
}
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;', "'":'&#39;','"':'&quot;' }[c])); }

document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-close-modal]') || event.target === modal) closeModal();
  if (event.target.closest('[data-open-picker]')) vehicleSection.scrollIntoView({ behavior: 'smooth' });
  if (event.target.closest('[data-focus-oem]')) { document.querySelector('#searchInput').focus(); document.querySelector('#searchInput').placeholder = 'OEM / parça numarası ara...'; }
  if (event.target.closest('#sellBtn, #mobileSell')) { event.preventDefault(); await requireMember(openSellChoice); }
  if (event.target.closest('[data-choice-sell]')) { event.preventDefault(); closeModal(); openListingForm(); return; }
  if (event.target.closest('[data-choice-request]')) {
    event.preventDefault();
    closeModal();
    if (window.__openRequestForm) window.__openRequestForm();
    else showToast('Talep oluşturma ekranı yüklenemedi.');
    return;
  }
  if (event.target.closest('[data-easy-listing]')) { event.preventDefault(); closeModal(); if (window.__openEasyListing) window.__openEasyListing(); return; }
  const detail = event.target.closest('[data-detail]');
  if (detail) { event.preventDefault(); event.stopImmediatePropagation(); openDetail(detail.dataset.detail); }
  const contact = event.target.closest('[data-contact]');
  if (contact) {
    if (!supabaseConfigured) { showToast('Mesajlaşma için Supabase bağlantısı gerekli.'); return; }
    const contactTitle = contact.closest('.modal-card')?.querySelector('h2')?.textContent;
    requireMember(() => {
      if (!contact.dataset.seller) return showToast('Bu ilan için satıcı bilgisi bulunamadı.');
      return getCurrentUser().then((user) => {
        if (user && user.id === contact.dataset.seller) return showToast('Bu senin ilanın.');
        openContactForm(contact.dataset.seller, contact.dataset.listing, contactTitle);
      });
    });
    return;
  }

  if (event.target.closest('[data-open-login]')) openLoginForm();
  if (event.target.closest('[data-open-signup]')) openSignupForm();
  if (event.target.closest('[data-open-forgot]')) openForgotPassword();
  if (event.target.closest('#loginBtn')) openLoginForm();
  if (event.target.closest('#signupBtn')) openSignupForm();
  if (event.target.closest('#accountBtn')) openAccount();
  if (event.target.closest('#accountLink')) { event.preventDefault(); const user = await getCurrentUser().catch(() => null); user ? openAccount() : openAuth(); }
  if (event.target.closest('#notifBell')) { const user = await getCurrentUser().catch(() => null); user ? window.__openAccountCenter?.('bildirimler') : openAuth(); }
  if (event.target.closest('#favoriteLink')) { event.preventDefault(); const user = await getCurrentUser().catch(() => null); user ? window.__openAccountCenter?.('favorilerim') : openAuth(); }
  if (event.target.closest('[data-my-listings]')) openMyListings();
  if (event.target.closest('[data-account-signout]')) signOutUser();
  if (event.target.closest('[data-open-sell]')) { await requireMember(openListingForm); }
}, true);

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'loginForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      await signIn({ email: data.get('email'), password: data.get('password') });
      const action = pendingAction;
      pendingAction = null;
      closeModal();
      showToast('Giriş yapıldı.');
      renderAuthUI(await getCurrentUser().catch(() => null));
      if (action) action();
    } catch (error) { showToast(error.message || 'Giriş yapılamadı.'); }
  }
  if (event.target.id === 'signupForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      const result = await signUp({ email: data.get('email'), password: data.get('password'), fullName: data.get('fullName') });
      if (result.session) {
        const action = pendingAction;
        pendingAction = null;
        closeModal();
        showToast('Kayıt tamamlandı.');
        renderAuthUI(result.session.user);
        if (action) action();
      } else {
        openEmailVerify();
        showToast('Kayıt tamamlandı. E-postanı doğrulamayı unutma.');
      }
    } catch (error) { showToast(error.message || 'Kayıt tamamlanamadı.'); }
  }
  if (event.target.id === 'forgotForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      await resetPassword(data.get('email'));
      closeModal();
      showToast('Şifre sıfırlama bağlantısı e-postana gönderildi.');
    } catch (error) { showToast(error.message || 'Bağlantı gönderilemedi.'); }
  }
  if (event.target.id === 'resetPasswordForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    const password = data.get('password');
    if (!password || password !== data.get('confirm')) return showToast('Şifreler eşleşmiyor.');
    try {
      await updatePassword(password);
      showToast('Şifren güncellendi.');
      closeModal();
      try { await signOut(); } catch {}
      openLoginForm();
    } catch (error) { showToast(error.message || 'Şifre güncellenemedi.'); }
  }
  if (event.target.id === 'contactForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      await sendMessage({ listingId: event.target.dataset.listing, receiverId: event.target.dataset.seller, body: data.get('body') });
      showToast('Mesaj gönderildi.');
      closeModal();
      if (window.__openAccountCenter) window.__openAccountCenter('mesajlarim');
    } catch (error) { showToast(error.message || 'Mesaj gönderilemedi.'); }
  }
  if (event.target.id === 'listingForm') {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    data.photos = [...selectedPhotos];
    data.category = data.category || '';
    data.subCategory = data.subCategory || '';
    data.vehicle = [selection.type, selection.make, selection.model, selection.year, selection.engine].filter(Boolean).join(' · ');
    if (!selection.type || !selection.make || !selection.model) return showToast('Araç bilgisi için araç tipi, marka ve model seç.');
    openPreview(data);
  }
});

document.addEventListener('click', (event) => {
  const thumb = event.target.closest('[data-gallery]');
  if (!thumb) return;
  const gallery = thumb.closest('.detail-gallery');
  const imgs = gallery ? [...gallery.querySelectorAll('.gallery-thumb-img')] : [];
  const main = gallery ? gallery.querySelector('.gallery-main-img') : null;
  const index = Number(thumb.dataset.gallery);
  if (main && imgs[index]) {
    main.src = imgs[index].src;
    gallery.querySelectorAll('.gallery-thumb').forEach((item, i) => item.classList.toggle('active', i === index));
  }
});

document.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.classList.contains('listing-photo')) { target.style.display = 'none'; return; }
  if (target.classList.contains('gallery-thumb-img')) { const thumb = target.closest('.gallery-thumb'); if (thumb) thumb.style.display = 'none'; return; }
  if (target.classList.contains('gallery-main-img')) { const main = target.closest('.gallery-main'); if (main) main.innerHTML = '<div class="detail-photo">PARÇA AVCISI</div>'; }
}, true);

onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') openResetPassword();
  renderAuthUI(session?.user || null);
});
getCurrentUser().then((user) => renderAuthUI(user)).catch(() => renderAuthUI(null));
