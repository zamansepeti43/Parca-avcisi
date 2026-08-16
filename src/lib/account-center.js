import './account-center.css';
import { getCurrentUser, onAuthStateChange, updatePassword } from './auth.js';
import { getMyListings, updateListing, updateListingStatus, deleteListing, getListingById } from './listings.js';
import { attachImagesToListing, deleteListingImage, setListingCover, reorderListingImages } from './listing-images.js';
import { PART_CATEGORY_LIST, subcategoriesFor } from './part-categories.js';
import { getMyFavorites, toggleFavorite } from './favorites.js';
import { getMyMessages, sendMessage, markConversationRead } from './messages.js';
import { getNotifications, getUnreadNotificationsCount, markNotificationsRead, markAllNotificationsRead } from './notifications.js';
import { getSavedSearches, createSavedSearch, updateSavedSearch, deleteSavedSearch } from './saved-searches.js';
import { getMyProfile, getProfilesByIds, updateProfile } from './profile.js';
import { getMyPartRequests, getMyRespondedRequests, getPartRequestById, setPartRequestStatus, REQUEST_STATUS_LABELS } from './part-requests.js';
import { supabase, supabaseConfigured } from './supabase.js';

const modal = document.querySelector('#appModal');
const content = document.querySelector('#modalContent');

let currentPane = 'profilim';
let currentTab = 'all';
let requestTab = 'all';
let me = '';
let conversations = [];
let profilesCache = [];
let editPhotoItems = [];
let editOriginalIds = [];
let editListingId = null;
let activeThreadKey = null;
let messagesChannel = null;

const esc = (v) => String(v || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const money = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0) + ' TL';
const statusLabel = (s) => ({ draft: 'Taslak', active: 'Yayında', sold: 'Satıldı', paused: 'Pasif', removed: 'Kaldırıldı' })[s] || s;
const conditionLabels = { new: 'Sıfır', used: '2. El', salvage: 'Çıkma' };

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function timeLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function profileName(id) {
  const profile = profilesCache.find((p) => p.id === id);
  return profile?.full_name || 'Satıcı';
}

const menuItems = [
  ['profilim', 'Profilim'],
  ['ilanlarim', 'İlanlarım'],
  ['taleplerim', 'Taleplerim'],
  ['mesajlarim', 'Mesajlarım'],
  ['favorilerim', 'Favorilerim'],
  ['kayitli-aramalar', 'Kayıtlı Aramalarım'],
  ['bildirimler', 'Bildirimler'],
  ['musterilerim', 'Müşterilerim'],
  ['hesap-bilgileri', 'Hesap Bilgileri'],
  ['ayarlar', 'Ayarlar'],
  ['yardim', 'Yardım & Destek'],
];

function menuHtml(active) {
  return menuItems.map(([key, label]) => '<button class="' + (active === key ? 'active' : '') + '" data-pane="' + key + '">' + label + '</button>').join('') +
    '<button class="danger" data-account-signout style="margin-top:6px">Çıkış Yap</button>';
}

function shell(active, bodyHtml) {
  return '<div class="account-shell"><aside class="account-menu">' + menuHtml(active) + '</aside><section class="account-pane">' + bodyHtml + '</section></div>';
}

function render(html) { content.innerHTML = html; }

function showError(message) {
  render(shell(currentPane, '<div class="pane-empty"><strong>Bir hata oluştu</strong><span>' + esc(message || 'Tekrar dene.') + '</span></div>'));
}

function loadingHtml() { return '<div class="pane-loading">Yükleniyor…</div>'; }

async function openAccountCenter(pane) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    if (window.__openAuth) window.__openAuth();
    return;
  }
  currentPane = pane || 'profilim';
  me = user.id;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal-card').classList.add('account-wide');
  render(loadingHtml());
  const handlers = {
    profilim: renderProfil,
    ilanlarim: () => renderIlanlar(currentTab),
    taleplerim: () => renderTaleplerim(requestTab),
    mesajlarim: renderMesajlar,
    favorilerim: renderFavoriler,
    'kayitli-aramalar': renderKayitliAramalar,
    bildirimler: renderBildirimler,
    'musterilerim': renderMusterilerim,
    'hesap-bilgileri': renderHesapBilgileri,
    ayarlar: renderAyarlar,
    yardim: renderYardim,
  };
  try {
    await (handlers[currentPane] || renderProfil)();
  } catch (error) {
    showError(error.message);
  }
}
window.__openAccountCenter = openAccountCenter;

// ---- Profilim ----
async function renderProfil() {
  const profile = await getMyProfile();
  const user = await getCurrentUser().catch(() => null);
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const initial = esc(name.charAt(0).toLocaleUpperCase('tr-TR') || 'P');
  const avatar = profile?.avatar_url
    ? '<img src="' + esc(profile.avatar_url) + '" alt="">'
    : initial;
  render(shell('profilim',
    '<div class="profile-hero"><span class="profile-avatar">' + avatar + '</span><div><strong style="font-size:17px">' + esc(name || 'Profil') + '</strong><small style="display:block;color:#6e747c">' + esc(user?.email || '') + '</small></div></div>' +
    '<h3 style="margin:0 0 4px">Profilini düzenle</h3>' +
    '<form id="profileForm" class="pane-form">' +
    '<label>Ad soyad<input name="fullName" required value="' + esc(name) + '"></label>' +
    '<label>Telefon<input name="phone" value="' + esc(profile?.phone || '') + '" placeholder="05xx xxx xx xx"></label>' +
    '<label>Şehir<input name="city" value="' + esc(profile?.city || '') + '" placeholder="Örn. İstanbul"></label>' +
    '<label>Adres<textarea name="address" placeholder="Parça teslimatı için adres">' + esc(profile?.address || '') + '</textarea></label>' +
    '<label>Avatar (görsel bağlantısı)<input name="avatarUrl" value="' + esc(profile?.avatar_url || '') + '" placeholder="https://..."></label>' +
    '<button>Kaydet</button></form>'));
}

