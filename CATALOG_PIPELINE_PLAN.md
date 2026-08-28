# Parça Avcısı — Canonical catalog pipeline

The catalog expansion must use exactly these five sources in the first wave:

1. KAUTEK — https://www.kautek.com.tr/tr/katalog
2. KURPAR — https://www.kurpar.com/
3. Oto Karaman — https://www.otokaraman.com/tr
4. DRiV EMEA PDF catalogues — https://www.drivparts.com/en-eu/support/pdf-catalogues.html
5. Continental Engine Parts aftermarket downloads — https://www.continental-engineparts.com/eu/en-gb/aftermarket/support/downloads

Do NOT add NSK in this wave; it is deferred to the next wave.

## Required behavior

- Remove the obsolete MANN-specific ingestion workflows after the currently running MANN job has finished: `catalog-ingestion.yml`, `mann-additional-catalogs.yml`, `mann-ingest-now.yml`.
- Do not leave multiple competing catalog workflows. Keep one canonical catalog ingestion workflow for the five sources above, plus the normal build workflow.
- Implement one adapter per source under `scripts/catalog-adapters/`.
- Use only public/free/authorized catalog pages or downloadable PDFs. Respect robots.txt, terms and rate limits.
- Normalize into the existing product schema and merge into the existing single product pool.
- Never delete existing products.
- Primary dedup: normalized manufacturer/OEM/part number; secondary: brand + product code.
- Different vehicle applications of the same part remain application relationships, not duplicate products.
- Preserve source URL, source name/date and confidence/evidence.
- Do not infer vehicle make/model/engine/trim values that are not explicit in the source.
- Re-running any adapter must be idempotent.
- Report per source: records discovered, new products, matched existing products, new applications, rejected/skipped records and errors.
- Validate build/lint and Supabase import behavior before considering the pipeline complete.

## Important

The existing MANN parser is MANN-specific. Do not pretend it can parse KAUTEK/KURPAR/Oto Karaman/DRiV/Continental. Build source-specific adapters and feed normalized JSONL into the existing ingestion path.
