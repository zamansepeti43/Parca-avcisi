import { getListingById } from './listings.js';

const normalize = (value) => String(value ?? '').trim();
const titleCase = (value) => normalize(value).split(/\s+/).filter(Boolean).map((word) => {
  const upper = word.toLocaleUpperCase('tr-TR');
  return upper.length > 1 && upper === word ? word : upper.charAt(0) + word.slice(1).toLocaleLowerCase('tr-TR');
}).join(' ');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

function vehicleLabel(vehicle) {
  if (!vehicle) return '';
  const years = [vehicle.year_from, vehicle.year_to].filter((value) => value !== null && value !== undefined && value !== '').join('–');
  return [titleCase(vehicle.make), titleCase(vehicle.model), years, titleCase(vehicle.engine)].filter(Boolean).join(' · ');
}

function renderCompatibility(listing) {
  const host = document.querySelector('#listingDetail .detail-vehicle');
  if (!host) return;
  const vehicles = (listing?.vehicles || []).map((entry) => entry?.vehicle).filter(Boolean);
  if (!vehicles.length) return;

  host.innerHTML = '<span>ARAÇ UYUMLULUĞU</span>'
    + '<div class="compatibility-list">'
    + vehicles.map((vehicle) => '<div class="compatibility-item"><span class="compatibility-check">✓</span><div><strong>Uyumlu araç</strong><p>' + escapeHtml(vehicleLabel(vehicle)) + '</p></div></div>').join('')
    + '</div>';
}

let lastId = '';
let loading = false;
async function syncCompatibility() {
  const match = String(window.location.hash || '').match(/^#\/ilan\/([^/?#]+)/);
  if (!match || loading || match[1] === lastId) return;
  const id = decodeURIComponent(match[1]);
  const host = document.querySelector('#listingDetail .detail-vehicle');
  if (!host) return;
  loading = true;
  try {
    const listing = await getListingById(id);
    if (listing) {
      lastId = id;
      renderCompatibility(listing);
    }
  } catch {
    // Detail compatibility is an enhancement; never break the existing detail page.
  } finally {
    loading = false;
  }
}

const observer = new MutationObserver(() => syncCompatibility());
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('hashchange', () => {
  lastId = '';
  window.setTimeout(syncCompatibility, 0);
});
window.setTimeout(syncCompatibility, 0);
