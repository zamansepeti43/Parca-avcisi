import './listing-detail.css';
import { getListingById, getSellerActiveListings } from './listings.js';
import { getProfileById, getActiveListingCount } from './profile.js';
import { getFavoriteListingIds, toggleFavorite } from './favorites.js';
import { getCurrentUser } from './auth.js';
import { supabaseConfigured } from './supabase.js';
import { demoListings } from './demo-listings.js';

const main = document.querySelector('#top') || document.querySelector('main');
const money = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0) + ' TL';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const statusLabels = { draft: 'Taslak', active: 'Yayınlandı', sold: 'Satıldı', paused: 'Yayında Değil', removed: 'Kaldırıldı' };
const conditionClass = (label) => (label === 'Sıfır' ? ' new' : '');
const art = { Aydınlatma: '◖', Kaporta: '▰', Motor: '⚙', 'Fren Sistemi': '◎', Süspansiyon: '╱', Elektrik: '⚡', 'İç Aksam': '◌', Şanzıman: '⇄', 'Jant & Lastik': '⭕' };

function titleCase(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).map((word) => {
    const upper = word.toLocaleUpperCase('tr-TR');
    if (upper === word && word.length > 1) return word;
    if (word.length === 1) return upper;
    return upper.charAt(0) + word.slice(1).toLocaleLowerCase('tr-TR');
  }).join(' ');
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function nationalNumber(value) {
  let d = digits(value);
  if (d.startsWith('90')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return d;
}

function telHref(value) {
  const d = digits(value);
  if (!d) return '';
  return d.startsWith('90') ? '+' + d : d.startsWith('0') ? '+90' + d.slice(1) : '+90' + d;
}

function phoneInfo(value) {
  const n = nationalNumber(value);
  if (/^5\d{9}$/.test(n)) {
    return { display: '0 ' + n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6, 8) + ' ' + n.slice(8), tel: '+90' + n, wa: '90' + n };
  }
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return { display: raw, tel: telHref(raw), wa: '' };
}

function whatsappFor(profile) {
  if (!profile) return '';
  const explicit = profile.settings?.whatsapp;
  if (explicit && digits(explicit)) return '90' + nationalNumber(explicit);
  const info = phoneInfo(profile.phone);
  return info?.wa || '';
}

const state = {
  id: null,
  isFavorite: false,
  imageIndex: 0,
  urls: [],
};

let loadToken = 0;
let inDetail = false;
let section = null;

function showToast(message) {
  if (window.__showToast) return window.__showToast(message);
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function listingNumber(id) {
  const digitsClean = String(id || '').replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 8);
  if (digitsClean) return 'ILAN-' + digitsClean;
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'ILAN-' + String(h).padStart(8, '0');
}

function ensureSection() {
  if (section && main.contains(section)) return section;
  section = document.createElement('section');
  section.className = 'detail-page';
  section.id = 'listingDetail';
  main.appendChild(section);
  return section;
}

function enterDetailMode() {
  if (!inDetail) window.scrollTo({ top: 0 });
  main.classList.add('detail-mode');
}
function exitDetailMode() {
  main.classList.remove('detail-mode');
}

function vehicleSpecs(listing) {
  const v = (listing.vehicles || [])[0]?.vehicle;
  const fallback = String(listing.vehicle || '').split('·').map((s) => s.trim()).filter(Boolean);
  const make = titleCase(v?.make || fallback[0] || '');
  const model = titleCase(v?.model || fallback[1] || '');
  const year = v ? [v.year_from, v.year_to].filter((x) => x !== null && x !== undefined && x !== '').join('–') : (/\d{4}/.test(fallback[2] || '') ? fallback[2] : '');
  const engine = titleCase(v?.engine || fallback[3] || '');
  return {
    make,
    model,
    year,
    engine,
    raw: listing.vehicle || '',
    label: [make, model, year, engine].filter(Boolean).join(' · '),
  };
}

function specRow(label, value) {
  return '<div class="detail-spec"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
}

