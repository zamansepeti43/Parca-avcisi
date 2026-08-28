# Codex task — replace obsolete catalog ingestion with the canonical five-source pipeline

Implement the catalog expansion described in `CATALOG_PIPELINE_PLAN.md`.

Approved first-wave sources: KAUTEK, KURPAR, Oto Karaman, DRiV EMEA, Continental Engine Parts. NSK is deferred.

Before completion, remove these obsolete MANN-only workflow files:
- `.github/workflows/catalog-ingestion.yml`
- `.github/workflows/mann-additional-catalogs.yml`
- `.github/workflows/mann-ingest-now.yml`

Keep `.github/workflows/build.yml` and create/keep exactly one canonical catalog workflow for the five approved sources. Do not leave competing ingestion workflows.

Build five source-specific adapters. The existing `scripts/mann-pdf-ingest.py` is MANN-specific and must not be reused as if it understands other catalog formats. Normalize all adapters into the existing JSONL ingestion contract and existing Supabase RPC/merge mechanism. Existing products must never be deleted. Deduplicate by normalized manufacturer/OEM/part number, then brand + product code. Preserve all explicit vehicle applications and provenance. Never guess trims, engines, generations or model variants.

Use only public/free/authorized catalog resources and respect robots.txt, terms and rate limits. Make imports resumable/idempotent. Add clear per-source logging and final counts.

Validate build/lint and the ingestion path. Do not claim success unless the adapters actually parse their source and the resulting records can be merged into Supabase.
