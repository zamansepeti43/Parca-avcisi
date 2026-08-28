const BASE = 'https://phira.com.tr';
const LANDING = `${BASE}/marka-kataloglarimiz/`;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BATCH = Number(process.env.CATALOG_BATCH_SIZE || 100);
const MAX_URLS = Number(process.env.CATALOG_MAX_URLS || 5000);
const HEADERS = { 'user-agent': 'Parca-Avcisi-Catalog-Worker/2.4' };
const MAKES = new Set(['MERCEDES','MERCEDES-BENZ','MAN','VOLVO','SCANIA','DAF','RENAULT','IVECO','FORD','BMC','ISUZU','MITSUBISHI','OTOKAR','FIAT','AUDI','BMW','VOLKSWAGEN','VW','OPEL','PEUGEOT','CITROEN','TOYOTA','NISSAN','HYUNDAI','KIA','HONDA','SKODA','ŠKODA','SEAT','DACIA','CHERY','MG','TOGG','KARSAN','TEMSA','FUSO','SUZUKI','MAZDA','JEEP','LAND ROVER','PORSCHE','ALFA ROMEO','DS','CUPRA','SSANGYONG','LADA']);
const PART_RE = /\b[A-Z]{1,8}[ -]?[0-9]{2,8}(?:[./-][A-Z0-9]{1,8})?\b/gi;
const OEM_RE = /\b(?:[0-9]{5,14}|[A-Z]{1,4}[ -]?[0-9]{4,12})\b/gi;

function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
function abs(href) { try { return new URL(href, BASE).href; } catch { return ''; } }
function stripHtml(html) {
  return clean(html.replace(/<script[\\s\\S]*?<\\/script>/gi, ' ').replace(/<style[\\s\\S]*?<\\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}
async function get(url) {
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return await r.text();
}
function linksFrom(html) {
  const out = new Set();
  const re = /(?:href|data-href)\\s*=\\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = abs(m[1]);
    if (u && new URL(u).hostname === 'phira.com.tr' && /\\/katalog\\//i.test(new URL(u).pathname)) out.add(u);
  }
  return [...out];
}
function makeRow(line, url) {
  const parts = [...new Set((line.match(PART_RE) || []).map(x => x.toUpperCase()))];
  if (!parts.length) return [];
  const oemText = line.split(/OEM\\s*:/i)[1] || '';
  const oems = [...new Set((oemText.match(OEM_RE) || []).map(x => x.toUpperCase()))].slice(0, 20);
  const upper = line.toUpperCase();
  const make = [...MAKES].find(x => upper.includes(x));
  return parts.map(part => ({
    sourceId: 'catalog:phira',
    brand: 'PHIRA',
    partNumber: part,
    partName: clean(line).slice(0, 180) || `PHIRA ${part}`,
    category: 'Otomotiv Yedek Parça',
    oemNumbers: oems,
    applications: [{ ...(make ? { make } : {}), raw: clean(line).slice(0, 240) }],
    sourceUrl: url,
    sourceQuality: 0.98,
  }));
}
async function upload(rows) {
  if (!rows.length) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_catalog_batch`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ records: rows })
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 2000)}`);
}
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  const landing = await get(LANDING);
  const urls = [...new Set(linksFrom(landing))].slice(0, MAX_URLS);
  if (!urls.length) throw new Error('PHIRA catalog discovery found zero /katalog/ pages');
  console.log(`phira: discovered=${urls.length} source=${LANDING}`);
  const seen = new Set();
  let pending = [];
  let scanned = 0;
  let uploaded = 0;
  let failed = 0;
  for (const url of urls) {
    try {
      const html = await get(url);
      const text = stripHtml(html);
      const lines = text.split(/(?<=[.!?])\\s+|\\n+/).map(clean).filter(Boolean);
      for (const line of lines) {
        if (!/OEM\\s*:/i.test(line)) continue;
        for (const row of makeRow(line, url)) {
          const key = row.partNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          if (!key || seen.has(key)) continue;
          seen.add(key); pending.push(row);
          if (pending.length >= BATCH) { await upload(pending); uploaded += pending.length; console.log(`uploaded ${pending.length}; unique=${seen.size}`); pending = []; }
        }
      }
    } catch (e) {
      failed++;
      console.log(`skip ${url}: ${e.message}`);
    }
    scanned++;
    if (scanned % 25 === 0 || scanned === urls.length) console.log(`phira: scanned ${scanned}/${urls.length} | unique=${seen.size} | queued=${pending.length} | failed=${failed}`);
  }
  if (pending.length) { await upload(pending); uploaded += pending.length; }
  console.log(`phira: COMPLETE scanned=${scanned} unique=${seen.size} uploaded=${uploaded} failed=${failed}`);
  if (!seen.size) throw new Error('PHIRA: zero normalized catalog records; refusing to report success');
}
main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
