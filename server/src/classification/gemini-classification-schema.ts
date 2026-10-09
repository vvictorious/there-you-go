import { DESTINATION_CATEGORIES } from '../places/destination-category';
import { DESTINATION_TAXONOMY_VERSION } from './classification-response';

type JsonObject = { readonly [key: string]: unknown };

// Gemini structured output does not support the discriminated `oneOf` used by
// the shared contract. Keep the response shape and value domains in the schema,
// then enforce outcome-specific invariants with the production parser.
export const GEMINI_CLASSIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['outcome', 'categories', 'taxonomyVersion'],
  properties: {
    outcome: {
      type: 'string',
      enum: [
        'classified',
        'no-destination',
        'needs-clarification',
        'unsupported-destination',
      ],
      description:
        'Classification result. Only needs-clarification includes clarificationQuestion.',
    },
    categories: {
      type: 'array',
      items: {
        type: 'string',
        enum: DESTINATION_CATEGORIES,
      },
      maxItems: DESTINATION_CATEGORIES.length,
      description:
        'Use one or more unique categories only for classified; use an empty array for every other outcome.',
    },
    clarificationQuestion: {
      type: 'string',
      description:
        'Required only for needs-clarification and omitted for every other outcome.',
    },
    taxonomyVersion: {
      type: 'integer',
      enum: [DESTINATION_TAXONOMY_VERSION],
    },
  },
} as const satisfies JsonObject;
