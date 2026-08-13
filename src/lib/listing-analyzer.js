export class OcrProvider { async read() { return { text: '', confidence: 0 }; } }
export class VisionProvider { async inspect() { return { labels: [], confidence: 0 }; } }
export class CatalogProvider { async match() { return { vehicle: null, confidence: 0 }; } }

export class ListingAnalyzer {
  constructor({ ocr = new OcrProvider(), vision = new VisionProvider(), catalog = new CatalogProvider() } = {}) {
    this.ocr = ocr; this.vision = vision; this.catalog = catalog;
  }
  async analyze(file) {
    const [ocr, vision] = await Promise.all([this.ocr.read(file), this.vision.inspect(file)]);
    const catalog = await this.catalog.match({ ocr, vision });
    const filename = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    return {
      title: filename ? filename.charAt(0).toUpperCase() + filename.slice(1) : 'Parça ilanı',
      partName: filename || '', category: '', brand: '', oemNumber: '',
      vehicle: catalog.vehicle || '', description: '',
      photos: [file], confidence: Math.min(ocr.confidence || 0, vision.confidence || 0, catalog.confidence || 0),
      source: 'local-placeholder',
    };
  }
}
