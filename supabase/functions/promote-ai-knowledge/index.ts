import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const THRESHOLD = 0.85;
const MIN_CONFIRMATIONS = 2;

const clean = (v: unknown) => String(v ?? '').trim();
function normalize(v: Record<string, unknown> = {}) {
  return { title: clean(v.title), partName: clean(v.partName), category: clean(v.category), subcategory: clean(v.subcategory), brand: clean(v.brand), model: clean(v.model), oemNumber: clean(v.oemNumber), vehicle: clean(v.vehicle) };
}
function fingerprint(input: unknown) {
  const text = JSON.stringify(input).toLowerCase(); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16);
}
function partKey(verified: Record<string, unknown>, prediction: Record<string, unknown> | null) {
  return fingerprint({
    oemNumber: clean(verified.oemNumber) || clean(prediction?.oemNumber),
    brand: clean(verified.brand) || clean(prediction?.brand),
    model: clean(verified.model) || clean(prediction?.model),
    partName: clean(verified.partName) || clean(prediction?.partName),
    category: clean(verified.category) || clean(prediction?.category),
    subcategory: clean(verified.subcategory) || clean(prediction?.subcategory),
    vehicle: clean(verified.vehicle) || clean(prediction?.vehicle),
  });
}
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Authentication required' }, 401);
    const token = auth.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'Invalid authentication' }, 401);

    const body = await req.json();
    const verified = normalize(body.verifiedListing || {});
    const prediction = body.aiPrediction ? normalize(body.aiPrediction) : null;
    const confidenceRaw = Number(body.confidence || 0);
    const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
    const confirmations = Math.max(1, Number(body.confirmations || 1));
    const conflicts = Math.max(0, Number(body.conflicts || 0));
    const hasIdentity = Boolean(verified.oemNumber || (verified.brand && verified.partName && (verified.vehicle || verified.category)));

    if (!hasIdentity || confidence < THRESHOLD || confirmations < MIN_CONFIRMATIONS || conflicts > 0) {
      return json({ promoted: false, reason: 'Insufficient trust signals', requirements: { hasIdentity, confidence, minimumConfidence: THRESHOLD, confirmations, minimumConfirmations: MIN_CONFIRMATIONS, conflicts } });
    }

    const key = partKey(verified, prediction);
    const { data: existing, error: findError } = await supabase.from('ai_part_knowledge').select('*').eq('part_key', key).maybeSingle();
    if (findError) throw findError;

    if (existing) {
      const { data, error } = await supabase.from('ai_part_knowledge').update({ canonical_part: { ...verified, confidence }, verified_count: Number(existing.verified_count || 1) + 1, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (error) throw error;
      return json({ promoted: true, learned: false, knowledge: data });
    }

    const { data, error } = await supabase.from('ai_part_knowledge').insert({ part_key: key, canonical_part: { ...verified, confidence }, aliases: [], verified_count: confirmations, last_verified_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return json({ promoted: true, learned: true, knowledge: data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Promotion failed' }, 500);
  }
});
