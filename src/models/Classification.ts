export const DESTINATION_TAXONOMY_VERSION = 1 as const;

export const DESTINATION_CATEGORIES = [
  'grocery-store',
  'convenience-store',
  'pharmacy',
  'pet-store',
  'hardware-store',
  'electronics-store',
  'department-store',
  'clothing-store',
  'auto-parts-store',
  'home-goods-store',
] as const;

export type DestinationCategory = (typeof DESTINATION_CATEGORIES)[number];

type ClassificationResponseBase = {
  taxonomyVersion: typeof DESTINATION_TAXONOMY_VERSION;
};

export type ClassifiedResult = ClassificationResponseBase & {
  outcome: 'classified';
  categories: [DestinationCategory, ...DestinationCategory[]];
};

export type NoDestinationResult = ClassificationResponseBase & {
  outcome: 'no-destination';
  categories: [];
};

export type NeedsClarificationResult = ClassificationResponseBase & {
  outcome: 'needs-clarification';
  categories: [];
  clarificationQuestion: string;
};

export type UnsupportedDestinationResult = ClassificationResponseBase & {
  outcome: 'unsupported-destination';
  categories: [];
};

export type ItemClassificationResult =
  | ClassifiedResult
  | NoDestinationResult
  | NeedsClarificationResult
  | UnsupportedDestinationResult;

export type ClassificationSource = {
  sourceRevision: number;
  sourceText: string;
  taxonomyVersion: typeof DESTINATION_TAXONOMY_VERSION;
};

export type UnclassifiedClassification = {
  status: 'unclassified';
  taxonomyVersion: typeof DESTINATION_TAXONOMY_VERSION;
};

export type PendingClassification = ClassificationSource & {
  status: 'pending';
  attemptCount: number;
  nextAttemptAt: string | null;
};

export type CurrentClassification = ClassificationSource & {
  status: 'current';
  result: ItemClassificationResult;
};

export type ClassificationFailureKind =
  | 'network'
  | 'timeout'
  | 'server'
  | 'invalid-request'
  | 'invalid-response'
  | 'unknown';

export type FailedClassification = ClassificationSource & {
  status: 'failed';
  attemptCount: number;
  nextAttemptAt: string | null;
  retryable: boolean;
  failureKind: ClassificationFailureKind;
};

export type ItemClassification =
  | UnclassifiedClassification
  | PendingClassification
  | CurrentClassification
  | FailedClassification;
