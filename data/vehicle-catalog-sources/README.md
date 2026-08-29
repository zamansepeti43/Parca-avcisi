# Vehicle catalog source merge

The canonical vehicle catalog is assembled from:

1. VehiclesDB open dataset (CC-BY 4.0) for broad make/model/body/year coverage.
2. The existing Parça Avcısı Turkey-first vehicle catalog for Turkish-market legacy vehicles and aliases.
3. Variant/trim enrichment sources are kept separate and must only add explicitly verified variants.

VehiclesDB attribution is required: **Vehicle data by VehiclesDB** with a link to https://vehiclesdb.com.

Do not infer missing trims, engines, years, or fitments. Merge by normalized make/model/generation/variant keys and preserve provenance.
