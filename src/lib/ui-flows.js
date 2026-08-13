import './flows.css';
import { VehicleResolver } from './vehicle-resolver.js';
import { getCurrentUser, signIn, signUp } from './auth.js';
import { createListing } from './listings.js';
import { supabaseConfigured } from './supabase.js';

const resolver = new VehicleResolver();
let selection = { type: '', make: '', model: '', generation: '', year: '', engine: '' };
let pendingAction = null;

const vehicleSection = document.querySelector('#aracini-sec');
vehicleSection.innerHTML = '<div class="container vehicle-card vehicle-picker"><div><span class="eyebrow">AKILLI ARAÇ SEÇİCİ</span><h2>Aracını seç, uyumlu parçayı bul.</h2><p>Araç tipiyle başla; katalog kapsamı olan alanlar sırayla açılır.</p></div><form class="vehicle-form vehicle-hierarchy" id="vehicleHierarchy"></form></div>';

const fields = [
  ['type', 'Araç Tipi'], ['make', 'Marka'], ['model', 'Model'],
  ['generation', 'Kasa / Nesil'], ['year', 'Yıl'], ['engine', 'Motor / Versiyon'],
];

function optionsHtml(field) {
  const options = field === 'type' ? resolver.getOptions({}, 'type') : resolver.getOptions(selection, field);
  const disabled = field !== 'type' && !selection[fields[fields.findIndex(([key]) => key === field) - 1]?.[0]];
  const unavailable = field === 'engine' && options.length === 0 && selection.year;
  return '<label><span>' + fields.find(([key]) => key === field)[1] + '</span><select data-vehicle-field="' + field + '" ' + (disabled ? 'disabled' : '') + '><option value="">' + (unavailable ? 'Bu kaynakta veri yok' : 'Seçiniz') + '</option>' + options.map((item) => '<option value="' + item + '" ' + (selection[field] === String(item) ? 'selected' : '') + '>' + item + '</option>').join('') + '</select></label>';
}

function renderPicker() {
  const form = document.querySelector('#vehicleHierarchy');
  form.innerHTML = fields.map(([field]) => optionsHtml(field)).join('') + '<button type="submit">Uyumlu Parçaları Göster</button>';
}

renderPicker();

document.querySelector('#vehicleHierarchy').addEventListener('change', (event) => {
  const field = event.target.dataset.vehicleField;
  if (!field) return;
  selection[field] = event.target.value;
  const index = fields.findIndex(([key]) => key === field);
  fields.slice(index + 1).forEach(([key]) => { selection[key] = ''; });
  renderPicker();
});

document.querySelector('#vehicleHierarchy').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!selection.model) return showToast('Lütfen araç tipi, marka ve model seç.');
  const query = [selection.make, selection.model, selection.generation, selection.year, selection.engine].filter(Boolean).join(' ');
  document.querySelector('#searchInput').value = query;
  document.querySelector('#searchForm').dispatchEvent(new Event('submit', { cancelable: true }));
});

document.querySelector('.search-box').insertAdjacentHTML('afterend', '<div class="search-paths"><button type="button" data-open-picker>Aracını Seç</button><span>veya</span><button type="button" data-focus-oem>Parça / OEM No Ara</button><small>VIN ile arama yakında</small></div>');

