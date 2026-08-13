import { vehicleCatalog } from './vehicle-catalog.js';

const OEM_PATTERN = /\b[A-Z0-9][A-Z0-9 .-]{5,24}[A-Z0-9]\b/g;
const knownBrands = [...new Set(vehicleCatalog.map(({ make }) => make))];

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function oemCandidates(text = '') {
  return unique((text.toUpperCase().match(OEM_PATTERN) || [])
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => /\d/.test(value) && value.length >= 6));
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
  constructor({ ocr = new OcrProvider(), vision = new VisionProvider(), catalog = new CatalogProvider() } = {}) {
    this.ocr = ocr; this.vision = vision; this.catalog = catalog;
  }
  async analyze(file) {
    const [ocr, vision] = await Promise.all([this.ocr.read(file), this.vision.inspect(file)]);
    const catalog = await this.catalog.match({ text: ocr.text, barcodes: vision.barcodes });
    const oemNumber = catalog.oemNumber || oemCandidates(ocr.text)[0] || '';
    const title = [catalog.brand, oemNumber || file.name.replace(/\.[^.]+$/, '')].filter(Boolean).join(' ') || 'Parça ilanı';
    const confidence = Math.round(((ocr.confidence * 0.5) + (vision.confidence * 0.25) + (catalog.confidence * 0.25)) * 100);
    return {
      title, partName: title, category: '', brand: catalog.brand, oemNumber, vehicle: catalog.vehicle,
      description: ocr.text ? 'Fotoğraf etiketi/OCR sonucu: ' + ocr.text.slice(0, 500).trim() : '',
      photos: [file], confidence, requiresReview: confidence < 70 || !catalog.vehicle,
      evidence: { ocr: ocr.engine, vision: vision.engine, barcode: vision.barcodes?.[0] || '' },
    };
  }
}
