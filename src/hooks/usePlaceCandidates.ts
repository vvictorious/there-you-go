import * as Location from 'expo-location';
import { useEffect } from 'react';

import { findPlaceCandidates } from '../api/places';
import type { Item } from '../models/Item';

type UsePlaceCandidatesOptions = {
  isLoadingItems: boolean;
  items: readonly Item[];
};

export function usePlaceCandidates({
  isLoadingItems,
  items,
}: UsePlaceCandidatesOptions) {
  useEffect(() => {
    if (isLoadingItems || items.length === 0) {
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    async function loadCandidates() {
      console.info('[places] Discovering candidates for current items.');

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!isActive) {
          return;
        }
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          console.warn(
            '[places] Location permission was denied; candidate lookup was skipped.',
          );
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isActive) {
          return;
        }

        const location = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
        console.info('[places] Current location obtained.', location);
        console.info('[places] Requesting candidates from the server.');

        const result = await findPlaceCandidates(
          {
            items: items.map(({ id, text }) => ({ id, text })),
            location,
          },
          { signal: abortController.signal },
        );
        if (!isActive) {
          return;
        }

        console.info(
          '[places] Candidate results returned:',
          result.results,
        );
        console.info(
          '[places] Unsupported item IDs returned:',
          result.unsupportedItemIds,
        );
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.warn(
          '[places] Candidate lookup failed; items remain available.',
          error,
        );
      }
    }

    void loadCandidates();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [isLoadingItems, items]);
}
