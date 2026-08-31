// Safe VIN UI bridge. Keeps ui-flows.js untouched while exposing the existing VIN search action.
function initVinUiBridge() {
  const paths = document.querySelector('.search-paths');
  const input = document.querySelector('#searchInput');
  if (!paths || !input) return;
  const legacy = paths.querySelector('small');
  if (legacy && /VIN ile arama yakında/i.test(legacy.textContent || '')) legacy.remove();
  let button = paths.querySelector('[data-vin-bridge]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.dataset.vinBridge = 'true';
    button.textContent = 'VIN / Şase No Ara';
    paths.appendChild(button);
  }
  if (button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    input.placeholder = '17 haneli VIN / şase numarası gir...';
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVinUiBridge);
else initVinUiBridge();
