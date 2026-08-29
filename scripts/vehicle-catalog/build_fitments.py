import json
from fitment_normalizer import normalize_make, normalize_model, year_matches

# Conservative fitment matcher. A catalog application becomes a fitment only
# when make + model match and, when supplied, application years overlap.
def application_candidates(record):
    seen = set()
    for key in ('structured_applications', 'applications'):
        value = record.get(key) or []
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except Exception:
                value = []
        if isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    item = {'raw': item}
                if isinstance(item, dict):
                    marker = json.dumps(item, sort_keys=True, ensure_ascii=False)
                    if marker not in seen:
                        seen.add(marker)
                        yield item

def match_record(record, vehicles):
    matches = []
    for app in application_candidates(record):
        make = normalize_make(app.get('make') or '')
        model = normalize_model(make, app.get('model') or app.get('model_type') or '')
        if not make or not model:
            continue
        app_engine = (app.get('engine_code') or '').strip().upper()
        for vehicle in vehicles:
            if normalize_make(vehicle.get('make')) != make:
                continue
            if normalize_model(make, vehicle.get('model')) != model:
                continue
            if not year_matches(vehicle.get('year_from'), vehicle.get('year_to'), app.get('year_from'), app.get('year_to')):
                continue
            vehicle_engine = (vehicle.get('engine_code') or '').strip().upper()
            confidence = 0.97 if app_engine and vehicle_engine and app_engine == vehicle_engine else 0.90
            matches.append((record['part_id'], vehicle['id'], confidence, record['id']))
    return matches
