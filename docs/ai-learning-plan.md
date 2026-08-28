# Parça Avcısı AI Learning Dataset

## Goal
Build a verified dataset from both AI-assisted and manually created listings so a future local vision/classification system can reduce dependence on paid remote vision APIs.

## Data sources
- `ai`: AI-generated listing draft that the user reviewed/accepted or corrected.
- `manual`: listing entered by the user without AI generation, provided the final fields are treated as verified training labels.

## Important rule
Do not treat every listing as ground truth automatically. Training candidates should prefer listings with complete vehicle/part/OEM information, successful publication, no abuse/report signal, and no unresolved corrections.

## Learning record
Each example should retain:
- source (`ai` or `manual`)
- original AI prediction when available
- final verified listing fields
- user corrections
- confidence/evidence
- timestamp

## Future pipeline
1. Collect verified examples.
2. Remove duplicates and low-quality labels.
3. Split by vehicle/part families to avoid leakage.
4. Evaluate a local vision model/classifier or embedding retrieval system.
5. Use the local model first when confidence is high.
6. Fall back to remote vision AI only when confidence is low or the part is outside the learned set.
7. Continue collecting corrections as new training data.

## Privacy and safety
Do not store secrets, auth tokens, private messages, or unnecessary personal information in the learning dataset. Image references should use application-controlled storage identifiers rather than exposing private URLs.
