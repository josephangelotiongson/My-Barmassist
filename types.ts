
export enum FlavorDimension {
  SWEET = 'Sweet',
  SOUR = 'Sour',
  BITTER = 'Bitter',
  BOOZY = 'Boozy',
  HERBAL = 'Herbal',
  FRUITY = 'Fruity',
  SPICY = 'Spicy',
  SMOKY = 'Smoky'
}

export interface FlavorProfile {
  [FlavorDimension.SWEET]: number;
  [FlavorDimension.SOUR]: number;
  [FlavorDimension.BITTER]: number;
  [FlavorDimension.BOOZY]: number;
  [FlavorDimension.HERBAL]: number;
  [FlavorDimension.FRUITY]: number;
  [FlavorDimension.SPICY]: number;
  [FlavorDimension.SMOKY]: number;
}

export interface Cocktail {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[]; // Added instructions
  flavorProfile: FlavorProfile;
  imageUrl?: string;
  source?: 'Manual' | 'Social' | 'Scan' | 'Order';
  originalLink?: string;
  creator?: string;
  creatorType?: 'Person' | 'Establishment' | 'Online'; // Added creator type for categorization
  dateAdded: string;
  rating?: number; // 1-5 Stars
  matchScore?: number; // 0-100 Match score for recommendations/scans
}

export interface Recommendation {
  name: string;
  description: string;
  matchScore: number; // 0-100
  ingredientsToUse: string[];
  missingIngredients: string[];
  instructions: string;
  flavorProfile: FlavorProfile;
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'Spirit' | 'Mixer' | 'Garnish' | 'Other';
  volume?: string; // e.g. "750ml", "50% full"
  flavorNotes?: string; // e.g. "Juniper, citrus, floral"
}

export interface ShoppingListItem {
  id: string;
  name: string;
  isChecked: boolean;
}

export interface MasterIngredient {
  id: string;
  name: string;
  category: 'Spirit' | 'Mixer' | 'Garnish' | 'Other';
  subCategory?: string; // e.g. "Rye Whiskey", "London Dry Gin"
  abv?: number; // Alcohol by volume percentage (e.g. 40, 50)
  defaultFlavorNotes?: string;
  isGeneric?: boolean; // True if it's a category catch-all (e.g. "Rye Whiskey"), false if brand (e.g. "Sazerac Rye")
}

export interface AppSettings {
  lowStockKeywords: string[]; // e.g., ["empty", "low", "10%", "near empty"]
  allergies: string[]; // New field for user allergies
  handedness: 'right' | 'left'; // UI preference for one-handed use
}
