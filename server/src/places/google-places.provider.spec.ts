import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DestinationCategory } from './destination-category';
import {
  GooglePlacesProvider,
  GOOGLE_NEARBY_SEARCH_URL,
  GOOGLE_PLACES_FIELD_MASK,
  NEARBY_CANDIDATE_LIMIT,
  NEARBY_SEARCH_RADIUS_METERS,
} from './google-places.provider';

describe('GooglePlacesProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [
      'grocery-store',
      [
        'grocery_store',
        'supermarket',
        'asian_grocery_store',
        'discount_supermarket',
        'health_food_store',
      ],
    ],
    ['convenience-store', ['convenience_store']],
    ['pharmacy', ['pharmacy', 'drugstore']],
    ['pet-store', ['pet_store']],
    ['hardware-store', ['hardware_store', 'home_improvement_store']],
    ['electronics-store', ['electronics_store']],
    ['department-store', ['department_store']],
    [
      'clothing-store',
      ['clothing_store', 'womens_clothing_store', 'sportswear_store'],
    ],
    ['auto-parts-store', ['auto_parts_store']],
    ['home-goods-store', ['home_goods_store']],
  ] as const satisfies readonly [DestinationCategory, readonly string[]][])(
    'maps %s searches to its Google primary types',
    async (category, googleTypes) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            places: [
              {
                id: 'google-place-1',
                displayName: { text: 'Local Market', languageCode: 'en' },
                location: { latitude: 34.01, longitude: -118.41 },
                types: ['grocery_store', 'store'],
              },
            ],
          }),
          { status: 200 },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);
      const provider = new GooglePlacesProvider(
        new ConfigService({ GOOGLE_PLACES_API_KEY: 'test-key' }),
      );

      await expect(
        provider.search({
          categories: [category],
          location: { latitude: 34, longitude: -118.4 },
        }),
      ).resolves.toEqual([
        {
          id: 'google-place-1',
          name: 'Local Market',
          location: { latitude: 34.01, longitude: -118.41 },
        },
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(GOOGLE_NEARBY_SEARCH_URL);
      expect(options?.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': 'test-key',
        'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      });
      if (typeof options?.body !== 'string') {
        throw new Error('Expected a JSON request body');
      }
      expect(JSON.parse(options.body)).toEqual({
        includedPrimaryTypes: googleTypes,
        maxResultCount: NEARBY_CANDIDATE_LIMIT,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: 34, longitude: -118.4 },
            radius: NEARBY_SEARCH_RADIUS_METERS,
          },
        },
      });
    },
  );

  it('fails clearly without a configured API key', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const provider = new GooglePlacesProvider(new ConfigService());

    await expect(
      provider.search({
        categories: ['grocery-store'],
        location: { latitude: 34, longitude: -118.4 },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose Google error payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('credential details', { status: 403 })),
    );
    const provider = new GooglePlacesProvider(
      new ConfigService({ GOOGLE_PLACES_API_KEY: 'test-key' }),
    );

    await expect(
      provider.search({
        categories: ['grocery-store'],
        location: { latitude: 34, longitude: -118.4 },
      }),
    ).rejects.toEqual(
      new BadGatewayException('Google Places request failed with status 403'),
    );
  });
});
