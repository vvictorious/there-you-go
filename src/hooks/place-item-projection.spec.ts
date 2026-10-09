import { describe, expect, it } from 'vitest';

import {
  createItem,
  markClassificationPending,
} from '../models/item-transitions';
import type { Item } from '../models/Item';
import {
  createPlaceRequestItemsSignature,
  parsePlaceRequestItemsSignature,
} from './place-item-projection';

function makeItem(): Item {
  const item = createItem('item-1', 'Milk', '2026-10-09T12:00:00.000Z');
  if (item === null) {
    throw new Error('Test item was not created.');
  }
  return item;
}

describe('place item projection', () => {
  it('retains the same signature for classification-only updates', () => {
    const item = makeItem();
    const initial = createPlaceRequestItemsSignature([item]);
    const [classificationUpdate] = markClassificationPending(
      [item],
      item.id,
      {
        sourceRevision: item.revision,
        sourceText: item.text,
        taxonomyVersion: item.classification.taxonomyVersion,
        attemptCount: 1,
      },
      null,
    );

    expect(createPlaceRequestItemsSignature([classificationUpdate])).toBe(
      initial,
    );
  });

  it('changes the signature when item text or membership changes', () => {
    const item = makeItem();
    const initial = createPlaceRequestItemsSignature([item]);
    const edited = { ...item, text: 'Oat milk' };

    expect(createPlaceRequestItemsSignature([edited])).not.toBe(initial);
    expect(createPlaceRequestItemsSignature([])).not.toBe(initial);
    expect(parsePlaceRequestItemsSignature(initial)).toEqual([
      { id: 'item-1', text: 'Milk' },
    ]);
  });
});
