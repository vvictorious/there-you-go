import type { Item } from '../models/Item';

export type PlaceRequestItem = Pick<Item, 'id' | 'text'>;

export function createPlaceRequestItemsSignature(
  items: readonly Item[],
): string {
  return JSON.stringify(items.map(({ id, text }) => ({ id, text })));
}

export function parsePlaceRequestItemsSignature(
  signature: string,
): PlaceRequestItem[] {
  return JSON.parse(signature) as PlaceRequestItem[];
}
