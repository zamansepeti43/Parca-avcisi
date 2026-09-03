const TURNSTILE_SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
let turnstileReady = null;

async function loadTurnstile() {
  if (!TURNSTILE_SITE_KEY) throw new Error('VITE_TURNSTILE_SITE_KEY eksik.');
  if (window.turnstile) return window.turnstile;
  if (!turnstileReady) {
    turnstileReady = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
        existing.addEventListener('error', () => reject(new Error('Turnstile yüklenemedi.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile hazır değil.'));
      script.onerror = () => reject(new Error('Turnstile yüklenemedi.'));
      document.head.appendChild(script);
    });
  }
  return turnstileReady;
}

export function hasAuthCaptcha() {
  return Boolean(TURNSTILE_SITE_KEY);
}

export async function mountAuthCaptcha(container) {
  if (!container) throw new Error('Güvenlik doğrulama alanı bulunamadı.');
  const turnstile = await loadTurnstile();
  container.innerHTML = '';
  return new Promise((resolve, reject) => {
    let settled = false;
    const widgetId = turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'auto',
      callback: (token) => {
        if (!settled) {
          settled = true;
          resolve({ token, widgetId });
        }
      },
      'expired-callback': () => {
        settled = false;
        reject(new Error('İnsan doğrulamasının süresi doldu. Tekrar tamamla.'));
      },
      'error-callback': () => {
        settled = false;
        reject(new Error('İnsan doğrulaması başarısız. Tekrar dene.'));
      },
    });
    container.dataset.widgetId = String(widgetId);
  });
}

export function resetAuthCaptcha(widgetId) {
  if (window.turnstile && widgetId !== undefined && widgetId !== null) {
    try { window.turnstile.reset(widgetId); } catch {}
  }
}
