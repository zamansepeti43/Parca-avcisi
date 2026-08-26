import './listing-entry-flow.css';

const modal = () => document.querySelector('#appModal');
const content = () => document.querySelector('#modalContent');

function show(html) {
  const root = modal();
  if (!root || !content()) return;
  content().innerHTML = html;
  root.querySelector('.modal-card')?.classList.remove('account-wide');
  root.classList.add('show');
  root.setAttribute('aria-hidden', 'false');
}

function close() {
  if (window.__closeModal) window.__closeModal();
  else modal()?.classList.remove('show');
}

function requestAction() {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.openRequest = '';
  button.hidden = true;
  document.body.appendChild(button);
  button.click();
  button.remove();
}

function optionCards(kind) {
  const request = kind === 'request';
  const title = request ? 'Talep oluşturma seçenekleri' : 'İlan oluşturma seçenekleri';
  const cards = request ? [
    ['single', '📝', 'Tekli Talep Oluştur', 'Tek bir parça için talep oluştur.'],
    ['photo', '📸', 'Fotoğraflı Talep Oluştur', 'Fotoğraf ekleyerek parçayı daha net tarif et.'],
    ['drafts', '📂', 'Taleplerim', 'Kayıtlı taleplerini görüntüle ve düzenle.'],
  ] : [
    ['single', '📷', 'Tekli İlan Oluştur', 'Tek bir parça için ilan oluştur.'],
    ['bulk', '▱', 'AI Çoklu İlan Oluştur', 'Birden fazla parçayı AI destekli taslaklarla hızlıca oluştur.'],
    ['photo', '✦', 'AI İlan Oluştur', 'Fotoğrafı analiz et, otomatik taslağı kontrol ederek ilanını hazırla.'],
    ['drafts', '📂', 'Taslaklarım', 'Kayıtlı taslak ilanlarını görüntüle ve düzenle.'],
  ];
  return '<section class="entry-options"><h3>' + title + '</h3><div class="entry-option-list">' + cards.map(([action, icon, label, desc]) =>
    '<button type="button" class="entry-option" data-entry-action="' + action + '"><span class="entry-option-icon">' + icon + '</span><span class="entry-option-copy"><strong>' + label + '</strong><small>' + desc + '</small></span><span class="entry-option-arrow">›</span></button>'
  ).join('') + '</div></section>';
}

function render(kind) {
  const request = kind === 'request';
  show('<span class="eyebrow">PARÇA AVCISI</span><h2>Ne yapmak istiyorsun?</h2><p class="entry-lead">Önce işlemi seç, ardından nasıl oluşturmak istediğini belirle.</p><div class="entry-type-switch" role="tablist" aria-label="İşlem türü">'
    + '<button type="button" class="entry-type ' + (request ? 'selected' : '') + '" data-entry-kind="request" role="tab" aria-selected="' + request + '"><span>🔎</span><strong>Parça Arıyorum</strong><small>Bulamadığın parçayı talep et.</small><i>✓</i></button>'
    + '<button type="button" class="entry-type ' + (!request ? 'selected' : '') + '" data-entry-kind="sell" role="tab" aria-selected="' + (!request) + '"><span>🔧</span><strong>Parça Satıyorum</strong><small>Sıfır, 2. el veya çıkma parçanı ilanla.</small><i>✓</i></button>'
    + '</div>' + optionCards(kind) + '<div class="entry-tip">💡 Doğru kategori, araç bilgisi ve fotoğraf eklemek parçanın daha hızlı bulunmasını sağlar.</div>');
}

async function start(kind) {
  if (window.__requireMember) {
    await window.__requireMember(() => render(kind));
    return;
  }
  render(kind);
}

document.addEventListener('click', async (event) => {
  const trigger = event.target.closest('#sellBtn, #mobileSell');
  if (trigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    await start('sell');
    return;
  }

  const kindButton = event.target.closest('[data-entry-kind]');
  if (kindButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    render(kindButton.dataset.entryKind === 'request' ? 'request' : 'sell');
    return;
  }

  const option = event.target.closest('[data-entry-action]');
  if (!option) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const kind = document.querySelector('.entry-type.selected')?.dataset.entryKind || 'sell';
  const action = option.dataset.entryAction;
  close();

  if (kind === 'sell') {
    if (action === 'single') window.__openListingForm?.();
    else if (action === 'photo') window.__openPhotoListing?.() || window.__openEasyListing?.();
    else if (action === 'bulk') window.__openBulkListing?.() || window.__openEasyListing?.();
    else if (action === 'drafts') window.__openAccountCenter?.('ilanlarim');
    return;
  }

  if (action === 'single' || action === 'photo') requestAction();
  else if (action === 'drafts') window.__openAccountCenter?.('taleplerim');
});
