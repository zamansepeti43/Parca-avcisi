import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const MIN_CONFIDENCE = 0.85;
const MIN_CONFIRMATIONS = 2;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  try {
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const token = auth.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json();
    const verified = body?.verifiedListing || {};
    const confidence = Number(body?.confidence) > 1 ? Number(body.confidence) / 100 : Number(body?.confidence || 0);
    const confirmations = Number(body?.confirmations || 1);
    const conflicts = Number(body?.conflicts || 0);
    const hasIdentity = Boolean(String(verified.oemNumber || '').trim() || (String(verified.brand || '').trim() && String(verified.partName || '').trim() && (String(verified.vehicle || '').trim() || String(verified.category || '').trim())));
    if (!hasIdentity || confidence < MIN_CONFIDENCE || confirmations < MIN_CONFIRMATIONS || conflicts !== 0) return new Response(JSON.stringify({ promoted: false, reason: 'Promotion requirements not met.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const partKey = String(body?.partKey || '').trim();
    if (!partKey) return new Response(JSON.stringify({ error: 'partKey is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const { data: existing, error: readError } = await supabase.from('ai_part_knowledge').select('*').eq('part_key', partKey).maybeSingle();
    if (readError) throw readError;
    const now = new Date().toISOString();
    if (existing) {
      const next = await supabase.from('ai_part_knowledge').update({ canonical_part: { ...existing.canonical_part, ...verified, confidence }, verified_count: Number(existing.verified_count || 1) + 1, last_verified_at: now, updated_at: now }).eq('id', existing.id).select().single();
      if (next.error) throw next.error;
      return new Response(JSON.stringify({ promoted: true, learned: false, knowledge: next.data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const inserted = await supabase.from('ai_part_knowledge').insert({ part_key: partKey, canonical_part: { ...verified, confidence }, aliases: [], verified_count: confirmations, last_verified_at: now }).select().single();
    if (inserted.error) throw inserted.error;
    return new Response(JSON.stringify({ promoted: true, learned: true, knowledge: inserted.data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('promote-ai-knowledge:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Promotion failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
