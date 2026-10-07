import { Inject, Injectable } from '@nestjs/common';

import { PLACES_PROVIDER } from './places-provider';
import type {
  DestinationCategory,
  PlaceCandidate,
  PlacesProvider,
} from './places-provider';

export interface FindPlaceCandidatesRequest {
  reminders: readonly {
    id: string;
    text: string;
  }[];
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface FindPlaceCandidatesResult {
  results: readonly {
    reminderId: string;
    candidates: readonly PlaceCandidate[];
  }[];
  unsupportedReminderIds: readonly string[];
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
    const remindersByCategory = new Map<
      DestinationCategory,
      { id: string; text: string }[]
    >();
    const unsupportedReminderIds: string[] = [];

    for (const reminder of request.reminders) {
      const category = REMINDER_CATEGORIES[reminder.text.trim().toLowerCase()];

      if (category) {
        const reminders = remindersByCategory.get(category) ?? [];
        reminders.push(reminder);
        remindersByCategory.set(category, reminders);
      } else {
        unsupportedReminderIds.push(reminder.id);
      }
    }

    const resultGroups = await Promise.all(
      [...remindersByCategory].map(async ([category, reminders]) => {
        const candidates = await this.provider.search({
          categories: [category],
          location: request.location,
        });

        return reminders.map((reminder) => ({
          reminderId: reminder.id,
          candidates,
        }));
      }),
    );

    return {
      results: resultGroups.flat(),
      unsupportedReminderIds,
    };
  }
}
