import { getActiveListings } from './listings.js';
import { getFavoriteListingIds, toggleFavorite } from './favorites.js';
import { supabaseConfigured } from './supabase.js';
import { demoListings } from './demo-listings.js';

const grid = document.querySelector('#listingGrid');
const toast = document.querySelector('#toast');
const money = (value) => new Intl.NumberFormat('tr-TR').format(value) + ' TL';
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const titleCase = (value) => String(value ?? '').trim().split(/\s+/).filter(Boolean).map((word) => {
  const upper = word.toLocaleUpperCase('tr-TR');
  if (upper === word && word.length > 1) return word;
  if (word.length === 1) return upper;
  return upper.charAt(0) + word.slice(1).toLocaleLowerCase('tr-TR');
}).join(' ');
const art = { Aydınlatma: '◖', Kaporta: '▰', Motor: '⚙', 'Fren Sistemi': '◎', Süspansiyon: '╱', Elektrik: '⚡', 'İç Aksam': '◌', Şanzıman: '⇄', 'Jant & Lastik': '⭕' };

const state = {
  query: '',
  condition: 'Tümü',
  items: [],
  favoriteIds: new Set(),
  live: supabaseConfigured,
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function searchableText(item) {
  return [item.title, item.partName, item.category, item.subcategory, item.vehicle, item.oem, item.description, item.city, item.seller]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR');
}

function matches(item) {
  const okCondition = state.condition === 'Tümü' || item.condition === state.condition;
  const q = state.query.trim().toLocaleLowerCase('tr-TR');
  return okCondition && (!q || searchableText(item).includes(q));
}

function cardHtml(item) {
  const saved = state.favoriteIds.has(String(item.id)) ? '♥' : '♡';
  const conditionClass = item.condition === 'Sıfır' ? 'new' : '';
  const photo = item.coverImage
    ? '<img class="listing-photo" src="' + escapeHtml(item.coverImage) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
    : '';
  return '<article class="listing-card"><div class="listing-image engine">' + photo + '<span class="condition ' + conditionClass + '">' + escapeHtml(item.condition) + '</span><button class="heart" data-live-save="' + item.id + '" aria-label="Favorilere ekle">' + saved + '</button><div class="part-art">' + (art[item.category] || '◉') + '</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>' + escapeHtml(titleCase(item.category)) + '</span><span>⌖ ' + escapeHtml(titleCase(item.city)) + '</span></div><h3>' + escapeHtml(titleCase(item.title)) + '</h3><p>' + escapeHtml(item.vehicle) + '</p><strong class="price">' + money(item.price) + '</strong><div class="seller-line"><span>✓ ' + escapeHtml(titleCase(item.seller)) + '</span><button class="detail-btn" data-detail="' + item.id + '">İncele</button></div></div></article>';
}

function emptyHtml() {
  const noItems = state.items.length === 0;
  if (noItems) {
    return state.live
      ? '<div class="empty"><strong>Henüz aktif ilan yok.</strong><span>Yeni ilanlar eklendiğinde burada görünecek.</span></div>'
      : '<div class="empty"><strong>Henüz ilan yok.</strong><span>Yeni ilanlar eklendiğinde burada görünecek.</span></div>';
  }
  return '<div class="empty"><strong>Aramana uygun ilan bulamadık.</strong><span>Başka bir parça, marka veya kategori dene.</span></div>';
}

function render() {
  const visible = state.items.filter(matches);
  grid.innerHTML = visible.length ? visible.map(cardHtml).join('') : emptyHtml();
}

async function load() {
  if (!supabaseConfigured) {
    state.live = false;
    state.items = demoListings.slice();
    state.favoriteIds = new Set();
    render();
    return;
  }
  try {
    const [listings, favoriteIds] = await Promise.all([getActiveListings(), getFavoriteListingIds()]);
    state.live = true;
    state.items = dedupe(listings || []);
    state.favoriteIds = new Set(favoriteIds || []);
  } catch (error) {
    console.warn('Supabase ilanları yüklenemedi; demo ilanlar gösteriliyor.', error);
    state.live = false;
    state.items = demoListings.slice();
    state.favoriteIds = new Set();
  }
  render();
}

async function refresh() {
  await load();
}

function search(query) {
  state.query = query || '';
  render();
}

function setCondition(condition) {
  state.condition = condition || 'Tümü';
  render();
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-live-save]');
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.liveSave;
  if (!supabaseConfigured) {
    const isSaved = button.textContent === '♥';
    button.textContent = isSaved ? '♡' : '♥';
    if (isSaved) state.favoriteIds.delete(id); else state.favoriteIds.add(id);
    showToast(isSaved ? 'İlan favorilerden çıkarıldı.' : 'İlan favorilere eklendi.');
    return;
  }
  try {
    const isFavorite = await toggleFavorite(id);
    button.textContent = isFavorite ? '♥' : '♡';
    showToast(isFavorite ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.');
  } catch (error) {
    showToast(error.message || 'Favori işlemi tamamlanamadı.');
  }
});

window.addEventListener('parca:listings-updated', () => { refresh(); });

window.__listingView = { search, setCondition, refresh, load };

load();