// ---- İlanlarım ----
function statusActionsHtml(item) {
  const parts = [];
  if (item.status === 'draft' || item.status === 'paused') parts.push('<button class="primary" data-listing-status="active" data-id="' + esc(item.id) + '">Yayınla</button>');
  if (item.status === 'active') {
    parts.push('<button data-listing-status="paused" data-id="' + esc(item.id) + '">Durdur</button>');
    parts.push('<button data-listing-status="sold" data-id="' + esc(item.id) + '">Satıldı</button>');
  }
  if (item.status === 'sold') parts.push('<button class="primary" data-listing-status="active" data-id="' + esc(item.id) + '">Yeniden Yayınla</button>');
  parts.push('<button data-detail="' + esc(item.id) + '">İncele</button>');
  parts.push('<button data-edit-listing="' + esc(item.id) + '">Düzenle</button>');
  parts.push('<button class="danger" data-delete-listing="' + esc(item.id) + '">Sil</button>');
  return parts.join('');
}

async function renderIlanlar(tab) {
  currentTab = tab || currentTab;
  const items = (await getMyListings()) || [];
  const filtered = currentTab === 'all' ? items : items.filter((item) => item.status === currentTab);
  const tabsHtml = [['all', 'Tümü'], ['draft', 'Taslak'], ['active', 'Yayında'], ['sold', 'Satıldı'], ['paused', 'Pasif'], ['removed', 'Kaldırıldı']]
    .map(([key, label]) => '<button class="' + (currentTab === key ? 'active' : '') + '" data-listing-tab="' + key + '">' + label + '</button>').join('');
  const listHtml = filtered.length ? '<div class="pane-list">' + filtered.map((item) =>
    '<div class="pane-row"><div class="grow"><strong>' + esc(item.title) + '</strong><small>' + esc(item.category) + ' · ⌖ ' + esc(item.city) + ' · ' + money(item.price) + '</small></div>' +
    '<span class="status-badge ' + esc(item.status) + '" style="margin:0">' + esc(statusLabel(item.status)) + '</span>' +
    '<div class="pane-actions">' + statusActionsHtml(item) + '</div></div>'
  ).join('') + '</div>' : '<div class="pane-empty"><strong>Bu bölümde ilan yok</strong><span>Yeni ilan vererek başla.</span></div>';
  render(shell('ilanlarim',
    '<div class="account-pane-head"><h2>İlanlarım</h2><button class="pane-btn primary" data-open-sell>+ Yeni İlan Ver</button></div>' +
    '<div class="pane-tabs">' + tabsHtml + '</div>' + listHtml));
}

