#!/usr/bin/env python3
import concurrent.futures
import hashlib
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

HEADERS = {'User-Agent': 'Parca-Avcisi-Catalog-Worker/2.0'}
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BATCH = int(os.environ.get('CATALOG_BATCH_SIZE', '100'))
MAX_URLS = int(os.environ.get('CATALOG_MAX_URLS', '2500'))
HTTP_TIMEOUT = int(os.environ.get('CATALOG_HTTP_TIMEOUT', '20'))
WORKERS = int(os.environ.get('CATALOG_WORKERS', '12'))

SOURCES = {
    'kautek': {'brand': 'KAUTEK', 'url': 'https://www.kautek.com.tr/tr/catalog', 'quality': 0.97, 'kind': 'html'},
    'kurpar': {'brand': 'KURPAR', 'url': 'https://www.kurpar.com/catalog/', 'quality': 0.97, 'kind': 'html'},
    'oto-karaman': {'brand': 'OTO KARAMAN', 'url': 'https://www.otokaraman.com/tr/katalog/18-urunler', 'quality': 0.96, 'kind': 'html'},
    'driv': {'brand': 'DRiV', 'url': 'https://www.drivparts.com/en-eu/support/pdf-catalogues.html', 'quality': 0.96, 'kind': 'pdf-page'},
    'continental': {'brand': 'CONTINENTAL', 'url': 'https://www.continental-engineparts.com/eu/en-gb/aftermarket/support/downloads', 'quality': 0.96, 'kind': 'pdf-page'},
}

PART_RE = re.compile(r'\b[A-Z]{1,8}[ -]?[0-9]{2,8}(?:[./-][A-Z0-9]{1,8})?\b', re.I)
OEM_RE = re.compile(r'\b(?:[0-9]{5,14}|[A-Z]{1,4}[ -]?[0-9]{4,12})\b')
VEHICLE_MAKES = {
    'MERCEDES', 'MERCEDES-BENZ', 'MAN', 'VOLVO', 'SCANIA', 'DAF', 'RENAULT',
    'IVECO', 'FORD', 'BMC', 'ISUZU', 'MITSUBISHI', 'OTOKAR', 'FIAT', 'AUDI',
    'BMW', 'VOLKSWAGEN', 'VW', 'OPEL', 'PEUGEOT', 'CITROEN', 'TOYOTA',
    'NISSAN', 'HYUNDAI', 'KIA', 'HONDA', 'SKODA', 'ŠKODA'
}


def clean(value):
    return ' '.join(str(value or '').split())


def get(url, timeout=None):
    response = requests.get(url, headers=HEADERS, timeout=timeout or HTTP_TIMEOUT)
    response.raise_for_status()
    return response


def record(source, part, name='', category='', oems=None, apps=None, source_url=''):
    part = clean(part).upper()
    if not part or len(re.sub(r'[^A-Z0-9]', '', part)) < 4:
        return None
    oems = sorted(set(clean(x).upper() for x in (oems or []) if clean(x)))
    apps = apps or []
    raw = json.dumps([source, part, name, category, oems, apps], ensure_ascii=False, sort_keys=True)
    return {
        'sourceId': f'catalog:{source}',
        'brand': SOURCES[source]['brand'],
        'partNumber': part,
        'partName': clean(name) or f"{SOURCES[source]['brand']} {part}",
        'category': clean(category) or 'Otomotiv Yedek Parça',
        'oemNumbers': oems,
        'applications': apps,
        'sourceUrl': source_url or SOURCES[source]['url'],
        'sourceQuality': SOURCES[source]['quality'],
        'rawHash': hashlib.sha256(raw.encode()).hexdigest(),
    }


def upload(rows):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
    }
    total = len(rows)
    for i in range(0, total, BATCH):
        chunk = rows[i:i + BATCH]
        response = requests.post(
            SUPABASE_URL + '/rest/v1/rpc/upsert_catalog_batch',
            headers=headers,
            json={'records': chunk},
            timeout=120,
        )
        response.raise_for_status()
        print(f'uploaded batch {i // BATCH + 1}: {len(chunk)} | total={min(i + len(chunk), total)}/{total}', flush=True)


def parse_html_product(source, url, html):
    soup = BeautifulSoup(html, 'html.parser')
    rows = []

    for node in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(node.string or node.get_text())
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            typ = item.get('@type')
            if typ == 'Product' or (isinstance(typ, list) and 'Product' in typ):
                sku = item.get('mpn') or item.get('sku') or ''
                name = item.get('name') or ''
                if sku:
                    row = record(source, sku, name, oems=[item.get('gtin13', '')], source_url=url)
                    if row:
                        rows.append(row)

    text = clean(soup.get_text(' ', strip=True))
    for anchor in soup.find_all('a', href=True):
        label = clean(anchor.get_text(' ', strip=True))
        href = urljoin(url, anchor['href'])
        if not label:
            continue
        for part in PART_RE.findall(label)[:3]:
            row = record(source, part, label, apps=[{'text': label, 'sourceUrl': href}], source_url=href)
            if row:
                rows.append(row)

    for match in re.finditer(r'(.{0,80})(%s)(.{0,160})' % PART_RE.pattern, text, re.I):
        part = match.group(2)
        context = clean(match.group(1) + ' ' + match.group(3))
        row = record(source, part, context[:180], source_url=url)
        if row:
            rows.append(row)
    return rows


