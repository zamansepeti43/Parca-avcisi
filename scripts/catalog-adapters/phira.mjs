import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const BASE = 'https://phira.com.tr';
const LANDING = `${BASE}/marka-kataloglarimiz/`;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BATCH = Number(process.env.CATALOG_BATCH_SIZE || 100);
const MAX_URLS = Number(process.env.CATALOG_MAX_URLS || 500);
const TIMEOUT = Number(process.env.CATALOG_HTTP_TIMEOUT || 8);
const WORKERS = Math.max(1, Number(process.env.CATALOG_WORKERS || 6));
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const MAKES = new Set([
  'MERCEDES','MERCEDES-BENZ','MAN','VOLVO','SCANIA','DAF','RENAULT','IVECO','FORD','BMC','ISUZU','MITSUBISHI','OTOKAR','FIAT','AUDI','BMW','VOLKSWAGEN','VW','OPEL','PEUGEOT','CITROEN','TOYOTA','NISSAN','HYUNDAI','KIA','HONDA','SKODA','ŠKODA','SEAT','DACIA','CHEVROLET','MG','MINI','MINI COOPER','JEEP','SUZUKI','MAZDA','LAND ROVER','PORSCHE','ALFA ROMEO','DS','CUPRA','SSANGYONG','LADA'
]);
const OEM_RE = /\b(?:[0-9]{5,14}|[A-Z]{1,4}[ -]?[0-9]{4,12}|[A-Z0-9]{5,20}(?:[./-][A-Z0-9]{1,10})?)\b/gi;
const FALLBACK_SLUGS = ['genel','audi','bmw','chevrolet','citroen','dacia','fiat','ford','hyundai','iveco','kia','mazda','mercedes','mini-cooper','nissan','opel','peugeot','peugeot-fiat-citroen','renault','seat','skoda','suzuki','toyota','volkswagen','volvo'];

function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
function abs(href) { try { return new URL(href, BASE).href; } catch { return ''; } }
function stripHtml(html) {
  return clean(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function isCatalogPage(url) {
  try {
    const u = new URL(url, BASE);
    if (u.hostname !== 'phira.com.tr') return false;
    const parts = u.pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts[0] !== 'katalog' || parts.length < 2 || parts.length > 4) return false;
    if (parts.some(p => ['wp-content','wp-json','wp-admin','uploads','assets'].includes(p))) return false;
    if (parts.length === 2) return /^[a-z0-9çğıöşü-]+$/i.test(parts[1]);
    return parts.length === 4 && parts[2] === 'page' && /^\d+$/.test(parts[3]);
  } catch { return false; }
}

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT * 1000);
  try {
    const r = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (first) {
    const args = ['-fsSL', '--retry', '0', '--connect-timeout', String(Math.min(TIMEOUT, 5)), '--max-time', String(TIMEOUT), '-A', HEADERS['user-agent'], '-H', `Accept: ${HEADERS.accept}`, url];
    try {
      const { stdout } = await execFileAsync('curl', args, { maxBuffer: 20 * 1024 * 1024 });
      if (!stdout) throw new Error('empty response');
      return stdout;
    } catch (second) {
      throw new Error(`HTTP failed: ${first?.message || first}; curl: ${second?.message || second}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function linksFrom(html) {
  const out = new Set();
  const re = /(?:href|data-href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = abs(m[1]);
    if (u && isCatalogPage(u)) out.add(new URL(u).href.replace(/\/$/, '') + '/');
  }
  return [...out];
}

function makeRows(line, url) {
  if (!/OEM\s*:/i.test(line)) return [];
  const oemText = line.split(/OEM\s*:/i)[1] || '';
  const oems = [...new Set((oemText.match(OEM_RE) || []).map(x => x.toUpperCase()))].slice(0, 20);
  if (!oems.length) return [];
  const upper = line.toUpperCase();
  const make = [...MAKES].find(x => upper.includes(x));
  const name = clean(line).slice(0, 180);
  return oems.map(oem => ({
    sourceId: 'catalog:phira',
    brand: 'PHIRA',
    partNumber: oem,
    partName: name || `PHIRA ${oem}`,
    category: 'Otomotiv Yedek Parça',
    oemNumbers: [oem],
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
  const seedUrls = linksFrom(landing);
  let urls = seedUrls.length ? seedUrls : FALLBACK_SLUGS.map(slug => `${BASE}/katalog/${slug}/`);
  urls = [...new Set(urls)];

  const discovered = new Set(urls);
  const queue = [...urls];
  for (let i = 0; i < queue.length && discovered.size < MAX_URLS; i++) {
    const url = queue[i];
    try {
      const html = await get(url);
      for (const next of linksFrom(html)) {
        if (discovered.size >= MAX_URLS) break;
        if (!discovered.has(next)) {
          discovered.add(next);
          queue.push(next);
        }
      }
    } catch (e) {
      console.log(`phira discovery skip ${url}: ${e.message}`);
    }
  }
  urls = [...discovered].slice(0, MAX_URLS);
  console.log(`phira: discovered=${urls.length} source=${LANDING} workers=${WORKERS} timeout=${TIMEOUT}s`);

  const seen = new Set();
  let pending = [];
  let scanned = 0;
  let uploaded = 0;
  let failed = 0;
  let cursor = 0;

  async function processUrl(url) {
    try {
      const html = await get(url);
      const text = stripHtml(html);
      const rows = [];
      for (const line of text.split(/\n+/).map(clean).filter(Boolean)) {
        for (const row of makeRows(line, url)) {
          const key = row.partNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          rows.push(row);
        }
      }
      return rows;
    } catch (e) {
      failed++;
      console.log(`skip ${url}: ${e.message}`);
      return [];
    }
  }

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= urls.length) return;
      const rows = await processUrl(urls[i]);
      if (rows.length) pending.push(...rows);
      scanned++;
      if (pending.length >= BATCH) {
        const batch = pending.splice(0, pending.length);
        await upload(batch);
        uploaded += batch.length;
        console.log(`uploaded ${batch.length}; unique=${seen.size}`);
      }
      if (scanned % 10 === 0 || scanned === urls.length) console.log(`phira: scanned ${scanned}/${urls.length} | unique=${seen.size} | queued=${pending.length} | failed=${failed}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(WORKERS, urls.length) }, worker));

  if (pending.length) {
    const batch = pending.splice(0, pending.length);
    await upload(batch);
    uploaded += batch.length;
  }
  console.log(`phira: COMPLETE scanned=${scanned} unique=${seen.size} uploaded=${uploaded} failed=${failed}`);
  if (!seen.size) throw new Error('PHIRA: zero normalized catalog records; refusing to report success');
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
