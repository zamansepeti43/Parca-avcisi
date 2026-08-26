import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MODEL = process.env.OLLAMA_MODEL || 'qwen3-vl:8b';
const HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const images = process.argv.slice(2);

if (!images.length) {
  console.error('Kullanım: node scripts/ollama-vision-test.mjs <foto1.jpg> [foto2.jpg ...]');
  process.exit(1);
}

const toBase64 = async (file) => (await readFile(path.resolve(file))).toString('base64');

const prompt = `You are Parça Avcısı automotive-parts vision engine. Analyze the supplied automobile-part photo(s).
Return ONLY valid JSON with this exact shape:
{
  "part_name": "",
  "category": "",
  "subcategory": "",
  "brand": "",
  "oem_number": "",
  "vehicle_make": "",
  "vehicle_model": "",
  "vehicle_year_range": "",
  "confidence": 0,
  "evidence": [""],
  "description_tr": ""
}
Rules:
- Never invent an OEM, brand or vehicle fitment. Use an empty string when not visible or not reliably inferable.
- Distinguish direct visual evidence from inference in evidence.
- confidence is 0-100 for the overall identification.
- category/subcategory must be concise automotive taxonomy labels.
- description_tr must be a marketplace-ready Turkish listing description based only on supported facts.
- If multiple photos show the same part, combine evidence instead of duplicating it.`;

const body = {
  model: MODEL,
  stream: false,
  format: 'json',
  options: { temperature: 0.1 },
  messages: [{ role: 'user', content: prompt, images: await Promise.all(images.map(toBase64)) }],
};

const started = Date.now();
const response = await fetch(`${HOST.replace(/\/$/, '')}/api/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

if (!response.ok) {
  console.error(`Ollama HTTP ${response.status}: ${await response.text()}`);
  process.exit(2);
}

const data = await response.json();
const elapsedMs = Date.now() - started;
let result;
try {
  result = JSON.parse(data.message?.content || '{}');
} catch {
  console.error('Model geçerli JSON döndürmedi. Ham çıktı:');
  console.error(data.message?.content || data);
  process.exit(3);
}

console.log(JSON.stringify({
  model: MODEL,
  elapsed_ms: elapsedMs,
  eval: {
    part_recognition: Boolean(result.part_name),
    category: Boolean(result.category),
    subcategory: Boolean(result.subcategory),
    oem_extraction: Boolean(result.oem_number),
    brand_extraction: Boolean(result.brand),
    vehicle_extraction: Boolean(result.vehicle_make || result.vehicle_model),
    listing_description: Boolean(result.description_tr),
    confidence: Number(result.confidence || 0),
  },
  result,
}, null, 2));
