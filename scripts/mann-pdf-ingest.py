#!/usr/bin/env python3
"""Extract the official MANN catalog and preserve vehicle evidence.

The parser keeps the raw application text authoritative. It adds conservative
vehicle fields only when the PDF text makes them explicit; trim/variant values
are never guessed. This lets a later vehicle-catalog job verify and expand the
Parça Avcısı vehicle tree without polluting it with inferred data.
"""
import hashlib, json, os, re, urllib.request
from collections import defaultdict
from pathlib import Path

PDF_URL=os.environ.get("MANN_CATALOG_URL","https://www.mann-filter.com/content/dam/mann-filter/communication-media/brochures-catalogs/mann-filter-catalog-cars-transporters-2024-26-interactive.pdf")
SOURCE_ID=os.environ.get("MANN_SOURCE_ID","")
SOURCE_URL=os.environ.get("MANN_SOURCE_URL","https://www.mann-filter.com/en/catalog.html")
PDF_PATH=Path(os.environ.get("MANN_PDF_PATH","data/mann-catalog.pdf"))
OUT_PATH=Path(os.environ.get("MANN_JSONL_PATH","data/mann-catalog.jsonl"))
SUPABASE_URL=os.environ.get("SUPABASE_URL","").rstrip("/")
SUPABASE_KEY=os.environ.get("SUPABASE_SERVICE_ROLE_KEY","")
BATCH_SIZE=int(os.environ.get("CATALOG_BATCH_SIZE","100"))
START_PAGE=int(os.environ.get("MANN_APPLICATION_START_PAGE","57"))
BRAND=os.environ.get("MANN_BRAND","MANN-FILTER")

PART_RE=re.compile(r"\b(?:BFU?|BL|CUK|CU|CF|CP|CS|CUD|C|FP|HD|HU|LC|LE|MH|MWK?|P(?:F|FU|L|U)?|SP|TB|U|WDK|WD|WH|WK|WP|WA|W)\s+\d+(?:\s+\d+)?(?:/[A-Za-z0-9]+)?(?:-\d+)?\b")
KNOWN_MAKES={"ABARTH","ALFA ROMEO","ALPINA","ASTON MARTIN","AUDI","BMW","CHEVROLET","CHRYSLER","CITROEN","DACIA","DAEWOO","DODGE","DS","FIAT","FORD","HONDA","HYUNDAI","IVECO","JAGUAR","JEEP","KIA","LADA","LAMBORGHINI","LANCIA","LAND ROVER","LEXUS","MASERATI","MAZDA","MERCEDES-BENZ","MERCEDES","MINI","MITSUBISHI","NISSAN","OPEL","PEUGEOT","PORSCHE","RENAULT","SAAB","SEAT","SKODA","SMART","SUBARU","SUZUKI","TESLA","TOYOTA","VAUXHALL","VOLVO","VW","VOLKSWAGEN"}
HEADER_WORDS={"MODEL TYPE","FILTER TYPE","ENGINE CODE","CCM","KW","HP","PRODUCTION YEAR","VEHICLES / APPLICATIONS","OE NUMBERS","DIMENSIONS","FORD","MANN-FILTER"}

def category(part):
 p=part.split()[0].upper()
 if p in {"C","CF","CP","CS","CU","CUD","CUK","FP"}: return "Hava/Kabin Filtresi"
 if p in {"H","HU","HD","W","WD","WP","WA","WH"}: return "Yağ Filtresi"
 if p in {"P","PF","PFU","PL","PU","BF","BFU","BL","WK","WDK","MWK"}: return "Yakıt Filtresi"
 if p in {"MH","MW"}: return "Motosiklet Filtresi"
 if p in {"LC","LE","LB"}: return "Havalandırma/Yağ Ayırıcı"
 return "Diğer"

def clean(s): return " ".join(s.split()).strip()

def looks_like_model_heading(line):
 if not line or len(line)>90 or line.upper() in HEADER_WORDS: return False
 if re.search(r"\b\d{2}/\d{2}\b|\b\d{3,4}\s*(?:ccm|kW|HP)\b",line,re.I): return False
 if PART_RE.search(line): return False
 if re.match(r"^[0-9.() /-]+$",line): return False
 return True

