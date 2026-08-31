const CTA_TEXT = 'Parça Arıyorum';

function wireEmptyRequestCta() {
  const grid = document.querySelector('#requestMarketGrid');
  if (!grid) return;
  if (!grid.querySelector('.empty')) return;
  if (grid.querySelector('[data-empty-request-cta]')) return;

  const empty = grid.querySelector('.empty');
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.emptyRequestCta = 'true';
  button.className = 'request-card-btn primary empty-request-cta';
  button.textContent = CTA_TEXT;
  button.addEventListener('click', () => {
    const candidates = [...document.querySelectorAll('button, a')];
    const target = candidates.find((el) => el.textContent.trim().toLocaleLowerCase('tr-TR') === CTA_TEXT.toLocaleLowerCase('tr-TR'));
    if (target && target !== button) target.click();
    else if (window.location.hash !== '#/talepler') window.location.hash = '#/talepler';
  });
  empty.appendChild(button);
}

wireEmptyRequestCta();
window.addEventListener('parca:requests-updated', wireEmptyRequestCta);
