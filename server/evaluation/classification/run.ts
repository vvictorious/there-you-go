import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { CLASSIFICATION_EVALUATION_DATASET } from './dataset';
import {
  evaluateClassificationResponses,
  type ClassificationResponseMap,
} from './evaluate';

function usage(): never {
  throw new Error(
    'Usage: npm run eval:classification -- <responses.json> [--json]',
  );
}

function parseResponseMap(value: unknown): ClassificationResponseMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      'Response file must be a JSON object keyed by evaluation case ID',
    );
  }

  return value as ClassificationResponseMap;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const argumentsWithoutFlags = process.argv.slice(2).filter((arg) => {
    return !arg.startsWith('--');
  });
  const responseFile = argumentsWithoutFlags[0];
  if (!responseFile || argumentsWithoutFlags.length !== 1) {
    usage();
  }

  const rawResponses: unknown = JSON.parse(
    await readFile(resolve(responseFile), 'utf8'),
  );
  const report = evaluateClassificationResponses(
    CLASSIFICATION_EVALUATION_DATASET,
    parseResponseMap(rawResponses),
  );

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Cases: ${report.totalCases}`);
  console.log(
    `Outcome accuracy: ${formatPercent(report.outcomeAccuracy)} (${report.correctOutcomes}/${report.totalCases})`,
  );
  console.log(
    `Category precision: ${formatPercent(report.categoryMetrics.precision)}`,
  );
  console.log(
    `Category recall: ${formatPercent(report.categoryMetrics.recall)}`,
  );
  console.log(
    `Invalid-response rate: ${formatPercent(report.invalidResponseRate)} (${report.invalidResponses}/${report.totalCases})`,
  );
  console.log('\nPer-category precision / recall:');

  for (const [category, metrics] of Object.entries(
    report.categoryMetricsByCategory,
  )) {
    console.log(
      `  ${category}: ${formatPercent(metrics.precision)} / ${formatPercent(metrics.recall)}`,
    );
  }

  const unsuccessfulCases = report.cases.filter((result) => {
    return !result.validResponse || !result.outcomeCorrect;
  });
  if (unsuccessfulCases.length > 0) {
    console.log('\nInvalid or outcome-mismatched cases:');
    for (const result of unsuccessfulCases) {
      const actual = result.error ?? result.actualOutcome ?? 'unknown';
      console.log(
        `  ${result.id}: expected ${result.expectedOutcome}; received ${actual}`,
      );
    }
  }

  if (report.unknownResponseIds.length > 0) {
    console.log(
      `\nIgnored unknown response IDs: ${report.unknownResponseIds.join(', ')}`,
    );
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
