import '../app.js';
import { getActiveListings } from './listings.js';
import { getFavoriteListingIds, toggleFavorite } from './favorites.js';
import { supabaseConfigured } from './supabase.js';

const grid = document.querySelector('#listingGrid');
const toast = document.querySelector('#toast');
const money = (value) => new Intl.NumberFormat('tr-TR').format(value) + ' TL';
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const art = { Aydınlatma: '◖', Kaporta: '▰', Motor: '⚙', 'Fren Sistemi': '◎', Süspansiyon: '╱', Elektrik: '⚡', 'İç Aksam': '◌' };

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function render(listings, favoriteIds) {
  grid.innerHTML = listings.length ? listings.map((item) => {
    const saved = favoriteIds.has(item.id) ? '♥' : '♡';
    const conditionClass = item.condition === 'Sıfır' ? 'new' : '';
    return '<article class="listing-card"><div class="listing-image engine"><span class="condition ' + conditionClass + '">' + escapeHtml(item.condition) + '</span><button class="heart" data-live-save="' + item.id + '" aria-label="Favorilere ekle">' + saved + '</button><div class="part-art">' + (art[item.category] || '◉') + '</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>' + escapeHtml(item.category) + '</span><span>⌖ ' + escapeHtml(item.city) + '</span></div><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.vehicle) + '</p><strong class="price">' + money(item.price) + '</strong><div class="seller-line"><span>✓ ' + escapeHtml(item.seller) + '</span><button class="detail-btn" data-detail="' + item.id + '">İncele</button></div></div></article>';
  }).join('') : '<div class="empty"><strong>Henüz aktif ilan yok.</strong><span>Yeni ilanlar eklendiğinde burada görünecek.</span></div>';
}

async function loadLiveListings() {
  if (!supabaseConfigured) return;
  try {
    const [listings, favoriteIds] = await Promise.all([getActiveListings(), getFavoriteListingIds()]);
    if (listings?.length) render(listings, new Set(favoriteIds));
  } catch (error) {
    console.warn('Supabase ilanları yüklenemedi; demo ilanlar gösteriliyor.', error);
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-live-save]');
  if (!button) return;
  event.preventDefault();
  try {
    const isFavorite = await toggleFavorite(button.dataset.liveSave);
    button.textContent = isFavorite ? '♥' : '♡';
    showToast(isFavorite ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.');
  } catch (error) {
    showToast(error.message || 'Favori işlemi tamamlanamadı.');
  }
});

loadLiveListings();
