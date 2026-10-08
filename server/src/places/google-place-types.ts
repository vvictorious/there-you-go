import type { DestinationCategory } from './destination-category';

export const GOOGLE_PLACE_TYPES = {
  'grocery-store': [
    'grocery_store',
    'supermarket',
    'asian_grocery_store',
    'discount_supermarket',
    'health_food_store',
  ],
  'convenience-store': ['convenience_store'],
  pharmacy: ['pharmacy', 'drugstore'],
  'pet-store': ['pet_store'],
  'hardware-store': ['hardware_store', 'home_improvement_store'],
  'electronics-store': ['electronics_store'],
  'department-store': ['department_store'],
  'clothing-store': [
    'clothing_store',
    'womens_clothing_store',
    'sportswear_store',
  ],
  'auto-parts-store': ['auto_parts_store'],
  'home-goods-store': ['home_goods_store'],
} as const satisfies Readonly<Record<DestinationCategory, readonly string[]>>;
