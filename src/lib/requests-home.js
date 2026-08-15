import './part-requests.css';
import { getActivePartRequests, REQUEST_STATUS_LABELS } from './part-requests.js';
import { getCurrentUser } from './auth.js';
import { supabaseConfigured } from './supabase.js';

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const grid = document.querySelector('#requestMarketGrid');
const allRequestsBtn = document.querySelector('#allRequestsBtn');

// Kart başına slide boyutu (hero görünürlüğü için 4 kart → 1 slide).
const CARDS_PER_SLIDE = 4;
const ROTATE_MS = 4500;

function timeLabel(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function displayStatus(request) {
  if (request.status === 'closed') return 'closed';
  return request.responses.length ? 'answered' : 'active';
}

// Kartlar requests-home (ana sayfa) ve requests-search ("Parça Arayanı Bul")
// tarafından paylaşılır. Kişisel veri yalnızca mesajlaşmada açılır.
export function requestCardHtml(request, meId) {
  const status = displayStatus(request);
  const isOwner = Boolean(meId) && String(request.userId) === String(meId);
  const responded = Boolean(meId) && request.responses.some((response) => String(response.sellerId) === String(meId));
  const detailHref = '#/talep/' + encodeURIComponent(request.id);
  const incele = '<a class="request-card-btn" href="' + detailHref + '">İncele</a>';
  let respond;
  if (isOwner) respond = incele;
  else if (responded) respond = '<span class="responded-badge">✓ Cevap verdin</span>' + incele;
  else respond = '<button class="request-card-btn primary" data-respond-request="' + esc(request.id) + '">BENDE VAR</button>' + incele;
  return '<article class="request-card">'
    + '<span class="eyebrow">' + esc(request.partCategory || 'Parça Talebi') + '</span>'
    + '<h3>' + esc(request.partName) + '</h3>'
    + '<div class="request-card-vehicle"><span>📍 ' + esc(request.city || 'Türkiye') + '</span><small>' + esc(request.vehicleLabel || 'Araç belirtilmemiş') + '</small></div>'
    + '<div class="request-card-foot"><span class="status-badge ' + esc(status) + '">' + esc(REQUEST_STATUS_LABELS[status] || status) + '</span><small class="request-card-date">' + esc(timeLabel(request.createdAt)) + '</small></div>'
    + '<div class="request-card-actions">' + respond + '</div>'
    + '</article>';
}

function chunkCards(cards, size) {
  const out = [];
  for (let i = 0; i < cards.length; i += size) out.push(cards.slice(i, i + size));
  return out;
}

function reduceMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Yavaş rotator: 4 kartlık slide'lar arasında otomatik geçiş.
// Hover/focus/touch'ta duraklar; tercih "reduced-motion" ise otomatik dönmez.
let resizeBound = false;

function mountCarousel(container, slides, meId) {
  const track = document.createElement('div');
  track.className = 'request-carousel-track';
  track.innerHTML = slides.map((cards) => '<div class="request-carousel-slide"><div class="listing-grid request-grid">' + cards.map((request) => requestCardHtml(request, meId)).join('') + '</div></div>').join('');

  const nav = document.createElement('div');
  nav.className = 'request-carousel-nav';
  const prev = document.createElement('button');
  prev.className = 'carousel-arrow';
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Önceki');
  prev.textContent = '←';
  const next = document.createElement('button');
  next.className = 'carousel-arrow';
  next.type = 'button';
  next.setAttribute('aria-label', 'Sonraki');
  next.textContent = '→';
  const dots = document.createElement('div');
  dots.className = 'carousel-dots';
  dots.innerHTML = slides.map((_, index) => '<button type="button" data-carousel-dot="' + index + '" aria-label="Slayt ' + (index + 1) + '"></button>').join('');

  container.innerHTML = '';
  container.appendChild(track);
  if (slides.length > 1) {
    nav.appendChild(prev);
    nav.appendChild(dots);
    nav.appendChild(next);
    container.appendChild(nav);
  }

  let current = 0;
  let timer = null;

  const go = (index) => {
    current = (index + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + current * 100 + '%)';
    dots.querySelectorAll('[data-carousel-dot]').forEach((dot, index) => dot.classList.toggle('active', index === current));
  };

  const start = () => {
    if (reduceMotion() || slides.length < 2) return;
    stop();
    timer = window.setInterval(() => go(current + 1), ROTATE_MS);
  };
  const stop = () => {
    if (timer) { window.clearInterval(timer); timer = null; }
  };

  nav.addEventListener('click', (event) => {
    const dot = event.target.closest('[data-carousel-dot]');
    if (dot) { go(Number(dot.dataset.carouselDot)); start(); return; }
    if (event.target.closest('[data-carousel-prev]')) { go(current - 1); start(); return; }
    if (event.target.closest('[data-carousel-next]')) { go(current + 1); start(); return; }
  });
  container.addEventListener('mouseenter', stop);
  container.addEventListener('mouseleave', start);
  container.addEventListener('focusin', stop);
  container.addEventListener('focusout', start);

  let swipeStartX = 0;
  container.addEventListener('touchstart', (event) => {
    stop();
    swipeStartX = event.touches && event.touches[0] ? event.touches[0].clientX : 0;
  }, { passive: true });
  container.addEventListener('touchend', (event) => {
    const deltaX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX - swipeStartX : 0;
    if (deltaX < -40) go(current + 1);
    else if (deltaX > 40) go(current - 1);
    start();
  }, { passive: true });
  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener('resize', start);
  }

  go(0);
  start();
}

export async function renderRequestMarket() {
  if (!grid) return;
  let meId = '';
  try {
    const user = await getCurrentUser().catch(() => null);
    meId = user ? user.id : '';
  } catch { /* giriş yapılmamış olabilir */ }
  let requests = [];
  if (supabaseConfigured) {
    try { requests = (await getActivePartRequests()) || []; } catch (error) { console.error('Talep listesi yüklenemedi.', error); }
  }
  if (!requests.length) {
    grid.innerHTML = '<div class="empty"><strong>Şu an aktif talep yok</strong><span>Alıcılar parça talep ettikçe burada görünecek. Sen de "Parça Arıyorum" ile talep oluşturabilirsin.</span></div>';
    return;
  }
  const cards = requests.slice(0, 12);
  if (cards.length <= CARDS_PER_SLIDE) {
    grid.className = 'listing-grid request-grid';
    grid.innerHTML = cards.map((request) => requestCardHtml(request, meId)).join('');
    return;
  }
  grid.className = 'request-carousel';
  const slides = chunkCards(cards, CARDS_PER_SLIDE);
  mountCarousel(grid, slides, meId);
}

if (allRequestsBtn) {
  allRequestsBtn.addEventListener('click', () => {
    if (window.__requireMember) {
      window.__requireMember(() => {
        if (window.__openAccountCenter) window.__openAccountCenter('musteri-talepleri');
      });
    }
  });
}

window.addEventListener('parca:requests-updated', renderRequestMarket);

renderRequestMarket();
