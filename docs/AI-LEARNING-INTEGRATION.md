# AI Learning Integration

## Data sources

Parça Avcısı learning data comes from both listing creation paths:

- `manual`: user-entered listing fields are treated as candidate verified labels.
- `ai`: the model prediction is stored alongside the final user-confirmed listing fields.

## Safety rules

1. A learning write must never block listing creation.
2. AI predictions must not overwrite user-confirmed values.
3. Corrections are calculated from prediction vs final confirmed values.
4. Future model training should use verified/quality-filtered examples, not every raw listing.
5. The learning layer is data collection only until a validated local model is introduced.