function editPhotoThumbsHtml() {
  if (!editPhotoItems.length) return '<div class="edit-photos-empty">Henüz fotoğraf yok. Yukarıdan “Fotoğraf Ekle” ile ekleyebilirsin.</div>';
  return '<div class="edit-photos-grid">' + editPhotoItems.map((item, index) => {
    const isFirst = index === 0;
    const isLast = index === editPhotoItems.length - 1;
    const src = item.file ? URL.createObjectURL(item.file) : (item.url || '');
    return '<div class="photo-thumb' + (isFirst ? ' is-cover' : '') + '" data-edit-photo-index="' + index + '">'
      + '<img src="' + esc(src) + '" alt="">'
      + (isFirst ? '<span class="photo-cover-badge">Kapak</span>' : '')
      + '<div class="photo-thumb-actions">'
      + '<button type="button" data-edit-photo-move data-dir="-1"' + (isFirst ? ' disabled' : '') + ' aria-label="Sola taşı">‹</button>'
      + '<button type="button" data-edit-photo-move data-dir="1"' + (isLast ? ' disabled' : '') + ' aria-label="Sağa taşı">›</button>'
      + (!isFirst ? '<button type="button" data-edit-photo-cover title="Kapak yap">★</button>' : '')
      + '<button type="button" data-edit-photo-remove aria-label="Fotoğrafı kaldır">×</button>'
      + '</div></div>';
  }).join('') + '</div>';
}
function renderEditPhotos(form) {
  const grid = form.querySelector('[data-edit-photos]');
  if (grid) grid.innerHTML = editPhotoThumbsHtml();
}
function editPhotoPickerHtml() {
  return '<div class="photo-picker"><div class="photo-picker-head"><span class="eyebrow">FOTOĞRAFLAR</span><small>İlk fotoğraf kapak olur · Taşımak için oklar, kapak yapmak için ★, silmek için × · JPG, JPEG, PNG, WEBP</small></div>'
    + '<div class="photo-dropzone" data-edit-photo-add role="button" tabindex="0"><span class="photo-dropzone-icon">＋</span><b>Fotoğraf Ekle</b><small>Birden fazla yeni fotoğraf seçebilirsin</small></div>'
    + '<div class="edit-photos-slot" data-edit-photos>' + editPhotoThumbsHtml() + '</div>'
    + '<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-edit-photo-input>'
    + '</div>';
}
function wireEditPhotos(form) {
  const input = form.querySelector('[data-edit-photo-input]');
  if (!input) return;
  input.addEventListener('change', (event) => {
    const all = [...event.target.files];
    const valid = all.filter((file) => file instanceof File && file.size > 0 && (/\.(jpe?g|png|webp)$/i.test(file.name) || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)));
    if (valid.length !== all.length) showToast('Yalnızca JPG, JPEG, PNG ve WEBP fotoğraflar eklenebilir.');
    valid.forEach((file) => editPhotoItems.push({ id: null, url: '', isCover: false, file }));
    renderEditPhotos(form);
    input.value = '';
  });
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-edit-photo-add]')) { event.preventDefault(); input.click(); return; }
    const thumb = event.target.closest('[data-edit-photo-index]');
    if (!thumb) return;
    const index = Number(thumb.dataset.editPhotoIndex);
    const move = event.target.closest('[data-edit-photo-move]');
    if (move) {
      const target = index + Number(move.dataset.dir);
      if (target >= 0 && target < editPhotoItems.length) {
        const [item] = editPhotoItems.splice(index, 1);
        editPhotoItems.splice(target, 0, item);
      }
    }
    if (event.target.closest('[data-edit-photo-cover]') && index > 0) {
      const [item] = editPhotoItems.splice(index, 1);
      editPhotoItems.unshift(item);
    }
    if (event.target.closest('[data-edit-photo-remove]')) editPhotoItems.splice(index, 1);
    renderEditPhotos(form);
  });
  form.addEventListener('change', (event) => {
    if (!event.target.matches('[name="category"]')) return;
    const select = form.querySelector('[name="subCategory"]');
    if (!select) return;
    const subs = subcategoriesFor(event.target.value);
    select.disabled = !event.target.value;
    select.innerHTML = '<option value="">Alt kategori (opsiyonel)</option>' + subs.map((name) => '<option value="' + name + '">' + name + '</option>').join('');
  });
  renderEditPhotos(form);
}
async function syncEditPhotos(listingId) {
  const removedIds = (editOriginalIds || []).filter((id) => !editPhotoItems.some((item) => item.id === id));
  for (const id of removedIds) {
    try { await deleteListingImage(id); } catch (error) { showToast(error.message || 'Fotoğraf silinemedi.'); }
  }
  const newFiles = editPhotoItems.filter((item) => item.file).map((item) => item.file);
  let uploaded = [];
  if (newFiles.length) uploaded = await attachImagesToListing(listingId, newFiles);
  const orderIds = [];
  let uploadIndex = 0;
  for (const item of editPhotoItems) {
    if (item.id) orderIds.push(item.id);
    else if (uploaded[uploadIndex]) { orderIds.push(uploaded[uploadIndex].id); uploadIndex++; }
  }
  if (orderIds.length) {
    await reorderListingImages(listingId, orderIds);
    await setListingCover(listingId, orderIds[0]);
  }
  editPhotoItems = [];
  editOriginalIds = [];
  editListingId = null;
}
async function renderEditListing(id) {
  const listing = await getListingById(id);
  if (!listing) return showError('İlan bulunamadı.');
  editListingId = id;
  editOriginalIds = (listing.images || []).map((image) => image.id);
  editPhotoItems = (listing.images || []).map((image) => ({ id: image.id, url: image.url, isCover: image.isCover, file: null }));
  const conditionKey = ({ 'Sıfır': 'new', '2. El': 'used', 'Çıkma': 'salvage' })[listing.condition] || 'used';
  const conditionOptions = [['new', 'Sıfır'], ['used', '2. El'], ['salvage', 'Çıkma']]
    .map(([value, label]) => '<option value="' + value + '"' + (conditionKey === value ? ' selected' : '') + '>' + label + '</option>').join('');
  const cat = (listing.category && listing.category !== 'Oto Parça') ? listing.category : '';
  const sub = listing.subcategory || '';
  const categoryOptions = '<option value="">Kategori Seçiniz</option>' + PART_CATEGORY_LIST.map((name) => '<option value="' + name + '"' + (cat === name ? ' selected' : '') + '>' + name + '</option>').join('');
  const subOptions = subcategoriesFor(cat).map((name) => '<option value="' + name + '"' + (sub === name ? ' selected' : '') + '>' + name + '</option>').join('');
  render(shell('ilanlarim',
    '<div class="account-pane-head"><h2>İlanı düzenle</h2><button class="pane-btn" data-back-listings>← İlanlarıma dön</button></div>' +
    '<form id="editListingForm" class="pane-form" data-listing-id="' + esc(id) + '">' +
    '<label>Başlık<input name="title" required value="' + esc(listing.title) + '"></label>' +
    '<label>Durum<select name="condition">' + conditionOptions + '</select></label>' +
    '<label>Parça Kategorisi<select name="category">' + categoryOptions + '</select></label>' +
    '<label>Alt Kategori<select name="subCategory"' + (cat ? '' : ' disabled') + '><option value="">Alt kategori (opsiyonel)</option>' + subOptions + '</select></label>' +
    '<label>Araç bilgisi<input name="vehicle" value="' + esc(listing.vehicle) + '" readonly title="Araç bilgisi ilan verirken seçilir"></label>' +
    '<div class="field-row"><label>Fiyat (TL)<input name="price" type="number" min="0" required value="' + esc(listing.price) + '"></label><label>Şehir<input name="city" value="' + esc(listing.city) + '"></label></div>' +
    '<label>OEM / parça no<input name="oemNumber" value="' + esc(listing.oemNumber || '') + '"></label>' +
    '<label>Açıklama<textarea name="description">' + esc(listing.description || '') + '</textarea></label>' +
    editPhotoPickerHtml() +
    '<button>Kaydet</button></form>'));
  wireEditPhotos(document.querySelector('#editListingForm'));
}

