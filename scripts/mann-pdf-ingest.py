#!/usr/bin/env python3
"""Extract MANN cars/transporters catalog applications and push them to Supabase.

This uses the official MANN catalog PDF only. It does not bypass authentication
or licensing controls. The PDF is downloaded from MANN's published Download Hub
URL and parsed locally inside GitHub Actions.
"""
import hashlib
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

PDF_URL = os.environ.get(
    "MANN_CATALOG_URL",
    "https://www.mann-filter.com/content/dam/mann-filter/communication-media/brochures-catalogs/mann-filter-catalog-cars-transporters-2024-26-interactive.pdf",
)
SOURCE_ID = os.environ.get("MANN_SOURCE_ID", "d6646f1f-55c9-4141-beb8-f12b69ae7034")
SOURCE_URL = "https://www.mann-filter.com/tr-tr/katalog.html"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
PDF_PATH = Path(os.environ.get("MANN_PDF_PATH", "data/mann-cars-transporters-2024-26.pdf"))
OUT_PATH = Path(os.environ.get("MANN_JSONL_PATH", "data/mann-cars-transporters.jsonl"))
BATCH_SIZE = int(os.environ.get("CATALOG_BATCH_SIZE", "100"))

PART_RE = re.compile(
    r"\b(?:BFU?|BL|CUK|CU|CF|CP|CS|CUD|C|FP|HD|HU|LC|LE|MH|MWK?|P(?:F|FU|L|U)?|SP|TB|U|WDK|WD|WH|WK|WP|WA|W)\s+\d+(?:\s+\d+)?(?:/[A-Za-z0-9]+)?(?:-\d+)?\b"
)


def category(part: str) -> str:
    p = part.split()[0].upper()
    if p in {"C", "CF", "CP", "CS", "CU", "CUD", "CUK", "FP"}:
        return "Hava/Kabin Filtresi"
    if p in {"H", "HU", "HD", "W", "WD", "WP", "WA", "WH"}:
        return "Yağ Filtresi"
    if p in {"P", "PF", "PFU", "PL", "PU", "BF", "BFU", "BL", "WK", "WDK", "MWK"}:
        return "Yakıt Filtresi"
    if p in {"MH", "MW"}:
        return "Motosiklet Filtresi"
    if p in {"LC", "LE", "LB"}:
        return "Havalandırma/Yağ Ayırıcı"
    return "Diğer"


def download_pdf() -> None:
    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    if PDF_PATH.exists() and PDF_PATH.stat().st_size > 1_000_000:
        print(f"Using cached catalog: {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")
        return
    print(f"Downloading official MANN catalog: {PDF_URL}")
    req = urllib.request.Request(PDF_URL, headers={"User-Agent": "Parca-Avcisi-catalog-ingest/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response, open(PDF_PATH, "wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    if PDF_PATH.stat().st_size < 1_000_000:
        raise RuntimeError("Downloaded MANN catalog is unexpectedly small")


def extract_records():
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is required") from exc

    reader = PdfReader(str(PDF_PATH))
    if len(reader.pages) < 57:
        raise RuntimeError(f"Unexpected catalog page count: {len(reader.pages)}")

    applications = defaultdict(list)
    # The application list starts on physical page 57 and runs through the
    # cars/transporter section. The catalog itself states that applications are
    # listed by vehicle manufacturer.
    for page_no in range(57, len(reader.pages) + 1):
        text = reader.pages[page_no - 1].extract_text() or ""
        for raw_line in text.splitlines():
            line = " ".join(raw_line.split()).strip()
            if not line:
                continue
            for match in PART_RE.findall(line):
                applications[match].append({"page": page_no, "text": line})

    records = []
    for part in sorted(applications):
        apps = applications[part]
        raw = json.dumps(apps, ensure_ascii=False, sort_keys=True)
        records.append({
            "sourceId": SOURCE_ID,
            "brand": "MANN-FILTER",
            "partNumber": part,
            "partName": f"MANN-FILTER {part}",
            "category": category(part),
            "oemNumbers": [],
            "applications": apps,
            "sourceUrl": SOURCE_URL,
            "sourceQuality": 0.99,
            "rawHash": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        for row in records:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Extracted {len(records)} unique MANN part numbers and {sum(len(v) for v in applications.values())} application references")
    print(f"JSONL: {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")
    return records


def rpc(batch):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    body = json.dumps(batch, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/rpc/upsert_catalog_batch",
        data=body,
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
    )
    # The RPC expects a jsonb argument named records.
    envelope = json.dumps({"records": batch}, ensure_ascii=False).encode("utf-8")
    req.data = envelope
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def upload(records):
    total = len(records)
    upserted = duplicates = rejected = 0
    for start in range(0, total, BATCH_SIZE):
        batch = records[start:start + BATCH_SIZE]
        result = rpc(batch)
        if isinstance(result, list):
            result = result[0] if result else {}
        upserted += int(result.get("upserted", 0))
        duplicates += int(result.get("duplicates", 0))
        rejected += int(result.get("rejected", 0))
        print(f"batch {start // BATCH_SIZE + 1}: {len(batch)} records -> {result}")
    print(json.dumps({"records": total, "upserted": upserted, "duplicates": duplicates, "rejected": rejected}))


if __name__ == "__main__":
    download_pdf()
    records = extract_records()
    upload(records)
