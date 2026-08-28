import json
from fitment_normalizer import normalize_make, normalize_model, year_matches

# Runner contract: receives catalog records and canonical vehicles, emits idempotent
# part_vehicle_fitments rows. Matching is deliberately conservative: make + model
# are required; when application years are present they must overlap the vehicle range.

def application_candidates(record):
    for key in ('structured_applications','applications'):
        value = record.get(key) or []
        if isinstance(value, str):
            try: value = json.loads(value)
            except Exception: value = []
        if isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    yield {'raw': item}
                elif isinstance(item, dict):
                    yield item

def match_record(record, vehicles):
    matches=[]
    for app in application_candidates(record):
        make = normalize_make(app.get('make') or '')
        model = normalize_model(make, app.get('model') or app.get('model_type') or '')
        if not make or not model: continue
        for vehicle in vehicles:
            if normalize_make(vehicle.get('make')) != make: continue
            if normalize_model(make, vehicle.get('model')) != model: continue
            if not year_matches(vehicle.get('year_from'), vehicle.get('year_to'), app.get('year_from'), app.get('year_to')): continue
            confidence = 0.97 if app.get('engine_code') and vehicle.get('engine_code') == app.get('engine_code') else 0.90
            matches.append((record['part_id'], vehicle['id'], confidence, record['id']))
    return matches
