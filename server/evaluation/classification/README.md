# Classification model evaluation

This directory contains the offline evaluator plus an opt-in live model
runner. Neither runs as part of the NestJS application, server startup, or
normal tests. The live runner is the only code here that performs network
inference.

## Contents

- `dataset.ts`: 48 labeled inputs covering all four outcomes and all ten
  destination categories.
- `model-contract.ts`: baseline model instructions and a provider-neutral
  structured output schema derived from the production taxonomy and response
  constants.
- `evaluate.ts`: contract validation and metric calculation.
- `run.ts`: CLI for scoring a saved response file.
- `gemini-runner.ts`: isolated Gemini request, validation, usage, and cost
  accounting. It keeps baseline and v2 evaluation-owned while importing the
  selected v3 prompt and Gemini schema from `src/classification`.
- `run-gemini.ts`: explicit live-inference CLI.

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

## Gemini 3.5 Flash-Lite live runner

Google's official model documentation was checked on 2026-10-08. It lists
`gemini-3.5-flash-lite` as a stable, non-deprecated model with structured
output support. The runner uses the official `@google/genai` JavaScript SDK
and its `models.generateContent` API with `responseMimeType` and
`responseJsonSchema`.

References:

- [Gemini 3.5 Flash-Lite model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [`@google/genai` JavaScript SDK](https://googleapis.github.io/js-genai/)

Gemini's structured-output subset does not support the shared schema's
root-level `oneOf` discriminated union. The runner therefore sends a flat
object schema containing the four outcome values, supported destination
categories, taxonomy version, and optional clarification question. Conditional
rules such as non-empty unique categories for `classified`, empty categories
for other outcomes, and the outcome-specific clarification question remain
authoritatively enforced by the unchanged production response parser.

Set the API key only in the invoking environment:

```bash
export GEMINI_API_KEY="your-key"
```

Do not prefix the variable with `EXPO_PUBLIC_`, put it in source control, or
pass it as a CLI argument. The runner never prints the key.

The runner defaults to the unchanged shared prompt (`baseline`). Select a
prompt explicitly with `--prompt-version`:

- `baseline`: the unchanged shared evaluation prompt.
- `v2`: the unchanged destination-coverage, whole-basket, retailer-inventory,
  and short-phrase ambiguity refinement.
- `v3`: v2 plus exact-item qualifier handling and a stronger distinction
  between tasks requiring no destination and physical errands outside the
  taxonomy.

The selected version is recorded in metadata and must match when resuming a
run.

To run a five-case smoke test from `/server`:

```bash
npm run eval:classification:gemini -- \
  --confirm-live \
  --max-cases 5 \
  --output ./evaluation/results/gemini-3.5-flash-lite-smoke.json
```

To run all 48 cases with v2 and a new output file:

```bash
npm run eval:classification:gemini -- \
  --confirm-live \
  --prompt-version v2 \
  --max-cases 48 \
  --output ./evaluation/results/gemini-3.5-flash-lite-v2.json
```

To run all 48 cases with v3 and a new output file:

```bash
npm run eval:classification:gemini -- \
  --confirm-live \
  --prompt-version v3 \
  --max-cases 48 \
  --output ./evaluation/results/gemini-3.5-flash-lite-v3.json
```

`--confirm-live` is mandatory so compilation or an accidental script call
cannot initiate inference. Existing files are protected unless `--overwrite`
is provided. Requests are spaced five seconds apart by default, which can be
changed with `--request-delay-ms`. A 429 response is retried at most three
times, using Google's `RetryInfo.retryDelay` when present and a 60-second
fallback otherwise. The command writes:

- The response map at the requested path, ready for `eval:classification`.
- A neighboring `.metadata.json` file with model version, per-case and total
  token usage, parser validity, and estimated cost.

Progress is saved after every completed case. To continue an interrupted run
without repeating completed cases, use the same output path with `--resume`:

```bash
npm run eval:classification:gemini -- \
  --confirm-live \
  --resume \
  --output ./evaluation/results/gemini-3.5-flash-lite-smoke.json
```

The runner verifies that the response and metadata files describe the expected
completed prefix, preserves their responses, per-case usage, costs, and
original start time, then begins with the next case. `--resume` and
`--overwrite` cannot be combined. Pass the original `--max-cases` value when
resuming a partial run that used fewer than all cases.

Cost estimates use the standard paid-tier text rates published on 2026-10-07:
$0.30 per million input tokens and $2.50 per million output tokens, including
reported thinking tokens. Actual billing, free-tier treatment, and future
pricing may differ.

Score the smoke-test responses without making another model call:

```bash
npm run eval:classification -- \
  ./evaluation/results/gemini-3.5-flash-lite-smoke.json
```

## Revised category expectations

The 48 case IDs, inputs, and expected outcomes remain unchanged. Six category
sets were corrected because the omitted retailer routinely stocks the full
request:

- `classified-04`: added grocery and department stores for Tylenol.
- `classified-06`: added department stores for cough drops and tissues.
- `classified-09`: added department stores for dog flea medication. The dog
  qualifier still excludes human pharmacies.
- `classified-12`: added grocery stores for common warm-white light bulbs.
- `classified-18`: added pharmacies for a birthday card and wrapping paper.
- `classified-28`: added pharmacies for AA batteries.

No category was added where typical inventory is debatable. Each case's
`notes` field also records its specific justification.

Keep every baseline, v2, and v3 response and metadata file under a distinct
name. Because the IDs and inputs did not change, compare all prompt versions
fairly by scoring each saved response file with the current evaluator, which
applies the same revised expectations to all three:

```bash
npm run eval:classification -- ./evaluation/results/gemini-3.5-flash-lite-baseline.json
npm run eval:classification -- ./evaluation/results/gemini-3.5-flash-lite-v2.json
npm run eval:classification -- ./evaluation/results/gemini-3.5-flash-lite-v3.json
```

This rescoring makes historical metrics directly comparable without making
new API calls. Retain the original metadata files so prompt version, model
version, settings, usage, and run date remain auditable.
