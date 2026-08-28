# Turkey-first fitment pipeline

1. Read `ai_catalog_records` in batches.
2. Parse `structured_applications` first; fall back to `applications`.
3. Normalize Turkish-market make/model aliases.
4. Require make + model match. If application year ranges exist, require overlap.
5. Prefer engine-code matches when available.
6. Upsert `(part_id, vehicle_id)` into `part_vehicle_fitments`.
7. Keep unmatched records for later expansion; never invent compatibility.
8. Report scanned, matched, unmatched and confidence distributions.

Priority: Fiat, Renault, Ford, Volkswagen, Opel, Peugeot, Citroen, Toyota, Hyundai, Kia, Dacia, Mercedes-Benz, Nissan, Skoda, Seat, Audi, BMW, Honda, then remaining Turkish-market makes.
