// Keep Araçlarım visible in every account navigation variant.
function addVehiclesMenuItem() {
  const lists = [
    document.querySelector('.account-menu'),
    document.querySelector('.category-drawer .account-menu-list'),
    document.querySelector('.category-drawer .account-drawer-list')
  ].filter(Boolean);

  lists.forEach((list) => {
    if (list.querySelector('[data-account-pane="araclarim"], [data-pane="araclarim"], [data-saved-vehicles]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account-menu-link';
    button.dataset.accountPane = 'araclarim';
    button.dataset.pane = 'araclarim';
    button.innerHTML = '<span aria-hidden="true">🚗</span><strong>Araçlarım</strong>';

    // Araçlarım, Hesap menüsünde Profilim sekmesinin hemen altında görünmeli.
    // Profilim henüz oluşmadıysa güvenli şekilde listenin başına ekle.
    const profileItem = list.querySelector('[data-pane="profilim"], [data-account-pane="profilim"]');
    if (profileItem) {
      profileItem.insertAdjacentElement('afterend', button);
    } else {
      const before = list.querySelector('[data-account-signout], [data-account-signout-menu], .danger');
      list.insertBefore(button, before || list.firstChild || null);
    }

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign('/araclarim');
    }, true);
  });
}

function bootVehiclesMenuItem() {
  addVehiclesMenuItem();
  const observer = new MutationObserver(addVehiclesMenuItem);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootVehiclesMenuItem, { once: true });
else bootVehiclesMenuItem();
