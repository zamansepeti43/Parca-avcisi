/* Keep the original compact P mark inside the hamburger trigger on the home header. */
const applyHeaderLogo = () => {
  const trigger = document.querySelector('.site-header .menu-trigger[data-open-categories]');
  const brand = document.querySelector('.site-header .brand-logo');
  if (!trigger) return false;

  if (!trigger.querySelector('.menu-trigger-logo')) {
    trigger.innerHTML = '<img class="menu-trigger-logo" src="/app-logo.png" alt="" aria-hidden="true">';
  }
  trigger.setAttribute('aria-label', 'Kategoriler menüsünü aç');
  trigger.style.padding = '3px';
  trigger.style.overflow = 'hidden';
  trigger.style.background = 'transparent';
  const logo = trigger.querySelector('.menu-trigger-logo');
  if (logo) {
    logo.style.display = 'block';
    logo.style.width = '34px';
    logo.style.height = '34px';
    logo.style.maxWidth = '34px';
    logo.style.maxHeight = '34px';
    logo.style.objectFit = 'contain';
    logo.style.margin = '0 auto';
  }

  /* On phones the old large centered brand must not occupy the header. */
  if (brand) {
    brand.style.display = window.matchMedia('(max-width: 700px)').matches ? 'none' : '';
  }
  return true;
};

const observer = new MutationObserver(() => applyHeaderLogo());
observer.observe(document.documentElement, { childList: true, subtree: true });
applyHeaderLogo();
