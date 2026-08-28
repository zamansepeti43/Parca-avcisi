# Scalable catalog ingestion

## Objective
Build Parça Avcısı's initial knowledge base from openly accessible, authoritative catalog pages without copying proprietary bulk datasets.

## Source priority
1. Official manufacturer catalog/product pages.
2. Official manufacturer downloadable catalogs where access/use permits automated processing.
3. Public regulatory/OEM documentation.
4. Never treat marketplace listings or unsourced aggregators as authoritative seed data.

## Ingestion record
Every candidate must retain:
- normalized manufacturer
- normalized part number
- OEM/reference numbers
- part category/type
- vehicle make/model/year
- engine code when published
- dimensions/specifications when published
- canonical source URL
- source domain
- source quality
- fetched_at

## Deduplication
Canonical identity is manufacturer + normalized part number. Cross-reference/OEM numbers are aliases, not separate parts.

## Validation
A seed record is promoted only when the source is authoritative and the part identity is unambiguous. Conflicting application data remains a candidate and is not promoted.

## Current authoritative seed sources
- MANN-FILTER Online Catalog: official product, vehicle, cross-reference and dimension search. The manufacturer states its catalog covers 6,800 filter elements and about 300,000 applications.
- Bosch Aftermarket eCat: official product and vehicle catalog.
- MAHLE Aftermarket eCat: official aftermarket catalog.

## Scaling rule
Do not manufacture records to reach a target count. Grow the database by paginating/searching the public catalog surface or processing permitted catalog documents in batches. Store provenance for every record so the knowledge base can be audited and refreshed.