// ---- Taleplerim ----
async function renderTaleplerim(tab) {
  requestTab = tab || requestTab;
  const requests = (await getMyPartRequests()) || [];
  const filtered = requestTab === 'all' ? requests : requests.filter((r) => r.status === requestTab);
  const tabsHtml = [['all', 'Tümü'], ['active', 'Aktif'], ['answered', 'Cevap Geldi'], ['closed', 'Kapalı']]
    .map(([key, label]) => '<button class="' + (requestTab === key ? 'active' : '') + '" data-request-tab="' + key + '">' + label + '</button>').join('');
  const rows = filtered.length ? '<div class="pane-list">' + filtered.map((r) => {
    const statusActions = r.status === 'closed'
      ? '<button class="primary" data-reactivate-my-request="' + esc(r.id) + '">Tekrar Aktif Et</button>'
      : '<button data-close-my-request="' + esc(r.id) + '">Talebi Kapat</button>';
    return '<div class="pane-row request-row"><div class="grow"><strong>' + esc(r.partName) + '</strong><small>' + esc(r.vehicleLabel) + ' · ⌖ ' + esc(r.city) + ' · ' + timeLabel(r.createdAt) + '</small></div>' +
      '<span class="status-badge ' + esc(r.status) + '">' + esc(REQUEST_STATUS_LABELS[r.status] || r.status) + '</span>' +
      '<div class="pane-actions"><button data-open-request-detail="' + esc(r.id) + '">İncele</button><button data-edit-my-request="' + esc(r.id) + '">Düzenle</button>' + statusActions + '</div></div>';
  }).join('') + '</div>' : '<div class="pane-empty"><strong>Henüz talep oluşturmadın</strong><span>Bulamadığın parça için "Parça Talebi Oluştur" ile talep ekleyebilirsin.</span></div>';
  render(shell('taleplerim',
    '<div class="account-pane-head"><h2>Taleplerim</h2><button class="pane-btn primary" data-open-request>+ Yeni Talep</button></div>' +
    '<div class="pane-tabs">' + tabsHtml + '</div>' + rows));
}

// ---- Müşterilerim ("Bende Var" dediğim taleplerin sahipleri) ----
async function renderMusterilerim() {
  const requests = (await getMyRespondedRequests()) || [];
  const rows = requests.length ? '<div class="pane-list">' + requests.map((r) => {
    const customer = r.owner || null;
    const customerName = customer?.full_name || 'Müşteri';
    const respondAt = r.responses.find((resp) => resp.sellerId === me)?.createdAt || '';
    return '<div class="pane-row request-row"><div class="grow"><strong>' + esc(customerName) + '</strong><small>' + esc(r.partName) + ' · ' + esc(r.vehicleLabel) + ' · ⌖ ' + esc(r.city || 'Türkiye') + (respondAt ? ' · Bende Var: ' + timeLabel(respondAt) : '') + '</small></div>' +
      '<span class="status-badge ' + esc(r.status) + '">' + esc(REQUEST_STATUS_LABELS[r.status] || r.status) + '</span>' +
      '<div class="pane-actions"><button data-request-thread="' + esc(r.id) + '::' + esc(r.userId) + '">Mesaj Aç</button><button data-open-request-detail="' + esc(r.id) + '">Talebi Gör</button></div></div>';
  }).join('') + '</div>' : '<div class="pane-empty"><strong>Henüz müşterin yok</strong><span>Bir talebe "Bende Var" dediğinde o alıcı müşterin olarak burada görünür.</span></div>';
  render(shell('musterilerim',
    '<div class="account-pane-head"><h2>Müşterilerim</h2></div>' +
    '<p class="pane-hint">"Bende Var" dediğin taleplerin sahipleri burada listelenir. Mesaj Aç ile görüşmeye devam edebilirsin.</p>' + rows));
}

// ---- Mesajlarım ----
function buildConversations(messages, meId) {
  const map = new Map();
  for (const m of messages) {
    const other = m.sender_id === meId ? m.receiver_id : m.sender_id;
    const key = m.request_id ? (other + '::r' + m.request_id) : (other + '::' + m.listing_id);
    if (!map.has(key)) map.set(key, { key, other, listing: m.listing, request: m.request, messages: [], unread: 0 });
    const conv = map.get(key);
    conv.messages.push(m);
    if (m.sender_id !== meId && !m.read_at) conv.unread++;
  }
  const list = [...map.values()];
  list.forEach((c) => c.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  list.sort((a, b) => new Date(b.messages[0].created_at) - new Date(a.messages[0].created_at));
  return list;
}

function conversationTitle(conv) {
  if (conv.request) return (conv.request.part_name || 'Parça Talebi') + ' · Talep';
  return conv.listing?.title || 'İlan';
}

function conversationsHtml() {
  if (!conversations.length) {
    return '<div class="pane-empty"><strong>Henüz mesajın yok</strong><span>Bir ilan detayından satıcıyla iletişim başlattığında konuşmaların burada görünür.</span></div>';
  }
  return '<div class="pane-list">' + conversations.map((c) => {
    const last = c.messages[0];
    const requestBtn = c.request ? '<button class="pane-btn" data-open-request-detail="' + esc(c.request.id) + '">Talebi gör</button>' : '';
    return '<div class="pane-row conv-row" data-open-conversation="' + esc(c.key) + '" role="button" tabindex="0"><div class="grow"><strong>' + esc(profileName(c.other)) + ' · ' + esc(conversationTitle(c)) + '</strong><small>' + esc(last?.body || '') + ' · ' + timeLabel(last?.created_at) + '</small></div>' + requestBtn + (c.unread ? '<span class="conv-unread">' + c.unread + '</span>' : '') + '</div>';
  }).join('') + '</div>';
}

async function renderMesajlar() {
  activeThreadKey = null;
  const messages = (await getMyMessages()) || [];
  const otherIds = [...new Set(messages.map((m) => (m.sender_id === me ? m.receiver_id : m.sender_id)))];
  profilesCache = await getProfilesByIds(otherIds);
  conversations = buildConversations(messages, me);
  render(shell('mesajlarim', '<div class="account-pane-head"><h2>Mesajlarım</h2></div>' + conversationsHtml()));
}

async function refreshMessagesPane() {
  try {
    const messages = (await getMyMessages()) || [];
    const otherIds = [...new Set(messages.map((m) => (m.sender_id === me ? m.receiver_id : m.sender_id)))];
    profilesCache = await getProfilesByIds(otherIds);
    conversations = buildConversations(messages, me);
    if (activeThreadKey) renderThread(activeThreadKey);
    else renderMesajlar();
  } catch { /* pano yenilenemedi; mevcut görünüm korunur */ }
}

function subscribeMessagesRealtime() {
  if (!supabaseConfigured || !supabase || messagesChannel) return;
  try {
    messagesChannel = supabase
      .channel('account-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (currentPane === 'mesajlarim' && modal.classList.contains('show')) refreshMessagesPane().catch(() => {});
      })
      .subscribe();
  } catch (error) {
    console.warn('Mesaj canlı takibi başlatılamadı', error);
  }
}

