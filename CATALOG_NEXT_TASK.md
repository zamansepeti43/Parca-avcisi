# NEXT TASK — implement the five approved catalogs

Approved first wave (exactly five):
1. KAUTEK — https://www.kautek.com.tr/tr/katalog
2. KURPAR — https://www.kurpar.com/
3. Oto Karaman — https://www.otokaraman.com/tr
4. DRiV EMEA — https://www.drivparts.com/en-eu/support/pdf-catalogues.html
5. Continental Engine Parts — https://www.continental-engineparts.com/eu/en-gb/aftermarket/support/downloads

NSK is deferred and must NOT be included in this wave.

Build source-specific adapters and one canonical ingestion workflow. The previous MANN-only workflow files have intentionally been removed. Do not recreate them and do not leave old/duplicate catalog workflows.

Existing product data is sacred: never delete it. Merge new records into the same product pool; deduplicate by normalized manufacturer/OEM/part number, then brand + product code. Preserve all explicit applications, OEM/cross references, provenance and confidence. Never invent missing make/model/generation/year/engine/trim.

Use only public/free/authorized sources and respect robots.txt, terms and rate limits. Make ingestion idempotent and report discovered/new/matched/application/skipped/error counts per source.

The existing MANN parser is MANN-specific and is not a parser for these five sources.
