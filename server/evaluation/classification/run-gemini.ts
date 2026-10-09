import { GoogleGenAI } from '@google/genai';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

import { CLASSIFICATION_EVALUATION_DATASET } from './dataset';
import { parseGeminiCheckpoint } from './gemini-checkpoint';
import {
  aggregateGeminiUsage,
  GEMINI_INPUT_USD_PER_MILLION_TOKENS,
  GEMINI_MAX_RETRIES,
  GEMINI_MODEL,
  GEMINI_OUTPUT_USD_PER_MILLION_TOKENS,
  GEMINI_PRICING_AS_OF,
  GEMINI_PROMPT_VERSIONS,
  GEMINI_REQUEST_DELAY_MS,
  runGeminiCases,
  type GeminiGenerate,
  type GeminiPromptVersion,
  type GeminiRunProgress,
} from './gemini-runner';

type RunnerOptions = {
  outputPath: string;
  maxCases: number;
  overwrite: boolean;
  resume: boolean;
  confirmed: boolean;
  requestDelayMs: number;
  promptVersion: GeminiPromptVersion;
};

function usage(): never {
  throw new Error(
    'Usage: npm run eval:classification:gemini -- --confirm-live --output <responses.json> [--prompt-version <baseline|v2|v3>] [--max-cases <1-48>] [--request-delay-ms <milliseconds>] [--resume | --overwrite]',
  );
}

function readOptionValue(arguments_: string[], index: number) {
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) {
    usage();
  }
  return value;
}

function isPromptVersion(value: string): value is GeminiPromptVersion {
  return GEMINI_PROMPT_VERSIONS.some((version) => version === value);
}

export function parseRunnerOptions(arguments_: string[]): RunnerOptions {
  let outputPath: string | undefined;
  let maxCases: number = CLASSIFICATION_EVALUATION_DATASET.length;
  let overwrite = false;
  let resume = false;
  let confirmed = false;
  let requestDelayMs = GEMINI_REQUEST_DELAY_MS;
  let promptVersion: GeminiPromptVersion = 'baseline';

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    switch (argument) {
      case '--output':
        outputPath = readOptionValue(arguments_, index);
        index += 1;
        break;
      case '--max-cases': {
        const value = readOptionValue(arguments_, index);
        maxCases = Number(value);
        index += 1;
        break;
      }
      case '--overwrite':
        overwrite = true;
        break;
      case '--resume':
        resume = true;
        break;
      case '--request-delay-ms': {
        const value = readOptionValue(arguments_, index);
        requestDelayMs = Number(value);
        index += 1;
        break;
      }
      case '--prompt-version': {
        const value = readOptionValue(arguments_, index);
        if (!isPromptVersion(value)) {
          usage();
        }
        promptVersion = value;
        index += 1;
        break;
      }
      case '--confirm-live':
        confirmed = true;
        break;
      default:
        usage();
    }
  }

  if (
    !outputPath ||
    !Number.isInteger(maxCases) ||
    maxCases < 1 ||
    maxCases > CLASSIFICATION_EVALUATION_DATASET.length ||
    !Number.isInteger(requestDelayMs) ||
    requestDelayMs < 0 ||
    (resume && overwrite)
  ) {
    usage();
  }

  return {
    outputPath: resolve(outputPath),
    maxCases,
    overwrite,
    resume,
    confirmed,
    requestDelayMs,
    promptVersion,
  };
}

function metadataPath(outputPath: string) {
  const extension = extname(outputPath);
  return extension
    ? `${outputPath.slice(0, -extension.length)}.metadata${extension}`
    : `${outputPath}.metadata.json`;
}

function buildMetadata(
  progress: GeminiRunProgress,
  maxCases: number,
  startedAt: string,
  promptVersion: GeminiPromptVersion,
) {
  const totals = aggregateGeminiUsage(progress.cases);
  return {
    model: GEMINI_MODEL,
    promptVersion,
    startedAt,
    updatedAt: new Date().toISOString(),
    requestedCaseCount: maxCases,
    completedCaseCount: progress.cases.length,
    pricing: {
      asOf: GEMINI_PRICING_AS_OF,
      inputUsdPerMillionTokens: GEMINI_INPUT_USD_PER_MILLION_TOKENS,
      outputUsdPerMillionTokens: GEMINI_OUTPUT_USD_PER_MILLION_TOKENS,
      note: 'Estimate uses standard paid-tier text rates; actual billing may differ.',
    },
    ...totals,
    cases: progress.cases,
  };
}

