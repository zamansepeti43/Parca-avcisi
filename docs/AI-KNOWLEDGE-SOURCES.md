# Parça Avcısı AI — Knowledge Sources

## Priority

1. Verified local knowledge (`ai_part_knowledge` / `ai_vehicle_knowledge`)
2. Verified user corrections and listings
3. External AI API for unknown cases

## Starting knowledge

The application already contains a vehicle reference catalog. A small, explicit seed is loaded into `ai_vehicle_knowledge` so the AI is not empty at first launch.

This seed intentionally contains vehicle identity/reference information only. It does **not** invent OEM-to-part fitment relationships.

## External sources

- NHTSA provides public vehicle datasets and APIs that can be used as an additional vehicle-reference source. See: https://www.nhtsa.gov/nhtsa-datasets-and-apis
- TecAlliance TecDoc provides extensive standardized aftermarket vehicle/parts/reference data, including OE and vehicle linkages, but it is a licensed/commercial data source. It must not be copied into Parça Avcısı without an appropriate license/API agreement. See: https://www.tecalliance.net/products/cards/tecdoc-catalogue

## Learning policy

External information is not automatically trusted. A part-specific fact should enter global part knowledge only when it is supported by an approved source or verified by a user workflow.

The system should never overwrite verified user data with an API guess.