async function renderThread(key) {
  activeThreadKey = key;
  let conv = conversations.find((c) => c.key === key);
  if (!conv) {
    const [other, idPart] = key.split('::');
    const requestId = idPart && idPart.startsWith('r') ? idPart.slice(1) : null;
    if (!requestId) { activeThreadKey = null; return renderMesajlar(); }
    conv = { key, other, listing: null, request: { id: requestId }, messages: [], unread: 0 };
  }
  try {
    if (conv.request?.id) await markConversationRead({ requestId: conv.request.id, senderId: conv.other });
    else if (conv.listing?.id) await markConversationRead({ listingId: conv.listing.id, senderId: conv.other });
  } catch { /* okunma işaretleme isteğe bağlı */ }
  if (window.__refreshNotifBadge) window.__refreshNotifBadge();
  const messages = [...conv.messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const detailBtn = conv.request
    ? '<button class="pane-btn" data-open-request-detail="' + esc(conv.request.id) + '">Talebi gör</button>'
    : (conv.listing ? '<button class="pane-btn" data-detail="' + esc(conv.listing.id) + '">İlanı gör</button>' : '');
  render(shell('mesajlarim',
    '<div class="account-pane-head"><h2>Mesajlaşma</h2><button class="pane-btn" data-back-messages>← Konuşmalara dön</button></div>' +
    '<div class="pane-row conv-head"><div class="grow"><strong>' + esc(profileName(conv.other)) + '</strong><small>' + esc(conversationTitle(conv)) + (conv.listing ? ' · ' + money(conv.listing.price) : '') + '</small></div>' + detailBtn + '</div>' +
    '<div class="chat-thread">' + messages.map((m) => '<div class="chat-bubble ' + (m.sender_id === me ? 'sent' : 'received') + '">' + esc(m.body) + '<small>' + timeLabel(m.created_at) + '</small></div>').join('') + '</div>' +
    '<form id="chatForm" class="chat-form" data-conv="' + esc(key) + '"><input name="body" required placeholder="Mesajını yaz..." autocomplete="off"><button>Gönder</button></form>'));
}

async function openRequestThread(requestId, sellerId) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) { if (window.__openAuth) window.__openAuth(); return; }
  currentPane = 'mesajlarim';
  me = user.id;
  try {
    const messages = (await getMyMessages()) || [];
    const otherIds = [...new Set(messages.map((m) => (m.sender_id === me ? m.receiver_id : m.sender_id)))];
    profilesCache = await getProfilesByIds(otherIds);
    conversations = buildConversations(messages, me);
  } catch (error) {
    showToast(error.message || 'Mesajlar yüklenemedi.');
  }
  if (!modal.classList.contains('show')) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal-card').classList.add('account-wide');
  }
  await renderThread(sellerId + '::r' + requestId);
}
window.__openRequestThread = openRequestThread;

// ---- Favorilerim ----
async function renderFavoriler() {
  const favorites = (await getMyFavorites()) || [];
  const listHtml = favorites.length ? '<div class="pane-list">' + favorites.map((f) => {
    const l = f.listing;
    return '<div class="pane-row"><div class="grow"><strong>' + esc(l.title) + '</strong><small>' + esc(l.part?.category || 'Oto Parça') + ' · ' + esc(conditionLabels[l.condition] || l.condition) + ' · ⌖ ' + esc(l.city || 'Türkiye') + '</small></div>' +
      '<strong class="price">' + money(l.price) + '</strong>' +
      '<div class="pane-actions"><button data-detail="' + esc(l.id) + '">İncele</button><button class="danger" data-remove-fav="' + esc(l.id) + '">Kaldır</button></div></div>';
  }).join('') + '</div>' : '<div class="pane-empty"><strong>Henüz favorin yok</strong><span>İlanlardaki kalp simgesine dokunarak favorilere ekleyebilirsin.</span></div>';
  render(shell('favorilerim', '<div class="account-pane-head"><h2>Favorilerim</h2></div>' + listHtml));
}

// ---- Kayıtlı Aramalarım ----
function savedSearchLabel(s) {
  return [s.query, s.make, s.model, s.year, s.category, conditionLabels[s.condition] || s.condition].filter(Boolean).join(' · ') || 'Arama';
}

async function renderKayitliAramalar() {
  const searches = (await getSavedSearches()) || [];
  const listHtml = searches.length ? '<div class="pane-list">' + searches.map((s) =>
    '<div class="pane-row"><div class="grow"><strong>' + esc(savedSearchLabel(s)) + '</strong><small>' + (s.notify ? 'Bildirimler açık' : 'Bildirimler kapalı') + '</small></div>' +
    '<div class="pane-actions"><button data-toggle-search-notify="' + esc(s.id) + '">' + (s.notify ? 'Bildirim Kapat' : 'Bildirim Aç') + '</button>' +
    '<button data-edit-search="' + esc(s.id) + '">Düzenle</button>' +
    '<button class="danger" data-delete-search="' + esc(s.id) + '">Sil</button></div></div>'
  ).join('') + '</div>' : '<div class="pane-empty"><strong>Henüz kayıtlı araman yok</strong><span>Kaydettiğin aramalarla yeni ilanlardan haber alırsın.</span></div>';
  render(shell('kayitli-aramalar',
    '<div class="account-pane-head"><h2>Kayıtlı Aramalarım</h2><button class="pane-btn primary" data-new-search>+ Yeni Kayıt</button></div>' + listHtml));
}

