#!/usr/bin/env python3
import hashlib, json, os, re, subprocess, tempfile
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

HEADERS={'User-Agent':'Parca-Avcisi-Catalog-Worker/1.0'}
SUPABASE_URL=os.environ.get('SUPABASE_URL','').rstrip('/')
SUPABASE_KEY=os.environ.get('SUPABASE_SERVICE_ROLE_KEY','')
BATCH=int(os.environ.get('CATALOG_BATCH_SIZE','100'))

SOURCES={
 'kautek': {'brand':'KAUTEK','url':'https://www.kautek.com.tr/tr/catalog','quality':0.97,'kind':'html'},
 'kurpar': {'brand':'KURPAR','url':'https://www.kurpar.com/','quality':0.97,'kind':'html'},
 'oto-karaman': {'brand':'OTO KARAMAN','url':'https://www.otokaraman.com/tr','quality':0.96,'kind':'pdf-page'},
 'driv': {'brand':'DRiV','url':'https://www.drivparts.com/en-eu/support/pdf-catalogues.html','quality':0.96,'kind':'pdf-page'},
 'continental': {'brand':'CONTINENTAL','url':'https://www.continental-engineparts.com/eu/en-gb/aftermarket/support/downloads','quality':0.96,'kind':'pdf-page'},
}
PART_RE=re.compile(r'\b[A-Z]{1,8}[ -]?[0-9]{2,8}(?:[./-][A-Z0-9]{1,8})?\b',re.I)
OEM_RE=re.compile(r'\b(?:[0-9]{5,14}|[A-Z]{1,4}[ -]?[0-9]{4,12})\b')

def get(url):
 r=requests.get(url,headers=HEADERS,timeout=45); r.raise_for_status(); return r

def clean(s): return ' '.join(str(s or '').split())

def record(source, part, name='', category='', oems=None, apps=None, source_url=''):
 p=clean(part).upper()
 if not p or len(re.sub(r'[^A-Z0-9]','',p))<4: return None
 oems=sorted(set(clean(x).upper() for x in (oems or []) if clean(x)))
 apps=apps or []
 raw=json.dumps([source,p,name,category,oems,apps],ensure_ascii=False,sort_keys=True)
 return {'sourceId':f'catalog:{source}','brand':SOURCES[source]['brand'],'partNumber':p,'partName':clean(name) or f"{SOURCES[source]['brand']} {p}",'category':clean(category) or 'Otomotiv Yedek Parça','oemNumbers':oems,'applications':apps,'sourceUrl':source_url or SOURCES[source]['url'],'sourceQuality':SOURCES[source]['quality'],'rawHash':hashlib.sha256(raw.encode()).hexdigest()}

