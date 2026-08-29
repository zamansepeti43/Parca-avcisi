# Fitment sync plan

## Goal
Keep the Supabase vehicle catalog and `part_vehicle_fitments` graph synchronized as catalogs grow.

## Pipeline
1. Export/merge the canonical vehicle catalog.
2. Upsert canonical vehicles into Supabase `vehicles`.
3. Read `ai_catalog_records` in bounded batches.
4. Resolve each catalog record to the real `parts.id` by normalized part number.
5. Parse `structured_applications` and `applications`.
6. Normalize Turkish-market make/model aliases.
7. Require make + model and overlapping years when years are supplied.
8. Match engine code when available and assign a higher confidence.
9. Upsert `(part_id, vehicle_id)` into `part_vehicle_fitments`.
10. Record unmatched records for later enrichment instead of inventing fitments.
11. Repeat for new/changed catalog records on every catalog sync.

## Safety
- Never create a fitment from an unknown make/model.
- Never infer a vehicle solely from a generic part category.
- Do not overwrite stronger existing evidence with weaker evidence.
- Use idempotent upserts.
- Keep batch size bounded.

## Current production facts
- Canonical GitHub catalog: 7,587 vehicle records (latest audit).
- Supabase `parts`: 196,220 records.
- Supabase `ai_catalog_records`: 203,469 records.
- Supabase `part_vehicle_fitments`: currently empty; initial population is pending the catalog-to-Supabase vehicle import and controlled batch execution.
