import { getCurrentUser } from './auth.js';

function openMobileAccount() {
  const link = document.querySelector('#accountLink');
  if (!link || link.dataset.accountEntryBound === '1') return;
  link.dataset.accountEntryBound = '1';
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const user = await getCurrentUser().catch(() => null);
    if (user) {
      if (window.__openAccountCenter) {
        window.__openAccountCenter('profilim');
        return;
      }
      window.location.assign('/profilim');
      return;
    }
    if (window.__openAuth) {
      window.__openAuth();
      return;
    }
    document.querySelector('#loginBtn')?.click();
  });
}

function ensureMobileLoginAction() {
  const slot = document.querySelector('#authSlot');
  if (!slot || document.querySelector('.mobile-login-entry')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mobile-login-entry';
  button.textContent = 'Giriş Yap';
  button.addEventListener('click', () => {
    if (window.__openAuth) window.__openAuth();
    else document.querySelector('#loginBtn')?.click();
  });
  slot.insertBefore(button, slot.firstChild);
}

function init() {
  openMobileAccount();
  getCurrentUser().then((user) => {
    if (!user) ensureMobileLoginAction();
  }).catch(() => ensureMobileLoginAction());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

new MutationObserver(() => {
  openMobileAccount();
  if (!document.querySelector('#accountBtn')) ensureMobileLoginAction();
}).observe(document.body, { childList: true, subtree: true });
