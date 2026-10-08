import {
  DESTINATION_CATEGORIES,
  type DestinationCategory,
} from '../places/destination-category';

export const DESTINATION_TAXONOMY_VERSION = 1 as const;
export const MAX_CLARIFICATION_QUESTION_LENGTH = 160;

type ClassificationResponseBase = {
  taxonomyVersion: typeof DESTINATION_TAXONOMY_VERSION;
};

export type ClassifiedResponse = ClassificationResponseBase & {
  outcome: 'classified';
  categories: readonly [DestinationCategory, ...DestinationCategory[]];
};

export type NoDestinationResponse = ClassificationResponseBase & {
  outcome: 'no-destination';
  categories: readonly [];
};

export type NeedsClarificationResponse = ClassificationResponseBase & {
  outcome: 'needs-clarification';
  categories: readonly [];
  clarificationQuestion: string;
};

export type UnsupportedDestinationResponse = ClassificationResponseBase & {
  outcome: 'unsupported-destination';
  categories: readonly [];
};

export type ItemClassificationResponse =
  | ClassifiedResponse
  | NoDestinationResponse
  | NeedsClarificationResponse
  | UnsupportedDestinationResponse;

const destinationCategorySet = new Set<string>(DESTINATION_CATEGORIES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDestinationCategory(value: unknown): value is DestinationCategory {
  return typeof value === 'string' && destinationCategorySet.has(value);
}

function hasExactlyKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key) => expectedKeys.includes(key))
  );
}

function invalidResponse(message: string): never {
  throw new Error(`Invalid item classification response: ${message}`);
}

export function parseItemClassificationResponse(
  value: unknown,
): ItemClassificationResponse {
  if (!isRecord(value)) {
    return invalidResponse('expected an object');
  }

  if (value.taxonomyVersion !== DESTINATION_TAXONOMY_VERSION) {
    return invalidResponse(
      `taxonomyVersion must be ${DESTINATION_TAXONOMY_VERSION}`,
    );
  }

  if (!Array.isArray(value.categories)) {
    return invalidResponse('categories must be an array');
  }

  const categories = value.categories;
  if (!categories.every(isDestinationCategory)) {
    return invalidResponse(
      'categories must contain only supported destination categories',
    );
  }

  switch (value.outcome) {
    case 'classified': {
      if (
        !hasExactlyKeys(value, ['outcome', 'categories', 'taxonomyVersion'])
      ) {
        return invalidResponse('classified contains unexpected properties');
      }
      if (categories.length === 0) {
        return invalidResponse(
          'classified must contain at least one destination category',
        );
      }
      if (new Set(categories).size !== categories.length) {
        return invalidResponse(
          'classified destination categories must be unique',
        );
      }

      return {
        outcome: 'classified',
        categories: categories as [
          DestinationCategory,
          ...DestinationCategory[],
        ],
        taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
      };
    }

    case 'no-destination':
    case 'unsupported-destination': {
      if (
        !hasExactlyKeys(value, ['outcome', 'categories', 'taxonomyVersion'])
      ) {
        return invalidResponse(
          `${value.outcome} contains unexpected properties`,
        );
      }
      if (categories.length !== 0) {
        return invalidResponse(`${value.outcome} categories must be empty`);
      }

      return {
        outcome: value.outcome,
        categories: [],
        taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
      };
    }

    case 'needs-clarification': {
      if (
        !hasExactlyKeys(value, [
          'outcome',
          'categories',
          'clarificationQuestion',
          'taxonomyVersion',
        ])
      ) {
        return invalidResponse(
          'needs-clarification contains unexpected properties',
        );
      }
      if (categories.length !== 0) {
        return invalidResponse('needs-clarification categories must be empty');
      }
      if (
        typeof value.clarificationQuestion !== 'string' ||
        value.clarificationQuestion.trim().length === 0
      ) {
        return invalidResponse(
          'needs-clarification must include a clarificationQuestion',
        );
      }

      const clarificationQuestion = value.clarificationQuestion.trim();
      if (clarificationQuestion.length > MAX_CLARIFICATION_QUESTION_LENGTH) {
        return invalidResponse(
          `clarificationQuestion must not exceed ${MAX_CLARIFICATION_QUESTION_LENGTH} characters`,
        );
      }

      return {
        outcome: 'needs-clarification',
        categories: [],
        clarificationQuestion,
        taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
      };
    }

    default:
      return invalidResponse('outcome is not supported');
  }
}
