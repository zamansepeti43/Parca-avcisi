import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = (process.env.VITE_SITE_URL || 'https://parca-avcisi.vercel.app').replace(/\/$/, '');
const output = path.resolve('public/sitemap.xml');

const categories = [
  'motor', 'sanziman', 'kaporta', 'aydinlatma', 'fren-sistemi', 'suspansiyon',
  'elektrik', 'ic-aksam', 'egzoz', 'klima', 'filtreler', 'yakit-sistemi',
  'direksiyon', 'jant-lastik', 'cam-ayna', 'sogutma-sistemi', 'aktarma', 'diger'
];

const services = [
  'oto-bakim', 'fren-bakimi', 'yag-degisimi', 'klima-servisi',
  'elektrik-servisi', 'kaporta-boya', 'suspansiyon', 'diagnostik'
];

const urls = [
  '/',
  '/ilanlar',
  ...categories.map((slug) => `/parcalar/${slug}`),
  ...services.map((slug) => `/servisler/${slug}`)
];

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((url) => `  <url><loc>${xmlEscape(`${SITE_URL}${url}`)}</loc></url>`).join('\n') +
  '\n</urlset>\n';

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, xml, 'utf8');
console.log(`Generated ${output} with ${urls.length} URLs.`);
