import { describe, expect, it } from 'vitest';

import type { Item } from '../models/Item';
import { containsMilkItem } from '../services/placeCandidateDiscovery';

function item(text: string): Item {
  return {
    id: text,
    text,
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
  };
}

describe('containsMilkItem', () => {
  it.each(['Milk', 'milk', '  MILK  '])('detects %j', (text) => {
    expect(containsMilkItem([item(text)])).toBe(true);
  });

  it('does not match unsupported item text', () => {
    expect(containsMilkItem([item('Oat milk'), item('Bread')])).toBe(
      false,
    );
  });
});
