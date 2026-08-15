import './part-requests.css';
import { getCurrentUser } from './auth.js';
import { PART_CATEGORY_LIST } from './part-categories.js';
import { getMainCategories, getSubcategories } from './part-catalog.js';
import { vehicleTypes, getMakes, getModels } from './vehicle-catalog.js';
import { DELIVERY_OPTIONS, deliveryLabel } from './delivery.js';
import {
  createPartRequest,
  updatePartRequest,
  setPartRequestStatus,
  getPartRequestById,
  respondToRequest,
  attachRequestImages,
  deleteRequestImage,
  REQUEST_CONDITION_LABELS,
  REQUEST_STATUS_LABELS,
} from './part-requests.js';
import { supabaseConfigured } from './supabase.js';

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const modal = document.querySelector('#appModal');
const content = document.querySelector('#modalContent');
const main = document.querySelector('#top') || document.querySelector('main');

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const isPhotoFile = (file) => file instanceof File && file.size > 0 && (ACCEPTED_PHOTO_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name));

function showToast(message) {
  if (window.__showToast) return window.__showToast(message);
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function openModal(html, wide) {
  content.innerHTML = html;
  const card = modal.querySelector('.modal-card');
  card.classList.toggle('account-wide', Boolean(wide));
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  if (window.__closeModal) return window.__closeModal();
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

function timeLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- Search -> request prefill (Faz 4) ----
export function prefillFromSearch(query) {
  const out = { make: '', model: '', year: '', version: '', category: '', partName: '', condition: '', vehicleType: '' };
  const tokens = String(query || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) return out;
  const rest = [];
  for (const token of tokens) {
    if (/^(19|20)\d{2}$/.test(token)) { out.year = token; continue; }
    rest.push(token);
  }
  const lower = rest.map((token) => token.toLocaleLowerCase('tr-TR'));
  const type = vehicleTypes.find((name) => lower.includes(name.toLocaleLowerCase('tr-TR'))) || '';
  if (type) out.vehicleType = type;
  const makes = getMakes();
  out.make = makes.find((make) => lower.includes(make.toLocaleLowerCase('tr-TR'))) || '';
  const allModels = out.make ? getModels(out.make) : [];
  if (out.make) {
    const modelFound = allModels.find((model) => lower.includes(model.toLocaleLowerCase('tr-TR')));
    if (modelFound) out.model = modelFound;
  }
  if (!out.model) {
    const known = new Set();
    makes.forEach((make) => getModels(make).forEach((model) => known.add(model)));
    const modelFound = [...known].find((model) => lower.includes(model.toLocaleLowerCase('tr-TR')));
    if (modelFound) out.model = modelFound;
  }
  out.category = PART_CATEGORY_LIST.find((category) => lower.includes(category.toLocaleLowerCase('tr-TR'))) || '';
  const skip = new Set([out.make.toLocaleLowerCase('tr-TR'), out.model.toLocaleLowerCase('tr-TR'), out.category.toLocaleLowerCase('tr-TR')]);
  const part = rest.filter((token) => !skip.has(token.toLocaleLowerCase('tr-TR'))).join(' ');
  if (part) out.partName = part;
  if (!out.partName) out.partName = tokens.join(' ');
  return out;
}

// ---- Request form (modal) ----
let requestFormPhotos = [];
let requestFormOriginalIds = [];
let requestFormEditId = null;

function requestVehicleFieldsHtml(prefill, existing) {
  const type = (prefill && prefill.vehicleType) || (existing && existing.vehicleType) || '';
  const make = (prefill && prefill.make) || (existing && existing.vehicleMake) || '';
  const model = (prefill && prefill.model) || (existing && existing.vehicleModel) || '';
  const year = (prefill && prefill.year) || (existing && existing.vehicleYear) || '';
  const version = (prefill && prefill.version) || (existing && existing.vehicleVersion) || '';
  const typeOptions = '<option value="">Araç Tipi Seçiniz</option>' + vehicleTypes.map((name) => '<option value="' + esc(name) + '"' + (type === name ? ' selected' : '') + '>' + name + '</option>').join('');
  const makeOptions = getMakes().map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('');
  const modelOptions = (make ? getModels(make) : []).map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('');
  return '<label>Araç Tipi<select name="vehicleType">' + typeOptions + '</select></label>'
    + '<label>Araç Markası<input name="vehicleMake" list="prMakes" value="' + esc(make) + '" required placeholder="Örn. Ford"><datalist id="prMakes">' + makeOptions + '</datalist></label>'
    + '<label>Araç Modeli<input name="vehicleModel" list="prModels" value="' + esc(model) + '" placeholder="Örn. Escort"><datalist id="prModels">' + modelOptions + '</datalist></label>'
    + '<div class="field-row"><label>Yıl<input name="vehicleYear" inputmode="numeric" value="' + esc(year) + '" placeholder="Örn. 1997"></label>'
    + '<label>Versiyon / Motor<input name="vehicleVersion" value="' + esc(version) + '" placeholder="Örn. 1.8 D"></label></div>';
}

function requestFormHtml(prefill, existing) {
  const pre = prefill || {};
  const ex = existing || {};
  const type = pre.vehicleType || ex.vehicleType || '';
  const category = pre.category || ex.partCategory || '';
  const subcategory = ex.partSubcategory || '';
  const categories = getMainCategories(type);
  const categoryOptions = '<option value="">Parça Kategorisi Seçiniz</option>' + categories.map((name) => '<option value="' + name + '"' + (category === name ? ' selected' : '') + '>' + name + '</option>').join('');
  const subcategoryOptions = '<option value="">Alt Kategori (opsiyonel)</option>' + getSubcategories(type, category).map((name) => '<option value="' + name + '"' + (subcategory === name ? ' selected' : '') + '>' + name + '</option>').join('');
  const conditionOptions = [['any', 'Farketmez'], ['new', 'Sıfır'], ['used', '2. El'], ['salvage', 'Çıkma']]
    .map(([value, label]) => '<option value="' + value + '"' + ((pre.condition || ex.condition || 'any') === value ? ' selected' : '') + '>' + label + '</option>').join('');
  const deliveryOptions = '<option value="">Teslimat tercihi (opsiyonel)</option>' + DELIVERY_OPTIONS
    .map((option) => '<option value="' + option.value + '"' + (ex.delivery === option.value ? ' selected' : '') + '>' + option.label + '</option>').join('');
  return '<span class="eyebrow">PARÇA ARIYORUM</span>'
    + '<h2>' + (existing ? 'Talebi düzenle' : 'Parça talebi oluştur') + '</h2>'
    + '<p>Bulamadığın parçayı talep et; uygun satıcılar sana ulaşsın. Talep sahibine senin bilgilerin yalnızca mesajlaşmada açılır.</p>'
    + '<form id="requestForm" class="stack-form">' + requestVehicleFieldsHtml(prefill, existing)
    + '<label>Parça Kategorisi<span class="category-search"><input type="text" data-request-category-search placeholder="Kategori ara (örn. aydınlatma)"></span><select name="partCategory" required>' + categoryOptions + '</select></label>'
    + '<label>Alt Kategori<select name="partSubcategory">' + subcategoryOptions + '</select></label>'
    + '<input name="partName" placeholder="Parça adı" required value="' + esc(pre.partName || ex.partName || '') + '">'
    + '<input name="oemNumber" placeholder="OEM / parça numarası (opsiyonel)" value="' + esc(ex.oemNumber || '') + '">'
    + '<textarea name="description" placeholder="Açıklama — aracın durumu, aranan özellikler...">' + esc(ex.description || '') + '</textarea>'
    + '<div class="field-row"><input name="city" placeholder="Şehir" required value="' + esc(ex.city || '') + '"><select name="condition">' + conditionOptions + '</select></div>'
    + '<label>Teslimat<select name="delivery">' + deliveryOptions + '</select></label>'
    + '<div class="photo-picker"><div class="photo-picker-head"><span class="eyebrow">FOTOĞRAF</span><small>Opsiyonel · JPG, JPEG, PNG, WEBP</small></div>'
    + '<div class="photo-dropzone" data-request-photo-add role="button" tabindex="0" aria-label="Fotoğraf ekle"><span class="photo-dropzone-icon">＋</span><b>Fotoğraf Ekle</b><small>İlk fotoğraf kapak olur</small></div>'
    + '<div class="photo-previews" data-request-photo-previews></div>'
    + '<input name="requestPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-request-photo-input></div>'
    + '<button>' + (existing ? 'Değişiklikleri Kaydet' : 'Talebi Oluştur') + '</button></form>';
}

function requestPhotoPreviewsHtml() {
  if (!requestFormPhotos.length) return '';
  return requestFormPhotos.map((item, index) => {
    const src = item.file ? URL.createObjectURL(item.file) : (item.url || '');
    return '<div class="photo-thumb' + (index === 0 ? ' is-cover' : '') + '" data-request-photo-index="' + index + '">'
      + '<img src="' + esc(src) + '" alt="">'
      + (index === 0 ? '<span class="photo-cover-badge">Kapak</span>' : '')
      + '<div class="photo-thumb-actions"><button type="button" data-request-photo-remove aria-label="Fotoğrafı kaldır">×</button></div></div>';
  }).join('');
}

function syncRequestPhotos(form) {
  const grid = form.querySelector('[data-request-photo-previews]');
  if (grid) grid.innerHTML = requestPhotoPreviewsHtml();
}

function wireRequestForm(form) {
  form.addEventListener('change', (event) => {
    if (event.target.matches('[data-request-photo-input]')) {
      const all = [...event.target.files];
      const valid = all.filter(isPhotoFile);
      if (valid.length !== all.length) showToast('Yalnızca JPG, JPEG, PNG ve WEBP fotoğraflar eklenebilir.');
      valid.forEach((file) => requestFormPhotos.push({ id: null, url: '', file }));
      syncRequestPhotos(form);
      event.target.value = '';
      return;
    }
    if (event.target.name === 'vehicleType') {
      const type = event.target.value;
      const categorySelect = form.querySelector('[name="partCategory"]');
      if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Parça Kategorisi Seçiniz</option>'
          + getMainCategories(type).map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('');
      }
      const subcategorySelect = form.querySelector('[name="partSubcategory"]');
      if (subcategorySelect) subcategorySelect.innerHTML = '<option value="">Alt Kategori (opsiyonel)</option>';
      return;
    }
    if (event.target.name === 'partCategory') {
      const type = form.querySelector('[name="vehicleType"]') ? form.querySelector('[name="vehicleType"]').value : '';
      const subcategorySelect = form.querySelector('[name="partSubcategory"]');
      if (subcategorySelect) {
        const category = event.target.value;
        subcategorySelect.innerHTML = '<option value="">Alt Kategori (opsiyonel)</option>'
          + getSubcategories(type, category).map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('');
      }
      return;
    }
  });
  form.addEventListener('input', (event) => {
    if (event.target.matches('[data-request-category-search]')) {
      const q = event.target.value.trim().toLocaleLowerCase('tr-TR');
      const select = form.querySelector('[name="partCategory"]');
      if (!select) return;
      for (const option of select.options) {
        if (!option.value) continue;
        option.hidden = Boolean(q) && !option.text.toLocaleLowerCase('tr-TR').includes(q);
      }
      return;
    }
    if (event.target.name === 'vehicleMake') {
      const models = getModels(event.target.value);
      const datalist = form.querySelector('#prModels');
      if (datalist) datalist.innerHTML = models.map((name) => '<option value="' + esc(name) + '">' + name + '</option>').join('');
    }
  });
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-request-photo-add]')) { event.preventDefault(); form.querySelector('[data-request-photo-input]').click(); return; }
    const thumb = event.target.closest('[data-request-photo-index]');
    if (thumb && event.target.closest('[data-request-photo-remove]')) {
      requestFormPhotos.splice(Number(thumb.dataset.requestPhotoIndex), 1);
      syncRequestPhotos(form);
    }
  });
  form.addEventListener('keydown', (event) => {
    if (event.target.closest('[data-request-photo-add]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      form.querySelector('[data-request-photo-input]').click();
    }
  });
  syncRequestPhotos(form);
}

