import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Item } from '../models/Item';

const STORAGE_KEY = '@there-you-go/reminders:v1';

function isItem(value: unknown): value is Item {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.text === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string'
  );
}

function createItemId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const skipNextPersistence = useRef(true);

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isActive || storedValue === null) {
          return;
        }

        const parsedValue: unknown = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue) || !parsedValue.every(isItem)) {
          throw new Error('Stored items have an unexpected format.');
        }

        setItems(parsedValue);
      } catch {
        if (isActive) {
          setStorageError('Saved items could not be loaded.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      isActive = false;
    };
  }, []);

  const persist = useCallback((nextItems: Item[]) => {
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems)))
      .then(() => setStorageError(null))
      .catch(() => {
        setStorageError('Changes could not be saved on this device.');
      });
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (skipNextPersistence.current) {
      skipNextPersistence.current = false;
      return;
    }

    persist(items);
  }, [isLoading, persist, items]);

  const addItem = useCallback((text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    const now = new Date().toISOString();
    const item: Item = {
      id: createItemId(),
      text: normalizedText,
      createdAt: now,
      updatedAt: now,
    };

    setItems((currentItems) => [item, ...currentItems]);
  }, []);

  const updateItem = useCallback((id: string, text: string) => {
    const normalizedText = text.trim();

    setItems((currentItems) =>
      normalizedText
        ? currentItems.map((item) =>
            item.id === id
              ? {
                  ...item,
                  text: normalizedText,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          )
        : currentItems.filter((item) => item.id !== id),
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    );
  }, []);

  return {
    items,
    isLoading,
    storageError,
    addItem,
    updateItem,
    deleteItem,
  };
}
