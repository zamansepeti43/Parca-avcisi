import { getActiveListings } from './listings.js';
import { getFavoriteListingIds, toggleFavorite } from './favorites.js';
import { requireSupabase, supabaseConfigured } from './supabase.js';
import { demoListings } from './demo-listings.js';
import { vehicleCatalog } from './vehicle-catalog.js';

const grid = document.querySelector('#listingGrid');
const toast = document.querySelector('#toast');
const PAGE_SIZE = 24;
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
  query: '', tokens: [], condition: 'Tümü', items: [], favoriteIds: new Set(), live: supabaseConfigured,
  categoryFilter: null, page: 0, totalItems: 0, totalPages: 0, loadingPage: false,
};
const VEHICLE_TYPE_KEYWORDS = { Kamyon: ['kamyon'], Otobüs: ['otobüs'], Motosiklet: ['motosiklet'], 'Pickup / Kamyonet': ['pickup', 'kamyonet'] };
const typeVehicleMap = {};
for (const record of vehicleCatalog) { const combo = (record.make + ' ' + record.model).toLocaleLowerCase('tr-TR'); (typeVehicleMap[record.type] = typeVehicleMap[record.type] || new Set()).add(combo); }
function matchesVehicleType(item, type) {
  if (!type) return true;
  const text = String(item.vehicle || '').toLocaleLowerCase('tr-TR');
  const tokens = text.split(/[^a-z0-9çğıöşü]+/).filter(Boolean);
  const keywords = VEHICLE_TYPE_KEYWORDS[type];
  if (keywords && keywords.some((keyword) => tokens.includes(keyword))) return true;
  const combos = typeVehicleMap[type]; if (combos) for (const combo of combos) if (text.includes(combo)) return true;
  return false;
}
function syncUrl() {
  const params = new URLSearchParams(window.location.search), filter = state.categoryFilter;
  if (filter?.category) {
    params.set('category', filter.category);
    if (filter.subcategory) params.set('subcategory', filter.subcategory); else params.delete('subcategory');
    if (filter.vehicleType) params.set('vehicleType', filter.vehicleType); else params.delete('vehicleType');
  } else { params.delete('category'); params.delete('subcategory'); params.delete('vehicleType'); }
  const queryString = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (queryString ? '?' + queryString : '') + window.location.hash);
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600); }
function searchableFields(item) { return { title: [item.title, item.partName].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR'), category: [item.category, item.subcategory].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR'), vehicle: String(item.vehicle || '').toLocaleLowerCase('tr-TR'), oem: String(item.oem || '').toLocaleLowerCase('tr-TR'), description: String(item.description || '').toLocaleLowerCase('tr-TR'), city: String(item.city || '').toLocaleLowerCase('tr-TR'), seller: String(item.seller || '').toLocaleLowerCase('tr-TR') }; }
function tokenMatches(token, text) {
  if (/^(19|20)\d{2}$/.test(token)) { if (text.includes(token)) return true; const range = /(\d{4})\s*[–-]\s*(\d{4})/.exec(text); if (range) { const from = Number(range[1]), to = Number(range[2]), year = Number(token); if (year >= from && year <= to) return true; } return false; }
  return text.includes(token);
}
const FIELD_WEIGHTS = { title: 2, category: 1, vehicle: 1, oem: 1, description: 0.25, city: 0.25, seller: 0.25 };
function scoreItem(item) { if (!state.tokens.length) return 0; const fields = searchableFields(item); let total = 0; for (const token of state.tokens) { let matched = false; for (const key of Object.keys(FIELD_WEIGHTS)) if (tokenMatches(token, fields[key])) { matched = true; total += FIELD_WEIGHTS[key]; } if (!matched) return -1; if (/^(19|20)\d{2}$/.test(token) && tokenMatches(token, fields.vehicle)) total += 1.5; } return total; }
function matches(item) {
  if (state.condition !== 'Tümü' && item.condition !== state.condition) return false;
  const filter = state.categoryFilter;
  if (filter?.category) {
    if (String(item.category || '').toLocaleLowerCase('tr-TR') !== filter.category.toLocaleLowerCase('tr-TR')) return false;
    if (filter.subcategory && String(item.subcategory || '').toLocaleLowerCase('tr-TR') !== filter.subcategory.toLocaleLowerCase('tr-TR')) return false;
    if (filter.vehicleType && !matchesVehicleType(item, filter.vehicleType)) return false;
  }
  return state.tokens.length ? scoreItem(item) > 0 : true;
}
function cardHtml(item) { const saved = state.favoriteIds.has(String(item.id)) ? '♥' : '♡', conditionClass = item.condition === 'Sıfır' ? 'new' : '', photo = item.coverImage ? '<img class="listing-photo" src="' + escapeHtml(item.coverImage) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">' : ''; return '<article class="listing-card"><div class="listing-image engine">' + photo + '<span class="condition ' + conditionClass + '">' + escapeHtml(item.condition) + '</span><button class="heart" data-live-save="' + item.id + '" aria-label="Favorilere ekle">' + saved + '</button><div class="part-art">' + (art[item.category] || '◉') + '</div><span class="art-caption">PARÇA AVCISI</span></div><div class="listing-body"><div class="listing-meta"><span>' + escapeHtml(titleCase(item.category)) + '</span><span>⌖ ' + escapeHtml(titleCase(item.city)) + '</span></div><h3>' + escapeHtml(titleCase(item.title)) + '</h3><p>' + escapeHtml(item.vehicle) + '</p><strong class="price">' + money(item.price) + '</strong><div class="seller-line"><span>✓ ' + escapeHtml(titleCase(item.seller)) + '</span><button class="detail-btn" data-detail="' + item.id + '">İncele</button></div></div></article>'; }
function requestCtaHtml() { return '<button class="dark-btn" data-request-empty data-empty-query="' + escapeHtml(state.query) + '">PARÇA TALEBİ OLUŞTUR</button>'; }
function emptyHtml() { if (state.categoryFilter?.category) return '<div class="empty"><strong>Bu kategoride henüz ilan bulunmuyor.</strong><span>Farklı bir kategori, alt kategori veya araç tipi deneyebilirsin.</span><button class="dark-btn" data-clear-category>FİLTREYİ KALDIR</button>' + requestCtaHtml() + '</div>'; if (state.items.length === 0) return '<div class="empty"><strong>Henüz aktif ilan yok.</strong><span>Yeni ilanlar eklendiğinde burada görünecek.</span>' + requestCtaHtml() + '</div>'; return '<div class="empty"><strong>Aradığın parçayı bulamadık.</strong><span>Başka bir parça, marka veya kategori dene — ya da talep oluştur.</span>' + requestCtaHtml() + '</div>'; }
function paginationHtml() { if (!state.live || state.totalPages <= 1) return ''; const current = state.page, last = state.totalPages - 1, pages = new Set([0, last, current - 1, current, current + 1].filter((page) => page >= 0 && page <= last)), ordered = [...pages].sort((a, b) => a - b), controls = []; let previous = null; for (const page of ordered) { if (previous !== null && page - previous > 1) controls.push('<span class="pagination-gap" aria-hidden="true">…</span>'); controls.push('<button type="button" class="pagination-btn ' + (page === current ? 'active' : '') + '" data-page="' + page + '" aria-current="' + (page === current ? 'page' : 'false') + '">' + (page + 1) + '</button>'); previous = page; } const prevDisabled = current === 0 || state.loadingPage ? 'disabled' : '', nextDisabled = current >= last || state.loadingPage ? 'disabled' : ''; return '<div class="center-action listing-pagination" style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:28px"><button type="button" class="dark-btn" data-prev-page ' + prevDisabled + '>‹ Önceki</button><div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap">' + controls.join('') + '</div><button type="button" class="dark-btn" data-next-page ' + nextDisabled + '>Sonraki ›</button></div>'; }
function render() { const results = state.items.map((item, index) => ({ item, index, score: scoreItem(item) })).filter((result) => matches(result.item)).sort((a, b) => b.score - a.score || a.index - b.index); const visible = results.map((result) => result.item); grid.innerHTML = visible.length ? visible.map(cardHtml).join('') + paginationHtml() : emptyHtml() + paginationHtml(); }
async function getTotalActiveListings() { const { count, error } = await requireSupabase().from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'); if (error) throw error; return Number(count || 0); }
async function load({ page = 0, refreshMeta = false } = {}) { if (!supabaseConfigured) { state.live = false; state.items = demoListings.slice(); state.favoriteIds = new Set(); state.page = 0; state.totalItems = state.items.length; state.totalPages = 1; render(); return; } if (state.loadingPage) return; state.loadingPage = true; render(); try { const tasks = [getActiveListings({ page, pageSize: PAGE_SIZE })]; if (refreshMeta || state.totalPages === 0) tasks.push(getTotalActiveListings()); if (refreshMeta || state.favoriteIds.size === 0) tasks.push(getFavoriteListingIds()); const results = await Promise.all(tasks); const listings = results[0] || []; let resultIndex = 1; const totalItems = refreshMeta || state.totalPages === 0 ? results[resultIndex++] : state.totalItems; const favoriteIds = refreshMeta || state.favoriteIds.size === 0 ? results[resultIndex] : null; state.live = true; state.page = Math.max(0, Number(page) || 0); state.items = import.meta.env.DEV && state.page === 0 ? [...listings, ...demoListings] : listings; state.totalItems = Number(totalItems || 0); state.totalPages = Math.max(1, Math.ceil(state.totalItems / PAGE_SIZE)); if (favoriteIds) state.favoriteIds = new Set(favoriteIds || []); if (!state.items.length && state.page > 0) { state.page = Math.max(0, state.totalPages - 1); state.items = (await getActiveListings({ page: state.page, pageSize: PAGE_SIZE })) || []; } } catch (error) { console.warn('Supabase ilanları yüklenemedi; demo ilanlar gösteriliyor.', error); state.live = false; state.items = demoListings.slice(); state.favoriteIds = new Set(); state.page = 0; state.totalItems = state.items.length; state.totalPages = 1; } finally { state.loadingPage = false; render(); } }
async function goToPage(page) { const target = Math.max(0, Math.min(Number(page) || 0, state.totalPages - 1)); if (!state.live || target === state.page || state.loadingPage) return; await load({ page: target }); document.querySelector('#ilanlar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
async function refresh() { await load({ page: 0, refreshMeta: true }); }
function search(query) { state.query = query || ''; state.tokens = state.query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean); if (state.tokens.length) state.categoryFilter = null; syncUrl(); render(); }
function setCategoryFilter(filter) { const category = (filter && filter.category) || '', subcategory = (filter && filter.subcategory) || '', vehicleType = (filter && filter.vehicleType) || ''; state.categoryFilter = { category, subcategory, vehicleType }; const params = new URLSearchParams(window.location.search); const vehicleTerms = [params.get('vehicleMake'), params.get('vehicleModel'), params.get('vehicleYear')].filter(Boolean); state.query = [category, subcategory, ...vehicleTerms].join(' '); state.tokens = state.query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean); const input = document.querySelector('#searchInput'); if (input) input.value = state.query; syncUrl(); load({ page: 0 }); }
function clearCategoryFilter() { state.categoryFilter = null; state.query = ''; state.tokens = []; const input = document.querySelector('#searchInput'); if (input) input.value = ''; syncUrl(); load({ page: 0 }); }
function setCondition(condition) { state.condition = condition || 'Tümü'; load({ page: 0 }); }
document.addEventListener('click', async (event) => { const clearButton = event.target.closest('[data-clear-category]'); if (clearButton) { event.preventDefault(); clearCategoryFilter(); return; } const pageButton = event.target.closest('[data-page]'); if (pageButton) { event.preventDefault(); await goToPage(pageButton.dataset.page); return; } const prevButton = event.target.closest('[data-prev-page]'); if (prevButton) { event.preventDefault(); await goToPage(state.page - 1); return; } const nextButton = event.target.closest('[data-next-page]'); if (nextButton) { event.preventDefault(); await goToPage(state.page + 1); return; } const button = event.target.closest('[data-live-save]'); if (!button) return; event.preventDefault(); const id = button.dataset.liveSave; if (!supabaseConfigured) { const isSaved = button.textContent === '♥'; button.textContent = isSaved ? '♡' : '♥'; if (isSaved) state.favoriteIds.delete(id); else state.favoriteIds.add(id); showToast(isSaved ? 'İlan favorilerden çıkarıldı.' : 'İlan favorilere eklendi.'); return; } try { const isFavorite = await toggleFavorite(id); button.textContent = isFavorite ? '♥' : '♡'; showToast(isFavorite ? 'İlan favorilere eklendi.' : 'İlan favorilerden çıkarıldı.'); } catch (error) { showToast(error.message || 'Favori işlemi tamamlanamadı.'); } });
window.addEventListener('parca:listings-updated', () => { refresh(); });
window.__listingView = { search, setCondition, refresh, load, goToPage, setCategoryFilter, clearCategoryFilter };
(function restoreCategoryFilter() { try { const params = new URLSearchParams(window.location.search), category = params.get('category'); if (!category) return; const subcategory = params.get('subcategory') || '', vehicleType = params.get('vehicleType') || '', vehicleTerms = [params.get('vehicleMake'), params.get('vehicleModel'), params.get('vehicleYear')].filter(Boolean); state.categoryFilter = { category, subcategory, vehicleType }; state.query = [category, subcategory, ...vehicleTerms].join(' '); state.tokens = state.query.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean); const input = document.querySelector('#searchInput'); if (input) input.value = state.query; } catch (error) { console.warn('Kategori filtresi geri yüklenemedi.', error); } })();
load({ page: 0, refreshMeta: true });
