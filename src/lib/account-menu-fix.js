// Account sidebar navigation hardening.
// Menu items are real routes. The previous handler opened the account modal,
// which prevented account-page-navigation.js from ever receiving the click.
document.addEventListener('click', (event) => {
  const paneButton = event.target.closest?.('.account-menu [data-pane]');
  if (!paneButton) return;

  const pane = paneButton.dataset.pane;
  if (!pane) return;

  const navigation = window.__accountPageNavigation;
  if (navigation?.navigateToPane?.(pane)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
