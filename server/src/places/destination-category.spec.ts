import { describe, expect, it } from 'vitest';

import { DESTINATION_CATEGORIES } from './destination-category';

describe('DestinationCategory', () => {
  it('exposes the approved v1 taxonomy at runtime', () => {
    expect(DESTINATION_CATEGORIES).toEqual([
      'grocery-store',
      'convenience-store',
      'pharmacy',
      'pet-store',
      'hardware-store',
      'electronics-store',
      'department-store',
      'clothing-store',
      'auto-parts-store',
      'home-goods-store',
    ]);
    expect(DESTINATION_CATEGORIES).toHaveLength(10);
  });
});
