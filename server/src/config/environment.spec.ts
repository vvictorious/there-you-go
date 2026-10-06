import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('trims a configured Google Places API key', () => {
    expect(
      validateEnvironment({ GOOGLE_PLACES_API_KEY: '  test-key  ' }),
    ).toMatchObject({
      GOOGLE_PLACES_API_KEY: 'test-key',
    });
  });

  it('treats an empty Google Places API key as unconfigured', () => {
    expect(validateEnvironment({ GOOGLE_PLACES_API_KEY: '   ' })).toMatchObject(
      {
        GOOGLE_PLACES_API_KEY: undefined,
      },
    );
  });

  it('rejects a non-string Google Places API key', () => {
    expect(() => validateEnvironment({ GOOGLE_PLACES_API_KEY: 123 })).toThrow(
      'GOOGLE_PLACES_API_KEY must be a string',
    );
  });
});
