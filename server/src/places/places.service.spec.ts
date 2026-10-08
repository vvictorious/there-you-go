import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  PlaceCandidate,
  PLACES_PROVIDER,
  PlacesProvider,
} from './places-provider';
import { PlacesService } from './places.service';

describe('PlacesService', () => {
  async function createService(search = vi.fn()) {
    const provider: PlacesProvider = { search };
    const module = await Test.createTestingModule({
      providers: [
        PlacesService,
        { provide: PLACES_PROVIDER, useValue: provider },
      ],
    }).compile();

    return { search, service: module.get(PlacesService) };
  }

  it.each([
    ['Milk', 'grocery-store'],
    ['  MiLk  ', 'grocery-store'],
    ['Bananas', 'grocery-store'],
    ['  BANANAS  ', 'grocery-store'],
    ['Cortisone cream', 'pharmacy'],
    ['  CORTISONE CREAM  ', 'pharmacy'],
    ['Dog food', 'pet-store'],
    ['  DOG FOOD  ', 'pet-store'],
  ] as const)('maps %j to the %s category', async (item, category) => {
    const candidates: readonly PlaceCandidate[] = [
      {
        id: 'market-1',
        name: 'Neighborhood Market',
        location: { latitude: 34.051, longitude: -118.251 },
      },
    ];
    const search = vi.fn().mockResolvedValue(candidates);
    const { service } = await createService(search);
    const location = { latitude: 34.05, longitude: -118.25 };

    await expect(
      service.findCandidates({
        items: [{ id: 'item-1', text: item }],
        location,
      }),
    ).resolves.toEqual({
      results: [{ itemId: 'item-1', candidates }],
      unsupportedItemIds: [],
    });
    expect(search).toHaveBeenCalledWith({
      categories: [category],
      location,
    });
  });

  it('returns unsupported items without calling the provider', async () => {
    const { search, service } = await createService();
    const request = {
      items: [
        { id: 'item-1', text: 'Bread' },
        { id: 'item-2', text: 'Dry cleaning' },
      ],
      location: { latitude: 34.05, longitude: -118.25 },
    };

    await expect(service.findCandidates(request)).resolves.toEqual({
      results: [],
      unsupportedItemIds: ['item-1', 'item-2'],
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('queries once per category and preserves input order and item IDs', async () => {
    const candidatesByCategory: Record<string, readonly PlaceCandidate[]> = {
      'grocery-store': [
        {
          id: 'market-1',
          name: 'Neighborhood Market',
          location: { latitude: 34.051, longitude: -118.251 },
        },
      ],
      pharmacy: [
        {
          id: 'pharmacy-1',
          name: 'Neighborhood Pharmacy',
          location: { latitude: 34.052, longitude: -118.252 },
        },
      ],
      'pet-store': [
        {
          id: 'pet-store-1',
          name: 'Neighborhood Pet Store',
          location: { latitude: 34.053, longitude: -118.253 },
        },
      ],
    };
    const search = vi
      .fn<PlacesProvider['search']>()
      .mockImplementation(({ categories }) => {
        return Promise.resolve(candidatesByCategory[categories[0]]);
      });
    const { service } = await createService(search);
    const location = { latitude: 34.05, longitude: -118.25 };

    await expect(
      service.findCandidates({
        items: [
          { id: 'item-1', text: 'Milk' },
          { id: 'item-2', text: 'Cortisone cream' },
          { id: 'item-3', text: 'Bananas' },
          { id: 'item-4', text: 'Dog food' },
          { id: 'item-5', text: 'Bread' },
        ],
        location,
      }),
    ).resolves.toEqual({
      results: [
        { itemId: 'item-1', candidates: candidatesByCategory['grocery-store'] },
        { itemId: 'item-2', candidates: candidatesByCategory.pharmacy },
        { itemId: 'item-3', candidates: candidatesByCategory['grocery-store'] },
        { itemId: 'item-4', candidates: candidatesByCategory['pet-store'] },
      ],
      unsupportedItemIds: ['item-5'],
    });
    expect(search).toHaveBeenCalledTimes(3);
    expect(search).toHaveBeenCalledWith({
      categories: ['grocery-store'],
      location,
    });
    expect(search).toHaveBeenCalledWith({
      categories: ['pharmacy'],
      location,
    });
    expect(search).toHaveBeenCalledWith({
      categories: ['pet-store'],
      location,
    });
  });

  it('shares one grocery search across Milk and Bananas', async () => {
    const search = vi.fn().mockResolvedValue([]);
    const { service } = await createService(search);

    await expect(
      service.findCandidates({
        items: [
          { id: 'item-1', text: 'Milk' },
          { id: 'item-2', text: 'Bread' },
          { id: 'item-3', text: 'Bananas' },
        ],
        location: { latitude: 34.05, longitude: -118.25 },
      }),
    ).resolves.toEqual({
      results: [
        { itemId: 'item-1', candidates: [] },
        { itemId: 'item-3', candidates: [] },
      ],
      unsupportedItemIds: ['item-2'],
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({
      categories: ['grocery-store'],
      location: { latitude: 34.05, longitude: -118.25 },
    });
  });
});
