import { REPORT_REASONS, submitListingReport } from './listing-reports.js';

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

function closeReportModal() { document.querySelector('[data-report-modal]')?.remove(); }

function openReportModal(listingId) {
  if (document.querySelector('[data-report-modal]')) return;
  const modal = document.createElement('div');
  modal.className = 'report-modal';
  modal.dataset.reportModal = '';
  modal.innerHTML = `<div class="report-backdrop" data-report-close></div><section class="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title"><button type="button" class="report-close" data-report-close aria-label="Kapat">×</button><div class="report-icon" aria-hidden="true">!</div><h2 id="report-title">İlanı Bildir</h2><p class="report-lead">Bu ilanla ilgili sorun olduğunu düşünüyorsan nedenini seç.</p><div class="report-reasons" role="radiogroup" aria-label="Bildirim nedeni">${REPORT_REASONS.map(([value, label]) => `<label class="report-reason"><input type="radio" name="listing-report-reason" value="${value}"><span>${label}</span></label>`).join('')}</div><label class="report-details"><span>Açıklama <small>(isteğe bağlı)</small></span><textarea maxlength="500" placeholder="Sorunu kısaca açıklayabilirsin..."></textarea></label><div class="report-error" data-report-error role="alert"></div><div class="report-actions"><button type="button" class="report-cancel" data-report-close>Vazgeç</button><button type="button" class="report-submit" data-report-submit>Bildiri Gönder</button></div></section>`;
  document.body.appendChild(modal);
  modal.querySelector('input[type="radio"]')?.focus();
  modal.addEventListener('click', async (event) => {
    if (event.target.closest('[data-report-close]')) return closeReportModal();
    const submit = event.target.closest('[data-report-submit]');
    if (!submit) return;
    const selected = modal.querySelector('input[name="listing-report-reason"]:checked');
    const errorBox = modal.querySelector('[data-report-error]');
    if (!selected) { errorBox.textContent = 'Lütfen bir bildirim nedeni seç.'; return; }
    submit.disabled = true; submit.textContent = 'Gönderiliyor...'; errorBox.textContent = '';
    try { await submitListingReport(listingId, selected.value, modal.querySelector('textarea')?.value || ''); closeReportModal(); window.__showToast?.('İlan bildirimin alındı. Teşekkürler.'); }
    catch (error) { errorBox.textContent = error.message || 'İlan bildirilemedi.'; submit.disabled = false; submit.textContent = 'Bildiri Gönder'; }
  });
}

async function handleReport() {
  const match = /^#\/ilan\/([^#]+)$/.exec(window.location.hash || '');
  if (!match) return;
  const ok = await window.__requireMember?.(() => openReportModal(decodeURIComponent(match[1])));
  if (ok === false) return;
}

document.addEventListener('click', (event) => { if (event.target.closest('[data-detail-report]')) handleReport(); });
const observer = new MutationObserver(injectReportButton);
observer.observe(document.body, { childList: true, subtree: true });
injectReportButton();
