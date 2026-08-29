import fs from 'node:fs/promises';

const input = 'data/vehicle-catalog-merged.json';
const output = 'data/vehicle-catalog-audit.json';
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const key = (...v) => v.map(clean).join('|').toLocaleLowerCase('tr-TR');

const payload = JSON.parse(await fs.readFile(input, 'utf8'));
const rows = Array.isArray(payload.records) ? payload.records : [];
const unique = (values) => new Set(values.filter(Boolean));

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
console.log(JSON.stringify(report, null, 2));
