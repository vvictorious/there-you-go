export const CLASSIFICATION_PROVIDER = Symbol('CLASSIFICATION_PROVIDER');

export interface ClassificationProvider {
  classify(text: string): Promise<unknown>;
}