function galleryHtml(urls) {
  if (!urls.length) {
    return '<div class="detail-gallery"><div class="detail-main-photo placeholder"><div><span>PARÇA AVCISI</span><small>Bu ilana fotoğraf eklenmemiş.</small></div></div></div>';
  }
  const mainImg = '<img class="gallery-main-img" src="' + escapeHtml(urls[0]) + '" alt="İlan fotoğrafı" loading="lazy">';
  const nav = urls.length > 1
    ? '<button type="button" class="gallery-nav prev" data-detail-gallery-prev aria-label="Önceki fotoğraf">‹</button>'
    + '<button type="button" class="gallery-nav next" data-detail-gallery-next aria-label="Sonraki fotoğraf">›</button>'
    : '';
  const thumbs = urls.length > 1
    ? '<div class="detail-thumbs">' + urls.map((url, index) => '<button type="button" class="detail-thumb' + (index === 0 ? ' active' : '') + '" data-detail-gallery-thumb="' + index + '"><img src="' + escapeHtml(url) + '" alt="" loading="lazy"></button>').join('') + '</div>'
    : '';
  return '<div class="detail-gallery"><div class="detail-main-photo">' + mainImg + nav + '</div>' + thumbs + '</div>';
}

function breadcrumbHtml(listing) {
  const category = titleCase(listing.category);
  const subcategory = titleCase(listing.subcategory);
  const part = titleCase(listing.partName) || titleCase(listing.title) || 'İlan Detayı';
  const crumbs = ['<a href="#ilanlar" data-breadcrumb="all">← İlanlar</a>'];
  if (category && category !== 'Oto Parça') {
    crumbs.push('<a href="#ilanlar" data-breadcrumb="' + escapeHtml(listing.category) + '">' + escapeHtml(category) + '</a>');
  }
  if (subcategory && subcategory !== category) {
    crumbs.push('<a href="#ilanlar" data-breadcrumb="' + escapeHtml(listing.subcategory) + '">' + escapeHtml(subcategory) + '</a>');
  }
  crumbs.push('<span class="current">' + escapeHtml(part) + '</span>');
  return '<nav class="breadcrumb" aria-label="Konum">' + crumbs.join('<i>›</i>') + '</nav>';
}

function sellerCardHtml(listing, profile, sellerCount, isOwn) {
  const rawName = profile?.full_name || listing.seller || 'Satıcı';
  const name = titleCase(rawName);
  const avatar = profile?.avatar_url
    ? '<img src="' + escapeHtml(profile.avatar_url) + '" alt="' + escapeHtml(name) + '">'
    : escapeHtml(name.charAt(0).toLocaleUpperCase('tr-TR') || 'S');
  const type = profile?.role === 'seller' ? 'Kurumsal' : 'Bireysel';
  const city = titleCase(profile?.city || listing.city) || 'Belirtilmemiş';
  const memberSince = profile?.created_at ? (fmtDate(profile.created_at) || 'Belirtilmemiş') : 'Belirtilmemiş';
  const info = profile?.phone ? phoneInfo(profile.phone) : null;
  const wa = whatsappFor(profile);

  const actions = [];
  if (info) {
    actions.push('<a class="seller-call" href="tel:' + escapeHtml(info.tel) + '">☎ Telefonla Ara</a>');
  }
  const waNumber = info?.wa || wa;
  if (waNumber) {
    actions.push('<a class="seller-wa" href="https://wa.me/' + escapeHtml(waNumber) + '" target="_blank" rel="noopener">WhatsApp ile Yaz</a>');
  }
  if (!isOwn && listing.sellerId) {
    actions.push('<button class="seller-contact" data-contact data-seller="' + escapeHtml(listing.sellerId) + '" data-listing="' + escapeHtml(listing.id) + '">Mesaj Gönder</button>');
  }
  actions.push('<button class="seller-more" data-seller-listings>Satıcının Diğer İlanlarını Gör</button>');

  const phoneRow = info
    ? '<div class="seller-phone"><span>Telefon</span><b>' + escapeHtml(info.display) + '</b></div>'
    : '';

  return '<aside class="seller-card"><div class="seller-head"><span class="seller-avatar">' + avatar + '</span><div class="seller-head-info"><strong>' + escapeHtml(name) + '</strong><span class="seller-type">' + escapeHtml(type) + '</span></div></div>'
    + '<div class="seller-stats"><div class="seller-stat"><b>' + escapeHtml(String(sellerCount)) + '</b><span>aktif ilan</span></div><div class="seller-stat"><b>' + escapeHtml(memberSince) + '</b><span>üyelik tarihi</span></div><div class="seller-stat"><b>' + escapeHtml(city) + '</b><span>şehir</span></div></div>'
    + phoneRow
    + '<div class="seller-actions">' + actions.join('') + '</div></aside>';
}