document.body.insertAdjacentHTML('beforeend', '<div class="app-modal" id="appModal" aria-hidden="true"><div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="Kapat">×</button><div id="modalContent"></div></div></div>');
const modal = document.querySelector('#appModal');
const content = document.querySelector('#modalContent');

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}
function openModal(html) { content.innerHTML = html; modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); pendingAction = null; }
async function requireMember(action) {
  const user = await getCurrentUser().catch(() => null);
  if (user) return action();
  pendingAction = action;
  openAuth();
}
function openAuth() {
  openModal('<span class="eyebrow">PARÇA AVCISI ÜYELİK</span><h2>İlan vermek için ücretsiz üye olmalısınız.</h2><p>İlan detaylarını görmek, favori kaydetmek ve ilan vermek için giriş yapın.</p><form id="authForm" class="stack-form"><input name="fullName" placeholder="Ad soyad (kayıt için)"><input name="email" type="email" required placeholder="E-posta"><input name="password" type="password" required minlength="6" placeholder="Şifre (en az 6 karakter)"><button name="mode" value="login">Giriş Yap</button><button name="mode" value="signup" class="secondary">Ücretsiz Kayıt Ol</button></form>');
}
function openListingForm() {
  openModal('<span class="eyebrow">YENİ İLAN</span><h2>İlanını hazırla</h2><form id="listingForm" class="stack-form"><select name="condition" required><option value="">Durum</option><option value="new">Sıfır</option><option value="used">2. El</option><option value="salvage">Çıkma</option></select><input name="vehicle" value="' + [selection.type, selection.make, selection.model, selection.generation, selection.year, selection.engine].filter(Boolean).join(' · ') + '" placeholder="Araç bilgisi" required><input name="category" placeholder="Parça kategorisi" required><input name="partName" placeholder="Parça adı" required><input name="oemNumber" placeholder="OEM / parça numarası"><textarea name="description" placeholder="Açıklama"></textarea><input name="price" type="number" min="0" required placeholder="Fiyat"><input name="city" required placeholder="Şehir"><input name="photos" type="file" multiple accept="image/*"><button>Önizlemeye Geç</button></form>');
}
function openPreview(data) {
  openModal('<span class="eyebrow">İLAN ÖNİZLEME</span><h2>' + escapeHtml(data.partName) + '</h2><div class="preview-grid"><b>' + escapeHtml(data.vehicle) + '</b><span>' + escapeHtml(data.category) + ' · ' + escapeHtml(data.condition) + '</span><strong>' + Number(data.price).toLocaleString('tr-TR') + ' TL</strong><span>' + escapeHtml(data.city) + '</span></div><p>' + escapeHtml(data.description || 'Açıklama eklenmedi.') + '</p><button id="publishListing">Taslak ilanı oluştur</button>');
  document.querySelector('#publishListing').onclick = async () => {
    try { await createListing({ title: data.partName, description: data.description, condition: data.condition, price: data.price, city: data.city, oemNumber: data.oemNumber }); closeModal(); showToast('Taslak ilan oluşturuldu.'); }
    catch (error) { showToast(error.message || 'İlan oluşturulamadı.'); }
  };
}
function openDetail(id) {
  const card = document.querySelector('[data-detail="' + id + '"]')?.closest('.listing-card');
  openModal('<span class="eyebrow">İLAN DETAYI</span><h2>' + escapeHtml(card?.querySelector('h3')?.textContent || 'İlan') + '</h2><div class="detail-photo">PARÇA AVCISI</div><p>' + escapeHtml(card?.querySelector('p')?.textContent || 'Araç uyumluluğu belirtilmemiş') + '</p><p><strong>' + escapeHtml(card?.querySelector('.price')?.textContent || '') + '</strong> · ' + escapeHtml(card?.querySelector('.listing-meta')?.textContent || '') + '</p><button data-contact>Satıcıyla iletişim başlat</button>');
}
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;', "'":'&#39;','"':'&quot;' }[c])); }

document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-close-modal]') || event.target === modal) closeModal();
  if (event.target.closest('[data-open-picker]')) vehicleSection.scrollIntoView({ behavior: 'smooth' });
  if (event.target.closest('[data-focus-oem]')) { document.querySelector('#searchInput').focus(); document.querySelector('#searchInput').placeholder = 'OEM / parça numarası ara...'; }
  if (event.target.closest('#sellBtn, #mobileSell')) { event.preventDefault(); await requireMember(openListingForm); }
  const detail = event.target.closest('[data-detail]');
  if (detail) { event.preventDefault(); event.stopImmediatePropagation(); await requireMember(() => openDetail(detail.dataset.detail)); }
  if (event.target.closest('[data-contact]')) showToast('Mesajlaşma bir sonraki MVP adımında açılacak.');
}, true);

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'authForm') {
    event.preventDefault();
    const data = new FormData(event.target); const mode = event.submitter?.value;
    try {
      if (!supabaseConfigured) throw new Error('Üyelik için Supabase bağlantısı henüz yapılandırılmadı.');
      mode === 'signup' ? await signUp({ email: data.get('email'), password: data.get('password'), fullName: data.get('fullName') }) : await signIn({ email: data.get('email'), password: data.get('password') });
      closeModal(); showToast(mode === 'signup' ? 'Kayıt tamamlandı. E-postanı kontrol et.' : 'Giriş yapıldı.');
      if (pendingAction) pendingAction();
    } catch (error) { showToast(error.message || 'İşlem tamamlanamadı.'); }
  }
  if (event.target.id === 'listingForm') {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); openPreview(data);
  }
});
