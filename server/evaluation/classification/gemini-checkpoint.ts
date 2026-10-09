import { CLASSIFICATION_EVALUATION_DATASET } from './dataset';
import {
  GEMINI_MODEL,
  type GeminiCaseRun,
  type GeminiPromptVersion,
  type GeminiRunProgress,
  type GeminiUsageMetadata,
} from './gemini-runner';

type JsonRecord = Record<string, unknown>;

export type GeminiCheckpoint = {
  progress: GeminiRunProgress;
  startedAt: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalNonNegativeNumber(value: unknown) {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isFinite(value) && value >= 0)
  );
}

function isUsageMetadata(value: unknown): value is GeminiUsageMetadata {
  return (
    isRecord(value) &&
    isOptionalNonNegativeNumber(value.promptTokenCount) &&
    isOptionalNonNegativeNumber(value.candidatesTokenCount) &&
    isOptionalNonNegativeNumber(value.thoughtsTokenCount) &&
    isOptionalNonNegativeNumber(value.totalTokenCount)
  );
}

function isCaseRun(value: unknown): value is GeminiCaseRun {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.validResponse === 'boolean' &&
    (value.validationError === undefined ||
      typeof value.validationError === 'string') &&
    (value.modelVersion === undefined ||
      typeof value.modelVersion === 'string') &&
    isUsageMetadata(value.usage) &&
    (value.estimatedCostUsd === null ||
      (typeof value.estimatedCostUsd === 'number' &&
        Number.isFinite(value.estimatedCostUsd) &&
        value.estimatedCostUsd >= 0))
  );
}

export function parseGeminiCheckpoint(options: {
  responses: unknown;
  metadata: unknown;
  maxCases: number;
  expectedPromptVersion: GeminiPromptVersion;
}): GeminiCheckpoint {
  if (!isRecord(options.responses) || !isRecord(options.metadata)) {
    throw new Error('Gemini checkpoint files must contain JSON objects.');
  }
  if (options.metadata.model !== GEMINI_MODEL) {
    throw new Error(`Gemini checkpoint model must be ${GEMINI_MODEL}.`);
  }
  const checkpointPromptVersion = options.metadata.promptVersion ?? 'baseline';
  if (checkpointPromptVersion !== options.expectedPromptVersion) {
    throw new Error(
      `Gemini checkpoint prompt version must be ${options.expectedPromptVersion}.`,
    );
  }
  if (
    typeof options.metadata.startedAt !== 'string' ||
    options.metadata.startedAt.length === 0
  ) {
    throw new Error('Gemini checkpoint is missing startedAt.');
  }
  if (
    !Array.isArray(options.metadata.cases) ||
    !options.metadata.cases.every(isCaseRun)
  ) {
    throw new Error('Gemini checkpoint contains invalid case metadata.');
  }

  const cases = options.metadata.cases;
  const selectedCases = CLASSIFICATION_EVALUATION_DATASET.slice(
    0,
    options.maxCases,
  );
  if (cases.length > selectedCases.length) {
    throw new Error('Gemini checkpoint has more cases than requested.');
  }
  for (const [index, caseRun] of cases.entries()) {
    if (caseRun.id !== selectedCases[index]?.id) {
      throw new Error(
        'Gemini checkpoint cases are not the expected completed prefix.',
      );
    }
  }

  const responseIds = Object.keys(options.responses);
  if (
    responseIds.length !== cases.length ||
    cases.some(
      ({ id }) => !Object.prototype.hasOwnProperty.call(options.responses, id),
    )
  ) {
    throw new Error(
      'Gemini checkpoint responses and case metadata do not match.',
    );
  }

  return {
    progress: {
      responses: { ...options.responses },
      cases: [...cases],
    },
    startedAt: options.metadata.startedAt,
  };
}
