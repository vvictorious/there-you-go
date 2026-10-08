import type { DestinationCategory } from './destination-category';

export const PLACES_PROVIDER = Symbol('PLACES_PROVIDER');

export interface PlaceSearchRequest {
  categories: readonly DestinationCategory[];
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface PlaceCandidate {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface PlacesProvider {
  search(request: PlaceSearchRequest): Promise<readonly PlaceCandidate[]>;
}
