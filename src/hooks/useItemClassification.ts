import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { ItemClassificationResult } from '../models/Classification';
import type {
  ClassificationAttemptSnapshot,
  ClassificationFailure,
} from '../models/item-transitions';
import type { Item } from '../models/Item';
import { ItemClassificationWorker } from './item-classification-worker';

type UseItemClassificationOptions = {
  items: readonly Item[];
  isLoadingItems: boolean;
  markClassificationPending: (
    id: string,
    attempt: ClassificationAttemptSnapshot,
    nextAttemptAt: string | null,
  ) => void;
  applyClassificationResult: (
    id: string,
    attempt: ClassificationAttemptSnapshot,
    result: ItemClassificationResult,
  ) => void;
  markClassificationFailed: (
    id: string,
    attempt: ClassificationAttemptSnapshot,
    failure: ClassificationFailure,
  ) => void;
};

export function useItemClassification(
  options: UseItemClassificationOptions,
): void {
  const [worker] = useState(
    () =>
      new ItemClassificationWorker({
        markPending: options.markClassificationPending,
        applyResult: options.applyClassificationResult,
        markFailed: options.markClassificationFailed,
      }),
  );

  const [isForeground, setIsForeground] = useState(
    AppState.currentState === 'active',
  );
  const [isDefinitelyOffline, setIsDefinitelyOffline] = useState(false);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => setIsForeground(nextState === 'active'),
    );
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      setIsDefinitelyOffline(
        state.isConnected === false || state.isInternetReachable === false,
      );
    });

    return () => {
      appStateSubscription.remove();
      unsubscribeNetInfo();
    };
  }, []);

  useEffect(() => {
    worker.setCallbacks({
      markPending: options.markClassificationPending,
      applyResult: options.applyClassificationResult,
      markFailed: options.markClassificationFailed,
    });
  }, [
    options.applyClassificationResult,
    options.markClassificationFailed,
    options.markClassificationPending,
    worker,
  ]);

  useEffect(() => {
    worker.update({
      items: options.items,
      isHydrated: !options.isLoadingItems,
      isForeground,
      isDefinitelyOffline,
    });
  }, [
    isDefinitelyOffline,
    isForeground,
    options.isLoadingItems,
    options.items,
    worker,
  ]);

  useEffect(() => {
    worker.start();
    return () => worker.stop();
  }, [worker]);
}
