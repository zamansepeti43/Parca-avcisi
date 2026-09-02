const slot = document.querySelector('#authSlot');

if (slot && !slot.childElementCount) {
  slot.innerHTML = '<button class="outline-btn auth-btn" id="loginBtn" type="button">Giriş Yap</button><button class="outline-btn auth-btn gold" id="signupBtn" type="button">Kayıt Ol</button>';
}
