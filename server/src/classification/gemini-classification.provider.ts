import { GoogleGenAI } from '@google/genai';
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ClassificationProvider } from './classification-provider';
import {
  GEMINI_CLASSIFICATION_DEADLINE_MS,
  GEMINI_CLASSIFICATION_MAX_ATTEMPTS,
  GEMINI_CLASSIFICATION_MIN_RETRY_BUDGET_MS,
  GEMINI_CLASSIFICATION_MODEL,
} from './gemini-classification-config';
import { GEMINI_CLASSIFICATION_PROMPT_V3 } from './gemini-classification-prompt';
import { GEMINI_CLASSIFICATION_SCHEMA } from './gemini-classification-schema';

type ProviderError = {
  code?: unknown;
  name?: unknown;
  status?: unknown;
};

class ClassificationDeadlineError extends Error {}

function isRecord(value: unknown): value is ProviderError {
  return typeof value === 'object' && value !== null;
}

function isRateLimitError(error: unknown) {
  if (!isRecord(error)) {
    return false;
  }

  return (
    error.status === 429 ||
    error.code === 429 ||
    error.status === 'RESOURCE_EXHAUSTED' ||
    error.code === 'RESOURCE_EXHAUSTED'
  );
}

function isTimeoutError(error: unknown) {
  if (error instanceof ClassificationDeadlineError) {
    return true;
  }
  if (!isRecord(error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.name === 'RequestTimeoutError'
  );
}

function isTransientError(error: unknown) {
  if (isRateLimitError(error) || error instanceof TypeError) {
    return true;
  }
  if (!isRecord(error)) {
    return true;
  }

  return (
    error.status === 408 ||
    (typeof error.status === 'number' && error.status >= 500)
  );
}

@Injectable()
export class GeminiClassificationProvider implements ClassificationProvider {
  private client?: GoogleGenAI;

  constructor(private readonly config: ConfigService) {}

  async classify(text: string): Promise<unknown> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Classification service is unavailable',
      );
    }

    const client = (this.client ??= new GoogleGenAI({ apiKey }));
    const deadline = Date.now() + GEMINI_CLASSIFICATION_DEADLINE_MS;

    for (
      let attempt = 1;
      attempt <= GEMINI_CLASSIFICATION_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new GatewayTimeoutException('Classification request timed out');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), remainingMs);
      const deadlineReached = new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          'abort',
          () => reject(new ClassificationDeadlineError()),
          { once: true },
        );
      });

      try {
        const response = await Promise.race([
          client.models.generateContent({
            model: GEMINI_CLASSIFICATION_MODEL,
            contents: text,
            config: {
              systemInstruction: GEMINI_CLASSIFICATION_PROMPT_V3,
              responseMimeType: 'application/json',
              responseJsonSchema: GEMINI_CLASSIFICATION_SCHEMA,
              abortSignal: controller.signal,
              httpOptions: {
                timeout: remainingMs,
                retryOptions: { attempts: 1 },
              },
            },
          }),
          deadlineReached,
        ]);

        return this.parseResponse(response.text);
      } catch (error) {
        if (
          controller.signal.aborted ||
          Date.now() >= deadline ||
          isTimeoutError(error)
        ) {
          throw new GatewayTimeoutException('Classification request timed out');
        }

        if (error instanceof BadGatewayException) {
          throw error;
        }

        const canRetry =
          attempt < GEMINI_CLASSIFICATION_MAX_ATTEMPTS &&
          isTransientError(error) &&
          deadline - Date.now() >= GEMINI_CLASSIFICATION_MIN_RETRY_BUDGET_MS;
        if (canRetry) {
          continue;
        }

        if (isRateLimitError(error)) {
          throw new ServiceUnavailableException(
            'Classification service is unavailable',
          );
        }

        throw new BadGatewayException('Classification provider request failed');
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new BadGatewayException('Classification provider request failed');
  }

  private parseResponse(text: string | undefined): unknown {
    if (!text?.trim()) {
      throw new BadGatewayException(
        'Classification provider returned an invalid response',
      );
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new BadGatewayException(
        'Classification provider returned an invalid response',
      );
    }
  }
}
