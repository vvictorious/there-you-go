import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import {
  ClassifyItemDto,
  MAX_CLASSIFICATION_TEXT_LENGTH,
} from './classify-item.dto';

async function validateRequest(value: unknown) {
  return validate(plainToInstance(ClassifyItemDto, value));
}

describe('ClassifyItemDto', () => {
  it.each([
    'Milk',
    'Call Mom',
    'Need something for my headache',
    'a'.repeat(MAX_CLASSIFICATION_TEXT_LENGTH),
  ])('accepts valid text: %j', async (text) => {
    await expect(validateRequest({ text })).resolves.toHaveLength(0);
  });

  it.each([
    {},
    { text: null },
    { text: 42 },
    { text: '' },
    { text: '   ' },
    { text: 'a'.repeat(MAX_CLASSIFICATION_TEXT_LENGTH + 1) },
  ])('rejects invalid input: %j', async (value) => {
    expect(await validateRequest(value)).not.toHaveLength(0);
  });
});