async function submitRequestForm(form) {
  const data = new FormData(form);
  const fields = {
    vehicleType: data.get('vehicleType') || '',
    vehicleMake: data.get('vehicleMake'),
    vehicleModel: data.get('vehicleModel') || '',
    vehicleYear: data.get('vehicleYear') || '',
    vehicleVersion: data.get('vehicleVersion') || '',
    partCategory: data.get('partCategory'),
    partSubcategory: data.get('partSubcategory') || '',
    partName: data.get('partName'),
    oemNumber: data.get('oemNumber') || '',
    description: data.get('description') || '',
    city: data.get('city'),
    condition: data.get('condition') || 'any',
    delivery: data.get('delivery') || '',
  };
  if (!fields.vehicleMake || !fields.partName || !fields.city) {
    return showToast('Araç markası, parça adı ve şehir zorunludur.');
  }
  if (fields.partName.length > 140) return showToast('Parça adı en fazla 140 karakter olabilir.');
  if ((fields.description || '').length > 2000) return showToast('Açıklama en fazla 2000 karakter olabilir.');

  try {
    if (requestFormEditId) {
      await updatePartRequest(requestFormEditId, fields);
      const removedIds = requestFormOriginalIds.filter((id) => !requestFormPhotos.some((item) => item.id === id));
      for (const id of removedIds) {
        try { await deleteRequestImage(id); } catch (error) { console.warn('Talep fotoğrafı silinemedi.', error); }
      }
      const newFiles = requestFormPhotos.filter((item) => item.file).map((item) => item.file);
      if (newFiles.length) await attachRequestImages(requestFormEditId, newFiles);
      requestFormPhotos = [];
      requestFormOriginalIds = [];
      requestFormEditId = null;
      closeModal();
      showToast('Talep güncellendi.');
      window.dispatchEvent(new CustomEvent('parca:requests-updated'));
      if (window.__openAccountCenter) window.__openAccountCenter('taleplerim');
      return;
    }
    const created = await createPartRequest(fields);
    const photos = requestFormPhotos.filter((item) => item.file).map((item) => item.file);
    if (photos.length) {
      try { await attachRequestImages(created.id, photos); } catch (error) { showToast('Talep oluşturuldu; fotoğraf yüklenemedi: ' + (error.message || '')); }
    }
    requestFormPhotos = [];
    requestFormOriginalIds = [];
    requestFormEditId = null;
    closeModal();
    showToast('Parça talebin oluşturuldu. Satıcılar yakında seni bulabilir.');
    window.dispatchEvent(new CustomEvent('parca:requests-updated'));
    window.location.hash = '#/talep/' + encodeURIComponent(created.id);
  } catch (error) {
    showToast(error.message || 'Talep oluşturulamadı.');
  }
}

