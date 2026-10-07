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
  bananas: 'grocery-store',
  'cortisone cream': 'pharmacy',
  'dog food': 'pet-store',
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
    const supportedItems: {
      itemId: string;
      category: DestinationCategory;
    }[] = [];
    const categories = new Set<DestinationCategory>();
    const unsupportedItemIds: string[] = [];

    for (const item of request.items) {
      const category = ITEM_CATEGORIES[item.text.trim().toLowerCase()];

      if (category) {
        supportedItems.push({ itemId: item.id, category });
        categories.add(category);
      } else {
        unsupportedItemIds.push(item.id);
      }
    }

    const candidatesByCategory = new Map(
      await Promise.all(
        [...categories].map(async (category) => {
          const candidates = await this.provider.search({
            categories: [category],
            location: request.location,
          });

          return [category, candidates] as const;
        }),
      ),
    );

    return {
      results: supportedItems.map(({ itemId, category }) => ({
        itemId,
        candidates: candidatesByCategory.get(category) ?? [],
      })),
      unsupportedItemIds,
    };
  }
}
