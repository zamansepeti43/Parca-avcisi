# AI Knowledge Promotion

## Goal

Parça Avcısı must not promote every user-provided value directly into the shared AI memory.

## Pipeline

1. AI/API produces an initial prediction.
2. The user reviews and may correct the draft.
3. The verified listing is stored as a learning example.
4. Only sufficiently trustworthy examples should be promoted to `ai_part_knowledge`.
5. The global knowledge layer is then preferred on future recognition attempts.

## Promotion rules

A future backend promotion worker should require multiple independent signals before promoting a part:

- verified listing data is present;
- the part identity is stable (prefer OEM number; otherwise a strong combination of brand/model/part/category/vehicle);
- confidence meets the configured threshold;
- no conflicting verified identity is present;
- repeated confirmations increase confidence rather than creating duplicate knowledge records.

## Important distinction

A repeated listing is not a new part. Its listing ID must never define the global part identity. New photographs can still be retained separately as future visual-training examples.

## Security

The browser must not have unrestricted write access to `ai_part_knowledge`. Promotion should happen through a trusted server-side path after validation.
