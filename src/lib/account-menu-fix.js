// Account sidebar navigation hardening.
// The account center is rendered dynamically, so delegation is required.
// Capture phase guarantees the sidebar buttons receive the click before any
// unrelated document-level handlers can consume it.
document.addEventListener('click', (event) => {
  const paneButton = event.target.closest?.('.account-menu [data-pane]');
  if (!paneButton) return;

  const pane = paneButton.dataset.pane;
  if (!pane || typeof window.__openAccountCenter !== 'function') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.__openAccountCenter(pane);
}, true);
