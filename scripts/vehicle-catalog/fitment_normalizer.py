import re

ALIASES = {
    'CITROEN': {'C-ELYSEE': 'C ELYSEE', 'C ELYSEE': 'C ELYSEE', 'C4 CACTUS': 'C4 CACTUS'},
    'MERCEDES-BENZ': {'C CLASS': 'C-CLASS', 'C SERISI': 'C-CLASS', 'E CLASS': 'E-CLASS', 'E SERISI': 'E-CLASS'},
    'VOLKSWAGEN': {'VW': 'VOLKSWAGEN', 'GOLF VII': 'GOLF', 'GOLF VIII': 'GOLF', 'PASSAT B8': 'PASSAT', 'POLO VI': 'POLO'},
    'RENAULT': {'CLIO IV': 'CLIO', 'CLIO V': 'CLIO', 'MEGANE IV': 'MEGANE', 'MEGANE III': 'MEGANE', 'KANGOO II': 'KANGOO'},
    'FIAT': {'EGEA': 'EGEA', 'TIPO': 'EGEA', 'DOBLO CARGO': 'DOBLO', 'FIORINO COMBI': 'FIORINO'},
    'FORD': {'TOURNEO COURIER': 'TOURNEO COURIER', 'TRANSIT COURIER': 'TRANSIT COURIER'},
}

def normalize(value: str) -> str:
    value = (value or '').upper().strip()
    value = value.replace('İ', 'I').replace('Ş', 'S').replace('Ğ', 'G').replace('Ü', 'U').replace('Ö', 'O').replace('Ç', 'C')
    value = re.sub(r'[^A-Z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()

def normalize_make(value: str) -> str:
    v = normalize(value)
    return {'VW': 'VOLKSWAGEN', 'MERCEDES': 'MERCEDES-BENZ', 'MERCEDES BENZ': 'MERCEDES-BENZ'}.get(v, v)

def normalize_model(make: str, value: str) -> str:
    make = normalize_make(make)
    v = normalize(value)
    for alias, canonical in ALIASES.get(make, {}).items():
        if normalize(alias) == v:
            return normalize(canonical)
    return v

def year_matches(vehicle_year_from, vehicle_year_to, app_year_from, app_year_to):
    vf = vehicle_year_from or 0
    vt = vehicle_year_to or 9999
    af = app_year_from or 0
    at = app_year_to or 9999
    return vf <= at and af <= vt
