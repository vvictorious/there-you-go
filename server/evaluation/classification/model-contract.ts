import { DESTINATION_CATEGORIES } from '../../src/places/destination-category';
import {
  DESTINATION_TAXONOMY_VERSION,
  MAX_CLARIFICATION_QUESTION_LENGTH,
} from '../../src/classification/classification-response';

const baseProperties = {
  taxonomyVersion: { const: DESTINATION_TAXONOMY_VERSION },
  categories: {
    type: 'array',
    items: { enum: DESTINATION_CATEGORIES },
    uniqueItems: true,
  },
} as const;

export const CLASSIFICATION_STRUCTURED_OUTPUT_SCHEMA = {
  type: 'object',
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['outcome', 'categories', 'taxonomyVersion'],
      properties: {
        outcome: { const: 'classified' },
        categories: {
          ...baseProperties.categories,
          minItems: 1,
        },
        taxonomyVersion: baseProperties.taxonomyVersion,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['outcome', 'categories', 'taxonomyVersion'],
      properties: {
        outcome: { enum: ['no-destination', 'unsupported-destination'] },
        categories: {
          ...baseProperties.categories,
          maxItems: 0,
        },
        taxonomyVersion: baseProperties.taxonomyVersion,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: [
        'outcome',
        'categories',
        'clarificationQuestion',
        'taxonomyVersion',
      ],
      properties: {
        outcome: { const: 'needs-clarification' },
        categories: {
          ...baseProperties.categories,
          maxItems: 0,
        },
        clarificationQuestion: {
          type: 'string',
          pattern: '\\S',
          maxLength: MAX_CLARIFICATION_QUESTION_LENGTH,
        },
        taxonomyVersion: baseProperties.taxonomyVersion,
      },
    },
  ],
} as const;

export const CLASSIFICATION_EVALUATION_INSTRUCTIONS = `
Classify one ThereYouGo reminder input.

Return "classified" when one or more supported destination categories are
useful for obtaining the named item or items. Return every useful category.
Return "no-destination" for a task that does not require visiting a
destination. Return "needs-clarification" when the request is too ambiguous
or omits the item needed to choose a destination; ask one concise question.
Return "unsupported-destination" when the destination is clear but falls
outside the supported taxonomy.

Use taxonomy version ${DESTINATION_TAXONOMY_VERSION}. Supported categories:
${DESTINATION_CATEGORIES.join(', ')}.
`.trim();