export async function openRequestForm(prefill, existing) {
  if (!supabaseConfigured) {
    return showToast('Parça talebi için Supabase bağlantısı gerekli.');
  }
  requestFormEditId = existing ? existing.id : null;
  requestFormOriginalIds = (existing && existing.images ? existing.images : []).map((image) => image.id);
  requestFormPhotos = (existing && existing.images ? existing.images : []).map((image) => ({ id: image.id, url: image.url, file: null }));
  openModal(requestFormHtml(prefill || null, existing || null));
  wireRequestForm(document.querySelector('#requestForm'));
}

// ---- Request detail page (hash route) ----
let requestSection = null;
let requestInDetail = false;
let requestPageState = { id: null, me: '' };

function ensureRequestSection() {
  if (requestSection && main.contains(requestSection)) return requestSection;
  requestSection = document.createElement('section');
  requestSection.className = 'request-page';
  requestSection.id = 'requestDetail';
  main.appendChild(requestSection);
  return requestSection;
}

function renderRequestLoading(sectionEl) {
  sectionEl.innerHTML = '<div class="request-body container"><div class="request-loading">Yükleniyor…</div></div>';
}

function renderRequestNotFound(sectionEl) {
  sectionEl.innerHTML = '<div class="request-body container"><div class="detail-empty"><h2>Talep bulunamadı</h2><p>Talep kapatılmış veya kaldırılmış olabilir.</p><button class="dark-btn" data-request-back>← Geri</button></div></div>';
}

