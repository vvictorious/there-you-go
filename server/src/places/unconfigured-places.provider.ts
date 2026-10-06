import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PlaceCandidate, PlacesProvider } from './places-provider';

@Injectable()
export class UnconfiguredPlacesProvider implements PlacesProvider {
  search(): Promise<readonly PlaceCandidate[]> {
    throw new ServiceUnavailableException(
      'Places requires GOOGLE_PLACES_API_KEY to be configured',
    );
  }
}