function ctaBarHtml(listing, profile, isOwn) {
  if (isOwn) return '';
  const info = profile?.phone ? phoneInfo(profile.phone) : null;
  const wa = whatsappFor(profile);
  const parts = [];
  if (info) parts.push('<a class="cta-call" href="tel:' + escapeHtml(info.tel) + '">Telefonla Ara</a>');
  if (info?.wa || wa) parts.push('<a class="cta-wa" href="https://wa.me/' + escapeHtml(info?.wa || wa) + '" target="_blank" rel="noopener">WhatsApp</a>');
  if (listing.sellerId) {
    parts.push('<button class="cta-msg" data-contact data-seller="' + escapeHtml(listing.sellerId) + '" data-listing="' + escapeHtml(listing.id) + '">Mesaj Gönder</button>');
  }
  if (!parts.length) return '';
  return '<div class="detail-cta">' + parts.join('') + '</div>';
}

function otherCardHtml(item) {
  const photo = item.coverImage
    ? '<img class="listing-photo" src="' + escapeHtml(item.coverImage) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
    : '';
  const conditionClass = item.condition === 'Sıfır' ? ' new' : '';
  return '<article class="listing-card"><div class="listing-image engine">' + photo + '<span class="condition' + conditionClass + '">' + escapeHtml(item.condition) + '</span><div class="part-art">' + (art[item.category] || '◉') + '</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>' + escapeHtml(titleCase(item.category)) + '</span><span>⌖ ' + escapeHtml(titleCase(item.city)) + '</span></div><h3>' + escapeHtml(titleCase(item.title)) + '</h3><strong class="price">' + money(item.price) + '</strong><div class="seller-line"><span>✓ ' + escapeHtml(titleCase(item.seller)) + '</span><button class="detail-btn" data-detail="' + item.id + '">İncele</button></div></div></article>';
}

function renderLoading(sectionEl) {
  sectionEl.innerHTML = '<div class="detail-body container"><div class="detail-loading"><div class="skeleton skeleton-hero"></div><div class="detail-layout"><div class="skeleton skeleton-gallery"></div><div class="skeleton skeleton-info"></div></div></div></div>';
}

function renderNotFound(sectionEl) {
  sectionEl.innerHTML = '<div class="detail-hero"><div class="container detail-hero-row"><button class="back-btn" data-detail-back aria-label="Geri">← Geri</button></div></div>'
    + '<div class="detail-body container"><div class="detail-empty"><h2>İlan bulunamadı</h2><p>İlan kaldırılmış veya yayında değil olabilir. Listeye dönüp başka ilanlara göz atabilirsin.</p><a class="dark-btn" href="#ilanlar">İlanlara Dön</a></div></div>';
}

