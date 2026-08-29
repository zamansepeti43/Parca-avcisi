# Turkey-first fitment pipeline

1. Read `ai_catalog_records` in batches.
2. Use `structured_applications` as the primary catalog declaration; use `applications` when it contains structured make/model data.
3. Treat an explicit catalog make + model + optional year/engine application as authoritative compatibility data; never invent missing compatibility.
4. Automatically register catalog-defined vehicle/variant rows that are not yet present in `vehicles`.
5. Upsert `(part_id, vehicle_id)` into `part_vehicle_fitments` with `match_method=catalog_direct`.
6. Match application year ranges when supplied and prefer exact engine-code matches when available.
7. Keep unmatched/non-structured records for later source-specific parsing; do not run an expensive part x full vehicle Cartesian scan as the primary path.
8. Report catalog-direct fitment counts and coverage.

The canonical runtime entry point is `scripts/supabase/sync-vehicles-and-fitments.mjs`, which calls the Supabase RPC `sync_catalog_direct_fitments`.

Priority: Fiat, Renault, Ford, Volkswagen, Opel, Peugeot, Citroen, Toyota, Hyundai, Kia, Dacia, Mercedes-Benz, Nissan, Skoda, Seat, Audi, BMW, Honda, then remaining Turkish-market makes.
