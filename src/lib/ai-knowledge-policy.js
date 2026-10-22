const DEFAULT_PROMOTION_THRESHOLD = 0.85;
const MIN_CONFIRMATIONS = 2;
export function getKnowledgePromotionDecision({ verifiedListing = {}, confidence = 0, confirmations = 1, conflicts = 0 } = {}) {
  const hasIdentity = Boolean(String(verifiedListing.oemNumber || '').trim() || (String(verifiedListing.brand || '').trim() && String(verifiedListing.partName || '').trim() && (String(verifiedListing.vehicle || '').trim() || String(verifiedListing.category || '').trim())));
  const score = Number(confidence) > 1 ? Number(confidence) / 100 : Number(confidence);
  const accepted = hasIdentity && score >= DEFAULT_PROMOTION_THRESHOLD && Number(conflicts) === 0 && Number(confirmations) >= MIN_CONFIRMATIONS;
  return { accepted, reason: accepted ? 'Yeterli kimlik, güven ve bağımsız doğrulama bulundu.' : 'Global hafızaya aktarmak için daha fazla doğrulama gerekiyor.', requirements: { hasIdentity, confidence: score, minimumConfidence: DEFAULT_PROMOTION_THRESHOLD, confirmations: Number(confirmations), minimumConfirmations: MIN_CONFIRMATIONS, conflicts: Number(conflicts) } };
}
export function shouldUseLocalKnowledge(knowledge, { minimumConfidence = DEFAULT_PROMOTION_THRESHOLD } = {}) { if (!knowledge?.canonical_part) return false; const confidence = Number(knowledge.canonical_part.confidence ?? knowledge.confidence ?? 1); return confidence >= minimumConfidence; }
