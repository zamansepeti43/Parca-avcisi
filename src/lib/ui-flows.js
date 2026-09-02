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
let selection = { type: '', make: '', model: '', generation: '', year: '', engine: '', trim: '' };
let pendingAction = null;
let emailVerificationRequired = false;
const isEmailVerified = (user) => Boolean(user && user.email_confirmed_at);
let selectedPhotos = [];
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const isPhotoFile = (file) => file instanceof File && file.size > 0 && (ACCEPTED_PHOTO_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name));
const photoUrl = (file) => URL.createObjectURL(file);

const vehicleSection = document.querySelector('#aracini-sec');
vehicleSection.innerHTML = '<div class="container vehicle-card vehicle-picker"><div><span class="eyebrow">AKILLI ARAÇ SEÇİCİ</span><h2>Aracını seç, uyumlu parçayı bul.</h2><p>Araç tipiyle başla; katalog kapsamı olan alanlar sırayla açılır.</p></div><form class="vehicle-form vehicle-hierarchy" id="vehicleHierarchy"></form></div>';

const fields = [
  ['type', 'Araç Tipi'],
  ['make', 'Marka'],
  ['model', 'Model'],
  ['generation', 'Nesil/Kasa'],
  ['year', 'Yıl'],
  ['trim', 'Versiyon / Trim'],
  ['engine', 'Motor'],
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
  if (!user) { pendingAction = action; openAuth(); return; }
  if (emailVerificationRequired && !isEmailVerified(user)) {
    pendingAction = null;
    openVerifyEmailRequired();
    return;
  }
  await action();
}

function openAuth() {
  if (!supabaseConfigured) {
    openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Üyelik yakında açılacak</h2><p>Üyelik sistemi için Supabase bağlantısı henüz yapılandırılmadı. <code>VITE_SUPABASE_URL</code> ve <code>VITE_SUPABASE_ANON_KEY</code> ortam değişkenlerini ayarlayın.</p>');
    pendingAction = null;
    return;
  }
  window.location.href = '/giris';
}
function openLoginForm() { window.location.href = '/giris'; }
function openSignupForm() { window.location.href = '/kayit'; }
function openForgotPassword() { window.location.href = '/giris#sifremi-unuttum'; }
function openResetPassword() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>Yeni şifre belirle</h2><p>Yeni şifreni gir ve kaydet.</p><form id="resetPasswordForm" class="stack-form"><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Yeni şifre (en az 6 karakter)"><input name="confirm" type="password" required minlength="6" autocomplete="new-password" placeholder="Yeni şifre (tekrar)"><button>Şifreyi Güncelle</button></form>');
}
function openEmailVerify() {
  window.location.href = '/giris';
}
function openVerifyEmailRequired() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>E-posta doğrulaması gerekli</h2><p>Bu işlemi kullanmak için hesabının e-posta adresini doğrulaman gerekiyor. E-postandaki doğrulama bağlantısına tıkladıktan sonra tekrar dene.</p><div class="auth-choices"><button data-close-modal>Tamam</button><button data-open-login class="secondary">Giriş Yap</button></div>');
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
      slot.innerHTML = '<button class="notif-bell" id="notifBell" type="button" aria-label="Bildirimler"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="notif-badge" id="notifBadge"></span></button><button class="auth-account" id="accountBtn" type="button" aria-label="Hesabım"><b>' + initial + '</b><span>' + escapeHtml(name.toLocaleUpperCase('tr-TR')) + '</span></button>';
    } else {
      slot.innerHTML = '<button class="outline-btn auth-btn" id="loginBtn" type="button">Giriş Yap</button><button class="outline-btn auth-btn gold" id="signupBtn" type="button">Kayıt Ol</button>';
    }
  }
  const accountLabel = document.querySelector('#accountLabel');
  if (accountLabel) {
    const name = user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Hesabım').split(' ')[0] : 'Hesabım';
    accountLabel.textContent = name.toLocaleUpperCase('tr-TR');
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
  grid.hidden = selectedPhotos.length === 0;
  const count = form.querySelector('[data-photo-count]');
  if (count) { count.textContent = selectedPhotos.length ? selectedPhotos.length + ' fotoğraf seçildi.' : ''; count.hidden = selectedPhotos.length === 0; }
}
function addPhotos(files, form) {
  const valid = [...files].filter(isPhotoFile);
  selectedPhotos = selectedPhotos.concat(valid).slice(0, 8);
  syncPhotoPreviews(form);
}
function openPhotoPicker(form) { form.querySelector('[data-photo-input]')?.click(); }

function openListingForm() { if (window.__openListingCreator) window.__openListingCreator(); else showToast('İlan ekranı yüklenemedi.'); }
function openSellChoice() { openModal('<span class="eyebrow">İLAN VER</span><h2>Ne yapmak istiyorsun?</h2><div class="auth-choices"><button data-choice-sell>İlan Ver</button><button data-choice-request class="secondary">Parça Talebi Oluştur</button></div>'); }

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

  if (event.target.closest('[data-open-login]')) { event.preventDefault(); openLoginForm(); return; }
  if (event.target.closest('[data-open-signup]')) { event.preventDefault(); openSignupForm(); return; }
  if (event.target.closest('[data-open-forgot]')) { event.preventDefault(); openForgotPassword(); return; }
  if (event.target.closest('#loginBtn')) { event.preventDefault(); openLoginForm(); return; }
  if (event.target.closest('#signupBtn')) { event.preventDefault(); openSignupForm(); return; }
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
    } catch (error) {
      const message = error.message || 'Giriş yapılamadı.';
      if (/confirm/i.test(message)) {
        emailVerificationRequired = true;
        pendingAction = null;
        openEmailVerify();
      } else showToast(message);
    }
  }
  if (event.target.id === 'signupForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    if (data.get('password') !== data.get('confirm')) return showToast('Şifreler eşleşmiyor.');
    try {
      const fullName = [data.get('firstName'), data.get('lastName')].filter(Boolean).join(' ').trim();
      const result = await signUp({ email: data.get('email'), password: data.get('password'), fullName, phone: data.get('phone'), address: data.get('address') });
      if (result?.session) { closeModal(); renderAuthUI(result.user); showToast('Kayıt tamamlandı.'); }
      else openEmailVerify();
    } catch (error) { showToast(error.message || 'Kayıt oluşturulamadı.'); }
  }
  if (event.target.id === 'forgotForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    try { await resetPassword(data.get('email')); showToast('Şifre yenileme bağlantısı gönderildi.'); }
    catch (error) { showToast(error.message || 'Bağlantı gönderilemedi.'); }
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
