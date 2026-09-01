import './listing-creator.css';
import { ListingAnalyzer } from './listing-analyzer.js';
import { getCurrentUser } from './auth.js';
import { createListing } from './listings.js';
import { attachImagesToListing } from './listing-images.js';
import { optimizeImageFiles } from './image-optimization.js';

const analyzer = new ListingAnalyzer();
const modal = document.querySelector('#appModal');
const content = document.querySelector('#modalContent');
const toast = document.querySelector('#toast');
const esc = (v) => String(v || '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;', "'":'&#39;','"':'&quot;' }[c]));
function open(html) { content.innerHTML = html; modal.querySelector('.modal-card').classList.remove('account-wide'); modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }
function notice(message) { toast.textContent=message; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2600); }

async function openChoices() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return;
  open('<span class="eyebrow">KOLAY İLAN VER</span><h2>Parçanın fotoğrafını çek. İlanını biz hazırlayalım.</h2><div class="creator-options"><button data-photo-flow><b>✦</b><strong>AI İlan Oluştur</strong><small>Fotoğraf → parça tanıma → kategori → ilan taslağı</small></button><button data-bulk-flow><b>▱</b><strong>AI Çoklu İlan Oluştur</strong><small>Birden fazla fotoğraftan ayrı ilan taslakları</small></button><button data-manual-flow><b>✍️</b><strong>Tekli İlan Oluştur</strong><small>Alanları kendin doldur</small></button></div>');
}

function upload(multiple) {
  open('<span class="eyebrow">AI İLAN OLUŞTUR</span><h2>Fotoğrafları seç</h2><p>AI parçayı, kategoriyi ve mümkün olan teknik bilgileri fotoğraftan çıkarır; yayınlamadan önce kontrol edebilirsin.</p><input id="analyzeFiles" type="file" accept="image/*" ' + (multiple ? 'multiple' : '') + '><small>Bir ilan için en fazla 5 fotoğraf kullanılabilir.</small><button id="startAnalysis">AI ile analiz et</button>');
  document.querySelector('#startAnalysis').onclick = async () => {
    const input = document.querySelector('#analyzeFiles');
    const selected = [...input.files];
    if (!selected.length) return notice('En az bir fotoğraf seç.');
    if (selected.length > 5) return notice('Bir ilanda en fazla 5 fotoğraf olabilir.');
    const button = document.querySelector('#startAnalysis');
    button.disabled = true;
    button.textContent = 'AI analiz ediyor…';
    try {
      const optimized = await optimizeImageFiles(selected);
      const drafts = await Promise.all(optimized.map((file) => analyzer.analyze(file)));
      renderDrafts(drafts, multiple, optimized);
    } catch (error) {
      notice(error.message || 'AI analizi başarısız.');
      button.disabled = false;
      button.textContent = 'AI ile analiz et';
    }
  };
}

function renderDrafts(drafts, bulk, files = []) {
  open('<span class="eyebrow">AI TASLAĞI</span><h2>Bilgileri kontrol edin</h2><p class="confidence-note">AI fotoğraftaki parçayı ve görülebilen bilgileri analiz eder. Emin olmadığı alanları yayınlamadan önce kontrol et.</p><div id="draftList">' + drafts.map((d,i)=>'<form class="ai-draft" data-draft="'+i+'"><small class="analysis-result">Güven: %'+d.confidence+' · AI: '+esc(d.evidence?.aiVision || 'yerel')+' · OCR: '+esc(d.evidence?.ocr || '')+'</small><input name="brand" value="'+esc(d.brand)+'" placeholder="Marka"><input name="partName" value="'+esc(d.partName)+'" placeholder="Parça adı"><input name="title" value="'+esc(d.title)+'" placeholder="İlan başlığı"><input name="oemNumber" value="'+esc(d.oemNumber)+'" placeholder="OEM / parça no"><input name="category" value="'+esc(d.category)+'" placeholder="Kategori"><input name="subcategory" value="'+esc(d.subcategory)+'" placeholder="Alt kategori"><input name="vehicle" value="'+esc(d.vehicle)+'" placeholder="Araç bilgisi"><textarea name="description" placeholder="Açıklama">'+esc(d.description)+'</textarea><input name="price" type="number" min="0" placeholder="Fiyat"><input name="city" placeholder="Şehir"><select name="condition"><option value="used">2. El</option><option value="new">Sıfır</option><option value="salvage">Çıkma</option></select></form>').join('')+'</div><button id="publishDrafts">'+(bulk ? 'Seçili taslakları oluştur' : 'Taslağı oluştur')+'</button>');
  document.querySelector('#publishDrafts').onclick = async () => {
    const forms=[...document.querySelectorAll('.ai-draft')]; let lastId=null; let count=0;
    for (let i=0;i<forms.length && i<5;i++) {
      const form = forms[i];
      const d=Object.fromEntries(new FormData(form));
      if (!d.partName || !d.price || !d.city) continue;
      try {
        const listing = await createListing({ title:d.title||d.partName, description:d.description, condition:d.condition, price:d.price, city:d.city, oemNumber:d.oemNumber, category:d.category||null, subcategory:d.subcategory||null, vehicle:d.vehicle||null });
        lastId = listing.id;
        count++;
        const file = files[i];
        if (file) {
          try { await attachImagesToListing(listing.id, [file]); }
          catch (imgError) { notice(imgError.message || 'Fotoğraf yüklenemedi.'); }
        }
      } catch (error) { notice(error.message || 'İlan oluşturulamadı.'); }
    }
    notice(count ? count+' AI taslak ilan oluşturuldu.' : 'Parça adı, fiyat ve şehir alanlarını doldur.');
    if (count) window.dispatchEvent(new CustomEvent('parca:listings-updated'));
    if (lastId && window.__openListingDetail) window.__openListingDetail(lastId);
  };
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-photo-flow]')) upload(false);
  if (event.target.closest('[data-bulk-flow]')) upload(true);
  if (event.target.closest('[data-manual-flow]')) { modal.classList.remove('show'); if (window.__openListingForm) window.__openListingForm(); }
});

window.__openEasyListing = openChoices;
window.__openPhotoListing = () => upload(false);
window.__openBulkListing = () => upload(true);