async function renderSearchForm(id) {
  let existing = null;
  if (id) {
    const searches = await getSavedSearches();
    existing = searches.find((s) => s.id === id) || null;
  }
  const conditionOptions = '<option value="">Fark etmez</option>' + [['new', 'Sıfır'], ['used', '2. El'], ['salvage', 'Çıkma']]
    .map(([value, label]) => '<option value="' + value + '"' + (existing?.condition === value ? ' selected' : '') + '>' + label + '</option>').join('');
  render(shell('kayitli-aramalar',
    '<div class="account-pane-head"><h2>' + (id ? 'Kayıtlı Aramayı Düzenle' : 'Yeni Kayıtlı Arama') + '</h2><button class="pane-btn" data-back-searches>← Kayıtlı aramalarım</button></div>' +
    '<form id="accountSearchForm" class="pane-form" data-search-id="' + (id ? esc(id) : '') + '">' +
    '<label>Arama metni<input name="query" value="' + esc(existing?.query || '') + '" placeholder="Örn. Golf 7 far"></label>' +
    '<div class="field-row"><label>Marka<input name="make" value="' + esc(existing?.make || '') + '" placeholder="Volkswagen"></label><label>Model<input name="model" value="' + esc(existing?.model || '') + '" placeholder="Golf 7"></label></div>' +
    '<div class="field-row"><label>Yıl<input name="year" type="number" min="1990" max="2030" value="' + esc(existing?.year || '') + '" placeholder="2015"></label><label>Kategori<input name="category" value="' + esc(existing?.category || '') + '" placeholder="Aydınlatma"></label></div>' +
    '<label>Durum<select name="condition">' + conditionOptions + '</select></label>' +
    '<label class="toggle-row" style="border:0;padding:4px 0"><span><strong>Bildirim al</strong><small>Uygun yeni ilan çıktığında bildirim gönder.</small></span><span class="switch"><input type="checkbox" name="notify" ' + (existing?.notify ? 'checked' : '') + '><i></i></span></label>' +
    '<button>' + (id ? 'Güncelle' : 'Kaydet') + '</button></form>'));
}

// ---- Bildirimler ----
async function renderBildirimler() {
  const notifications = (await getNotifications()) || [];
  const listHtml = notifications.length ? '<div class="pane-list">' + notifications.map((n) => {
    const listingBtn = n.related_listing_id ? '<button class="pane-btn" data-detail="' + esc(n.related_listing_id) + '">İlanı gör</button>' : '';
    const requestBtn = n.related_request_id ? '<button class="pane-btn" data-open-request-detail="' + esc(n.related_request_id) + '">Talebi gör</button>' : '';
    return '<div class="pane-row notif-row ' + (n.read_at ? '' : 'unread') + '" data-notif="' + esc(n.id) + '"><div class="grow"><strong>' + esc(n.title) + '</strong><small>' + timeLabel(n.created_at) + '</small><div class="notif-body">' + esc(n.body || '') + '</div></div>' +
      '<div class="pane-actions">' + (n.body ? '<button data-notif-expand>' + (n.read_at ? 'İçeriği göster' : 'Aç') + '</button>' : '') + listingBtn + requestBtn + '</div></div>';
  }).join('') + '</div>' : '<div class="pane-empty"><strong>Bildirimin yok</strong><span>Yeni mesaj, talep cevabı ve ilan durumu bildirimleri burada görünür.</span></div>';
  render(shell('bildirimler',
    '<div class="account-pane-head"><h2>Bildirimler</h2><button class="pane-btn" data-mark-all-read>Tümünü okundu işaretle</button></div>' + listHtml));
}

// ---- Hesap Bilgileri ----
async function renderHesapBilgileri() {
  const profile = await getMyProfile();
  const user = await getCurrentUser().catch(() => null);
  render(shell('hesap-bilgileri',
    '<div class="account-pane-head"><h2>Hesap Bilgileri</h2></div>' +
    '<div class="pane-form"><label>E-posta<input value="' + esc(user?.email || '') + '" disabled></label><label>Telefon<input value="' + esc(profile?.phone || '') + '" disabled></label><label>Adres<textarea disabled>' + esc(profile?.address || '') + '</textarea></label></div>' +
    '<h3 style="margin:22px 0 4px">Şifre değiştir</h3>' +
    '<form id="accountPasswordForm" class="pane-form"><label>Yeni şifre<input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="En az 6 karakter"></label><label>Yeni şifre (tekrar)<input name="confirm" type="password" required minlength="6" autocomplete="new-password" placeholder="En az 6 karakter"></label><button>Şifreyi Güncelle</button></form>'));
}

// ---- Ayarlar ----
async function renderAyarlar() {
  let profile = null;
  try { profile = await getMyProfile(); } catch { /* varsayılanlar kullanılır */ }
  const settings = { notify_messages: true, notify_listings: true, notify_favorites: true, ...(profile?.settings || {}) };
  const toggles = [
    ['notify_messages', 'Yeni mesaj bildirimleri', 'Size mesaj geldiğinde bildir.'],
    ['notify_listings', 'İlan durumu bildirimleri', 'İlanınız yayınlandığında veya durumu değiştiğinde bildir.'],
    ['notify_favorites', 'Favori bildirimleri', 'İlanınız favorilere eklendiğinde bildir.'],
  ];
  render(shell('ayarlar',
    '<div class="account-pane-head"><h2>Ayarlar</h2></div><p>Bildirim tercihlerini yönet.</p>' +
    '<div class="pane-list">' + toggles.map(([key, label, hint]) =>
      '<label class="toggle-row"><span><strong>' + label + '</strong><small>' + hint + '</small></span><span class="switch"><input type="checkbox" data-setting="' + key + '" ' + (settings[key] ? 'checked' : '') + '><i></i></span></label>'
    ).join('') + '</div>'));
}

