#!/usr/bin/env node
/**
 * Resumable catalog ingestion worker.
 *
 * It deliberately consumes only catalog endpoints/files that the caller is
 * authorized to use. It does not bypass authentication, robots rules, or
 * licensing restrictions. Feed adapters should emit normalized JSON records.
 *
 * Usage:
 *   node scripts/catalog-ingest.mjs --file data/catalog.jsonl --batch 500
 *
 * Each JSONL row should contain at minimum:
 *   { brand, partNumber, partName, category, oemNumbers, applications, sourceUrl, sourceQuality }
 */
import fs from 'node:fs';
import readline from 'node:readline';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith('--')) args.set(process.argv[i].slice(2), process.argv[i + 1] || true);
}
const file = args.get('file');
const batchSize = Math.max(1, Number(args.get('batch') || 500));
if (!file) {
  console.error('Missing --file <normalized-jsonl>');
  process.exit(1);
}

function normalize(row) {
  const brand = String(row.brand || '').trim();
  const partNumber = String(row.partNumber || '').trim().toUpperCase().replace(/[\s./_-]+/g, '');
  if (!brand || !partNumber) return null;
  return {
    brand,
    partNumber,
    partName: String(row.partName || '').trim(),
    category: String(row.category || '').trim(),
    oemNumbers: Array.isArray(row.oemNumbers) ? [...new Set(row.oemNumbers.map(String).map(v => v.trim()).filter(Boolean))] : [],
    applications: Array.isArray(row.applications) ? row.applications : [],
    sourceUrl: String(row.sourceUrl || '').trim(),
    sourceQuality: Math.min(1, Math.max(0, Number(row.sourceQuality ?? 0))),
  };
}

const input = fs.createReadStream(file, 'utf8');
const rl = readline.createInterface({ input, crlfDelay: Infinity });
let batch = [];
let seen = new Set();
let accepted = 0;
let rejected = 0;
let duplicates = 0;

function key(row) { return `${row.brand.toLowerCase()}::${row.partNumber}`; }

for await (const line of rl) {
  if (!line.trim()) continue;
  let raw;
  try { raw = JSON.parse(line); } catch { rejected += 1; continue; }
  const row = normalize(raw);
  if (!row) { rejected += 1; continue; }
  const k = key(row);
  if (seen.has(k)) { duplicates += 1; continue; }
  seen.add(k);
  batch.push(row);
  accepted += 1;
  if (batch.length >= batchSize) {
    process.stdout.write(JSON.stringify({ type: 'batch', size: batch.length, records: batch }) + '\n');
    batch = [];
  }
}
if (batch.length) process.stdout.write(JSON.stringify({ type: 'batch', size: batch.length, records: batch }) + '\n');
process.stderr.write(JSON.stringify({ accepted, rejected, duplicates }) + '\n');