def upload(rows):
 if not SUPABASE_URL or not SUPABASE_KEY: raise RuntimeError('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
 for i in range(0,len(rows),BATCH):
  payload={'records':rows[i:i+BATCH]}
  r=requests.post(SUPABASE_URL+'/rest/v1/rpc/upsert_catalog_batch',headers={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},json=payload,timeout=120)
  r.raise_for_status()
  print(f'uploaded batch {i//BATCH+1}: {len(rows[i:i+BATCH])}')

def parse_html_product(source,url,html):
 soup=BeautifulSoup(html,'html.parser')
 rows=[]
 # Prefer JSON-LD product data because it is structured and less noisy than page text.
 for node in soup.find_all('script',type='application/ld+json'):
  try: data=json.loads(node.string or node.get_text())
  except Exception: continue
  items=data if isinstance(data,list) else [data]
  for x in items:
   if not isinstance(x,dict): continue
   typ=x.get('@type')
   if typ=='Product' or (isinstance(typ,list) and 'Product' in typ):
    sku=x.get('mpn') or x.get('sku') or ''
    name=x.get('name') or ''
    if sku:
     rows.append(record(source,sku,name,oems=[x.get('gtin13','')] if x.get('gtin13') else [],source_url=url))
 # Then visible catalog/product links. Do not invent vehicle trims; retain the raw page text as application evidence.
 text=clean(soup.get_text(' ',strip=True))
 for a in soup.find_all('a',href=True):
  label=clean(a.get_text(' ',strip=True))
  href=urljoin(url,a['href'])
  if not label: continue
  candidates=PART_RE.findall(label)
  for p in candidates[:3]:
   rows.append(record(source,p,label,apps=[{'text':label,'sourceUrl':href}],source_url=href))
 # If the catalog page itself exposes product rows, capture codes from compact text chunks.
 for m in re.finditer(r'(.{0,80})(%s)(.{0,160})' % PART_RE.pattern,text,re.I):
  p=m.group(2); ctx=clean(m.group(1)+' '+m.group(3))
  rows.append(record(source,p,ctx[:180],source_url=url))
 return rows

def discover_sitemap(base):
 candidates=[urljoin(base,'/sitemap.xml'),urljoin(base,'/sitemap_index.xml')]
 for u in candidates:
  try:
   r=get(u); soup=BeautifulSoup(r.text,'xml'); locs=[x.get_text(strip=True) for x in soup.find_all('loc')]
   if locs: return locs
  except Exception: pass
 return []

def run_html(source):
 cfg=SOURCES[source]; urls=discover_sitemap(cfg['url'])
 product_urls=[]
 for u in urls:
  lu=u.lower()
  if any(k in lu for k in ('product','urun','catalog','katalog','item','parca')): product_urls.append(u)
 if not product_urls: product_urls=[cfg['url']]
 product_urls=list(dict.fromkeys(product_urls))[:2500]
 rows=[]
 for i,u in enumerate(product_urls,1):
  try: rows.extend(parse_html_product(source,u,get(u).text))
  except Exception as e: print(f'skip {u}: {e}')
  if i%100==0: print(f'{source}: scanned {i}/{len(product_urls)}')
 return rows

def run_pdf_page(source):
 cfg=SOURCES[source]; html=get(cfg['url']).text; soup=BeautifulSoup(html,'html.parser')
 links=[]
 for a in soup.find_all('a',href=True):
  href=urljoin(cfg['url'],a['href']); label=clean(a.get_text(' ',strip=True)).lower()
  if href.lower().endswith('.pdf') and (source!='continental' or any(k in label for k in ('catalog','workbook','cross','products','catalogue'))): links.append(href)
 # Keep catalog/reference PDFs, not generic posters/manuals.
 links=list(dict.fromkeys(links))[:40]
 if not links: raise RuntimeError(f'No PDF catalog links found for {source}')
 rows=[]
 for u in links:
  with tempfile.NamedTemporaryFile(suffix='.pdf',delete=False) as f: path=f.name
  try:
   r=get(u); Path(path).write_bytes(r.content)
   out=subprocess.run(['pdftotext','-layout',path,'-'],capture_output=True,text=True,timeout=180)
   text=out.stdout
   lines=[clean(x) for x in text.splitlines() if clean(x)]
   current_make='';
   for line in lines:
    # Preserve explicit vehicle make/application headings only.
    if line.upper() in {'MERCEDES','MERCEDES-BENZ','MAN','VOLVO','SCANIA','DAF','RENAULT','IVECO','FORD','BMC','ISUZU','MITSUBISHI','OTOKAR','FIAT','AUDI','BMW','VOLKSWAGEN','VW','OPEL','PEUGEOT','CITROEN','TOYOTA','NISSAN','HYUNDAI','KIA','HONDA'}: current_make=line
    parts=PART_RE.findall(line)
    if not parts: continue
    oems=OEM_RE.findall(line)
    for p in parts[:8]:
     apps=[{'make':current_make,'raw':line}] if current_make else [{'raw':line}]
     rows.append(record(source,p,line[:180],oems=oems[:10],apps=apps,source_url=u))
  finally:
   try: os.unlink(path)
   except OSError: pass
 return rows

def main():
 source=os.environ.get('CATALOG_SOURCE','').strip().lower()
 if source not in SOURCES: raise SystemExit('CATALOG_SOURCE must be one of: '+', '.join(SOURCES))
 rows=run_html(source) if SOURCES[source]['kind']=='html' else run_pdf_page(source)
 dedup={}
 for r in rows: dedup[(r['brand'].lower(),re.sub(r'[^A-Z0-9]','',r['partNumber'].upper()))]=r
 rows=list(dedup.values())
 if not rows: raise RuntimeError(f'{source}: zero normalized catalog records; refusing to report success')
 print(f'{source}: normalized {len(rows)} unique records')
 upload(rows)
 print(f'{source}: SUCCESS')

if __name__=='__main__': main()
