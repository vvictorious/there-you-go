import { afterEach, describe, expect, it, vi } from 'vitest';

import { findPlaceCandidates, parsePlaceCandidatesResponse } from './places';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('parsePlaceCandidatesResponse', () => {
  it('parses the app-owned server response', () => {
    expect(
      parsePlaceCandidatesResponse({
        candidates: [
          {
            id: 'place-1',
            name: 'Sprouts Farmers Market',
            location: {
              latitude: 34.027,
              longitude: -118.393,
            },
          },
        ],
        unsupportedReminders: ['Dry cleaning'],
      }),
    ).toEqual({
      candidates: [
        {
          id: 'place-1',
          name: 'Sprouts Farmers Market',
          location: {
            latitude: 34.027,
            longitude: -118.393,
          },
        },
      ],
      unsupportedReminders: ['Dry cleaning'],
    });
  });

  it.each([
    null,
    {},
    { candidates: [], unsupportedReminders: [42] },
    {
      candidates: [
        {
          id: 'place-1',
          name: 'Market',
          location: { latitude: '34', longitude: -118.393 },
        },
      ],
      unsupportedReminders: [],
    },
  ])('rejects an invalid response: %j', (response) => {
    expect(() => parsePlaceCandidatesResponse(response)).toThrow();
  });
});

describe('findPlaceCandidates', () => {
  it('posts the app request to the configured server', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'http://192.168.1.23:3000/');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [],
          unsupportedReminders: [],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = {
      reminders: ['Milk'],
      location: { latitude: 34.027, longitude: -118.393 },
    };

    await expect(findPlaceCandidates(request)).resolves.toEqual({
      candidates: [],
      unsupportedReminders: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.23:3000/places/candidates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request),
      }),
    );
  });
});
