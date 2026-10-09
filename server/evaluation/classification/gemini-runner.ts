import { parseItemClassificationResponse } from '../../src/classification/classification-response';
import { GEMINI_CLASSIFICATION_PROMPT_V3 } from '../../src/classification/gemini-classification-prompt';
import { GEMINI_CLASSIFICATION_SCHEMA } from '../../src/classification/gemini-classification-schema';
import {
  CLASSIFICATION_EVALUATION_DATASET,
  type ClassificationEvaluationCase,
} from './dataset';
import { CLASSIFICATION_EVALUATION_INSTRUCTIONS } from './model-contract';

export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_PRICING_AS_OF = '2026-10-07';
export const GEMINI_INPUT_USD_PER_MILLION_TOKENS = 0.3;
export const GEMINI_OUTPUT_USD_PER_MILLION_TOKENS = 2.5;
export const GEMINI_REQUEST_DELAY_MS = 5_000;
export const GEMINI_RETRY_FALLBACK_MS = 60_000;
export const GEMINI_MAX_RETRIES = 3;

type JsonObject = { readonly [key: string]: unknown };

export const GEMINI_PROMPT_VERSIONS = ['baseline', 'v2', 'v3'] as const;
export type GeminiPromptVersion = (typeof GEMINI_PROMPT_VERSIONS)[number];

const GEMINI_CLASSIFICATION_PROMPT_V2 = `
${CLASSIFICATION_EVALUATION_INSTRUCTIONS}

Apply these destination-selection rules:

1. Include every common, actionable supported destination where a typical
store in that category is reasonably likely to stock the requested item. Do
not return only the specialist, best-known, or preferred retailer.
2. For a request containing multiple items, return a category only when a
typical store in that category is reasonably likely to satisfy the entire
basket in one visit. Do not combine categories that each cover only part of
the basket.
3. Calibrate broad retailers by their typical inventory:
   - Convenience stores carry a limited quick-stop selection such as basic
     groceries, common over-the-counter and personal-care products, batteries,
     common phone chargers, cards, and wrapping supplies. Do not assume they
     carry broad assortments, specialized goods, bulky home goods, or apparel.
   - Department stores carry broad mass-market assortments such as apparel,
     personal care, housewares, basic hardware and electronics, and common
     pet and automotive supplies. They are especially useful for mixed baskets,
     but do not assume specialist-only or unusually specific inventory.
4. Check ambiguity before assigning categories, especially for short phrases.
If a phrase has multiple common item meanings that imply materially different
destinations (for example, "apple" or "mouse") and context does not resolve
the meaning, return "needs-clarification". Do not ask for clarification merely
because one clearly named item is sold by multiple destination categories.
`.trim();

export const GEMINI_CLASSIFICATION_PROMPTS = {
  baseline: CLASSIFICATION_EVALUATION_INSTRUCTIONS,
  v2: GEMINI_CLASSIFICATION_PROMPT_V2,
  v3: GEMINI_CLASSIFICATION_PROMPT_V3,
} as const satisfies Record<GeminiPromptVersion, string>;

export function selectGeminiClassificationPrompt(version: GeminiPromptVersion) {
  return GEMINI_CLASSIFICATION_PROMPTS[version];
}

export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};

export type GeminiGenerateResponse = {
  text?: string;
  modelVersion?: string;
  usageMetadata?: GeminiUsageMetadata;
};

export type GeminiGenerateRequest = {
  model: typeof GEMINI_MODEL;
  contents: string;
  config: {
    systemInstruction: string;
    responseMimeType: 'application/json';
    responseJsonSchema: JsonObject;
  };
};

export type GeminiGenerate = (
  request: GeminiGenerateRequest,
) => Promise<GeminiGenerateResponse>;

export type GeminiCaseRun = {
  id: string;
  validResponse: boolean;
  validationError?: string;
  modelVersion?: string;
  usage: GeminiUsageMetadata;
  estimatedCostUsd: number | null;
};

export type GeminiRunProgress = {
  responses: Record<string, unknown>;
  cases: GeminiCaseRun[];
};