def parse_structured(line, make, model, page):
 if not make or not model: return None
 # MANN rows commonly look like: "1.6 16V L1E 66 (90) 09/92-01/95 C ..."
 part=PART_RE.search(line)
 left=clean(line[:part.start()]) if part else clean(line)
 if not left: return None
 years=re.search(r"\b(\d{2})/(\d{2})\s*(?:[-–→]\s*(\d{2})/(\d{2})|©)",left)
 year_from=year_to=None
 if years:
  sy,sm,ey,em=years.groups()
  y=int(sy); year_from=(2000+y if y<70 else 1900+y)
  if ey: y2=int(ey); year_to=(2000+y2 if y2<70 else 1900+y2)
 # Only take an engine code when it is a clearly separate uppercase token.
 before_year=left[:years.start()] if years else left
 codes=re.findall(r"\b[A-Z][A-Z0-9]{1,7}(?:[-/][A-Z0-9]{1,8}){0,2}\b",before_year)
 excluded={"TDI","TSI","HDI","CDI","GDI","D","TD","VVT","VVTi","VTEC","ECOBOOST"}
 engine_code=next((c for c in codes if c.upper() not in excluded and c.upper() not in KNOWN_MAKES),None)
 model_type=clean(before_year)
 return {"make":make,"model":model,"model_type":model_type,"engine_code":engine_code,"year_from":year_from,"year_to":year_to,"source_url":SOURCE_URL,"source_quality":0.99,"page":page,"raw_text":line}

def download_pdf():
 PDF_PATH.parent.mkdir(parents=True,exist_ok=True)
 if PDF_PATH.exists() and PDF_PATH.stat().st_size>1_000_000: return
 req=urllib.request.Request(PDF_URL,headers={"User-Agent":"Parca-Avcisi-catalog-ingest/1.2"})
 with urllib.request.urlopen(req,timeout=180) as r, open(PDF_PATH,"wb") as out:
  while True:
   chunk=r.read(1024*1024)
   if not chunk: break
   out.write(chunk)
 if PDF_PATH.stat().st_size<1_000_000: raise RuntimeError("Downloaded MANN catalog is unexpectedly small")

def extract_records():
 from pypdf import PdfReader
 reader=PdfReader(str(PDF_PATH))
 if len(reader.pages)<START_PAGE: raise RuntimeError(f"Unexpected catalog page count: {len(reader.pages)}")
 apps=defaultdict(list); structured=defaultdict(list); current_make=None; current_model=None
 for page_no in range(START_PAGE,len(reader.pages)+1):
  text=reader.pages[page_no-1].extract_text() or ""
  for raw in text.splitlines():
   line=clean(raw)
   if not line: continue
   upper=line.upper()
   if upper in KNOWN_MAKES:
    current_make=upper; current_model=None; continue
   if current_make and looks_like_model_heading(line):
    # Keep headings such as "Escort V" / "Escort Cabriolet". Do not infer trim.
    current_model=line
   matches=PART_RE.findall(line)
   for match in matches:
    apps[match].append({"page":page_no,"text":line})
    evidence=parse_structured(line,current_make,current_model,page_no)
    if evidence: structured[match].append(evidence)
 records=[]
 for part in sorted(apps):
  raw=json.dumps(apps[part],ensure_ascii=False,sort_keys=True)
  records.append({"sourceId":SOURCE_ID,"brand":BRAND,"partNumber":part,"partName":f"{BRAND} {part}","category":category(part),"oemNumbers":[],"applications":apps[part],"structuredApplications":structured.get(part,[]),"sourceUrl":SOURCE_URL,"sourceQuality":0.99,"rawHash":hashlib.sha256(raw.encode()).hexdigest()})
 OUT_PATH.parent.mkdir(parents=True,exist_ok=True)
 with open(OUT_PATH,"w",encoding="utf-8") as f:
  for row in records: f.write(json.dumps(row,ensure_ascii=False)+"\n")
 print(f"Extracted {len(records)} parts; structured application evidence: {sum(len(v) for v in structured.values())}")
 return records

def rpc(batch):
 if not SUPABASE_URL or not SUPABASE_KEY: raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
 req=urllib.request.Request(SUPABASE_URL+"/rest/v1/rpc/upsert_catalog_batch",data=json.dumps({"records":batch},ensure_ascii=False).encode(),method="POST",headers={"apikey":SUPABASE_KEY,"Authorization":f"Bearer {SUPABASE_KEY}","Content-Type":"application/json"})
 with urllib.request.urlopen(req,timeout=120) as r: return json.loads(r.read().decode())

def upload(records):
 for start in range(0,len(records),BATCH_SIZE):
  result=rpc(records[start:start+BATCH_SIZE]); print(f"batch {start//BATCH_SIZE+1}: {result}")

if __name__=="__main__":
 if not SOURCE_ID: raise RuntimeError("MANN_SOURCE_ID is required")
 download_pdf(); upload(extract_records())
