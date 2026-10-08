import { describe, expect, it } from 'vitest';

import {
  DESTINATION_TAXONOMY_VERSION,
  MAX_CLARIFICATION_QUESTION_LENGTH,
  parseItemClassificationResponse,
} from './classification-response';

describe('parseItemClassificationResponse', () => {
  it.each([
    {
      outcome: 'classified',
      categories: ['grocery-store', 'convenience-store'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'no-destination',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'needs-clarification',
      categories: [],
      clarificationQuestion: 'What item would help with your headache?',
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'unsupported-destination',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
  ])('parses a valid $outcome response', (response) => {
    expect(parseItemClassificationResponse(response)).toEqual(response);
  });

  it('trims a clarification question', () => {
    expect(
      parseItemClassificationResponse({
        outcome: 'needs-clarification',
        categories: [],
        clarificationQuestion: '  What item do you need?  ',
        taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
      }),
    ).toEqual({
      outcome: 'needs-clarification',
      categories: [],
      clarificationQuestion: 'What item do you need?',
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    });
  });

  it.each([
    null,
    {},
    {
      outcome: 'classified',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'classified',
      categories: ['grocery-store', 'grocery-store'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'classified',
      categories: ['hair-salon'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'no-destination',
      categories: ['grocery-store'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'unsupported-destination',
      categories: ['department-store'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'needs-clarification',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'needs-clarification',
      categories: [],
      clarificationQuestion: '   ',
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'needs-clarification',
      categories: [],
      clarificationQuestion: 'a'.repeat(MAX_CLARIFICATION_QUESTION_LENGTH + 1),
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'classified',
      categories: ['grocery-store'],
      taxonomyVersion: 2,
    },
    {
      outcome: 'unknown',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'classified',
      categories: ['grocery-store'],
      clarificationQuestion: 'Unexpected',
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
  ])('rejects an invalid response: %j', (response) => {
    expect(() => parseItemClassificationResponse(response)).toThrow(
      'Invalid item classification response',
    );
  });
});