function renderPage(sectionEl, listing, profile, sellerCount, otherListings, isOwn) {
  const urls = (listing.images || []).map((image) => image.url).filter(Boolean);
  state.urls = urls;
  state.imageIndex = 0;
  const specs = vehicleSpecs(listing);
  const statusText = statusLabels[listing.status] || '';
  const condition = listing.condition || '';
  const entries = [
    ['Durum', condition],
    ['Marka', specs.make],
    ['Model', specs.model],
    ['Yıl', specs.year],
    ['Versiyon', specs.engine],
    ['Parça Kategorisi', titleCase(listing.category)],
    ['Alt Kategori', titleCase(listing.subcategory)],
    ['Parça Adı', titleCase(listing.partName)],
    ['OEM / Parça No', listing.oemNumber || listing.oem],
    ['Şehir', titleCase(listing.city)],
    ['İlan Tarihi', fmtDate(listing.createdAt)],
    ['İlan No', listingNumber(listing.id)],
  ];
  const rows = entries.map(([label, value]) => specRow(label, value && String(value).trim() ? value : 'Belirtilmemiş'));
  const conditionBadge = condition ? '<span class="detail-condition' + conditionClass(condition) + '">' + escapeHtml(condition) + '</span>' : '';
  sectionEl.innerHTML =
    '<div class="detail-hero"><div class="container detail-hero-row">'
    + '<div class="detail-hero-left">' + breadcrumbHtml(listing) + '</div>'
    + '<span class="detail-actions">'
    + '<button class="detail-action-btn" data-detail-fav><span class="fav-icon" data-fav-icon>♡</span><span data-fav-label>Favorilere Ekle</span></button>'
    + '<button class="detail-action-btn" data-detail-share>Paylaş</button>'
    + '</span></div></div>'
    + '<div class="detail-body container"><div class="detail-layout">'
    + '<div class="detail-gallery-col">' + galleryHtml(urls) + '</div>'
    + '<div class="detail-info-col">'
    + '<span class="eyebrow">' + (statusText ? 'İLAN · ' + escapeHtml(statusText) : 'İLAN DETAYI') + '</span>'
    + '<h1 class="detail-title">' + escapeHtml(titleCase(listing.title)) + '</h1>'
    + '<div class="detail-price-row"><strong class="detail-price">' + money(listing.price) + '</strong>' + conditionBadge + '</div>'
    + '<dl class="detail-specs">' + rows.join('') + '</dl>'
    + '<div class="detail-vehicle"><span>ARAÇ UYUMLULUĞU</span><p>' + escapeHtml(specs.label || 'Belirtilmemiş') + '</p></div>'
    + '<h2 class="detail-sub">Açıklama</h2>'
    + '<p class="detail-description">' + escapeHtml(listing.description || 'Açıklama eklenmemiş.') + '</p>'
    + sellerCardHtml(listing, profile, sellerCount, isOwn)
    + '</div></div>'
    + (otherListings.length
      ? '<section class="seller-listings" id="sellerListings"><div class="section-head"><div><span class="eyebrow">SATICI</span><h2>Satıcının Diğer İlanları</h2></div></div><div class="listing-grid">' + otherListings.map(otherCardHtml).join('') + '</div></section>'
      : '')
    + '</div>'
    + ctaBarHtml(listing, profile, isOwn);
  updateFav();
}

function updateFav() {
  const icon = document.querySelector('[data-fav-icon]');
  const label = document.querySelector('[data-fav-label]');
  if (icon) icon.textContent = state.isFavorite ? '♥' : '♡';
  if (label) label.textContent = state.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle';
}

function setImage(index) {
  if (!state.urls.length) return;
  const count = state.urls.length;
  state.imageIndex = ((index % count) + count) % count;
  const mainImg = document.querySelector('#listingDetail .gallery-main-img');
  const thumbs = [...document.querySelectorAll('#listingDetail .detail-thumb')];
  if (mainImg) mainImg.src = state.urls[state.imageIndex];
  thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === state.imageIndex));
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.hash = '';
}

function goToListings(query) {
  const value = query && query !== 'all' ? String(query) : '';
  const input = document.querySelector('#searchInput');
  if (input) input.value = value;
  const view = window.__listingView;
  if (view) {
    view.search(value);
    view.setCondition('Tümü');
  }
  document.querySelectorAll('.filter').forEach((button) => {
    button.classList.toggle('active', button.dataset.condition === 'Tümü');
  });
  window.location.hash = '#ilanlar';
}

