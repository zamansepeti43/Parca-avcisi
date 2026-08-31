// Add Araçlarım to the existing expandable account section without replacing the menu implementation.
function addVehiclesMenuItem() {
  const list = document.querySelector('.category-drawer .account-menu-list');
  if (!list || list.querySelector('[data-account-pane="araclarim"]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'account-menu-link';
  button.dataset.accountPane = 'araclarim';
  button.innerHTML = '<span aria-hidden="true">🚗</span><strong>Araçlarım</strong>';
  list.insertBefore(button, list.querySelector('[data-account-signout-menu]') || null);
}

function bootVehiclesMenuItem() {
  addVehiclesMenuItem();
  const observer = new MutationObserver(addVehiclesMenuItem);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootVehiclesMenuItem, { once: true });
else bootVehiclesMenuItem();
