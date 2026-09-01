import fs from 'node:fs';

const SITE_URL = (process.env.SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const OUT = 'public/vehicle-sitemap.xml';
const slug = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
let catalog = [];
try {
  const module = await import('../../src/lib/vehicle-catalog.js');
  catalog = Array.isArray(module.vehicleCatalog) ? module.vehicleCatalog : [];
} catch (error) {
  console.warn(`Vehicle catalog unavailable; writing an empty vehicle sitemap: ${error.message}`);
}
const unique = new Map();
for (const row of catalog) {
  const make = row?.make ?? row?.brand, model = row?.model;
  if (!make || !model) continue;
  const makeSlug = slug(make), modelSlug = slug(model);
  if (makeSlug && modelSlug) unique.set(`${makeSlug}/${modelSlug}`, { makeSlug, modelSlug });
}
const urls = [...unique.values()].map(({ makeSlug, modelSlug }) => `  <url><loc>${SITE_URL}/arac/${makeSlug}/${modelSlug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(OUT, xml, 'utf8');
console.log(`Generated ${urls.length} vehicle SEO URLs in ${OUT}`);
