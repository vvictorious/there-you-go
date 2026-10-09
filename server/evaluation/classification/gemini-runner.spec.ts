import { describe, expect, it, vi } from 'vitest';

import { GEMINI_CLASSIFICATION_PROMPT_V3 } from '../../src/classification/gemini-classification-prompt';
import { GEMINI_CLASSIFICATION_SCHEMA } from '../../src/classification/gemini-classification-schema';
import type { ClassificationEvaluationCase } from './dataset';
import {
  aggregateGeminiUsage,
  estimateGeminiCost,
  GEMINI_CLASSIFICATION_PROMPTS,
  GEMINI_MODEL,
  runGeminiCases,
} from './gemini-runner';
import { CLASSIFICATION_EVALUATION_INSTRUCTIONS } from './model-contract';

const FIXTURE_CASES: ClassificationEvaluationCase[] = [
  {
    id: 'classified',
    input: 'milk',
    expectedOutcome: 'classified',
    acceptableCategories: ['grocery-store'],
    notes: 'Fixture',
  },
  {
    id: 'task',
    input: 'call Mom',
    expectedOutcome: 'no-destination',
    acceptableCategories: [],
    notes: 'Fixture',
  },
];

describe('Gemini live evaluation runner', () => {
  it('uses a flat schema containing only Gemini-supported constraints', () => {
    const geminiSchema = JSON.stringify(GEMINI_CLASSIFICATION_SCHEMA);

    expect(geminiSchema).not.toContain('"const"');
    expect(geminiSchema).not.toContain('"uniqueItems"');
    expect(geminiSchema).not.toContain('"pattern"');
    expect(geminiSchema).not.toContain('"oneOf"');
    expect(GEMINI_CLASSIFICATION_SCHEMA.properties.outcome.enum).toEqual([
      'classified',
      'no-destination',
      'needs-clarification',
      'unsupported-destination',
    ]);
    expect(
      GEMINI_CLASSIFICATION_SCHEMA.properties.categories.items.enum,
    ).toHaveLength(10);
    expect(GEMINI_CLASSIFICATION_SCHEMA.required).not.toContain(
      'clarificationQuestion',
    );
  });

  it('estimates standard paid-tier cost from reported usage', () => {
    expect(
      estimateGeminiCost({
        promptTokenCount: 1_000_000,
        candidatesTokenCount: 500_000,
        thoughtsTokenCount: 500_000,
      }),
    ).toBe(2.8);
    expect(estimateGeminiCost({ promptTokenCount: 10 })).toBeNull();
  });

  it('runs selected cases with the shared prompt and validates responses', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify({
          outcome: 'classified',
          categories: ['grocery-store'],
          taxonomyVersion: 1,
        }),
        modelVersion: 'gemini-3.5-flash-lite-001',
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 10,
          totalTokenCount: 110,
        },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          outcome: 'no-destination',
          categories: ['grocery-store'],
          taxonomyVersion: 1,
        }),
        usageMetadata: {
          promptTokenCount: 90,
          candidatesTokenCount: 2,
          totalTokenCount: 92,
        },
      });
    const onProgress = vi.fn();

    const result = await runGeminiCases({
      generate,
      maxCases: 2,
      dataset: FIXTURE_CASES,
      onProgress,
      requestDelayMs: 0,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        model: GEMINI_MODEL,
        contents: 'milk',
        config: {
          systemInstruction: CLASSIFICATION_EVALUATION_INSTRUCTIONS,
          responseMimeType: 'application/json',
          responseJsonSchema: GEMINI_CLASSIFICATION_SCHEMA,
        },
      }),
    );
    expect(result.responses).toEqual({
      classified: {
        outcome: 'classified',
        categories: ['grocery-store'],
        taxonomyVersion: 1,
      },
      task: {
        outcome: 'no-destination',
        categories: ['grocery-store'],
        taxonomyVersion: 1,
      },
    });
    expect(result.cases[0]).toMatchObject({
      id: 'classified',
      validResponse: true,
    });
    expect(result.cases[1]).toMatchObject({
      id: 'task',
      validResponse: false,
    });
    expect(result.cases[1]?.validationError).toContain(
      'no-destination categories must be empty',
    );
    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it('selects the v2 prompt when requested', async () => {
    const generate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        outcome: 'classified',
        categories: ['grocery-store'],
        taxonomyVersion: 1,
      }),
    });

    await runGeminiCases({
      generate,
      maxCases: 1,
      dataset: FIXTURE_CASES,
      promptVersion: 'v2',
      requestDelayMs: 0,
    });

    expect(GEMINI_CLASSIFICATION_PROMPTS.baseline).toBe(
      CLASSIFICATION_EVALUATION_INSTRUCTIONS,
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          systemInstruction: GEMINI_CLASSIFICATION_PROMPTS.v2,
          responseMimeType: 'application/json',
          responseJsonSchema: GEMINI_CLASSIFICATION_SCHEMA,
        },
      }),
    );
    expect(GEMINI_CLASSIFICATION_PROMPTS.v2).toMatch(
      /satisfy the entire\s+basket in one visit/,
    );
    expect(GEMINI_CLASSIFICATION_PROMPTS.v2).toContain(
      'Check ambiguity before assigning categories',
    );
  });

  it('extends v2 with exact-request and unsupported-errand guards in v3', async () => {
    const generate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        outcome: 'classified',
        categories: ['grocery-store'],
        taxonomyVersion: 1,
      }),
    });

    await runGeminiCases({
      generate,
      maxCases: 1,
      dataset: FIXTURE_CASES,
      promptVersion: 'v3',
      requestDelayMs: 0,
    });

    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      GEMINI_CLASSIFICATION_PROMPTS.v2,
    );
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toMatch(
      /full item text as one exact request/,
    );
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      '"flea meds for my dog" is not a human-pharmacy request',
    );
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      '"grab a latte" is an unsupported coffee-shop',
    );
    expect(GEMINI_CLASSIFICATION_PROMPTS.v3).toBe(
      GEMINI_CLASSIFICATION_PROMPT_V3,
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          systemInstruction: GEMINI_CLASSIFICATION_PROMPTS.v3,
          responseMimeType: 'application/json',
          responseJsonSchema: GEMINI_CLASSIFICATION_SCHEMA,
        },
      }),
    );
  });

  it('paces requests after the first request', async () => {
    const generate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        outcome: 'no-destination',
        categories: [],
        taxonomyVersion: 1,
      }),
    });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await runGeminiCases({
      generate,
      maxCases: 2,
      dataset: FIXTURE_CASES,
      sleep,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(5_000);
  });

  it('respects Gemini retry delays for bounded 429 retries', async () => {
    const rateLimitError = {
      status: 429,
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: '19.25s',
        },
      ],
    };
    const generate = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          outcome: 'classified',
          categories: ['grocery-store'],
          taxonomyVersion: 1,
        }),
      });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await runGeminiCases({
      generate,
      maxCases: 1,
      dataset: FIXTURE_CASES,
      requestDelayMs: 5_000,
      retryFallbackMs: 60_000,
      maxRetries: 2,
      sleep,
      onRetry,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(19_250);
    expect(onRetry).toHaveBeenCalledWith({
      caseId: 'classified',
      retryNumber: 1,
      maxRetries: 2,
      delayMs: 19_250,
    });
  });

  it('stops retrying after the configured limit', async () => {
    const rateLimitError = new Error('429 RESOURCE_EXHAUSTED');
    const generate = vi.fn().mockRejectedValue(rateLimitError);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      runGeminiCases({
        generate,
        maxCases: 1,
        dataset: FIXTURE_CASES,
        requestDelayMs: 0,
        retryFallbackMs: 1_000,
        maxRetries: 2,
        sleep,
      }),
    ).rejects.toBe(rateLimitError);

    expect(generate).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 1_000);
  });

  it('resumes after completed cases without replacing checkpoint data', async () => {
    const initialProgress = {
      responses: {
        classified: {
          outcome: 'classified',
          categories: ['grocery-store'],
          taxonomyVersion: 1,
        },
      },
      cases: [
        {
          id: 'classified',
          validResponse: true,
          modelVersion: 'gemini-3.5-flash-lite-001',
          usage: {
            promptTokenCount: 100,
            candidatesTokenCount: 10,
            totalTokenCount: 110,
          },
          estimatedCostUsd: 0.000055,
        },
      ],
    };
    const generate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        outcome: 'no-destination',
        categories: [],
        taxonomyVersion: 1,
      }),
      usageMetadata: {
        promptTokenCount: 90,
        candidatesTokenCount: 5,
        totalTokenCount: 95,
      },
    });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await runGeminiCases({
      generate,
      maxCases: 2,
      dataset: FIXTURE_CASES,
      initialProgress,
      requestDelayMs: 5_000,
      sleep,
    });

    expect(generate).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ contents: 'call Mom' }),
    );
    expect(sleep).not.toHaveBeenCalled();
    expect(result.responses.classified).toEqual(
      initialProgress.responses.classified,
    );
    expect(result.cases[0]).toEqual(initialProgress.cases[0]);
    expect(result.cases).toHaveLength(2);
  });

  it('aggregates usage and only reports cost when every case has it', () => {
    const totals = aggregateGeminiUsage([
      {
        id: 'one',
        validResponse: true,
        usage: { promptTokenCount: 10, candidatesTokenCount: 5 },
        estimatedCostUsd: 0.0000155,
      },
      {
        id: 'two',
        validResponse: true,
        usage: {},
        estimatedCostUsd: null,
      },
    ]);

    expect(totals.usage).toMatchObject({
      promptTokenCount: 10,
      candidatesTokenCount: 5,
    });
    expect(totals.estimatedCostUsd).toBeNull();
  });
});
