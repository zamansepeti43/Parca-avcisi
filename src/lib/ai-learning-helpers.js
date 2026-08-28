export function buildLearningCorrections(prediction = {}, verified = {}) {
  const corrections = {};
  const fields = ['partName', 'category', 'subcategory', 'brand', 'model', 'oemNumber', 'vehicle'];
  for (const field of fields) {
    const predicted = prediction[field] ?? '';
    const actual = verified[field] ?? '';
    if (String(actual).trim() && String(predicted).trim() !== String(actual).trim()) {
      corrections[field] = { from: predicted, to: actual };
    }
  }
  return corrections;
}

export function buildLearningPayload({ source = 'manual', prediction = null, verified = {}, confidence = 0, evidence = {} } = {}) {
  return {
    source,
    aiPrediction: prediction,
    verifiedListing: verified,
    corrections: prediction ? buildLearningCorrections(prediction, verified) : {},
    confidence: Number(confidence) || 0,
    evidence: { ...evidence, listingCreated: true },
    status: 'verified',
  };
}