function requestSpecRow(label, value) {
  return '<div class="detail-spec"><dt>' + esc(label) + '</dt><dd>' + esc(value || 'Belirtilmemiş') + '</dd></div>';
}

function requestResponsesHtml(request, meId) {
  const isOwner = String(request.userId) === String(meId);
  const myResponse = request.responses.find((response) => String(response.sellerId) === String(meId));
  if (isOwner) {
    if (!request.responses.length) {
      return '<div class="request-responses"><h2 class="detail-sub">Gelen cevaplar</h2><p class="request-empty-note">Henüz cevap gelmedi. Satıcılar "Bende Var" dediğinde burada görünür.</p></div>';
    }
    return '<div class="request-responses"><h2 class="detail-sub">Gelen cevaplar</h2><div class="request-response-list">'
      + request.responses.map((response) => {
        const name = response.seller?.full_name || 'Satıcı';
        const city = response.seller?.city ? ' · ' + esc(response.seller.city) : '';
        return '<div class="request-response"><div class="request-response-head"><span class="seller-avatar">' + esc(name.charAt(0).toLocaleUpperCase('tr-TR') || 'S') + '</span><div class="grow"><strong>' + esc(name) + '</strong><small>' + esc(timeLabel(response.createdAt)) + city + '</small></div></div>'
          + '<button class="request-thread-btn" data-request-thread="' + esc(request.id) + '::' + esc(response.sellerId) + '">Mesajı Aç</button></div>';
      }).join('') + '</div></div>';
  }
  if (myResponse) {
    return '<div class="request-responses"><div class="request-response own"><strong>✓ Bu talebe cevap verdin.</strong><p>Alıcıya mesaj gönderildi; iletişim Mesajlarım bölümünde.</p>'
      + '<button class="request-thread-btn" data-request-thread="' + esc(request.id) + '::' + esc(meId) + '">Mesajı Aç</button></div></div>';
  }
  return '<div class="request-responses"><button class="request-respond-btn" data-respond-request="' + esc(request.id) + '">BENDE VAR</button>'
    + '<p class="request-empty-note">Bu parça sende varsa alıcıya haber ver, mesajlaşmayı başlat.</p></div>';
}

