import type { Item } from '../models/Item';

export function containsMilkItem(items: readonly Item[]) {
  return items.some(
    (item) => item.text.trim().toLowerCase() === 'milk',
  );
}
