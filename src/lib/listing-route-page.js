const isListingRoute = window.location.pathname.replace(/\/+$/, '') === '/ilan-ver';

async function boot() {
  if (!isListingRoute) return;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (typeof window.__openListingForm === 'function') {
      window.__openListingForm();
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
