import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Reminder } from '../models/Reminder';

const STORAGE_KEY = '@there-you-go/reminders:v1';

function isReminder(value: unknown): value is Reminder {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const reminder = value as Record<string, unknown>;
  return (
    typeof reminder.id === 'string' &&
    typeof reminder.text === 'string' &&
    typeof reminder.createdAt === 'string' &&
    typeof reminder.updatedAt === 'string'
  );
}

function createReminderId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const skipNextPersistence = useRef(true);

  useEffect(() => {
    let isActive = true;

    async function loadReminders() {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isActive || storedValue === null) {
          return;
        }

        const parsedValue: unknown = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue) || !parsedValue.every(isReminder)) {
          throw new Error('Stored reminders have an unexpected format.');
        }

        setReminders(parsedValue);
      } catch {
        if (isActive) {
          setStorageError('Saved reminders could not be loaded.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadReminders();

    return () => {
      isActive = false;
    };
  }, []);

  const persist = useCallback((nextReminders: Reminder[]) => {
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextReminders)))
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

    persist(reminders);
  }, [isLoading, persist, reminders]);

  const addReminder = useCallback((text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    const now = new Date().toISOString();
    const reminder: Reminder = {
      id: createReminderId(),
      text: normalizedText,
      createdAt: now,
      updatedAt: now,
    };

    setReminders((currentReminders) => [reminder, ...currentReminders]);
  }, []);

  const updateReminder = useCallback((id: string, text: string) => {
    const normalizedText = text.trim();

    setReminders((currentReminders) =>
      normalizedText
        ? currentReminders.map((reminder) =>
            reminder.id === id
              ? {
                  ...reminder,
                  text: normalizedText,
                  updatedAt: new Date().toISOString(),
                }
              : reminder,
          )
        : currentReminders.filter((reminder) => reminder.id !== id),
    );
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders((currentReminders) =>
      currentReminders.filter((reminder) => reminder.id !== id),
    );
  }, []);

  return {
    reminders,
    isLoading,
    storageError,
    addReminder,
    updateReminder,
    deleteReminder,
  };
}
