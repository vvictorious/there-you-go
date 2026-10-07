import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { FindPlaceCandidatesDto } from './find-place-candidates.dto';

async function validateRequest(value: unknown) {
  return validate(plainToInstance(FindPlaceCandidatesDto, value));
}

describe('FindPlaceCandidatesDto', () => {
  it('accepts a valid request', async () => {
    await expect(
      validateRequest({
        reminders: [{ id: 'reminder-1', text: 'Milk' }],
        location: { latitude: 34, longitude: -118.4 },
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    { reminders: [], location: { latitude: 34, longitude: -118.4 } },
    {
      reminders: [{ id: '', text: 'Milk' }],
      location: { latitude: 34, longitude: -118.4 },
    },
    {
      reminders: [{ id: 'reminder-1', text: '   ' }],
      location: { latitude: 34, longitude: -118.4 },
    },
    {
      reminders: [{ id: 'reminder-1', text: 'Milk' }],
      location: { latitude: 91, longitude: -118.4 },
    },
    {
      reminders: [{ id: 'reminder-1', text: 'Milk' }],
      location: { latitude: 34, longitude: -181 },
    },
  ])('rejects invalid input: %j', async (value) => {
    expect(await validateRequest(value)).not.toHaveLength(0);
  });
});
