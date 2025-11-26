
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

export interface Nutrition {
  calories: number;
  carbs: number; // in grams
  abv?: number; // Final Alcohol by Volume percentage
}

export interface Cocktail {
  id: string;
  name: string;
  category?: string; // New field for AI classification (e.g. "Ancestrals", "Tiki")
  description: string;
  ingredients: string[];
  instructions: string[]; 
  flavorProfile: FlavorProfile;
  nutrition?: Nutrition; // New field for AI Nutritionist estimates
  imageUrl?: string;
  source?: 'Manual' | 'Social' | 'Scan' | 'Order';
  originalLink?: string; 
  externalLinks?: string[]; 
  creator?: string;
  creatorType?: 'Person' | 'Establishment' | 'Online'; 
  dateAdded: string;
  rating?: number; 
  matchScore?: number; 
}

export interface Recommendation {
  name: string;
  description: string;
  matchScore: number; 
  ingredientsToUse: string[];
  missingIngredients: string[];
  instructions: string[]; 
  flavorProfile: FlavorProfile;
  nutrition?: Nutrition;
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'Spirit' | 'Mixer' | 'Garnish' | 'Other';
  volume?: string; 
  flavorNotes?: string; 
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
  subCategory?: string; 
  abv?: number; 
  defaultFlavorNotes?: string;
  isGeneric?: boolean;
  nutritionEstimate?: {
    caloriesPerOz: number;
    carbsPerOz: number;
  };
}

export interface AppSettings {
  lowStockKeywords: string[]; 
  allergies: string[]; 
  handedness: 'right' | 'left'; 
}