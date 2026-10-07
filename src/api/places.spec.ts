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
        results: [
          {
            itemId: 'item-1',
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
          },
        ],
        unsupportedItemIds: ['item-2'],
      }),
    ).toEqual({
      results: [
        {
          itemId: 'item-1',
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
        },
      ],
      unsupportedItemIds: ['item-2'],
    });
  });

  it.each([
    null,
    {},
    { results: [], unsupportedItemIds: [42] },
    {
      results: [
        {
          itemId: 'item-1',
          candidates: [
            {
              id: 'place-1',
              name: 'Market',
              location: { latitude: '34', longitude: -118.393 },
            },
          ],
        },
      ],
      unsupportedItemIds: [],
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
          results: [],
          unsupportedItemIds: [],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = {
      items: [{ id: 'item-1', text: 'Milk' }],
      location: { latitude: 34.027, longitude: -118.393 },
    };

    await expect(findPlaceCandidates(request)).resolves.toEqual({
      results: [],
      unsupportedItemIds: [],
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