async function saveProgress(
  outputPath: string,
  metadataOutputPath: string,
  progress: GeminiRunProgress,
  maxCases: number,
  startedAt: string,
  promptVersion: GeminiPromptVersion,
) {
  await Promise.all([
    writeFile(outputPath, `${JSON.stringify(progress.responses, null, 2)}\n`),
    writeFile(
      metadataOutputPath,
      `${JSON.stringify(
        buildMetadata(progress, maxCases, startedAt, promptVersion),
        null,
        2,
      )}\n`,
    ),
  ]);
}

async function reserveOutputFiles(
  outputPath: string,
  metadataOutputPath: string,
  initialMetadata: string,
  overwrite: boolean,
) {
  if (overwrite) {
    await Promise.all([
      writeFile(outputPath, '{}\n'),
      writeFile(metadataOutputPath, initialMetadata),
    ]);
    return;
  }

  await writeFile(outputPath, '{}\n', { flag: 'wx' });
  try {
    await writeFile(metadataOutputPath, initialMetadata, { flag: 'wx' });
  } catch (error) {
    await unlink(outputPath);
    throw error;
  }
}

function redactSecret(message: string, secret: string) {
  return message.replaceAll(secret, '[REDACTED]');
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function main() {
  const options = parseRunnerOptions(process.argv.slice(2));
  if (!options.confirmed) {
    throw new Error(
      'Live inference is disabled unless --confirm-live is provided.',
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const metadataOutputPath = metadataPath(options.outputPath);
  await mkdir(dirname(options.outputPath), { recursive: true });
  let initialProgress: GeminiRunProgress;
  let startedAt: string;
  if (options.resume) {
    const [responses, metadata] = await Promise.all([
      readJson(options.outputPath),
      readJson(metadataOutputPath),
    ]);
    const checkpoint = parseGeminiCheckpoint({
      responses,
      metadata,
      maxCases: options.maxCases,
      expectedPromptVersion: options.promptVersion,
    });
    initialProgress = checkpoint.progress;
    startedAt = checkpoint.startedAt;
    console.log(
      `Resuming ${initialProgress.cases.length}/${options.maxCases} completed cases.`,
    );
  } else {
    initialProgress = { responses: {}, cases: [] };
    startedAt = new Date().toISOString();
    const initialMetadata = `${JSON.stringify(
      buildMetadata(
        initialProgress,
        options.maxCases,
        startedAt,
        options.promptVersion,
      ),
      null,
      2,
    )}\n`;
    await reserveOutputFiles(
      options.outputPath,
      metadataOutputPath,
      initialMetadata,
      options.overwrite,
    );
  }

  const client = new GoogleGenAI({ apiKey });
  const generate: GeminiGenerate = async (request) => {
    return client.models.generateContent(request);
  };

  try {
    const progress = await runGeminiCases({
      generate,
      maxCases: options.maxCases,
      promptVersion: options.promptVersion,
      initialProgress,
      requestDelayMs: options.requestDelayMs,
      maxRetries: GEMINI_MAX_RETRIES,
      onRetry: ({ caseId, retryNumber, maxRetries, delayMs }) => {
        console.log(
          `Rate limited on ${caseId}; retry ${retryNumber}/${maxRetries} in ${(delayMs / 1_000).toFixed(1)}s.`,
        );
      },
      onProgress: async (currentProgress) => {
        await saveProgress(
          options.outputPath,
          metadataOutputPath,
          currentProgress,
          options.maxCases,
          startedAt,
          options.promptVersion,
        );
        console.log(
          `Completed ${currentProgress.cases.length}/${options.maxCases}: ${currentProgress.cases.at(-1)?.id ?? 'unknown'}`,
        );
      },
    });
    const totals = aggregateGeminiUsage(progress.cases);
    console.log(`Responses: ${options.outputPath}`);
    console.log(`Metadata: ${metadataOutputPath}`);
    console.log(
      `Estimated cost: ${
        totals.estimatedCostUsd === null
          ? 'unavailable'
          : `$${totals.estimatedCostUsd.toFixed(6)} USD`
      }`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(redactSecret(message, apiKey));
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
