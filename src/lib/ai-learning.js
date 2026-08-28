const STORAGE_KEY = 'parca-avcisi-ai-learning-v1';
const MAX_LOCAL_EXAMPLES = 1000;

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function load() {
  if (typeof localStorage === 'undefined') return { examples: [] };
  const parsed = safeParse(localStorage.getItem(STORAGE_KEY) || '', { examples: [] });
  return parsed && Array.isArray(parsed.examples) ? parsed : { examples: [] };
}

function save(state) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clean(value = '') {
  return String(value).trim();
}

function normalizeListing(listing = {}) {
  return {
    title: clean(listing.title),
    partName: clean(listing.partName),
    category: clean(listing.category),
    subcategory: clean(listing.subcategory),
    brand: clean(listing.brand),
    model: clean(listing.model),
    oemNumber: clean(listing.oemNumber),
    vehicle: clean(listing.vehicle),
  };
}

function fingerprint(input) {
  const text = JSON.stringify(input).toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function recordLearningExample({ source = 'manual', aiPrediction = null, verifiedListing = {}, corrections = {}, confidence = 0, evidence = {}, status = 'verified' } = {}) {
  const verified = normalizeListing(verifiedListing);
  const prediction = aiPrediction ? normalizeListing(aiPrediction) : null;
  const example = {
    id: fingerprint({ source, prediction, verified, corrections }),
    source: source === 'ai' ? 'ai' : 'manual',
    status,
    createdAt: new Date().toISOString(),
    aiPrediction: prediction,
    verifiedListing: verified,
    corrections: corrections && typeof corrections === 'object' ? corrections : {},
    confidence: Number(confidence) || 0,
    evidence: evidence && typeof evidence === 'object' ? evidence : {},
  };
  const state = load();
  const withoutDuplicate = state.examples.filter((item) => item.id !== example.id);
  state.examples = [example, ...withoutDuplicate].slice(0, MAX_LOCAL_EXAMPLES);
  save(state);
  return example;
}

export function recordAiCorrection({ aiPrediction, verifiedListing, corrections = {}, confidence = 0, evidence = {} } = {}) {
  return recordLearningExample({ source: 'ai', aiPrediction, verifiedListing, corrections, confidence, evidence });
}

export function recordManualListing({ verifiedListing, evidence = {} } = {}) {
  return recordLearningExample({ source: 'manual', verifiedListing, evidence });
}

export function getLearningExamples({ source = null, status = 'verified' } = {}) {
  const examples = load().examples;
  return examples.filter((item) => (!source || item.source === source) && (!status || item.status === status));
}

export function getLearningStats() {
  const examples = load().examples;
  return {
    total: examples.length,
    aiVerified: examples.filter((item) => item.source === 'ai').length,
    manualVerified: examples.filter((item) => item.source === 'manual').length,
  };
}

export function clearLearningExamples() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}
