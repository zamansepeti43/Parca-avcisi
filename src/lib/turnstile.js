const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SITE_KEY = String(import.meta.env?.VITE_TURNSTILE_SITE_KEY || '').trim();
let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="https://challenges.cloudflare.com/turnstile/"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile));
      existing.addEventListener('error', () => reject(new Error('Turnstile yüklenemedi.')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile başlatılamadı.'));
    script.onerror = () => reject(new Error('Turnstile yüklenemedi.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function getContainer(form) {
  let container = form.querySelector('[data-turnstile]');
  if (!container) {
    container = document.createElement('div');
    container.dataset.turnstile = 'true';
    container.className = 'turnstile-box';
    const submit = form.querySelector('button[type="submit"], button:not([type])');
    if (submit) form.insertBefore(container, submit);
    else form.appendChild(container);
  }
  return container;
}

export async function mountSignupTurnstile(form) {
  if (!(form instanceof HTMLFormElement)) return false;
  if (!SITE_KEY) {
    form.dataset.turnstileReady = 'missing-key';
    return false;
  }
  const container = getContainer(form);
  try {
    const turnstile = await loadScript();
    if (container.dataset.widgetId) return true;
    const widgetId = turnstile.render(container, {
      sitekey: SITE_KEY,
      theme: 'dark',
      callback: (token) => { form.dataset.turnstileToken = token; },
      'expired-callback': () => { delete form.dataset.turnstileToken; },
      'error-callback': () => { delete form.dataset.turnstileToken; },
    });
    container.dataset.widgetId = String(widgetId);
    form.dataset.turnstileReady = 'ready';
    return true;
  } catch (error) {
    form.dataset.turnstileReady = 'error';
    return false;
  }
}

export function getTurnstileToken(form) {
  return String(form?.dataset?.turnstileToken || '').trim();
}

export function resetSignupTurnstile(form) {
  const id = form?.querySelector('[data-turnstile]')?.dataset?.widgetId;
  if (id && window.turnstile) {
    try { window.turnstile.reset(id); } catch {}
  }
  if (form) delete form.dataset.turnstileToken;
}

const observer = new MutationObserver(() => {
  const form = document.querySelector('#signupForm');
  if (form && form.dataset.turnstileMounted !== 'true') {
    form.dataset.turnstileMounted = 'true';
    mountSignupTurnstile(form);
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.__parcaTurnstile = { mountSignupTurnstile, getTurnstileToken, resetSignupTurnstile };
