---
name: ai-learning
description: Build and maintain Parça Avcısı's verified learning dataset from AI-assisted and manually created listings. Use when changing listing analysis, user corrections, training data, confidence, or local AI fallback behavior.
---

# Parça Avcısı AI Learning

Treat the marketplace's verified listing data as a potential learning source, but never assume every listing is automatically correct.

## Learning sources
- AI-assisted listings: retain the original AI prediction and the final user-verified values.
- Manual listings: retain the final user-entered values as training candidates when the listing meets quality checks.
- User corrections are high-value supervision because they show where the AI prediction differed from the accepted result.

## Rules
1. Never store secrets, auth tokens, private messages, or unnecessary personal data in learning records.
2. Preserve the distinction between AI prediction and verified ground truth.
3. Prefer structured fields: make, model, generation, part, category, subcategory, OEM, and condition.
4. Track confidence and evidence when available.
5. Exclude deleted, reported, spam, or unresolved listings from trusted training data.
6. Do not claim that collecting examples automatically trains a model; dataset collection and model training are separate stages.
7. When a local model is introduced, use it as the first inference path only when evaluation shows sufficient accuracy; otherwise use the existing remote provider as fallback.
8. Any production learning-data schema change requires a database migration and privacy review.

## Current implementation
`src/lib/ai-learning.js` provides a local development dataset collector with separate `ai` and `manual` sources. It is intentionally provider-independent and does not replace `ListingAnalyzer`.

## Future implementation
Move verified examples to a protected Supabase learning table, add quality gates, build an export/evaluation pipeline, and only then train or fine-tune a local vision model if the dataset is large and clean enough.
