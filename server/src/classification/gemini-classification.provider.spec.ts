import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GEMINI_CLASSIFICATION_DEADLINE_MS,
  GEMINI_CLASSIFICATION_MIN_RETRY_BUDGET_MS,
  GEMINI_CLASSIFICATION_MODEL,
} from './gemini-classification-config';
import { GEMINI_CLASSIFICATION_PROMPT_V3 } from './gemini-classification-prompt';
import { GEMINI_CLASSIFICATION_SCHEMA } from './gemini-classification-schema';
import { GeminiClassificationProvider } from './gemini-classification.provider';

const sdk = vi.hoisted(() => ({
  construct: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = { generateContent: sdk.generateContent };

    constructor(options: unknown) {
      sdk.construct(options);
    }
  },
}));

describe('GeminiClassificationProvider', () => {
  function createProvider(apiKey: string | undefined = 'test-api-key') {
    const config = {
      get: vi.fn().mockReturnValue(apiKey),
    } as unknown as ConfigService;

    return new GeminiClassificationProvider(config);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T17:00:00.000Z'));
    sdk.construct.mockClear();
    sdk.generateContent.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends the evaluated model, v3 prompt, JSON schema, and MIME type', async () => {
    const response = {
      outcome: 'classified',
      categories: ['grocery-store'],
      taxonomyVersion: 1,
    };
    sdk.generateContent.mockResolvedValue({ text: JSON.stringify(response) });

    await expect(createProvider().classify('Milk')).resolves.toEqual(response);
    expect(sdk.construct).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    expect(sdk.generateContent).toHaveBeenCalledWith({
      model: GEMINI_CLASSIFICATION_MODEL,
      contents: 'Milk',
      config: {
        systemInstruction: GEMINI_CLASSIFICATION_PROMPT_V3,
        responseMimeType: 'application/json',
        responseJsonSchema: GEMINI_CLASSIFICATION_SCHEMA,
        abortSignal: expect.any(AbortSignal) as unknown,
        httpOptions: {
          timeout: GEMINI_CLASSIFICATION_DEADLINE_MS,
          retryOptions: { attempts: 1 },
        },
      },
    });
  });

  it('returns 503 without constructing the SDK when the key is missing', async () => {
    await expect(createProvider('').classify('Milk')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sdk.construct).not.toHaveBeenCalled();
    expect(sdk.generateContent).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   ', '{not-json'])(
    'returns 502 for an empty or malformed response',
    async (text) => {
      sdk.generateContent.mockResolvedValue({ text });

      await expect(createProvider().classify('Milk')).rejects.toEqual(
        new BadGatewayException(
          'Classification provider returned an invalid response',
        ),
      );
      expect(sdk.generateContent).toHaveBeenCalledTimes(1);
    },
  );

  it('enforces one total 10-second deadline', async () => {
    sdk.generateContent.mockReturnValue(new Promise(() => undefined));

    const result = expect(
      createProvider().classify('Milk'),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
    await vi.advanceTimersByTimeAsync(GEMINI_CLASSIFICATION_DEADLINE_MS);

    await result;
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: 408 },
    { code: 'ETIMEDOUT' },
    { status: 'DEADLINE_EXCEEDED' },
  ])('returns 504 for provider timeout errors', async (error) => {
    sdk.generateContent.mockRejectedValue(error);

    await expect(createProvider().classify('Milk')).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries one transient network failure', async () => {
    const response = {
      outcome: 'no-destination',
      categories: [],
      taxonomyVersion: 1,
    };
    sdk.generateContent
      .mockRejectedValueOnce(new TypeError('network failed'))
      .mockResolvedValueOnce({ text: JSON.stringify(response) });

    await expect(createProvider().classify('Call Mom')).resolves.toEqual(
      response,
    );
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it.each(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_SOCKET'])(
    'retries transient network error %s',
    async (code) => {
      const response = {
        outcome: 'no-destination',
        categories: [],
        taxonomyVersion: 1,
      };
      sdk.generateContent
        .mockRejectedValueOnce({ code })
        .mockResolvedValueOnce({ text: JSON.stringify(response) });

      await expect(createProvider().classify('Call Mom')).resolves.toEqual(
        response,
      );
      expect(sdk.generateContent).toHaveBeenCalledTimes(2);
    },
  );

  it('skips retry when less than the one-second retry budget remains', async () => {
    sdk.generateContent.mockImplementationOnce(() => {
      vi.setSystemTime(
        Date.now() +
          GEMINI_CLASSIFICATION_DEADLINE_MS -
          GEMINI_CLASSIFICATION_MIN_RETRY_BUDGET_MS +
          1,
      );
      return Promise.reject(new TypeError('network failed'));
    });

    await expect(createProvider().classify('Milk')).rejects.toEqual(
      new BadGatewayException('Classification provider request failed'),
    );
    expect(GEMINI_CLASSIFICATION_MIN_RETRY_BUDGET_MS).toBe(1_000);
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries when exactly the one-second retry budget remains', async () => {
    const response = {
      outcome: 'no-destination',
      categories: [],
      taxonomyVersion: 1,
    };
    sdk.generateContent
      .mockImplementationOnce(() => {
        vi.setSystemTime(
          Date.now() +
            GEMINI_CLASSIFICATION_DEADLINE_MS -
            GEMINI_CLASSIFICATION_MIN_RETRY_BUDGET_MS,
        );
        return Promise.reject(new TypeError('network failed'));
      })
      .mockResolvedValueOnce({ text: JSON.stringify(response) });

    await expect(createProvider().classify('Call Mom')).resolves.toEqual(
      response,
    );
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it('returns 503 after the single rate-limit retry is exhausted', async () => {
    sdk.generateContent.mockRejectedValue({ status: 429 });

    await expect(createProvider().classify('Milk')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it('returns 502 after a transient provider failure exhausts its retry', async () => {
    sdk.generateContent.mockRejectedValue(new TypeError('network failed'));

    await expect(createProvider().classify('Milk')).rejects.toEqual(
      new BadGatewayException('Classification provider request failed'),
    );
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it('returns 502 for a non-transient provider error without retrying', async () => {
    sdk.generateContent.mockRejectedValue({ status: 400 });

    await expect(createProvider().classify('Milk')).rejects.toEqual(
      new BadGatewayException('Classification provider request failed'),
    );
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });
});