def discover_sitemap(base):
    seen = set()
    found = []
    queue = [urljoin(base, '/sitemap.xml'), urljoin(base, '/sitemap_index.xml')]
    while queue and len(seen) < 10:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            response = get(url)
            soup = BeautifulSoup(response.text, 'xml')
            locs = [x.get_text(strip=True) for x in soup.find_all('loc')]
            if soup.find('sitemapindex'):
                queue.extend(locs[:20])
            else:
                found.extend(locs)
        except Exception as exc:
            print(f'sitemap skip {url}: {exc}', flush=True)
    return list(dict.fromkeys(found))


def upload_unique(rows, seen, pending):
    for row in rows:
        if not isinstance(row, dict):
            continue
        brand = clean(row.get('brand'))
        part = clean(row.get('partNumber'))
        if not brand or not part:
            continue
        key = (brand.lower(), re.sub(r'[^A-Z0-9]', '', part.upper()))
        if key in seen:
            continue
        seen.add(key)
        pending.append(row)
        if len(pending) >= BATCH:
            upload(pending[:BATCH])
            del pending[:BATCH]


def run_html(source):
    cfg = SOURCES[source]
    urls = discover_sitemap(cfg['url'])
    product_urls = []
    for url in urls:
        lower = url.lower()
        if any(k in lower for k in ('product', 'urun', 'catalog', 'katalog', 'item', 'parca', 'part')):
            product_urls.append(url)
    if not product_urls:
        product_urls = [cfg['url']]
    product_urls = list(dict.fromkeys(product_urls))[:MAX_URLS]
    print(f'{source}: scheduled={len(product_urls)} workers={WORKERS}', flush=True)

    seen = set()
    pending = []
    completed = 0

    def fetch_parse(url):
        try:
            return parse_html_product(source, url, get(url).text), None
        except Exception as exc:
            return [], f'{url}: {exc}'

    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = [executor.submit(fetch_parse, url) for url in product_urls]
        for future in concurrent.futures.as_completed(futures):
            rows, error = future.result()
            completed += 1
            if error:
                print(f'skip {error}', flush=True)
            upload_unique(rows, seen, pending)
            if completed % 25 == 0 or completed == len(product_urls):
                print(f'{source}: scanned {completed}/{len(product_urls)} | unique={len(seen)} | queued={len(pending)}', flush=True)

    if pending:
        upload(pending)
    return len(seen)


def run_pdf_page(source):
    cfg = SOURCES[source]
    html = get(cfg['url']).text
    soup = BeautifulSoup(html, 'html.parser')
    links = []
    for anchor in soup.find_all('a', href=True):
        href = urljoin(cfg['url'], anchor['href'])
        label = clean(anchor.get_text(' ', strip=True)).lower()
        if not href.lower().endswith('.pdf'):
            continue
        if source != 'continental' or any(k in label for k in ('catalog', 'workbook', 'cross', 'products', 'catalogue')):
            links.append(href)
    links = list(dict.fromkeys(links))[:40]
    if not links:
        raise RuntimeError(f'No PDF catalog links found for {source}; source page layout may have changed')

    seen = set()
    pending = []
    print(f'{source}: pdfs={len(links)}', flush=True)
    for index, url in enumerate(links, 1):
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as file:
            path = file.name
        try:
            response = get(url, timeout=max(HTTP_TIMEOUT, 60))
            Path(path).write_bytes(response.content)
            output = subprocess.run(
                ['pdftotext', '-layout', path, '-'],
                capture_output=True,
                text=True,
                timeout=180,
            )
            if output.returncode != 0:
                raise RuntimeError(output.stderr.strip() or 'pdftotext failed')
            current_make = ''
            for line in (clean(x) for x in output.stdout.splitlines()):
                if not line:
                    continue
                if line.upper() in VEHICLE_MAKES:
                    current_make = line
                parts = PART_RE.findall(line)
                if not parts:
                    continue
                oems = OEM_RE.findall(line)
                for part in parts[:8]:
                    apps = [{'make': current_make, 'raw': line}] if current_make else [{'raw': line}]
                    row = record(source, part, line[:180], oems=oems[:10], apps=apps, source_url=url)
                    if row:
                        upload_unique([row], seen, pending)
            print(f'{source}: pdf {index}/{len(links)} | unique={len(seen)}', flush=True)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    if pending:
        upload(pending)
    return len(seen)


def main():
    source = os.environ.get('CATALOG_SOURCE', '').strip().lower()
    if source not in SOURCES:
        raise SystemExit('CATALOG_SOURCE must be one of: ' + ', '.join(SOURCES))
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError('Supabase configuration missing before catalog scan')

    unique = run_html(source) if SOURCES[source]['kind'] == 'html' else run_pdf_page(source)
    if unique == 0:
        raise RuntimeError(f'{source}: zero normalized catalog records; refusing to report success')
    print(f'{source}: SUCCESS | unique={unique}', flush=True)


if __name__ == '__main__':
    main()
