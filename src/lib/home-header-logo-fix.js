/* Keep the original compact mobile brand mark in the hamburger trigger. */
const applyHeaderLogo = () => {
  const trigger = document.querySelector('.site-header .menu-trigger[data-open-categories]');
  if (!trigger) return false;

  trigger.innerHTML = '<img class="menu-trigger-logo" src="/app-logo.png" alt="" aria-hidden="true">';
  trigger.setAttribute('aria-label', 'Kategoriler menüsünü aç');
  return true;
};

const observer = new MutationObserver(() => {
  if (applyHeaderLogo()) observer.disconnect();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
applyHeaderLogo();
