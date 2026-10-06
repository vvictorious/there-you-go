import { describe, expect, it } from 'vitest';

import type { Reminder } from '../models/Reminder';
import { containsMilkReminder } from '../services/placeCandidateDiscovery';

function reminder(text: string): Reminder {
  return {
    id: text,
    text,
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
  };
}

describe('containsMilkReminder', () => {
  it.each(['Milk', 'milk', '  MILK  '])('detects %j', (text) => {
    expect(containsMilkReminder([reminder(text)])).toBe(true);
  });

  it('does not match unsupported reminder text', () => {
    expect(containsMilkReminder([reminder('Oat milk'), reminder('Bread')])).toBe(
      false,
    );
  });
});
