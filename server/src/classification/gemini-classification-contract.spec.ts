import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { DESTINATION_CATEGORIES } from '../places/destination-category';
import {
  DESTINATION_TAXONOMY_VERSION,
  parseItemClassificationResponse,
} from './classification-response';
import { GEMINI_CLASSIFICATION_PROMPT_V3 } from './gemini-classification-prompt';
import { GEMINI_CLASSIFICATION_SCHEMA } from './gemini-classification-schema';

describe('Gemini classification contract', () => {
  it('pins the v3 prompt to the production taxonomy', () => {
    expect(
      createHash('sha256')
        .update(GEMINI_CLASSIFICATION_PROMPT_V3)
        .digest('hex'),
    ).toBe('345269e2c7f2401445a347326449b9925e9342733610446d347a9ef421c81c5e');
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      `Use taxonomy version ${DESTINATION_TAXONOMY_VERSION}.`,
    );
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      `${DESTINATION_CATEGORIES.join(', ')}.`,
    );
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      'Apply these destination-selection rules:',
    );
    expect(GEMINI_CLASSIFICATION_PROMPT_V3).toContain(
      'Apply these additional exact-request and outcome rules:',
    );
  });

  it('keeps the Gemini schema aligned with the taxonomy and outcomes', () => {
    expect(GEMINI_CLASSIFICATION_SCHEMA.properties.categories.items.enum).toBe(
      DESTINATION_CATEGORIES,
    );
    expect(
      GEMINI_CLASSIFICATION_SCHEMA.properties.taxonomyVersion.enum,
    ).toEqual([DESTINATION_TAXONOMY_VERSION]);
    expect(GEMINI_CLASSIFICATION_SCHEMA.properties.outcome.enum).toEqual([
      'classified',
      'no-destination',
      'needs-clarification',
      'unsupported-destination',
    ]);

    const serializedSchema = JSON.stringify(GEMINI_CLASSIFICATION_SCHEMA);
    expect(serializedSchema).not.toContain('"oneOf"');
    expect(serializedSchema).not.toContain('"const"');
    expect(serializedSchema).not.toContain('"uniqueItems"');
    expect(serializedSchema).not.toContain('"pattern"');
  });

  it('keeps the strict parser authoritative over the compatible schema', () => {
    expect(
      parseItemClassificationResponse({
        outcome: 'classified',
        categories: ['grocery-store'],
        taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
      }),
    ).toEqual({
      outcome: 'classified',
      categories: ['grocery-store'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    });

    expect(() =>
      parseItemClassificationResponse({
        outcome: 'classified',
        categories: [],
        taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
      }),
    ).toThrow('classified must contain at least one destination category');
  });
});
