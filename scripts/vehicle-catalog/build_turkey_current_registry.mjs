import fs from 'node:fs/promises';

const INDEX_URL = 'https://www.sifirarababul.com/markalar';
const OUT = 'src/lib/turkey-current-models.generated.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stripTags = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ');
const decode = (text) => text
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const clean = (text) => decode(stripTags(text)).replace(/^[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]+/, '').trim();

async function get(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'ParcaAvcisi-TurkeyCatalog/1.0 (+catalog refresh)' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function extractBrandLinks(html) {
  const links = [];
  const re = /<a\b[^>]*href=["']\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const slug = match[1].trim();
    const text = clean(match[2]);
    if (!slug || !text || !/Aktif/i.test(text)) continue;
    if (['markalar', 'fiyat-listesi', 'blog', 'elektrikli', 'suv', 'karsilastir', 'favoriler'].includes(slug)) continue;
    const label = text.split('👁️')[0].replace(/\s*Aktif\s*$/i, '').trim();
    if (!label) continue;
    if (!links.some((x) => x.slug === slug)) links.push({ slug, label });
  }
  return links;
}

function extractModels(html, brandLabel) {
  const models = new Set();
  const text = clean(html).replace(/\s+/g, ' ');
  const brand = brandLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${brand}\\s+(.{1,100}?)\\s*(?:🚗|🚙|👁️)?\\s*Başlangıç fiyatı`, 'giu');

  for (const match of text.matchAll(re)) {
    let model = match[1].replace(/[🚗🚙👁️]/gu, '').trim();
    model = model.replace(/\s+/g, ' ').trim();
    if (!model || model.length > 100) continue;
    // Strip obvious price/count artifacts that can sit between the model name and label.
    model = model.replace(/\s+\d+(?:[.,]\d+)?\s*B$/i, '').trim();
    models.add(model);
  }

  return [...models].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
}

const index = await get(INDEX_URL);
const brands = extractBrandLinks(index);
if (brands.length < 20) throw new Error(`Turkey current brand discovery failed: only ${brands.length} brands found`);

const registry = [];
for (const brand of brands) {
  try {
    const html = await get(`https://www.sifirarababul.com/${brand.slug}`);
    const models = extractModels(html, brand.label);
    if (models.length) registry.push({ make: brand.label, models, source: 'SifirArabaBul-2026' });
    console.log(`${brand.label}: ${models.length} current model labels`);
  } catch (error) {
    console.warn(`Skipping ${brand.label}: ${error.message}`);
  }
  await sleep(150);
}

if (registry.length < 20) throw new Error(`Turkey current model registry failed: only ${registry.length} brands parsed`);

const output = `// AUTO-GENERATED. DO NOT HAND-EDIT.\n// Source: ${INDEX_URL}\n// Refreshed: ${new Date().toISOString()}\nexport const turkeyCurrentModelRegistry = ${JSON.stringify(registry, null, 2)};\n`;
await fs.writeFile(OUT, output, 'utf8');
console.log(`Wrote ${OUT}: ${registry.length} brands / ${registry.reduce((n, x) => n + x.models.length, 0)} raw current model labels`);
