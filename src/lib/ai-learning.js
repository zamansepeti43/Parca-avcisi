import { requireSupabase, supabaseConfigured } from './supabase.js';
import { getKnowledgePromotionDecision } from './ai-knowledge-policy.js';

const STORAGE_KEY = 'parca-avcisi-ai-learning-v1';
const MAX_LOCAL_EXAMPLES = 1000;
const clean = (v = '') => String(v).trim();
const normalize = (x = {}) => ({ title: clean(x.title), partName: clean(x.partName), category: clean(x.category), subcategory: clean(x.subcategory), brand: clean(x.brand), model: clean(x.model), oemNumber: clean(x.oemNumber), vehicle: clean(x.vehicle) });
function key(verified = {}, prediction = null) { const v = normalize(verified), p = prediction ? normalize(prediction) : {}; const text = JSON.stringify({ oemNumber: v.oemNumber || p.oemNumber || '', brand: v.brand || p.brand || '', model: v.model || p.model || '', partName: v.partName || p.partName || '', category: v.category || p.category || '', subcategory: v.subcategory || p.subcategory || '', vehicle: v.vehicle || p.vehicle || '' }).toLowerCase(); let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
function localLoad() { if (typeof localStorage === 'undefined') return []; try { const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return Array.isArray(x.examples) ? x.examples : []; } catch { return []; } }
function localSave(example) { if (typeof localStorage === 'undefined') return example; const examples = [example, ...localLoad().filter((x) => x.id !== example.id)].slice(0, MAX_LOCAL_EXAMPLES); localStorage.setItem(STORAGE_KEY, JSON.stringify({ examples })); return example; }

async function promoteGlobalKnowledge({ verifiedListing, aiPrediction, confidence, confirmations, conflicts }) {
  const decision = getKnowledgePromotionDecision({ verifiedListing, confidence, confirmations, conflicts });
  if (!decision.accepted) return { promoted: false, reason: decision.reason };
  const supabase = requireSupabase();
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!token || !base) return { promoted: false, reason: 'Trusted promotion configuration is unavailable.' };
  const response = await fetch(`${base}/functions/v1/promote-ai-knowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ verifiedListing: normalize(verifiedListing), aiPrediction: aiPrediction ? normalize(aiPrediction) : null, confidence, confirmations, conflicts }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Trusted AI knowledge promotion failed.');
  return payload;
}

export async function recordLearningExample({ source = 'manual', aiPrediction = null, verifiedListing = {}, corrections = {}, confidence = 0, evidence = {}, status = 'verified', listingId = null, confirmations = 1, conflicts = 0 } = {}) {
  const verified = normalize(verifiedListing); const prediction = aiPrediction ? normalize(aiPrediction) : null; const exampleKey = key(verified, prediction);
  if (!supabaseConfigured) return localSave({ id: exampleKey, source: source === 'ai' ? 'ai' : 'manual', status, createdAt: new Date().toISOString(), listingId, aiPrediction: prediction, verifiedListing: verified, corrections, confidence, evidence });
  try {
    const { data: userData, error: userError } = await requireSupabase().auth.getUser(); if (userError) throw userError; if (!userData.user) throw new Error('Authentication required.');
    const decision = getKnowledgePromotionDecision({ verifiedListing: verified, confidence, confirmations, conflicts });
    const promotion = status === 'verified' && decision.accepted ? await promoteGlobalKnowledge({ verifiedListing: verified, aiPrediction: prediction, confidence, confirmations, conflicts }) : { promoted: false, reason: decision.reason };
    const { data, error } = await requireSupabase().from('ai_learning_examples').upsert({ user_id: userData.user.id, listing_id: listingId, source: source === 'ai' ? 'ai' : 'manual', status, example_key: exampleKey, ai_prediction: prediction, verified_listing: verified, corrections, confidence: Number(confidence) || 0, evidence: { ...evidence, promotion }, updated_at: new Date().toISOString() }, { onConflict: 'user_id,example_key' }).select().single();
    if (error) throw error; return data;
  } catch (error) { console.warn('AI learning remote kayıt başarısız:', error); return localSave({ id: exampleKey, source: source === 'ai' ? 'ai' : 'manual', status, createdAt: new Date().toISOString(), listingId, aiPrediction: prediction, verifiedListing: verified, corrections, confidence, evidence }); }
}
export const recordAiCorrection = (options = {}) => recordLearningExample({ ...options, source: 'ai' });
export const recordManualListing = (options = {}) => recordLearningExample({ ...options, source: 'manual' });
export async function isPartAlreadyKnown({ verifiedListing = {}, aiPrediction = null } = {}) { const partKey = key(verifiedListing, aiPrediction); if (!supabaseConfigured) return localLoad().some((x) => x.id === partKey); try { const { data, error } = await requireSupabase().from('ai_part_knowledge').select('id').eq('part_key', partKey).maybeSingle(); if (error) throw error; return Boolean(data); } catch { return localLoad().some((x) => x.id === partKey); } }
