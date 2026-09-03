const isListingRoute = window.location.pathname.replace(/\/+$/, '') === '/ilan-ver';

async function boot() {
  if (!isListingRoute) return;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const trigger = document.querySelector('[data-open-sell]') || document.querySelector('#sellBtn') || document.querySelector('#mobileSell');
    if (trigger) {
      trigger.click();
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
