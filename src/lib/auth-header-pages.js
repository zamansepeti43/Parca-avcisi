function convertAuthButtons() {
  const slot = document.querySelector('#authSlot');
  if (!slot) return;

  const login = slot.querySelector('#loginBtn');
  if (login && login.tagName !== 'A') {
    const link = document.createElement('a');
    link.id = 'loginBtn';
    link.className = login.className;
    link.href = '/giris';
    link.textContent = 'Giriş Yap';
    login.replaceWith(link);
  }

  const signup = slot.querySelector('#signupBtn');
  if (signup && signup.tagName !== 'A') {
    const link = document.createElement('a');
    link.id = 'signupBtn';
    link.className = signup.className;
    link.href = '/kayit';
    link.textContent = 'Kayıt Ol';
    signup.replaceWith(link);
  }
}

convertAuthButtons();
const observer = new MutationObserver(convertAuthButtons);
observer.observe(document.body, { childList: true, subtree: true });