// ---- Yardım & Destek ----
function renderYardim() {
  const faq = [
    ['Nasıl ilan veririm?', 'Sağ üstteki “+ İlan Ver” butonuna dokun. Fotoğraftan otomatik taslak veya manuel form ile ilanını hazırla; önizlemeden sonra yayınla.'],
    ['İlanımı nasıl düzenlerim?', 'Hesabım → İlanlarım bölümünden ilanının yanındaki Düzenle butonuyla içerik ve fiyatını güncelleyebilirsin.'],
    ['İlanımı nasıl yayınlar, durdurur veya kaldırırım?', 'İlanlarım bölümünde duruma göre Yayınla, Durdur, Satıldı veya Sil seçenekleri görünür.'],
    ['Satıcıyla nasıl iletişim kurarım?', 'İlan detayındaki “Satıcıyla iletişim başlat” butonuyla mesaj yazabilirsin. Konuşmaların Hesabım → Mesajlarım bölümünde listelenir.'],
    ['Favoriler ne işe yarar?', 'İlan kartlarındaki kalp simgesiyle ilanları favorilere ekleyebilirsin. Listene Hesabım → Favorilerim bölümünden ulaşırsın.'],
    ['Kayıtlı aramalar nasıl çalışır?', 'Hesabım → Kayıtlı Aramalarım bölümünden arama kriterlerini kaydedip bildirimleri açabilirsin; uygun yeni ilan çıktığında haberin olur.'],
  ];
  render(shell('yardim',
    '<div class="account-pane-head"><h2>Yardım & Destek</h2></div>' +
    faq.map(([q, a]) => '<details class="faq"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('') +
    '<h3 style="margin:22px 0 4px">Bize ulaşın</h3><p>Destek talepleriniz için: <a href="mailto:destek@parcaavcisi.com" style="color:#b07f00;font-weight:700">destek@parcaavcisi.com</a></p>'));
}

// ---- Event delegation ----
document.addEventListener('click', async (event) => {
  const paneBtn = event.target.closest('[data-pane]');
  if (paneBtn) { event.preventDefault(); openAccountCenter(paneBtn.dataset.pane); return; }

  if (event.target.closest('[data-open-request-detail]')) return;

  const requestTabBtn = event.target.closest('[data-request-tab]');
  if (requestTabBtn) { renderTaleplerim(requestTabBtn.dataset.requestTab); return; }

  const editMyRequest = event.target.closest('[data-edit-my-request]');
  if (editMyRequest) {
    try {
      const request = await getPartRequestById(editMyRequest.dataset.editMyRequest);
      if (request && window.__openRequestForm) window.__openRequestForm(null, request);
      else showToast('Talep bulunamadı.');
    } catch (error) { showToast(error.message || 'Talep yüklenemedi.'); }
    return;
  }

  const closeMyRequest = event.target.closest('[data-close-my-request]');
  if (closeMyRequest) {
    try {
      await setPartRequestStatus(closeMyRequest.dataset.closeMyRequest, 'closed');
      showToast('Talep kapatıldı. Artık satıcılara gösterilmiyor.');
    } catch (error) { showToast(error.message || 'Talep kapatılamadı.'); }
    renderTaleplerim(requestTab);
    window.dispatchEvent(new CustomEvent('parca:requests-updated'));
    return;
  }

  const reactivateMyRequest = event.target.closest('[data-reactivate-my-request]');
  if (reactivateMyRequest) {
    try {
      await setPartRequestStatus(reactivateMyRequest.dataset.reactivateMyRequest, 'active');
      showToast('Talep yeniden aktif edildi.');
    } catch (error) { showToast(error.message || 'Talep aktifleştirilemedi.'); }
    renderTaleplerim(requestTab);
    window.dispatchEvent(new CustomEvent('parca:requests-updated'));
    return;
  }

  if (event.target.closest('[data-back-listings]')) { renderIlanlar(currentTab); return; }
  if (event.target.closest('[data-back-searches]')) { renderKayitliAramalar(); return; }
  if (event.target.closest('[data-back-messages]')) { renderMesajlar(); return; }

  const tab = event.target.closest('[data-listing-tab]');
  if (tab) { renderIlanlar(tab.dataset.listingTab); return; }

  const statusBtn = event.target.closest('[data-listing-status]');
  if (statusBtn) {
    try {
      await updateListingStatus(statusBtn.dataset.id, statusBtn.dataset.listingStatus);
      showToast('İlan durumu güncellendi.');
      window.dispatchEvent(new CustomEvent('parca:listings-updated'));
    } catch (error) { showToast(error.message || 'Güncellenemedi.'); }
    renderIlanlar(currentTab);
    return;
  }

  const editBtn = event.target.closest('[data-edit-listing]');
  if (editBtn) { renderEditListing(editBtn.dataset.editListing); return; }

  const deleteBtn = event.target.closest('[data-delete-listing]');
  if (deleteBtn) {
    if (!window.confirm('Bu ilanı silmek istediğine emin misin?')) return;
    try {
      await deleteListing(deleteBtn.dataset.deleteListing);
      showToast('İlan silindi.');
      window.dispatchEvent(new CustomEvent('parca:listings-updated'));
    } catch (error) { showToast(error.message || 'Silinemedi.'); }
    renderIlanlar(currentTab);
    return;
  }

  const favBtn = event.target.closest('[data-remove-fav]');
  if (favBtn) {
    try {
      await toggleFavorite(favBtn.dataset.removeFav);
      showToast('Favorilerden çıkarıldı.');
    } catch (error) { showToast(error.message || 'Kaldırılamadı.'); }
    renderFavoriler();
    return;
  }

  const convBtn = event.target.closest('[data-open-conversation]');
  if (convBtn) { renderThread(convBtn.dataset.openConversation); return; }

  const editSearch = event.target.closest('[data-edit-search]');
  if (editSearch) { renderSearchForm(editSearch.dataset.editSearch); return; }

  const deleteSearch = event.target.closest('[data-delete-search]');
  if (deleteSearch) {
    try {
      await deleteSavedSearch(deleteSearch.dataset.deleteSearch);
      showToast('Kayıtlı arama silindi.');
    } catch (error) { showToast(error.message || 'Silinemedi.'); }
    renderKayitliAramalar();
    return;
  }

  const toggleSearch = event.target.closest('[data-toggle-search-notify]');
  if (toggleSearch) {
    try {
      const searches = await getSavedSearches();
      const target = searches.find((s) => s.id === toggleSearch.dataset.toggleSearchNotify);
      if (target) {
        await updateSavedSearch(target.id, { notify: !target.notify });
        showToast('Bildirim tercihi güncellendi.');
      }
    } catch (error) { showToast(error.message || 'Güncellenemedi.'); }
    renderKayitliAramalar();
    return;
  }

  const newSearch = event.target.closest('[data-new-search]');
  if (newSearch) { renderSearchForm(null); return; }

  const markAll = event.target.closest('[data-mark-all-read]');
  if (markAll) {
    try { await markAllNotificationsRead(); } catch (error) { showToast(error.message || 'Güncellenemedi.'); }
    if (window.__refreshNotifBadge) window.__refreshNotifBadge();
    renderBildirimler();
    return;
  }

  const notif = event.target.closest('[data-notif]');
  if (notif) {
    markNotificationsRead([notif.dataset.notif]).catch(() => {});
    if (notif.classList.contains('unread')) {
      notif.classList.remove('unread');
      if (window.__refreshNotifBadge) window.__refreshNotifBadge();
    }
    const expand = event.target.closest('[data-notif-expand]');
    if (expand) {
      notif.classList.toggle('open');
      expand.textContent = notif.classList.contains('open') ? 'Gizle' : 'İçeriği göster';
    }
    return;
  }
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'profileForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      await updateProfile({ fullName: data.get('fullName'), phone: data.get('phone'), city: data.get('city'), address: data.get('address'), avatarUrl: data.get('avatarUrl') });
      showToast('Profil güncellendi.');
      renderProfil();
    } catch (error) { showToast(error.message || 'Güncellenemedi.'); }
  }
  if (event.target.id === 'editListingForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    const id = event.target.dataset.listingId;
    try {
      await updateListing(id, {
        title: data.get('title'), condition: data.get('condition'),
        category: data.get('category') || null, subcategory: data.get('subCategory') || null,
        vehicle: data.get('vehicle') || null,
        price: data.get('price'), city: data.get('city'),
        oemNumber: data.get('oemNumber'), description: data.get('description'),
      });
      let photoError = '';
      try { await syncEditPhotos(id); }
      catch (photoErrorObject) { photoError = photoErrorObject.message || 'Fotoğraflar güncellenemedi.'; }
      showToast(photoError ? 'İlan güncellendi. ' + photoError : 'İlan güncellendi.');
      window.dispatchEvent(new CustomEvent('parca:listings-updated'));
      renderIlanlar(currentTab);
    } catch (error) { showToast(error.message || 'Güncellenemedi.'); }
  }
  if (event.target.id === 'chatForm') {
    event.preventDefault();
    const input = event.target.elements.body;
    const body = input.value.trim();
    if (!body) return;
    const convKey = event.target.dataset.conv;
    let conv = conversations.find((c) => c.key === convKey);
    if (!conv) {
      const [other, idPart] = convKey.split('::');
      const requestId = idPart && idPart.startsWith('r') ? idPart.slice(1) : null;
      if (requestId) conv = { key: convKey, other, listing: null, request: { id: requestId }, messages: [], unread: 0 };
    }
    if (!conv) return;
    try {
      if (conv.request) await sendMessage({ requestId: conv.request.id, receiverId: conv.other, body });
      else if (conv.listing) await sendMessage({ listingId: conv.listing.id, receiverId: conv.other, body });
      await renderMesajlar();
      renderThread(convKey);
    } catch (error) { showToast(error.message || 'Mesaj gönderilemedi.'); }
  }
  if (event.target.id === 'accountSearchForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    const fields = {
      query: data.get('query') || null,
      make: data.get('make') || null,
      model: data.get('model') || null,
      year: data.get('year') ? Number(data.get('year')) : null,
      category: data.get('category') || null,
      condition: data.get('condition') || null,
      notify: data.get('notify') === 'on',
    };
    try {
      if (event.target.dataset.searchId) await updateSavedSearch(event.target.dataset.searchId, fields);
      else await createSavedSearch(fields);
      showToast('Kayıtlı arama kaydedildi.');
      renderKayitliAramalar();
    } catch (error) { showToast(error.message || 'Kaydedilemedi.'); }
  }
  if (event.target.id === 'accountPasswordForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    const password = data.get('password');
    if (!password || password !== data.get('confirm')) return showToast('Şifreler eşleşmiyor.');
    try {
      await updatePassword(password);
      showToast('Şifren güncellendi.');
      event.target.reset();
    } catch (error) { showToast(error.message || 'Şifre güncellenemedi.'); }
  }
});

// ---- Notification badge ----
async function refreshBadge() {
  const badge = document.querySelector('#notifBadge');
  if (!badge) return;
  const user = await getCurrentUser().catch(() => null);
  if (!user) { badge.style.display = 'none'; return; }
  try {
    const count = await getUnreadNotificationsCount();
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = count > 0 ? 'grid' : 'none';
  } catch { badge.style.display = 'none'; }
}
window.__refreshNotifBadge = refreshBadge;

setInterval(refreshBadge, 30000);
onAuthStateChange(() => { refreshBadge(); });
refreshBadge();

window.addEventListener('parca:requests-updated', () => {
  if (currentPane === 'taleplerim') renderTaleplerim(requestTab).catch(() => {});
  else if (currentPane === 'musterilerim') renderMusterilerim().catch(() => {});
});

subscribeMessagesRealtime();