function renderRequestPage(sectionEl, request, meId) {
  const isOwner = String(request.userId) === String(meId);
  const statusText = REQUEST_STATUS_LABELS[request.status] || request.status;
  const conditionLabel = REQUEST_CONDITION_LABELS[request.condition] || request.condition;
  const delivery = deliveryLabel(request.delivery);
  const cover = request.images[0] ? request.images[0].url : null;
  const gallery = cover
    ? '<div class="request-gallery"><img src="' + esc(cover) + '" alt="' + esc(request.partName) + '" loading="lazy"></div>'
    : '<div class="request-gallery placeholder"><span>PARÇA AVCISI</span><small>TALEP</small></div>';
  const ownerActions = isOwner
    ? '<div class="request-owner-actions">'
      + '<button class="pane-btn" data-request-edit="' + esc(request.id) + '">Düzenle</button>'
      + (request.status === 'closed'
        ? '<button class="pane-btn primary" data-request-reactivate="' + esc(request.id) + '">Talebi Tekrar Aktif Et</button>'
        : '<button class="pane-btn danger" data-request-close="' + esc(request.id) + '">Talebi Kapat</button>')
      + '</div>'
    : '';
  const specs = [
    ['Araç Tipi', request.vehicleType],
    ['Araç Markası', request.vehicleMake],
    ['Model', request.vehicleModel],
    ['Yıl', request.vehicleYear],
    ['Versiyon', request.vehicleVersion],
    ['Parça Kategorisi', request.partCategory],
    ['Alt Kategori', request.partSubcategory],
    ['Parça Adı', request.partName],
    ['OEM / Parça No', request.oemNumber],
    ['Şehir', request.city],
    ['Parça Durumu Tercihi', conditionLabel],
    ['Teslimat', delivery],
    ['Tarih', timeLabel(request.createdAt)],
  ];
  sectionEl.innerHTML =
    '<div class="request-hero"><div class="container request-hero-row">'
    + '<button class="back-btn" data-request-back aria-label="Geri">← Geri</button>'
    + '<button class="request-share-btn" data-share-request aria-label="Paylaş">Paylaş</button>'
    + '<span class="request-status-badge ' + esc(request.status) + '">' + esc(statusText) + '</span>'
    + '</div></div>'
    + '<div class="request-body container"><div class="request-layout">'
    + '<div class="request-gallery-col">' + gallery + '</div>'
    + '<div class="request-info-card">'
    + '<span class="eyebrow">PARÇA ARIYORUM · TALEP</span>'
    + '<h1 class="request-title">' + esc(request.partName) + '</h1>'
    + '<div class="request-vehicle"><span>ARANAN ARAÇ</span><p>' + esc(request.vehicleLabel || 'Belirtilmemiş') + '</p></div>'
    + '<dl class="detail-specs">' + specs.map(([label, value]) => requestSpecRow(label, value)).join('') + '</dl>'
    + '<h2 class="detail-sub">Açıklama</h2>'
    + '<p class="detail-description">' + esc(request.description || 'Açıklama eklenmemiş.') + '</p>'
    + ownerActions
    + requestResponsesHtml(request, meId)
    + '</div></div></div>';
}

