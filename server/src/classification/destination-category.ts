export const DESTINATION_CATEGORIES = [
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
] as const;

export type DestinationCategory = (typeof DESTINATION_CATEGORIES)[number];
