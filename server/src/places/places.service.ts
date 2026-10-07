import { Inject, Injectable } from '@nestjs/common';

import { PLACES_PROVIDER } from './places-provider';
import type {
  DestinationCategory,
  PlaceCandidate,
  PlacesProvider,
} from './places-provider';

export interface FindPlaceCandidatesRequest {
  items: readonly {
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
    itemId: string;
    candidates: readonly PlaceCandidate[];
  }[];
  unsupportedItemIds: readonly string[];
}

const ITEM_CATEGORIES: Readonly<Record<string, DestinationCategory>> = {
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
    const itemsByCategory = new Map<
      DestinationCategory,
      { id: string; text: string }[]
    >();
    const unsupportedItemIds: string[] = [];

    for (const item of request.items) {
      const category = ITEM_CATEGORIES[item.text.trim().toLowerCase()];

      if (category) {
        const items = itemsByCategory.get(category) ?? [];
        items.push(item);
        itemsByCategory.set(category, items);
      } else {
        unsupportedItemIds.push(item.id);
      }
    }

    const resultGroups = await Promise.all(
      [...itemsByCategory].map(async ([category, items]) => {
        const candidates = await this.provider.search({
          categories: [category],
          location: request.location,
        });

        return items.map((item) => ({
          itemId: item.id,
          candidates,
        }));
      }),
    );

    return {
      results: resultGroups.flat(),
      unsupportedItemIds,
    };
  }
}
