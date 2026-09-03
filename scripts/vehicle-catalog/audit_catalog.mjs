import fs from 'node:fs/promises';

const input = 'data/vehicle-catalog-merged.json';
const output = 'data/vehicle-catalog-audit.json';
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const norm = (v) => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('tr-TR');
const key = (...v) => v.map(norm).join('|');
const unique = (values) => new Set(values.filter(Boolean));
const valveSignature = (value) => {
  const text = clean(value).toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');
  if (/\b16\s*V\b/.test(text) || /\bV\s*16\b/.test(text)) return '16V';
  if (/\b8\s*V\b/.test(text) || /\bV\s*8\b/.test(text)) return '8V';
  return null;
};
const displacementSignature = (value) => {
  const match = clean(value).match(/\b(0?\d(?:[.,]\d{1,2})?)\s*(?:L|LT|LİTRE)?\b/i);
  return match ? match[1].replace(',', '.') : null;
};

const payload = JSON.parse(await fs.readFile(input, 'utf8'));
const rows = Array.isArray(payload.records) ? payload.records : [];

const makes = unique(rows.map(r => clean(r.make)));
const models = unique(rows.map(r => key(r.make, r.model)));
const engines = unique(rows.flatMap(r => (r.engines || []).map(e => key(r.make, r.model, e))));
const trims = unique(rows.flatMap(r => (r.trims || []).map(t => key(r.make, r.model, t))));
const variants = unique(rows.flatMap(r => [
  ...(r.engines || []).map(e => key(r.make, r.model, r.body, e)),
  ...(r.trims || []).map(t => key(r.make, r.model, r.body, t)),
]));
const years = unique(rows.flatMap(r => (r.years || []).map(Number)));
const bodies = unique(rows.map(r => clean(r.body)));

// Detect places where the catalog already proves that the same make/model and
// displacement has both 8V and 16V engines. Such families require the selector
// to preserve the valve distinction instead of collapsing them to one label.
const valveFamilies = new Map();
const modelLabelFamilies = new Map();
const collectEngineLabels = (row) => [
  ...(row.engines || []),
  ...(row.trims || []),
  ...(row.engineDetails || []).flatMap(d => [
    d.name, d.label, d.engine, d.version, d.trim,
    d.valves, d.valveCount, d.valf, d.valfSayisi,
  ]),
].map(clean).filter(Boolean);

for (const row of rows) {
  const makeModel = key(row.make, row.model);
  const rawModel = clean(row.model);
  if (!modelLabelFamilies.has(makeModel)) modelLabelFamilies.set(makeModel, new Set());
  modelLabelFamilies.get(makeModel).add(rawModel);

  for (const label of collectEngineLabels(row)) {
    const displacement = displacementSignature(label);
    const valve = valveSignature(label);
    if (!displacement || !valve) continue;
    const familyKey = `${makeModel}|${displacement}`;
    if (!valveFamilies.has(familyKey)) {
      valveFamilies.set(familyKey, {
        make: clean(row.make),
        model: rawModel,
        displacement,
        valves: new Set(),
        labels: new Set(),
      });
    }
    const family = valveFamilies.get(familyKey);
    family.valves.add(valve);
    family.labels.add(label);
  }
}

const valveDistinctionFamilies = [...valveFamilies.values()]
  .filter(f => f.valves.has('8V') && f.valves.has('16V'))
  .map(f => ({
    make: f.make,
    model: f.model,
    displacement: f.displacement,
    valves: [...f.valves].sort(),
    labels: [...f.labels].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })),
  }))
  .sort((a, b) => key(a.make, a.model, a.displacement).localeCompare(key(b.make, b.model, b.displacement), 'tr'));

const duplicateModelLabels = [...modelLabelFamilies.entries()]
  .filter(([, labels]) => labels.size > 1)
  .map(([family, labels]) => ({
    family,
    labels: [...labels].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })),
  }))
  .sort((a, b) => a.family.localeCompare(b.family, 'tr'));

// A row with an engine label that omits 8V/16V is not automatically wrong. It
// is flagged only when the same make/model/displacement is already known to
// contain both valve families, so a source-backed review can decide whether the
// label needs to be split or mapped to a precise engine record.
const ambiguousValveLabels = [];
for (const row of rows) {
  const makeModel = key(row.make, row.model);
  for (const label of collectEngineLabels(row)) {
    const displacement = displacementSignature(label);
    if (!displacement || valveSignature(label)) continue;
    const family = valveFamilies.get(`${makeModel}|${displacement}`);
    if (!family || family.valves.size < 2) continue;
    ambiguousValveLabels.push({
      make: clean(row.make),
      model: clean(row.model),
      displacement,
      label,
      years: Array.isArray(row.years) ? row.years.map(Number).filter(Number.isFinite) : [],
      body: clean(row.body),
      provenance: Array.isArray(row.provenance) ? row.provenance : [],
    });
  }
}

const dedupAmbiguous = new Map();
for (const item of ambiguousValveLabels) {
  dedupAmbiguous.set(key(item.make, item.model, item.displacement, item.label, item.body, item.years.join(',')), item);
}

const report = {
  generated_at: new Date().toISOString(),
  source: 'ParcaAvcisi vehicle-catalog-merged.json',
  parca_avcisi: {
    marka_sayisi: makes.size,
    model_sayisi: models.size,
    motor_sayisi: engines.size,
    donanim_paket_sayisi: trims.size,
    motor_veya_versiyon_sayisi: variants.size,
    kasa_govde_sayisi: bodies.size,
    yil_sayisi: years.size,
    kayit_sayisi: rows.length,
  },
  variant_quality_audit: {
    valve_distinction_family_count: valveDistinctionFamilies.length,
    valve_distinction_families: valveDistinctionFamilies,
    ambiguous_valve_label_count: dedupAmbiguous.size,
    ambiguous_valve_labels: [...dedupAmbiguous.values()].sort((a, b) =>
      key(a.make, a.model, a.displacement, a.label).localeCompare(key(b.make, b.model, b.displacement, b.label), 'tr')
    ),
    duplicate_model_label_family_count: duplicateModelLabels.length,
    duplicate_model_labels: duplicateModelLabels,
    policy: '8V and 16V are distinct engine variants. Do not merge them. Unqualified labels are review candidates only when the same make/model/displacement is already proven to contain both valve families.',
  },
  sahibinden: {
    marka_sayisi: null,
    model_sayisi: null,
    motor_veya_versiyon_sayisi: null,
    donanim_paket_sayisi: null,
    note: 'Sahibinden does not expose a public bulk taxonomy/API for its complete Marka-Seri-Model-Yil-Motor-Paket-Donanim tree. Do not scrape or infer totals from individual search pages. Use an authorized export/API if available.'
  },
  comparison: {
    status: 'awaiting_authorized_sahibinden_reference',
    parca_avcisi_is_ready: true,
  },
};

await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  marka_sayisi: report.parca_avcisi.marka_sayisi,
  model_sayisi: report.parca_avcisi.model_sayisi,
  kayit_sayisi: report.parca_avcisi.kayit_sayisi,
  valve_distinction_family_count: report.variant_quality_audit.valve_distinction_family_count,
  ambiguous_valve_label_count: report.variant_quality_audit.ambiguous_valve_label_count,
  duplicate_model_label_family_count: report.variant_quality_audit.duplicate_model_label_family_count,
}, null, 2));
