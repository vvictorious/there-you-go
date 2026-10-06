import type { Reminder } from '../models/Reminder';

export function containsMilkReminder(reminders: readonly Reminder[]) {
  return reminders.some(
    (reminder) => reminder.text.trim().toLowerCase() === 'milk',
  );
}