async function toggleFav() {
  const id = state.id;
  if (!id) return;
  if (!supabaseConfigured) {
    state.isFavorite = !state.isFavorite;
    updateFav();
    showToast(state.isFavorite ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.');
    return;
  }
  await window.__requireMember(async () => {
    try {
      state.isFavorite = await toggleFavorite(id);
      updateFav();
      showToast(state.isFavorite ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.');
    } catch (error) {
      showToast(error.message || 'Favori işlemi tamamlanamadı.');
    }
  });
}

function share() {
  const title = document.querySelector('#listingDetail .detail-title')?.textContent || 'Parça Avcısı ilanı';
  const payload = { title: 'Parça Avcısı — ' + title, text: 'Bu ilana göz at: ' + title, url: window.location.href };
  if (navigator.share) { navigator.share(payload).catch(() => {}); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Bağlantı kopyalandı.')).catch(() => showToast('Kopyalanamadı.'));
    return;
  }
  showToast(window.location.href);
}

async function openListingDetail(id) {
  const token = ++loadToken;
  state.id = String(id);
  const sectionEl = ensureSection();
  renderLoading(sectionEl);
  try {
    if (!supabaseConfigured) {
      const demo = demoListings.find((item) => String(item.id) === String(id));
      if (token !== loadToken) return;
      if (!demo) { renderNotFound(sectionEl); return; }
      state.isFavorite = false;
      const other = demoListings.filter((item) => item.seller === demo.seller && item.id !== demo.id);
      renderPage(sectionEl, demo, null, other.length, other, false);
      return;
    }
    const user = await getCurrentUser().catch(() => null);
    const [listing, favoriteIds] = await Promise.all([
      getListingById(id),
      getFavoriteListingIds().catch(() => []),
    ]);
    if (token !== loadToken) return;
    if (!listing) { renderNotFound(sectionEl); return; }
    state.isFavorite = favoriteIds.some((favoriteId) => String(favoriteId) === String(id));
    const isOwn = Boolean(user && listing.sellerId && String(user.id) === String(listing.sellerId));
    let profile = null;
    let sellerCount = 0;
    let otherListings = [];
    if (listing.sellerId) {
      const [profileRes, countRes, otherRes] = await Promise.allSettled([
        getProfileById(listing.sellerId),
        getActiveListingCount(listing.sellerId),
        getSellerActiveListings(listing.sellerId, { excludeId: listing.id }),
      ]);
      profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
      sellerCount = countRes.status === 'fulfilled' ? (countRes.value || 0) : 0;
      otherListings = otherRes.status === 'fulfilled' ? (otherRes.value || []) : [];
    }
    if (token !== loadToken) return;
    renderPage(sectionEl, listing, profile, sellerCount, otherListings, isOwn);
  } catch (error) {
    if (token !== loadToken) return;
    console.error('İlan detayı yüklenemedi.', error);
    renderNotFound(sectionEl);
  }
}

function navigateToDetail(id) {
  const target = '#/ilan/' + encodeURIComponent(String(id));
  if (window.__closeModal) window.__closeModal();
  if (window.location.hash === target) {
    if (!inDetail) { inDetail = true; enterDetailMode(); }
    openListingDetail(String(id));
  } else {
    window.location.hash = target;
  }
}

function handleRoute() {
  const match = /^#\/ilan\/([^#]+)$/.exec(window.location.hash || '');
  if (match) {
    const wasDetail = inDetail;
    inDetail = true;
    enterDetailMode();
    if (!wasDetail) window.scrollTo({ top: 0 });
    openListingDetail(decodeURIComponent(match[1]));
    return;
  }
  const wasDetail = inDetail;
  inDetail = false;
  exitDetailMode();
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

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-detail-back]')) { goBack(); return; }
  if (event.target.closest('[data-detail-fav]')) { toggleFav(); return; }
  if (event.target.closest('[data-detail-share]')) { share(); return; }
  if (event.target.closest('[data-breadcrumb]')) { event.preventDefault(); goToListings(event.target.closest('[data-breadcrumb]').dataset.breadcrumb); return; }
  if (event.target.closest('[data-seller-listings]')) {
    document.querySelector('#sellerListings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (event.target.closest('[data-detail-gallery-prev]')) { setImage(state.imageIndex - 1); return; }
  if (event.target.closest('[data-detail-gallery-next]')) { setImage(state.imageIndex + 1); return; }
  const thumb = event.target.closest('[data-detail-gallery-thumb]');
  if (thumb) { setImage(Number(thumb.dataset.detailGalleryThumb)); }
});

window.addEventListener('hashchange', handleRoute);
window.__openListingDetail = navigateToDetail;
window.__openListingDetailPage = openListingDetail;

handleRoute();
