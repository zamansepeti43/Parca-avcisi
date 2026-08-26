import { vehicleCatalog } from './vehicle-catalog.js';
import { requireSupabase, supabaseConfigured } from './supabase.js';

const OEM_PATTERN = /\b[A-Z0-9][A-Z0-9 .-]{5,24}[A-Z0-9]\b/g;
const knownBrands = [...new Set(vehicleCatalog.map(({ make }) => make))];

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function oemCandidates(text = '') {
  return unique((text.toUpperCase().match(OEM_PATTERN) || [])
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => /\d/.test(value) && value.length >= 6));
}

async function fileToDataUrl(file) {
  if (typeof FileReader === 'undefined') return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export class OcrProvider {
  async read(file) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng+tur');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      return { text: data.text || '', confidence: (data.confidence || 0) / 100, engine: 'tesseract.js' };
    } catch (error) {
      return { text: '', confidence: 0, engine: 'fallback', error: error.message };
    }
  }
}

export class VisionProvider {
  async inspect(file) {
    if (!globalThis.BarcodeDetector) return { labels: [], barcodes: [], confidence: 0, engine: 'fallback' };
    try {
      const detector = new globalThis.BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code'] });
      const codes = await detector.detect(file);
      return { labels: [], barcodes: codes.map(({ rawValue }) => rawValue), confidence: codes.length ? 0.85 : 0, engine: 'BarcodeDetector' };
    } catch {
      return { labels: [], barcodes: [], confidence: 0, engine: 'fallback' };
    }
  }
}

export class GeminiVisionProvider {
  async inspect(file) {
    try {
      const imageDataUrl = await fileToDataUrl(file);
      if (!imageDataUrl) return { labels: [], confidence: 0, engine: 'unavailable' };
      const headers = { 'Content-Type': 'application/json' };
      if (supabaseConfigured) {
        const { data } = await requireSupabase().auth.getSession();
        const token = data?.session?.access_token;
        if (token) headers.Authorization = 'Bearer ' + token;
      }
      const response = await fetch('/api/analyze-part', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageDataUrl })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { labels: [], confidence: 0, engine: 'gemini-fallback', error: payload?.error || 'Vision AI isteği başarısız.' };
      return { labels: [], confidence: Number(payload?.result?.confidence || 0) / 100, engine: payload?.model || 'gemini', result: payload?.result || {} };
    } catch (error) {
      return { labels: [], confidence: 0, engine: 'gemini-fallback', error: error.message };
    }
  }
}

export class CatalogProvider {
  async match({ text = '', barcodes = [] }) {
    const upper = text.toUpperCase();
    const brand = knownBrands.find((name) => upper.includes(name.toUpperCase())) || '';
    const modelRow = brand && vehicleCatalog.find((item) => item.make === brand && upper.includes(item.model.toUpperCase()));
    const oemNumber = oemCandidates([text, ...barcodes].join(' '))[0] || '';
    return { brand, vehicle: modelRow ? [modelRow.make, modelRow.model, modelRow.generation].join(' · ') : '', oemNumber, confidence: modelRow ? 0.75 : brand ? 0.5 : oemNumber ? 0.45 : 0 };
  }
}

export class ListingAnalyzer {
  constructor({ ocr = new OcrProvider(), vision = new VisionProvider(), aiVision = new GeminiVisionProvider(), catalog = new CatalogProvider() } = {}) {
    this.ocr = ocr;
    this.vision = vision;
    this.aiVision = aiVision;
    this.catalog = catalog;
  }

  async analyze(file) {
    const [ocr, vision] = await Promise.all([this.ocr.read(file), this.vision.inspect(file)]);
    const catalog = await this.catalog.match({ text: ocr.text, barcodes: vision.barcodes });
    const ai = await this.aiVision.inspect(file);
    const aiResult = ai.result || {};
    const oemNumber = aiResult.oemNumber || catalog.oemNumber || oemCandidates(ocr.text)[0] || '';
    const brand = aiResult.brand || catalog.brand || '';
    const vehicle = aiResult.vehicle || catalog.vehicle || '';
    const partName = aiResult.partName || [brand, oemNumber || file.name.replace(/\.[^.]+$/, '')].filter(Boolean).join(' ') || 'Parça ilanı';
    const title = aiResult.title || partName;
    const description = aiResult.description || (ocr.text ? 'Fotoğraf etiketi/OCR sonucu: ' + ocr.text.slice(0, 500).trim() : '');
    const confidence = Math.round(Math.max(
      Number(aiResult.confidence || 0),
      ((ocr.confidence * 0.4) + (vision.confidence * 0.2) + (catalog.confidence * 0.2) + (ai.confidence * 0.2)) * 100
    ));
    return {
      title,
      partName,
      category: aiResult.category || '',
      subcategory: aiResult.subcategory || '',
      brand,
      model: aiResult.model || '',
      oemNumber,
      vehicle,
      description,
      photos: [file],
      confidence,
      requiresReview: Boolean(aiResult.requiresReview) || confidence < 70 || !aiResult.category,
      evidence: { ocr: ocr.engine, vision: vision.engine, aiVision: ai.engine, barcode: vision.barcodes?.[0] || '', aiError: ai.error || '' },
    };
  }
}