async function openRequestDetail(id) {
  const token = ++requestPageToken;
  requestPageState.id = String(id);
  const sectionEl = ensureRequestSection();
  renderRequestLoading(sectionEl);
  try {
    const user = await getCurrentUser().catch(() => null);
    const request = await getPartRequestById(id);
    if (token !== requestPageToken) return;
    if (!request) { renderRequestNotFound(sectionEl); return; }
    requestPageState.me = user ? user.id : '';
    renderRequestPage(sectionEl, request, requestPageState.me);
  } catch (error) {
    if (token !== requestPageToken) return;
    console.error('Talep detayı yüklenemedi.', error);
    renderRequestNotFound(sectionEl);
  }
}

function requestGoBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.hash = '';
}

function handleRequestRoute() {
  const match = /^#\/talep\/([^#]+)$/.exec(window.location.hash || '');
  if (match) {
    const wasDetail = requestInDetail;
    requestInDetail = true;
    main.classList.add('request-mode');
    if (!wasDetail) window.scrollTo({ top: 0 });
    openRequestDetail(decodeURIComponent(match[1]));
    return;
  }
  const wasDetail = requestInDetail;
  requestInDetail = false;
  main.classList.remove('request-mode');
  if (!wasDetail) return;
  const target = window.location.hash;
  requestAnimationFrame(() => {
    if (target && target.length > 1) {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0 });
    }
  });
}

let requestPageToken = 0;

