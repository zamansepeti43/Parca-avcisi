import { reportListing } from './listing-reports.js';

function injectReportButton() {
  const actions = document.querySelector('#listingDetail .detail-actions');
  if (!actions || actions.querySelector('[data-detail-report]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'detail-action-btn';
  button.dataset.detailReport = '';
  button.textContent = 'İlanı Bildir';
  actions.appendChild(button);
}

async function handleReport() {
  const button = document.querySelector('[data-detail-report]');
  const match = /^#\/ilan\/([^#]+)$/.exec(window.location.hash || '');
  if (!match) return;
  if (button) button.disabled = true;
  try {
    const ok = await window.__requireMember(() => reportListing(decodeURIComponent(match[1])));
    if (ok) window.__showToast?.('İlan bildirimin alındı. Teşekkürler.');
  } catch (error) {
    window.__showToast?.(error.message || 'İlan bildirilemedi.');
  } finally {
    if (button) button.disabled = false;
  }
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-detail-report]')) return;
  handleReport();
});

const observer = new MutationObserver(injectReportButton);
observer.observe(document.body, { childList: true, subtree: true });
injectReportButton();
