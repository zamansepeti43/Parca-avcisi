// Mobile header: keep one category trigger and expose the listings page.
// This layer is intentionally scoped to <=640px so desktop navigation remains untouched.
function initMobileHeader() {
  const header = document.querySelector('.site-header');
  const navWrap = header?.querySelector('.nav-wrap');
  if (!header || !navWrap) return;

  // Older/mobile layers can leave more than one hamburger trigger in the header.
  // Keep the first real category trigger only.
  const triggers = [...header.querySelectorAll('.menu-trigger')];
  triggers.slice(1).forEach((trigger) => trigger.remove());

  let listingsButton = navWrap.querySelector('.mobile-listings-link');
  if (!listingsButton) {
    listingsButton = document.createElement('a');
    listingsButton.className = 'mobile-listings-link';
    listingsButton.href = '/ilanlar';
    listingsButton.setAttribute('aria-label', 'İlanlar');
    listingsButton.innerHTML = '<span aria-hidden="true">▤</span><small>İlanlar</small>';
    navWrap.insertBefore(listingsButton, navWrap.querySelector('.auth-slot') || navWrap.querySelector('#sellBtn'));
  }

  listingsButton.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = '/ilanlar';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileHeader, { once: true });
} else {
  initMobileHeader();
}
