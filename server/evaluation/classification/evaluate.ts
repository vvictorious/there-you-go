import {
  parseItemClassificationResponse,
  type ItemClassificationResponse,
} from '../../src/classification/classification-response';
import {
  DESTINATION_CATEGORIES,
  type DestinationCategory,
} from '../../src/places/destination-category';
import type { ClassificationEvaluationCase } from './dataset';

export type ClassificationResponseMap = Readonly<Record<string, unknown>>;

export type MetricCounts = {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
};

export type ClassificationCaseResult = {
  id: string;
  expectedOutcome: ClassificationEvaluationCase['expectedOutcome'];
  actualOutcome: ItemClassificationResponse['outcome'] | null;
  validResponse: boolean;
  outcomeCorrect: boolean;
  error?: string;
};

export type ClassificationEvaluationReport = {
  totalCases: number;
  validResponses: number;
  invalidResponses: number;
  invalidResponseRate: number;
  correctOutcomes: number;
  outcomeAccuracy: number;
  categoryMetrics: MetricCounts;
  categoryMetricsByCategory: Record<DestinationCategory, MetricCounts>;
  unknownResponseIds: string[];
  cases: ClassificationCaseResult[];
};

type MutableCounts = {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
};

function divide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function finishCounts(counts: MutableCounts): MetricCounts {
  return {
    ...counts,
    precision: divide(
      counts.truePositives,
      counts.truePositives + counts.falsePositives,
    ),
    recall: divide(
      counts.truePositives,
      counts.truePositives + counts.falseNegatives,
    ),
  };
}

function emptyCounts(): MutableCounts {
  return {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
  };
}

function responseError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown validation error';
}

export function evaluateClassificationResponses(
  dataset: readonly ClassificationEvaluationCase[],
  responses: ClassificationResponseMap,
): ClassificationEvaluationReport {
  const datasetIds = new Set(dataset.map(({ id }) => id));
  const categoryCounts = Object.fromEntries(
    DESTINATION_CATEGORIES.map((category) => [category, emptyCounts()]),
  ) as Record<DestinationCategory, MutableCounts>;
  const cases: ClassificationCaseResult[] = [];
  let validResponses = 0;
  let correctOutcomes = 0;

  for (const testCase of dataset) {
    let parsed: ItemClassificationResponse;

    if (!Object.hasOwn(responses, testCase.id)) {
      cases.push({
        id: testCase.id,
        expectedOutcome: testCase.expectedOutcome,
        actualOutcome: null,
        validResponse: false,
        outcomeCorrect: false,
        error: 'Missing response',
      });

      for (const category of testCase.acceptableCategories) {
        categoryCounts[category].falseNegatives += 1;
      }
      continue;
    }

    try {
      parsed = parseItemClassificationResponse(responses[testCase.id]);
      validResponses += 1;
    } catch (error) {
      cases.push({
        id: testCase.id,
        expectedOutcome: testCase.expectedOutcome,
        actualOutcome: null,
        validResponse: false,
        outcomeCorrect: false,
        error: responseError(error),
      });

      for (const category of testCase.acceptableCategories) {
        categoryCounts[category].falseNegatives += 1;
      }
      continue;
    }

    const outcomeCorrect = parsed.outcome === testCase.expectedOutcome;
    if (outcomeCorrect) {
      correctOutcomes += 1;
    }

    const expectedCategories = new Set(testCase.acceptableCategories);
    const actualCategories = new Set(
      parsed.outcome === 'classified' ? parsed.categories : [],
    );

    for (const category of DESTINATION_CATEGORIES) {
      const expected = expectedCategories.has(category);
      const actual = actualCategories.has(category);

      if (expected && actual) {
        categoryCounts[category].truePositives += 1;
      } else if (actual) {
        categoryCounts[category].falsePositives += 1;
      } else if (expected) {
        categoryCounts[category].falseNegatives += 1;
      }
    }

    cases.push({
      id: testCase.id,
      expectedOutcome: testCase.expectedOutcome,
      actualOutcome: parsed.outcome,
      validResponse: true,
      outcomeCorrect,
    });
  }

  const aggregateCounts = Object.values(categoryCounts).reduce(
    (aggregate, counts) => ({
      truePositives: aggregate.truePositives + counts.truePositives,
      falsePositives: aggregate.falsePositives + counts.falsePositives,
      falseNegatives: aggregate.falseNegatives + counts.falseNegatives,
    }),
    emptyCounts(),
  );
  const totalCases = dataset.length;

  return {
    totalCases,
    validResponses,
    invalidResponses: totalCases - validResponses,
    invalidResponseRate: divide(totalCases - validResponses, totalCases),
    correctOutcomes,
    outcomeAccuracy: divide(correctOutcomes, totalCases),
    categoryMetrics: finishCounts(aggregateCounts),
    categoryMetricsByCategory: Object.fromEntries(
      DESTINATION_CATEGORIES.map((category) => [
        category,
        finishCounts(categoryCounts[category]),
      ]),
    ) as Record<DestinationCategory, MetricCounts>,
    unknownResponseIds: Object.keys(responses)
      .filter((id) => !datasetIds.has(id))
      .sort(),
    cases,
  };
}