export type GeminiRetryEvent = {
  caseId: string;
  retryNumber: number;
  maxRetries: number;
  delayMs: number;
};

export function estimateGeminiCost(usage: GeminiUsageMetadata): number | null {
  if (
    usage.promptTokenCount === undefined ||
    usage.candidatesTokenCount === undefined
  ) {
    return null;
  }

  const billableOutputTokens =
    usage.candidatesTokenCount + (usage.thoughtsTokenCount ?? 0);
  return (
    (usage.promptTokenCount * GEMINI_INPUT_USD_PER_MILLION_TOKENS +
      billableOutputTokens * GEMINI_OUTPUT_USD_PER_MILLION_TOKENS) /
    1_000_000
  );
}

function parseModelText(text: string | undefined): unknown {
  if (text === undefined) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function validateResponse(value: unknown) {
  try {
    parseItemClassificationResponse(value);
    return { validResponse: true } as const;
  } catch (error) {
    return {
      validResponse: false,
      validationError:
        error instanceof Error ? error.message : 'Unknown validation error',
    } as const;
  }
}

export function aggregateGeminiUsage(cases: readonly GeminiCaseRun[]) {
  const usage = cases.reduce(
    (total, current) => ({
      promptTokenCount:
        total.promptTokenCount + (current.usage.promptTokenCount ?? 0),
      candidatesTokenCount:
        total.candidatesTokenCount + (current.usage.candidatesTokenCount ?? 0),
      thoughtsTokenCount:
        total.thoughtsTokenCount + (current.usage.thoughtsTokenCount ?? 0),
      totalTokenCount:
        total.totalTokenCount + (current.usage.totalTokenCount ?? 0),
    }),
    {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      thoughtsTokenCount: 0,
      totalTokenCount: 0,
    },
  );
  const costs = cases.map(({ estimatedCostUsd }) => estimatedCostUsd);

  return {
    usage,
    estimatedCostUsd: costs.every((cost) => cost !== null)
      ? costs.reduce<number>((total, cost) => total + (cost ?? 0), 0)
      : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDurationMs(value: unknown): number | undefined {
  if (typeof value === 'string') {
    const match = /^(\d+(?:\.\d+)?)s$/.exec(value.trim());
    if (match?.[1]) {
      return Math.ceil(Number(match[1]) * 1_000);
    }
  }

  if (isRecord(value)) {
    const seconds =
      typeof value.seconds === 'number'
        ? value.seconds
        : Number(value.seconds ?? Number.NaN);
    const nanos =
      typeof value.nanos === 'number' ? value.nanos : Number(value.nanos ?? 0);
    if (Number.isFinite(seconds) && Number.isFinite(nanos)) {
      return Math.ceil(seconds * 1_000 + nanos / 1_000_000);
    }
  }

  return undefined;
}

function findRetryDelayMs(value: unknown, depth = 0): number | undefined {
  if (depth > 5) {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const delayMs = findRetryDelayMs(child, depth + 1);
      if (delayMs !== undefined) {
        return delayMs;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === 'retryDelay' || key === 'retry_delay') {
      const delayMs = parseDurationMs(child);
      if (delayMs !== undefined) {
        return delayMs;
      }
    }
  }
  for (const child of Object.values(value)) {
    const delayMs = findRetryDelayMs(child, depth + 1);
    if (delayMs !== undefined) {
      return delayMs;
    }
  }
  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isGeminiRateLimitError(error: unknown) {
  const status = isRecord(error) ? error.status : undefined;
  const code = isRecord(error) ? error.code : undefined;
  const message = errorMessage(error);
  return (
    status === 429 ||
    code === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    /\b429\b|RESOURCE_EXHAUSTED/.test(message)
  );
}

export function geminiRetryDelayMs(error: unknown): number | undefined {
  const structuredDelay = findRetryDelayMs(error);
  if (structuredDelay !== undefined) {
    return structuredDelay;
  }

  const message = errorMessage(error);
  const retryInfoMatch =
    /retry(?:Delay|[_ ]delay)["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)s/i.exec(
      message,
    );
  const retrySentenceMatch = /retry\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*s/i.exec(
    message,
  );
  const seconds = Number(
    retryInfoMatch?.[1] ?? retrySentenceMatch?.[1] ?? Number.NaN,
  );
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1_000) : undefined;
}

function assertNonNegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
}

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function runGeminiCases(options: {
  generate: GeminiGenerate;
  maxCases: number;
  promptVersion?: GeminiPromptVersion;
  onProgress?: (progress: GeminiRunProgress) => Promise<void>;
  onRetry?: (event: GeminiRetryEvent) => void;
  dataset?: readonly ClassificationEvaluationCase[];
  initialProgress?: GeminiRunProgress;
  requestDelayMs?: number;
  retryFallbackMs?: number;
  maxRetries?: number;
  sleep?: (delayMs: number) => Promise<void>;
}): Promise<GeminiRunProgress> {
  const dataset = options.dataset ?? CLASSIFICATION_EVALUATION_DATASET;
  const selectedCases = dataset.slice(0, options.maxCases);
  const systemInstruction = selectGeminiClassificationPrompt(
    options.promptVersion ?? 'baseline',
  );
  const requestDelayMs = options.requestDelayMs ?? GEMINI_REQUEST_DELAY_MS;
  const retryFallbackMs = options.retryFallbackMs ?? GEMINI_RETRY_FALLBACK_MS;
  const maxRetries = options.maxRetries ?? GEMINI_MAX_RETRIES;
  assertNonNegativeInteger(requestDelayMs, 'requestDelayMs');
  assertNonNegativeInteger(retryFallbackMs, 'retryFallbackMs');
  assertNonNegativeInteger(maxRetries, 'maxRetries');

  const progress: GeminiRunProgress = {
    responses: { ...(options.initialProgress?.responses ?? {}) },
    cases: [...(options.initialProgress?.cases ?? [])],
  };
  const completedCaseIds = new Set(progress.cases.map(({ id }) => id));
  const selectedCaseIds = new Set(selectedCases.map(({ id }) => id));
  if (
    completedCaseIds.size !== progress.cases.length ||
    [...completedCaseIds].some((id) => !selectedCaseIds.has(id)) ||
    Object.keys(progress.responses).some((id) => !completedCaseIds.has(id)) ||
    [...completedCaseIds].some(
      (id) => !Object.prototype.hasOwnProperty.call(progress.responses, id),
    )
  ) {
    throw new Error('Initial Gemini progress is inconsistent.');
  }

  const sleep = options.sleep ?? defaultSleep;
  let hasMadeRequest = false;
  let nextRequestDelayMs = requestDelayMs;

  for (const testCase of selectedCases) {
    if (completedCaseIds.has(testCase.id)) {
      continue;
    }

    let response: GeminiGenerateResponse;
    let retryCount = 0;
    while (true) {
      if (hasMadeRequest && nextRequestDelayMs > 0) {
        await sleep(nextRequestDelayMs);
      }
      hasMadeRequest = true;

      try {
        response = await options.generate({
          model: GEMINI_MODEL,
          contents: testCase.input,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: GEMINI_CLASSIFICATION_SCHEMA,
          },
        });
        nextRequestDelayMs = requestDelayMs;
        break;
      } catch (error) {
        if (!isGeminiRateLimitError(error) || retryCount >= maxRetries) {
          throw error;
        }

        retryCount += 1;
        nextRequestDelayMs = Math.max(
          requestDelayMs,
          geminiRetryDelayMs(error) ?? retryFallbackMs,
        );
        options.onRetry?.({
          caseId: testCase.id,
          retryNumber: retryCount,
          maxRetries,
          delayMs: nextRequestDelayMs,
        });
      }
    }

    const parsedResponse = parseModelText(response.text);
    const validation = validateResponse(parsedResponse);
    const usage = response.usageMetadata ?? {};

    progress.responses[testCase.id] = parsedResponse;
    progress.cases.push({
      id: testCase.id,
      ...validation,
      modelVersion: response.modelVersion,
      usage,
      estimatedCostUsd: estimateGeminiCost(usage),
    });
    await options.onProgress?.(progress);
  }

  return progress;
}
