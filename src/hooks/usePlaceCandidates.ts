import * as Location from 'expo-location';
import { useEffect, useMemo } from 'react';

import { findPlaceCandidates } from '../api/places';
import type { Item } from '../models/Item';
import {
  createPlaceRequestItemsSignature,
  parsePlaceRequestItemsSignature,
} from './place-item-projection';

type UsePlaceCandidatesOptions = {
  isLoadingItems: boolean;
  items: readonly Item[];
};

export function usePlaceCandidates({
  isLoadingItems,
  items,
}: UsePlaceCandidatesOptions) {
  const requestItemsSignature = createPlaceRequestItemsSignature(items);
  const requestItems = useMemo(
    () => parsePlaceRequestItemsSignature(requestItemsSignature),
    [requestItemsSignature],
  );

  useEffect(() => {
    if (isLoadingItems || requestItems.length === 0) {
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
            items: [...requestItems],
            location,
          },
          { signal: abortController.signal },
        );
        if (!isActive) {
          return;
        }

        const itemsById = new Map(requestItems.map((item) => [item.id, item]));

        for (const { itemId, candidates } of result.results) {
          const itemText = itemsById.get(itemId)?.text ?? 'Unknown item';
          const candidateNames =
            candidates.map(({ name }) => name).join(', ') || '(none)';

          console.info(
            `[places] "${itemText}" (${itemId})\nCandidates: ${candidateNames}`,
          );
        }

        for (const itemId of result.unsupportedItemIds) {
          const itemText = itemsById.get(itemId)?.text ?? 'Unknown item';
          console.info(`[places] Unsupported item: "${itemText}" (${itemId})`);
        }
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
  }, [isLoadingItems, requestItems]);
}
