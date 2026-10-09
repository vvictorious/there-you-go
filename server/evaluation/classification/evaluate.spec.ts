import { describe, expect, it } from 'vitest';

import { DESTINATION_CATEGORIES } from '../../src/places/destination-category';
import {
  CLASSIFICATION_EVALUATION_DATASET,
  type ClassificationEvaluationCase,
} from './dataset';
import { evaluateClassificationResponses } from './evaluate';

function expectedResponse(testCase: ClassificationEvaluationCase) {
  switch (testCase.expectedOutcome) {
    case 'classified':
      return {
        outcome: 'classified',
        categories: [...testCase.acceptableCategories],
        taxonomyVersion: 1,
      };
    case 'needs-clarification':
      return {
        outcome: 'needs-clarification',
        categories: [],
        clarificationQuestion: 'Which specific item do you need?',
        taxonomyVersion: 1,
      };
    case 'no-destination':
    case 'unsupported-destination':
      return {
        outcome: testCase.expectedOutcome,
        categories: [],
        taxonomyVersion: 1,
      };
  }
}

describe('classification evaluation dataset', () => {
  it('contains 48 unique cases spanning every outcome and category', () => {
    expect(CLASSIFICATION_EVALUATION_DATASET).toHaveLength(48);

    const ids = CLASSIFICATION_EVALUATION_DATASET.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);

    const outcomes = new Set(
      CLASSIFICATION_EVALUATION_DATASET.map(
        ({ expectedOutcome }) => expectedOutcome,
      ),
    );
    expect(outcomes).toEqual(
      new Set([
        'classified',
        'no-destination',
        'needs-clarification',
        'unsupported-destination',
      ]),
    );

    const representedCategories = new Set(
      CLASSIFICATION_EVALUATION_DATASET.flatMap(
        ({ acceptableCategories }) => acceptableCategories,
      ),
    );
    expect(representedCategories).toEqual(new Set(DESTINATION_CATEGORIES));
  });

  it('only assigns categories to classified cases', () => {
    for (const testCase of CLASSIFICATION_EVALUATION_DATASET) {
      if (testCase.expectedOutcome === 'classified') {
        expect(testCase.acceptableCategories.length).toBeGreaterThan(0);
      } else {
        expect(testCase.acceptableCategories).toEqual([]);
      }
    }
  });

  it('includes only the documented clear secondary-retailer corrections', () => {
    const categoriesById = Object.fromEntries(
      CLASSIFICATION_EVALUATION_DATASET.map(({ id, acceptableCategories }) => [
        id,
        acceptableCategories,
      ]),
    );

    expect(categoriesById['classified-04']).toEqual([
      'pharmacy',
      'grocery-store',
      'department-store',
      'convenience-store',
    ]);
    expect(categoriesById['classified-06']).toContain('department-store');
    expect(categoriesById['classified-09']).toEqual([
      'pet-store',
      'department-store',
    ]);
    expect(categoriesById['classified-12']).toContain('grocery-store');
    expect(categoriesById['classified-18']).toContain('pharmacy');
    expect(categoriesById['classified-28']).toContain('pharmacy');
  });
});

describe('evaluateClassificationResponses', () => {
  it('reports perfect metrics for contract-valid expected responses', () => {
    const responses = Object.fromEntries(
      CLASSIFICATION_EVALUATION_DATASET.map((testCase) => [
        testCase.id,
        expectedResponse(testCase),
      ]),
    );

    const report = evaluateClassificationResponses(
      CLASSIFICATION_EVALUATION_DATASET,
      responses,
    );

    expect(report.outcomeAccuracy).toBe(1);
    expect(report.categoryMetrics.precision).toBe(1);
    expect(report.categoryMetrics.recall).toBe(1);
    expect(report.invalidResponseRate).toBe(0);
    expect(report.unknownResponseIds).toEqual([]);
  });

  it('counts malformed, missing, wrong, and unknown responses correctly', () => {
    const dataset: ClassificationEvaluationCase[] = [
      {
        id: 'item',
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
      {
        id: 'missing',
        input: 'dog food',
        expectedOutcome: 'classified',
        acceptableCategories: ['pet-store'],
        notes: 'Fixture',
      },
    ];

    const report = evaluateClassificationResponses(dataset, {
      item: {
        outcome: 'classified',
        categories: [],
        taxonomyVersion: 1,
      },
      task: {
        outcome: 'classified',
        categories: ['electronics-store'],
        taxonomyVersion: 1,
      },
      extra: {
        outcome: 'no-destination',
        categories: [],
        taxonomyVersion: 1,
      },
    });

    expect(report.outcomeAccuracy).toBe(0);
    expect(report.invalidResponseRate).toBe(2 / 3);
    expect(report.categoryMetrics).toMatchObject({
      truePositives: 0,
      falsePositives: 1,
      falseNegatives: 2,
      precision: 0,
      recall: 0,
    });
    expect(report.unknownResponseIds).toEqual(['extra']);
    expect(report.cases.map(({ error }) => error)).toEqual([
      expect.stringContaining('classified must contain at least one'),
      undefined,
      'Missing response',
    ]);
  });
});