// ---- Share (Web Share API, clipboard fallback) ----
function shareRequestDetail(requestId) {
  const url = window.location.origin + window.location.pathname + '#/talep/' + encodeURIComponent(requestId);
  const payload = {
    title: 'Parça Avcısı — Parça Talebi',
    url,
  };
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share(payload).catch((error) => {
      if (error && error.name !== 'AbortError') showToast('Paylaşım açılamadı.');
    });
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Talep bağlantısı kopyalandı.'))
      .catch(() => showToast('Bağlantı kopyalanamadı.'));
    return;
  }
  showToast(url);
}

// ---- Delegation ----
document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-request-back]')) { requestGoBack(); return; }

  const requestDetail = event.target.closest('[data-open-request-detail]');
  if (requestDetail) {
    event.preventDefault();
    if (window.__closeModal) window.__closeModal();
    window.location.hash = '#/talep/' + encodeURIComponent(String(requestDetail.dataset.openRequestDetail));
    return;
  }

  const openTrigger = event.target.closest('[data-open-request], [data-request-empty]');
  if (openTrigger) {
    event.preventDefault();
    const prefill = openTrigger.dataset.requestPrefill || openTrigger.dataset.emptyQuery || '';
    if (window.__requireMember) {
      await window.__requireMember(() => openRequestForm(prefillFromSearch(prefill), null));
    } else {
      openRequestForm(prefillFromSearch(prefill), null);
    }
    return;
  }

  const shareBtn = event.target.closest('[data-share-request]');
  if (shareBtn) {
    event.preventDefault();
    shareRequestDetail(shareBtn.dataset.shareRequest);
    return;
  }

  const respond = event.target.closest('[data-respond-request]');  if (respond) {
    event.preventDefault();
    const id = respond.dataset.respondRequest;
    if (window.__requireMember) {
      await window.__requireMember(async () => {
        try {
          await respondToRequest(id);
          showToast('Alıcıya bildirim gönderildi. Mesajlaşma başlatıldı.');
          window.dispatchEvent(new CustomEvent('parca:requests-updated'));
          openRequestDetail(id);
        } catch (error) {
          showToast(error.message || 'Cevap oluşturulamadı.');
        }
      });
    }
    return;
  }

  const editBtn = event.target.closest('[data-request-edit]');
  if (editBtn) {
    event.preventDefault();
    const request = await getPartRequestById(editBtn.dataset.requestEdit).catch(() => null);
    if (request) openRequestForm(null, request);
    return;
  }

  const closeBtn = event.target.closest('[data-request-close]');
  if (closeBtn) {
    event.preventDefault();
    try {
      await setPartRequestStatus(closeBtn.dataset.requestClose, 'closed');
      showToast('Talep kapatıldı. Artık satıcılara gösterilmiyor.');
      window.dispatchEvent(new CustomEvent('parca:requests-updated'));
      openRequestDetail(closeBtn.dataset.requestClose);
    } catch (error) { showToast(error.message || 'Talep kapatılamadı.'); }
    return;
  }

  const reactivate = event.target.closest('[data-request-reactivate]');
  if (reactivate) {
    event.preventDefault();
    try {
      await setPartRequestStatus(reactivate.dataset.requestReactivate, 'active');
      showToast('Talep yeniden aktif edildi.');
      window.dispatchEvent(new CustomEvent('parca:requests-updated'));
      openRequestDetail(reactivate.dataset.requestReactivate);
    } catch (error) { showToast(error.message || 'Talep aktifleştirilemedi.'); }
    return;
  }

  const thread = event.target.closest('[data-request-thread]');
  if (thread) {
    event.preventDefault();
    const [requestId, sellerId] = thread.dataset.requestThread.split('::');
    if (window.__openRequestThread) window.__openRequestThread(requestId, sellerId);
    else showToast('Mesajlaşma için Hesabım → Mesajlarım bölümünü aç.');
    return;
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'requestForm') return;
  event.preventDefault();
  submitRequestForm(event.target);
});

window.addEventListener('hashchange', handleRequestRoute);

window.__openRequestForm = openRequestForm;
window.__openRequestDetail = openRequestDetail;

handleRequestRoute();
