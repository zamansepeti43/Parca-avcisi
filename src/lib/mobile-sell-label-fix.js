/* Keep the central mobile sell label below the raised + button. */
(function installMobileSellLabelFix() {
  const STYLE_ID = 'mobile-sell-label-fix-css';
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 760px) {
      .mobile-nav #mobileSell small,
      .mobile-nav .account-mobile-sell small {
        top: 55px !important;
        bottom: auto !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 20 !important;
        line-height: 1.1 !important;
        pointer-events: none !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
