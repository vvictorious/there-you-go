import * as Location from 'expo-location';
import { useEffect } from 'react';

import { findPlaceCandidates } from '../api/places';
import type { Reminder } from '../models/Reminder';
import { containsMilkReminder } from '../services/placeCandidateDiscovery';

type UsePlaceCandidatesOptions = {
  isLoadingReminders: boolean;
  reminders: readonly Reminder[];
};

export function usePlaceCandidates({
  isLoadingReminders,
  reminders,
}: UsePlaceCandidatesOptions) {
  useEffect(() => {
    if (isLoadingReminders || !containsMilkReminder(reminders)) {
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    async function loadCandidates() {
      console.info('[places] Milk reminder detected.');

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
            reminders: reminders.map((reminder) => reminder.text),
            location,
          },
          { signal: abortController.signal },
        );
        if (!isActive) {
          return;
        }

        console.info(
          '[places] Candidate names returned:',
          result.candidates.map((candidate) => candidate.name),
        );
        console.info(
          '[places] Unsupported reminders returned:',
          result.unsupportedReminders,
        );
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.warn(
          '[places] Candidate lookup failed; reminders remain available.',
          error,
        );
      }
    }

    void loadCandidates();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [isLoadingReminders, reminders]);
}
