# Classification model evaluation

This directory is an offline, model-neutral evaluation harness. It does not
run as part of the NestJS application and contains no model SDK, credential,
or network integration.

## Contents

- `dataset.ts`: 48 labeled inputs covering all four outcomes and all ten
  destination categories.
- `model-contract.ts`: model instructions and a provider-neutral structured
  output schema derived from the production taxonomy and response constants.
- `evaluate.ts`: contract validation and metric calculation.
- `run.ts`: CLI for scoring a saved response file.

The production `parseItemClassificationResponse` function remains the final
validity check. A provider's structured-output mode can prevent many malformed
responses, but it does not replace runtime contract validation.

## Evaluate a model

Only test a model when its provider currently lists it as supported,
non-deprecated, and capable of structured output. Record the exact model ID,
provider, evaluation date, model settings, and prompt revision with the
result. Use identical settings across runs where the providers expose
equivalent controls.

For each dataset entry:

1. Send `CLASSIFICATION_EVALUATION_INSTRUCTIONS` plus the entry's `input`.
2. Configure structured output with
   `CLASSIFICATION_STRUCTURED_OUTPUT_SCHEMA`. If a provider supports only a
   subset of JSON Schema, adapt the syntax without changing the response
   semantics.
3. Save the raw parsed response under the case ID in one JSON object.

Example response file:

```json
{
  "classified-01": {
    "outcome": "classified",
    "categories": ["grocery-store", "convenience-store"],
    "taxonomyVersion": 1
  },
  "no-destination-01": {
    "outcome": "no-destination",
    "categories": [],
    "taxonomyVersion": 1
  }
}
```

Score it from `/server`:

```bash
npm run eval:classification -- ./results/model-name.json
```

Add `--json` for a machine-readable report. Missing or contract-invalid
responses count as invalid and incorrect. Unknown case IDs are ignored and
reported.

## Metrics

- **Outcome accuracy**: exact outcome matches divided by all dataset cases.
- **Category precision/recall**: micro-averaged over the accepted categories
  for every case. Per-category values are also reported. Wrongly classified
  non-destination cases therefore produce false positives, while missed or
  invalid classified cases produce false negatives.
- **Invalid-response rate**: missing responses or responses rejected by the
  production parser divided by all dataset cases.

Run each candidate model at least three times if its decoding is
nondeterministic. Keep each raw response file so aggregate scores can be
recalculated when labels or scoring rules are reviewed.
