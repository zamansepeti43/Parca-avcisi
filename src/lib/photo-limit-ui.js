const MAX_PHOTOS = 5;

function photoCountInForm(input) {
  const form = input.closest('form');
  if (!form) return 0;
  return form.querySelectorAll('[data-photo-index]').length;
}

function showPhotoLimitNotice() {
  window.__showToast?.('Bir ilanda en fazla 5 fotoğraf olabilir.');
  const toast = document.querySelector('#toast');
  if (toast && !toast.classList.contains('show')) {
    toast.textContent = 'Bir ilanda en fazla 5 fotoğraf olabilir.';
    toast.classList.add('show');
    window.clearTimeout(showPhotoLimitNotice.timer);
    showPhotoLimitNotice.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }
}

function trimFileList(input, files, allowedCount) {
  if (files.length <= allowedCount) return files;
  if (allowedCount <= 0) {
    input.value = '';
    return [];
  }

  // Modern Chromium/Firefox/Safari destekler; desteklenmeyen bir tarayıcıda
  // mevcut seçim tamamen reddedilir ve kullanıcı tekrar seçim yapabilir.
  if (typeof DataTransfer !== 'function') {
    input.value = '';
    return [];
  }

  const transfer = new DataTransfer();
  files.slice(0, allowedCount).forEach((file) => transfer.items.add(file));
  try {
    input.files = transfer.files;
    return [...input.files];
  } catch (_) {
    input.value = '';
    return [];
  }
}

// Capture aşamasında çalışır: ui-flows.js'nin kendi change handler'ı devreye
// girmeden önce FileList'i maksimum 5'e indirir. Böylece arayüzde de limit
// gerçekten uygulanır; backend sınırı ayrıca korunur.
document.addEventListener('change', (event) => {
  const input = event.target.closest?.('[data-photo-input]');
  if (!input) return;

  const existing = photoCountInForm(input);
  const selected = [...(input.files || [])];
  const allowed = Math.max(0, MAX_PHOTOS - existing);
  if (selected.length > allowed) {
    trimFileList(input, selected, allowed);
    showPhotoLimitNotice();
  }
}, true);

// Dropzone'a tıklanırken zaten 5 fotoğraf varsa dosya seçiciyi açma.
document.addEventListener('click', (event) => {
  const add = event.target.closest?.('[data-photo-add]');
  if (!add) return;
  const form = add.closest('form');
  if (!form) return;
  if (form.querySelectorAll('[data-photo-index]').length >= MAX_PHOTOS) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showPhotoLimitNotice();
  }
}, true);
