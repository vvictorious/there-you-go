import { describe, expect, it } from 'vitest';

import { parseGeminiCheckpoint } from './gemini-checkpoint';
import { GEMINI_MODEL } from './gemini-runner';

const RESPONSE = {
  outcome: 'classified',
  categories: ['grocery-store'],
  taxonomyVersion: 1,
};

const CASE = {
  id: 'classified-01',
  validResponse: true,
  modelVersion: 'gemini-3.5-flash-lite-001',
  usage: {
    promptTokenCount: 100,
    candidatesTokenCount: 10,
    totalTokenCount: 110,
  },
  estimatedCostUsd: 0.000055,
};

describe('Gemini checkpoint', () => {
  it('restores responses and per-case usage metadata', () => {
    const checkpoint = parseGeminiCheckpoint({
      responses: { 'classified-01': RESPONSE },
      metadata: {
        model: GEMINI_MODEL,
        startedAt: '2026-10-08T21:31:07.403Z',
        cases: [CASE],
      },
      maxCases: 48,
      expectedPromptVersion: 'baseline',
    });

    expect(checkpoint.startedAt).toBe('2026-10-08T21:31:07.403Z');
    expect(checkpoint.progress.responses['classified-01']).toEqual(RESPONSE);
    expect(checkpoint.progress.cases).toEqual([CASE]);
  });

  it('rejects mismatched response and metadata checkpoints', () => {
    expect(() =>
      parseGeminiCheckpoint({
        responses: {},
        metadata: {
          model: GEMINI_MODEL,
          startedAt: '2026-10-08T21:31:07.403Z',
          cases: [CASE],
        },
        maxCases: 48,
        expectedPromptVersion: 'baseline',
      }),
    ).toThrow('responses and case metadata do not match');
  });

  it('rejects checkpoints created with a different prompt version', () => {
    expect(() =>
      parseGeminiCheckpoint({
        responses: {},
        metadata: {
          model: GEMINI_MODEL,
          promptVersion: 'baseline',
          startedAt: '2026-10-08T21:31:07.403Z',
          cases: [],
        },
        maxCases: 48,
        expectedPromptVersion: 'v2',
      }),
    ).toThrow('prompt version must be v2');
  });
});
