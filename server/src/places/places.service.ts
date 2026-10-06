import { Inject, Injectable } from '@nestjs/common';

import { PLACES_PROVIDER } from './places-provider';
import type {
  DestinationCategory,
  PlaceCandidate,
  PlacesProvider,
} from './places-provider';

export interface FindPlaceCandidatesRequest {
  reminders: readonly string[];
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface FindPlaceCandidatesResult {
  candidates: readonly PlaceCandidate[];
  unsupportedReminders: readonly string[];
}

const REMINDER_CATEGORIES: Readonly<Record<string, DestinationCategory>> = {
  milk: 'grocery-store',
};

@Injectable()
export class PlacesService {
  constructor(
    @Inject(PLACES_PROVIDER)
    private readonly provider: PlacesProvider,
  ) {}

  async findCandidates(
    request: FindPlaceCandidatesRequest,
  ): Promise<FindPlaceCandidatesResult> {
    const categories = new Set<DestinationCategory>();
    const unsupportedReminders: string[] = [];

    for (const reminder of request.reminders) {
      const category = REMINDER_CATEGORIES[reminder.trim().toLowerCase()];

      if (category) {
        categories.add(category);
      } else {
        unsupportedReminders.push(reminder);
      }
    }

    if (categories.size === 0) {
      return { candidates: [], unsupportedReminders };
    }

    const candidates = await this.provider.search({
      categories: [...categories],
      location: request.location,
    });

    return { candidates, unsupportedReminders };
  }
}
