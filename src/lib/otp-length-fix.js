const OTP_LENGTH = 6;
const OTP_PATTERN = '[0-9]{6}';

function normalizeOtpInput(root = document) {
  const emailInput = root.querySelector?.('#signupEmailVerifyForm input[name="emailOtp"]');
  if (!emailInput) return;
  emailInput.maxLength = OTP_LENGTH;
  emailInput.minLength = OTP_LENGTH;
  emailInput.pattern = OTP_PATTERN;
  emailInput.placeholder = '6 haneli e-posta kodu';
  emailInput.setAttribute('aria-label', '6 haneli e-posta doğrulama kodu');
}

function rejectInvalidEmailOtp(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'signupEmailVerifyForm') return;
  const token = String(form.elements.emailOtp?.value || '').trim();
  if (/^\d{6}$/.test(token)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const status = form.querySelector('[data-signup-email-status]');
  if (status) status.textContent = 'E-posta doğrulama kodunu 6 hane olarak gir.';
}

document.addEventListener('submit', rejectInvalidEmailOtp, true);

if (document.body) {
  normalizeOtpInput();
  new MutationObserver(() => normalizeOtpInput()).observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    normalizeOtpInput();
    new MutationObserver(() => normalizeOtpInput()).observe(document.body, { childList: true, subtree: true });
  }, { once: true });
}
