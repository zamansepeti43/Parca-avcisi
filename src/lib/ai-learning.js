import { requireSupabase, supabaseConfigured } from './supabase.js';

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

function toExample(row) {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    listingId: row.listing_id || null,
    aiPrediction: row.ai_prediction || null,
    verifiedListing: row.verified_listing || {},
    corrections: row.corrections || {},
    confidence: Number(row.confidence) || 0,
    evidence: row.evidence || {},
  };
}

function saveLocalExample({ source, aiPrediction, verifiedListing, corrections, confidence, evidence, status, listingId = null }) {
  const verified = normalizeListing(verifiedListing);
  const prediction = aiPrediction ? normalizeListing(aiPrediction) : null;
  const example = {
    id: fingerprint({ source, prediction, verified, corrections, listingId }),
    source: source === 'ai' ? 'ai' : 'manual',
    status,
    createdAt: new Date().toISOString(),
    listingId,
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

async function getUserId() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('AI öğrenme verisi için giriş yapmalısın.');
  return data.user.id;
}

export async function recordLearningExample({ source = 'manual', aiPrediction = null, verifiedListing = {}, corrections = {}, confidence = 0, evidence = {}, status = 'verified', listingId = null } = {}) {
  if (!supabaseConfigured) return saveLocalExample({ source, aiPrediction, verifiedListing, corrections, confidence, evidence, status, listingId });

  try {
    const userId = await getUserId();
    const verified = normalizeListing(verifiedListing);
    const prediction = aiPrediction ? normalizeListing(aiPrediction) : null;
    const exampleKey = fingerprint({ source, prediction, verified, corrections, listingId });
    const { data, error } = await requireSupabase()
      .from('ai_learning_examples')
      .upsert({
        user_id: userId,
        listing_id: listingId,
        source: source === 'ai' ? 'ai' : 'manual',
        status,
        example_key: exampleKey,
        ai_prediction: prediction,
        verified_listing: verified,
        corrections: corrections && typeof corrections === 'object' ? corrections : {},
        confidence: Number(confidence) || 0,
        evidence: evidence && typeof evidence === 'object' ? evidence : {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,example_key' })
      .select()
      .single();
    if (error) throw error;
    return toExample(data);
  } catch (error) {
    console.warn('AI learning remote kayıt başarısız, yerel yedek kullanılıyor:', error);
    return saveLocalExample({ source, aiPrediction, verifiedListing, corrections, confidence, evidence, status, listingId });
  }
}

export function recordAiCorrection(options = {}) {
  return recordLearningExample({ ...options, source: 'ai' });
}

export function recordManualListing(options = {}) {
  return recordLearningExample({ ...options, source: 'manual' });
}

export async function getLearningExamples({ source = null, status = 'verified', limit = 100 } = {}) {
  if (!supabaseConfigured) {
    const examples = load().examples;
    return examples.filter((item) => (!source || item.source === source) && (!status || item.status === status)).slice(0, limit);
  }

  try {
    const userId = await getUserId();
    let query = requireSupabase()
      .from('ai_learning_examples')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 100, 1), 500));
    if (source) query = query.eq('source', source);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(toExample);
  } catch (error) {
    console.warn('AI learning remote okuma başarısız:', error);
    const examples = load().examples;
    return examples.filter((item) => (!source || item.source === source) && (!status || item.status === status)).slice(0, limit);
  }
}

export async function getLearningStats() {
  if (!supabaseConfigured) {
    const examples = load().examples;
    return {
      total: examples.length,
      aiVerified: examples.filter((item) => item.source === 'ai' && item.status === 'verified').length,
      manualVerified: examples.filter((item) => item.source === 'manual' && item.status === 'verified').length,
    };
  }

  try {
    const userId = await getUserId();
    const { data, error } = await requireSupabase()
      .from('ai_learning_examples')
      .select('source,status')
      .eq('user_id', userId);
    if (error) throw error;
    const rows = data || [];
    return {
      total: rows.length,
      aiVerified: rows.filter((item) => item.source === 'ai' && item.status === 'verified').length,
      manualVerified: rows.filter((item) => item.source === 'manual' && item.status === 'verified').length,
    };
  } catch (error) {
    console.warn('AI learning istatistikleri alınamadı:', error);
    const examples = load().examples;
    return {
      total: examples.length,
      aiVerified: examples.filter((item) => item.source === 'ai' && item.status === 'verified').length,
      manualVerified: examples.filter((item) => item.source === 'manual' && item.status === 'verified').length,
    };
  }
}

export function clearLearningExamples() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}
