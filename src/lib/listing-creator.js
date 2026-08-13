import './listing-creator.css';
import { ListingAnalyzer } from './listing-analyzer.js';
import { getCurrentUser } from './auth.js';
import { createListing } from './listings.js';

const analyzer = new ListingAnalyzer();
const modal = document.querySelector('#appModal');
const content = document.querySelector('#modalContent');
const toast = document.querySelector('#toast');
const esc = (v) => String(v || '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;', "'":'&#39;','"':'&quot;' }[c]));
function open(html) { content.innerHTML = html; modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }
function notice(message) { toast.textContent=message; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2600); }

async function openChoices() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) { open('<span class="eyebrow">ÜYELİK GEREKLİ</span><h2>İlan vermek için ücretsiz üye olmalısınız.</h2><p>Giriş veya kayıt ekranını kullanarak devam edin.</p>'); return; }
  open('<span class="eyebrow">KOLAY İLAN VER</span><h2>Parçanın fotoğrafını çek. İlanını biz hazırlayalım.</h2><div class="creator-options"><button data-photo-flow><b>📸</b><strong>Fotoğraftan İlan Oluştur</strong><small>Fotoğraf → otomatik taslak → kontrol → yayınla</small></button><button data-bulk-flow><b>📦</b><strong>Toplu İlan Oluştur</strong><small>Birden fazla fotoğraftan ayrı taslaklar</small></button><button data-manual-flow><b>✍️</b><strong>Manuel İlan</strong><small>Alanları kendin doldur</small></button></div>');
}
function upload(multiple) {
  open('<span class="eyebrow">FOTOĞRAFTAN TASLAK</span><h2>Fotoğrafları seç</h2><p>Etiket/OEM analizi için altyapı hazır. Sonuçlar yayınlanmadan önce mutlaka kontrol edilir.</p><input id="analyzeFiles" type="file" accept="image/*" ' + (multiple ? 'multiple' : '') + '><button id="startAnalysis">Taslakları hazırla</button>');
  document.querySelector('#startAnalysis').onclick = async () => {
    const files = [...document.querySelector('#analyzeFiles').files];
    if (!files.length) return notice('En az bir fotoğraf seç.');
    const drafts = await Promise.all(files.map((file) => analyzer.analyze(file)));
    renderDrafts(drafts, multiple);
  };
}
function renderDrafts(drafts, bulk) {
  open('<span class="eyebrow">OTOMATİK TASLAKLAR</span><h2>Bilgileri kontrol edin</h2><p class="confidence-note">AI tahminleri kesin araç/parça uyumluluğu değildir. Yayınlamadan önce her alanı düzeltin.</p><div id="draftList">' + drafts.map((d,i)=>'<form class="ai-draft" data-draft="'+i+'"><small class="analysis-result">Güven: %'+d.confidence+' · OCR: '+esc(d.evidence?.ocr)+' · Görsel: '+esc(d.evidence?.vision)+'</small><input name="brand" value="'+esc(d.brand)+'" placeholder="Marka"><input name="partName" value="'+esc(d.partName)+'" placeholder="Parça adı"><input name="title" value="'+esc(d.title)+'" placeholder="İlan başlığı"><input name="oemNumber" placeholder="OEM / parça no"><input name="category" placeholder="Kategori"><input name="vehicle" value="'+esc(d.vehicle)+'" placeholder="Araç bilgisi"><textarea name="description" placeholder="Açıklama"></textarea><input name="price" type="number" min="0" placeholder="Fiyat"><input name="city" placeholder="Şehir"><select name="condition"><option value="used">2. El</option><option value="new">Sıfır</option><option value="salvage">Çıkma</option></select></form>').join('')+'</div><button id="publishDrafts">'+(bulk ? 'Seçili taslakları oluştur' : 'Taslağı oluştur')+'</button>');
  document.querySelector('#publishDrafts').onclick = async () => {
    const forms=[...document.querySelectorAll('.ai-draft')]; let count=0;
    for (const form of forms) { const d=Object.fromEntries(new FormData(form)); if (!d.partName || !d.price || !d.city) continue; await createListing({title:d.title||d.partName,description:d.description,condition:d.condition,price:d.price,city:d.city,oemNumber:d.oemNumber}); count++; }
    notice(count ? count+' taslak ilan oluşturuldu.' : 'Parça adı, fiyat ve şehir alanlarını doldur.');
  };
}
document.addEventListener('click', (event) => {
  if (window.__openManualListing) { window.__openManualListing = false; return; }
  if (!event.target.closest('#sellBtn,#mobileSell')) return;
  event.preventDefault(); event.stopImmediatePropagation(); openChoices();
}, true);
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-photo-flow]')) upload(false);
  if (event.target.closest('[data-bulk-flow]')) upload(true);
  if (event.target.closest('[data-manual-flow]')) { modal.classList.remove('show'); window.__openManualListing = true; document.querySelector('#sellBtn').click(); }
});
