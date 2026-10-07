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

  it.each(['Milk', 'milk', 'MILK', '  MiLk  '])(
    'maps %j to the grocery-store category',
    async (reminder) => {
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
          reminders: [{ id: 'reminder-1', text: reminder }],
          location,
        }),
      ).resolves.toEqual({
        results: [{ reminderId: 'reminder-1', candidates }],
        unsupportedReminderIds: [],
      });
      expect(search).toHaveBeenCalledWith({
        categories: ['grocery-store'],
        location,
      });
    },
  );

  it('returns unsupported reminders without calling the provider', async () => {
    const { search, service } = await createService();
    const request = {
      reminders: [
        { id: 'reminder-1', text: 'Bread' },
        { id: 'reminder-2', text: 'Dry cleaning' },
      ],
      location: { latitude: 34.05, longitude: -118.25 },
    };

    await expect(service.findCandidates(request)).resolves.toEqual({
      results: [],
      unsupportedReminderIds: ['reminder-1', 'reminder-2'],
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('queries once for supported reminders and reports unsupported ones', async () => {
    const search = vi.fn().mockResolvedValue([]);
    const { service } = await createService(search);

    await expect(
      service.findCandidates({
        reminders: [
          { id: 'reminder-1', text: 'Milk' },
          { id: 'reminder-2', text: 'Bread' },
          { id: 'reminder-3', text: 'milk' },
        ],
        location: { latitude: 34.05, longitude: -118.25 },
      }),
    ).resolves.toEqual({
      results: [
        { reminderId: 'reminder-1', candidates: [] },
        { reminderId: 'reminder-3', candidates: [] },
      ],
      unsupportedReminderIds: ['reminder-2'],
    });
    expect(search).toHaveBeenCalledTimes(1);
  });
});
