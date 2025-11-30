
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Beaker, ChefHat, BarChart3, Trash2, Sparkles, Loader2, Wine, BookOpen, ExternalLink, User, ChevronDown, ChevronUp, Layers, Star, Disc, Plus, ImageIcon, Pencil, Check, Camera, ScanLine, Beer, Calendar, MapPin, HelpCircle, ShieldCheck, Zap, XCircle, MessageCircle, Store, Globe, Search, X, ShoppingCart, Minus, Archive, Settings, AlertTriangle, CheckCircle2, ShoppingBag, History, Info, Edit3, ListOrdered, Activity, Droplets, GlassWater, LogIn, LogOut, FlaskConical } from 'lucide-react';
import { useAuth } from './client/src/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import FlavorRadar from './components/RadarChart';
import IngredientScanner from './components/IngredientScanner';
import RecipeImporter from './components/RecipeImporter';
import RecipeDetail from './components/RecipeDetail';
import FlavorWheel from './components/FlavorWheel';
import SettingsModal from './components/SettingsModal';
import ShoppingListAddModal from './components/ShoppingListAddModal';
import HowItWorksModal from './components/HowItWorksModal';
import AuthModal from './components/AuthModal';
import DrinkFamilyTree from './components/DrinkFamilyTree';
import CocktailLab from './components/CocktailLab';
import SharedRecipePage from './components/SharedRecipePage';
import { Cocktail, Ingredient, FlavorProfile, FlavorDimension, Recommendation, ShoppingListItem, MasterIngredient, AppSettings, Nutrition } from './types';
import { getRecommendations, generateCocktailImage, enrichIngredientDetails, recommendFromMenu, getBarOrderSuggestion, deduceRecipe } from './services/geminiService';
import { INITIAL_MASTER_DATA, INITIAL_RECIPES_DATA } from './initialData';

// Default empty profile for fallback
const INITIAL_PROFILE: FlavorProfile = {
  Sweet: 0, Fruity: 0, Floral: 0, Herbal: 0, Spicy: 0, Earthy: 0, Sour: 0, Boozy: 0
};

const INITIAL_SETTINGS: AppSettings = {
    lowStockKeywords: ['empty', 'low', '10%', 'near empty', 'almost gone', 'running low'],
    allergies: [],
    handedness: 'right'
};

// DIY Ingredients Database - recipes for homemade bar ingredients
interface DiyRecipe {
  id: string;
  name: string;
  category: 'Syrup' | 'Infusion' | 'Shrub' | 'Bitters' | 'Cordial' | 'Other';
  description: string;
  baseYield: number; // oz
  baseIngredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
  shelfLife: string;
  tips?: string;
  usedIn?: string[];
}

const DIY_RECIPES: DiyRecipe[] = [
  {
    id: 'simple-syrup',
    name: 'Simple Syrup',
    category: 'Syrup',
    description: 'The foundation of most cocktails. A 1:1 ratio of sugar to water.',
    baseYield: 16,
    baseIngredients: [
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Combine sugar and water in a saucepan.',
      'Heat over medium, stirring until sugar dissolves.',
      'Remove from heat and let cool completely.',
      'Transfer to a clean bottle.'
    ],
    shelfLife: '2-4 weeks refrigerated',
    tips: 'Add 1 oz vodka to extend shelf life.',
    usedIn: ['Daiquiri', 'Mojito', 'Tom Collins', 'Whiskey Sour']
  },
  {
    id: 'rich-simple-syrup',
    name: 'Rich Simple Syrup',
    category: 'Syrup',
    description: 'A 2:1 sugar to water ratio for a thicker, sweeter syrup.',
    baseYield: 12,
    baseIngredients: [
      { name: 'White Sugar', amount: 2, unit: 'cups' },
      { name: 'Water', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Combine sugar and water in a saucepan.',
      'Heat over medium-low, stirring constantly.',
      'Do not let it boil - remove once fully dissolved.',
      'Cool and bottle.'
    ],
    shelfLife: '4-6 weeks refrigerated',
    tips: 'Preferred for stirred drinks - adds body without dilution.'
  },
  {
    id: 'demerara-syrup',
    name: 'Demerara Syrup',
    category: 'Syrup',
    description: 'Made with raw demerara sugar for caramel and molasses notes.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Demerara Sugar', amount: 2, unit: 'cups' },
      { name: 'Water', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Combine demerara sugar and water in a saucepan.',
      'Heat over medium-low, stirring until dissolved.',
      'The sugar takes longer to dissolve than white sugar.',
      'Cool completely before bottling.'
    ],
    shelfLife: '4-6 weeks refrigerated',
    tips: 'Essential for proper Old Fashioneds and Tiki drinks.',
    usedIn: ['Old Fashioned', 'Jungle Bird', 'Zombie']
  },
  {
    id: 'honey-syrup',
    name: 'Honey Syrup',
    category: 'Syrup',
    description: 'Diluted honey for easier mixing in cold cocktails.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Honey', amount: 1, unit: 'cup' },
      { name: 'Hot Water', amount: 0.5, unit: 'cup' }
    ],
    instructions: [
      'Heat water until very hot but not boiling.',
      'Add honey and stir until fully combined.',
      'Let cool and bottle.',
      'Shake before each use as it may separate.'
    ],
    shelfLife: '2-3 weeks refrigerated',
    tips: 'Use quality local honey for best flavor.',
    usedIn: ['Bees Knees', 'Gold Rush', 'Penicillin']
  },
  {
    id: 'honey-ginger-syrup',
    name: 'Honey-Ginger Syrup',
    category: 'Syrup',
    description: 'Spicy ginger combined with honey - essential for the Penicillin.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Fresh Ginger', amount: 4, unit: 'oz' },
      { name: 'Honey', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 0.5, unit: 'cup' }
    ],
    instructions: [
      'Peel and roughly chop the ginger.',
      'Blend ginger with water until smooth.',
      'Strain through fine mesh, pressing to extract juice.',
      'Combine ginger juice with honey, stir until mixed.',
      'Bottle and refrigerate.'
    ],
    shelfLife: '2 weeks refrigerated',
    tips: 'More ginger = more heat. Adjust to taste.',
    usedIn: ['Penicillin', 'Gold Rush variation']
  },
  {
    id: 'cinnamon-syrup',
    name: 'Cinnamon Syrup',
    category: 'Syrup',
    description: 'Warm spiced syrup perfect for tiki and fall cocktails.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Cinnamon Sticks', amount: 6, unit: 'sticks' },
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Break cinnamon sticks into pieces.',
      'Toast in dry pan for 1-2 minutes until fragrant.',
      'Add water and sugar, bring to simmer.',
      'Remove from heat, let steep 2 hours.',
      'Strain and bottle.'
    ],
    shelfLife: '3-4 weeks refrigerated',
    tips: 'Use Ceylon cinnamon for a more delicate flavor.',
    usedIn: ['Zombie', 'Jet Pilot', 'Hot Toddy']
  },
  {
    id: 'grenadine',
    name: 'Grenadine',
    category: 'Syrup',
    description: 'Real pomegranate syrup - nothing like the artificial stuff.',
    baseYield: 16,
    baseIngredients: [
      { name: 'Pomegranate Juice', amount: 2, unit: 'cups' },
      { name: 'White Sugar', amount: 2, unit: 'cups' },
      { name: 'Pomegranate Molasses', amount: 1, unit: 'tbsp' },
      { name: 'Orange Flower Water', amount: 0.5, unit: 'tsp' }
    ],
    instructions: [
      'Combine pomegranate juice and sugar in a saucepan.',
      'Heat over low, stirring until sugar dissolves.',
      'Do not boil - this preserves the fresh flavor.',
      'Remove from heat, stir in molasses and orange flower water.',
      'Cool and bottle.'
    ],
    shelfLife: '4-6 weeks refrigerated',
    tips: 'Use 100% pomegranate juice, not from concentrate.',
    usedIn: ['Jack Rose', 'Ward Eight', 'Zombie', 'Tequila Sunrise']
  },
  {
    id: 'orgeat',
    name: 'Orgeat',
    category: 'Syrup',
    description: 'Almond syrup with orange flower water - essential for tiki.',
    baseYield: 16,
    baseIngredients: [
      { name: 'Raw Almonds', amount: 2, unit: 'cups' },
      { name: 'White Sugar', amount: 1.5, unit: 'cups' },
      { name: 'Water', amount: 2, unit: 'cups' },
      { name: 'Orange Flower Water', amount: 1, unit: 'tsp' },
      { name: 'Brandy or Cognac', amount: 1, unit: 'oz' }
    ],
    instructions: [
      'Toast almonds lightly in a dry pan.',
      'Blend almonds with water until smooth.',
      'Let steep for 3-4 hours or overnight.',
      'Strain through cheesecloth, squeezing well.',
      'Add sugar to almond milk, heat until dissolved.',
      'Cool, add orange flower water and brandy.',
      'Bottle and refrigerate.'
    ],
    shelfLife: '2-3 weeks refrigerated',
    tips: 'Adding the brandy extends shelf life and adds depth.',
    usedIn: ['Mai Tai', 'Japanese Cocktail', 'Army & Navy', 'Trinidad Sour']
  },
  {
    id: 'passion-fruit-syrup',
    name: 'Passion Fruit Syrup',
    category: 'Syrup',
    description: 'Tropical syrup essential for tiki and modern sours.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Passion Fruit Puree', amount: 1, unit: 'cup' },
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 0.5, unit: 'cup' }
    ],
    instructions: [
      'Combine water and sugar, heat until dissolved.',
      'Remove from heat and let cool to room temperature.',
      'Stir in passion fruit puree until well combined.',
      'Strain if desired for smoother texture.',
      'Bottle and refrigerate.'
    ],
    shelfLife: '2 weeks refrigerated',
    tips: 'Frozen passion fruit puree works perfectly.',
    usedIn: ['Hurricane', 'Porn Star Martini', 'Passion Fruit Sour']
  },
  {
    id: 'raspberry-syrup',
    name: 'Raspberry Syrup',
    category: 'Syrup',
    description: 'Fresh berry syrup for Clover Club and berry cocktails.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Fresh Raspberries', amount: 2, unit: 'cups' },
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 0.5, unit: 'cup' }
    ],
    instructions: [
      'Muddle raspberries in a bowl.',
      'Add sugar, stir well, cover and refrigerate overnight.',
      'Add water and strain through fine mesh.',
      'Press berries to extract all liquid.',
      'Bottle and refrigerate.'
    ],
    shelfLife: '1-2 weeks refrigerated',
    tips: 'The overnight maceration extracts more flavor.',
    usedIn: ['Clover Club', 'Raspberry Collins', 'Bramble']
  },
  {
    id: 'ginger-syrup',
    name: 'Ginger Syrup',
    category: 'Syrup',
    description: 'Spicy ginger syrup for Moscow Mules and modern cocktails.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Fresh Ginger', amount: 6, unit: 'oz' },
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Peel and slice ginger thinly.',
      'Combine with water and sugar in a saucepan.',
      'Bring to a boil, then reduce to simmer for 30 minutes.',
      'Remove from heat, let cool in the liquid.',
      'Strain and bottle.'
    ],
    shelfLife: '3-4 weeks refrigerated',
    tips: 'Leave skin on for more intensity.',
    usedIn: ['Homemade Ginger Beer', 'Dark n Stormy', 'Penicillin variation']
  },
  {
    id: 'falernum',
    name: 'Falernum',
    category: 'Cordial',
    description: 'Caribbean spiced syrup with lime, almond, and clove.',
    baseYield: 16,
    baseIngredients: [
      { name: 'White Rum', amount: 8, unit: 'oz' },
      { name: 'Lime Zest', amount: 6, unit: 'limes' },
      { name: 'Blanched Almonds', amount: 0.5, unit: 'cup' },
      { name: 'Whole Cloves', amount: 15, unit: 'cloves' },
      { name: 'Fresh Ginger', amount: 1, unit: 'oz' },
      { name: 'White Sugar', amount: 1.5, unit: 'cups' },
      { name: 'Water', amount: 1, unit: 'cup' },
      { name: 'Almond Extract', amount: 0.25, unit: 'tsp' }
    ],
    instructions: [
      'Toast almonds lightly, then crush.',
      'Combine rum, lime zest, almonds, cloves, and sliced ginger.',
      'Let infuse 24 hours at room temperature.',
      'Make syrup: heat water and sugar until dissolved.',
      'Strain rum mixture, combine with cooled syrup.',
      'Add almond extract, bottle.',
      'Let rest 1 week before using.'
    ],
    shelfLife: '6+ months refrigerated',
    tips: 'The resting period mellows the flavors significantly.',
    usedIn: ['Corn n Oil', 'Saturn', 'Royal Bermuda Yacht Club']
  },
  {
    id: 'hibiscus-syrup',
    name: 'Hibiscus Syrup',
    category: 'Syrup',
    description: 'Floral, tart syrup with a stunning magenta color.',
    baseYield: 12,
    baseIngredients: [
      { name: 'Dried Hibiscus Flowers', amount: 0.5, unit: 'cup' },
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Water', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Bring water to a boil.',
      'Add hibiscus flowers, remove from heat.',
      'Steep for 20 minutes.',
      'Strain, add sugar while still warm.',
      'Stir until dissolved, cool and bottle.'
    ],
    shelfLife: '3-4 weeks refrigerated',
    tips: 'The longer you steep, the more tart it becomes.',
    usedIn: ['Hibiscus Margarita', 'Floradora']
  },
  {
    id: 'oleo-saccharum',
    name: 'Oleo Saccharum',
    category: 'Syrup',
    description: 'Citrus oil-sugar extraction for punch and complex citrus notes.',
    baseYield: 8,
    baseIngredients: [
      { name: 'Lemon Peels', amount: 6, unit: 'lemons' },
      { name: 'White Sugar', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Peel lemons using a vegetable peeler (no pith).',
      'Combine peels and sugar in a bowl, muddle gently.',
      'Cover and let sit 2-4 hours, or overnight.',
      'The sugar will become a fragrant, oily syrup.',
      'Add 2oz warm water to dissolve remaining sugar.',
      'Strain out peels.'
    ],
    shelfLife: '1-2 weeks refrigerated',
    tips: 'Essential for authentic punch recipes.',
    usedIn: ['Classic Punch', 'Philadelphia Fish House Punch']
  },
  {
    id: 'shrub-raspberry',
    name: 'Raspberry Shrub',
    category: 'Shrub',
    description: 'Vinegar-based drinking syrup for complex, tangy cocktails.',
    baseYield: 16,
    baseIngredients: [
      { name: 'Fresh Raspberries', amount: 2, unit: 'cups' },
      { name: 'White Sugar', amount: 1, unit: 'cup' },
      { name: 'Apple Cider Vinegar', amount: 1, unit: 'cup' }
    ],
    instructions: [
      'Muddle raspberries with sugar in a jar.',
      'Cover and refrigerate 1-2 days, stirring occasionally.',
      'Strain through fine mesh, pressing berries.',
      'Add vinegar to the strained juice, stir well.',
      'Bottle and refrigerate. Best after 1 week.'
    ],
    shelfLife: '6+ months refrigerated',
    tips: 'The vinegar acts as a preservative and adds complexity.',
    usedIn: ['Shrub Spritz', 'Shrub Sour']
  }
];

// Helper to parse shelf life string into days
const parseShelfLifeToDays = (shelfLife: string): number => {
  const lower = shelfLife.toLowerCase();
  
  // Extract the first number (take the lower bound for safety)
  const match = lower.match(/(\d+)/);
  if (!match) return 14; // Default 2 weeks
  
  const num = parseInt(match[1]);
  
  if (lower.includes('month')) return num * 30;
  if (lower.includes('week')) return num * 7;
  if (lower.includes('day')) return num;
  
  return 14; // Default
};

// Helper to calculate days remaining until expiration
const getDaysRemaining = (expiresDate: string | undefined): number | null => {
  if (!expiresDate) return null;
  const now = new Date();
  const expires = new Date(expiresDate);
  const diff = expires.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Helper to check if ingredient was made recently (within 3 days)
const isMadeRecently = (createdDate: string | undefined): boolean => {
  if (!createdDate) return false;
  const now = new Date();
  const created = new Date(createdDate);
  const diff = now.getTime() - created.getTime();
  const daysSinceMade = Math.floor(diff / (1000 * 60 * 60 * 24));
  return daysSinceMade <= 3;
};

// --- IMPROVED NUTRITION ESTIMATOR ---
// Uses Master Data for lookup, calculating weighted estimates based on volume.
// NOTE: Now accessible within component scope via MasterData state, but we define helper here for initialization
const estimateNutrition = (ingredients: string[], masterData: MasterIngredient[]): Nutrition => {
    let calories = 0;
    let carbs = 0;
    
    let totalVolume = 0;
    let totalAlcoholVolume = 0;

    // Default factors if no match
    const DEFAULT_SPIRIT = { cal: 65, carb: 0, abv: 40 };
    const DEFAULT_LIQUEUR = { cal: 90, carb: 10, abv: 20 };
    const DEFAULT_SYRUP = { cal: 50, carb: 14, abv: 0 };
    const DEFAULT_JUICE = { cal: 10, carb: 3, abv: 0 };

    ingredients.forEach(ing => {
        const lower = ing.toLowerCase();
        
        // Extract volume (oz) - simplistic regex for "1.5 oz" or "1 oz" or "1/2 oz"
        let volume = 0;
        const decimalMatch = lower.match(/(\d+(?:\.\d+)?)\s*oz/);
        const fractionMatch = lower.match(/(\d+)\/(\d+)\s*oz/);
        
        if (decimalMatch) {
            volume = parseFloat(decimalMatch[1]);
        } else if (fractionMatch) {
            volume = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
        } else if (lower.includes('dash') || lower.includes('rinse') || lower.includes('spray')) {
            volume = 0.05; // negligible
        } else if (lower.includes('spoon') || lower.includes('tsp')) {
            volume = 0.16;
        } else if (lower.includes('cup')) {
            volume = 8;
        } else if (lower.includes('splash')) {
            volume = 0.25;
        }

        if (volume > 0) {
            totalVolume += volume;
            
            // 1. Try to find direct match in master data
            const masterMatch = masterData.find(m => lower.includes(m.name.toLowerCase()));
            
            let itemABV = 0;
            
            // Zero-Proof Detection (Explicit)
            if (lower.includes('na ') || lower.includes('zero proof') || lower.includes('virgin') || lower.includes('non-alcoholic')) {
                 itemABV = 0;
            } else if (masterMatch && masterMatch.nutritionEstimate) {
                calories += volume * masterMatch.nutritionEstimate.caloriesPerOz;
                carbs += volume * masterMatch.nutritionEstimate.carbsPerOz;
                itemABV = masterMatch.abv || 0;
            } else {
                // 2. Fallback Heuristics
                if (lower.includes('syrup') || lower.includes('nectar') || lower.includes('cordial') || lower.includes('grenadine') || lower.includes('orgeat')) {
                    calories += volume * DEFAULT_SYRUP.cal;
                    carbs += volume * DEFAULT_SYRUP.carb;
                    itemABV = DEFAULT_SYRUP.abv;
                } else if (lower.includes('liqueur') || lower.includes('creme') || lower.includes('amaro') || lower.includes('vermouth') || lower.includes('sherry') || lower.includes('port')) {
                    calories += volume * DEFAULT_LIQUEUR.cal;
                    carbs += volume * DEFAULT_LIQUEUR.carb;
                    itemABV = DEFAULT_LIQUEUR.abv;
                } else if (lower.includes('juice') || lower.includes('cider')) {
                    calories += volume * DEFAULT_JUICE.cal;
                    carbs += volume * DEFAULT_JUICE.carb;
                    itemABV = DEFAULT_JUICE.abv;
                } else if (lower.includes('cream') || lower.includes('milk')) {
                    calories += volume * 100; // Heavy cream estimate
                    carbs += volume * 1;
                    itemABV = 0;
                } else if (lower.includes('wine') || lower.includes('champagne') || lower.includes('prosecco')) {
                     calories += volume * 25;
                     carbs += volume * 1;
                     itemABV = 12;
                } else if (lower.includes('beer')) {
                     calories += volume * 12;
                     carbs += volume * 1;
                     itemABV = 5;
                } else if (lower.includes('soda') || lower.includes('water') || lower.includes('tonic') || lower.includes('cola') || lower.includes('ginger')) {
                     // Check for diet? Assume full sugar for safety unless specified
                     if (lower.includes('diet') || lower.includes('soda water') || lower.includes('club soda')) {
                        calories += 0;
                        carbs += 0;
                     } else {
                        calories += volume * 12; // Typical soda
                        carbs += volume * 3;
                     }
                     itemABV = 0;
                } else {
                     // Assume base spirit
                     calories += volume * DEFAULT_SPIRIT.cal;
                     carbs += volume * DEFAULT_SPIRIT.carb;
                     itemABV = DEFAULT_SPIRIT.abv;
                }
            }
            
            // Add to total alcohol
            totalAlcoholVolume += volume * (itemABV / 100);
            
        } else {
            // Handle Items without typical "oz" measurements (usually 0 volume contribution or negligible)
            if (lower.includes('egg white')) {
                calories += 25;
            } else if (lower.includes('egg') && !lower.includes('white')) {
                calories += 70; // Whole egg
            } else if (lower.includes('sugar cube')) {
                calories += 10;
                carbs += 2.5;
            } else if (lower.includes('cherry')) {
                calories += 10;
                carbs += 2;
            } else if (lower.includes('olive')) {
                calories += 5;
            }
        }
    });

    if (calories < 10 && ingredients.length > 0) calories = 0; 
    
    // Calculate Final ABV (Pre-Dilution)
    // Avoid division by zero
    const finalABV = totalVolume > 0 ? (totalAlcoholVolume / totalVolume) * 100 : 0;
    
    return {
        calories: Math.round(calories),
        carbs: Math.round(carbs),
        abv: Math.round(finalABV)
    };
};

// Preloaded Pantry Items
const INITIAL_PANTRY: Ingredient[] = [
  { id: 'teq-01', name: 'Blanco Tequila', category: 'Spirit', volume: '750ml Full', flavorNotes: 'Bright agave, white pepper, and citrus notes with a clean finish.' },
  { id: 'camp-01', name: 'Campari', category: 'Spirit', volume: 'Half Bottle', flavorNotes: 'Intensely bitter, herbal, with notes of orange peel, cherry, and clove.' },
  { id: 'gin-01', name: 'London Dry Gin', category: 'Spirit', volume: 'Nearly Empty', flavorNotes: 'Juniper-forward, dry, with hints of coriander, angelica, and citrus peel.' }
];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400';

const TABS: Array<'palate' | 'recipes' | 'bar' | 'recommend'> = ['palate', 'recipes', 'bar', 'recommend'];

function MainApp() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'palate' | 'recipes' | 'bar' | 'recommend'>('palate');
  const [palateView, setPalateView] = useState<'diagnosis' | 'wheel'>('diagnosis');
  const [formularyView, setFormularyView] = useState<'drinks' | 'creators'>('drinks');
  const [rxView, setRxView] = useState<'recommend' | 'history' | 'lab'>('recommend');
  const [labRecipe, setLabRecipe] = useState<Cocktail | null>(null);
  const [labMode, setLabMode] = useState<'recipe' | 'build' | 'deproof'>('recipe');
  const [barView, setBarView] = useState<'shopping' | 'pantry' | 'makeIt'>('shopping');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [abvFilter, setAbvFilter] = useState<'all' | 'low' | 'zero'>('all');
  const [masterData, setMasterData] = useState<MasterIngredient[]>(INITIAL_MASTER_DATA);

  // Convert database global recipe to Cocktail type
  const convertGlobalRecipeToCocktail = (dbRecipe: any): Cocktail => {
    const flavorProfile = dbRecipe.flavorProfile || INITIAL_PROFILE;
    const nutrition = dbRecipe.nutrition ? {
      calories: dbRecipe.nutrition.calories || 0,
      carbs: dbRecipe.nutrition.sugarGrams || 0,
      abv: dbRecipe.nutrition.abvPercent || 0
    } : estimateNutrition(dbRecipe.ingredients || [], INITIAL_MASTER_DATA);
    
    return {
      id: dbRecipe.slug || dbRecipe.id.toString(),
      name: dbRecipe.name,
      description: dbRecipe.description || '',
      history: dbRecipe.history,
      category: dbRecipe.category,
      ingredients: dbRecipe.ingredients || [],
      instructions: dbRecipe.instructions || [],
      flavorProfile,
      nutrition,
      creator: dbRecipe.creator,
      creatorType: dbRecipe.creatorType,
      dateAdded: dbRecipe.createdAt || new Date().toISOString()
    };
  };

  // Get preloaded recipes from hardcoded data (fallback)
  const getPreloadedRecipesFallback = () => {
    return INITIAL_RECIPES_DATA.map(drink => ({
        ...drink,
        nutrition: drink.nutrition || estimateNutrition(drink.ingredients, INITIAL_MASTER_DATA)
    }));
  };

  // Initialize history with fallback data - will be replaced with database data when loaded
  const [history, setHistory] = useState<Cocktail[]>(() => getPreloadedRecipesFallback());
  
  // Track if global recipes have been loaded from database
  const [globalRecipesLoaded, setGlobalRecipesLoaded] = useState(false);

  // Track if we've loaded user data
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  
  // Track if we've loaded global images
  const [globalImagesLoaded, setGlobalImagesLoaded] = useState(false);

  // Load global recipes from database on mount
  useEffect(() => {
    if (!globalRecipesLoaded) {
      setGlobalRecipesLoaded(true);
      
      Promise.all([
        fetch('/api/global-recipes'),
        fetch('/api/recipe-images')
      ])
        .then(async ([recipesRes, imagesRes]) => {
          const globalRecipes = recipesRes.ok ? await recipesRes.json() : [];
          const globalImages = imagesRes.ok ? await imagesRes.json() : [];
          
          // Create image lookup map
          const imageMap = new Map<string, string>();
          globalImages.forEach((img: any) => imageMap.set(img.recipeName, img.imageUrl));
          
          if (globalRecipes.length > 0) {
            // Convert database recipes to Cocktail type and apply images
            const cocktails = globalRecipes.map((dbRecipe: any) => {
              const cocktail = convertGlobalRecipeToCocktail(dbRecipe);
              const globalImage = imageMap.get(cocktail.name);
              return globalImage ? { ...cocktail, imageUrl: globalImage } : cocktail;
            });
            setHistory(cocktails);
            setGlobalImagesLoaded(true);
          } else {
            // Fallback to hardcoded data if database is empty
            console.log('No global recipes in database, using fallback data');
            const fallback = getPreloadedRecipesFallback();
            const cocktailsWithImages = fallback.map(cocktail => {
              const globalImage = imageMap.get(cocktail.name);
              return globalImage ? { ...cocktail, imageUrl: globalImage } : cocktail;
            });
            setHistory(cocktailsWithImages);
            setGlobalImagesLoaded(true);
          }
        })
        .catch(() => {
          // Fallback to hardcoded data on error
          console.log('Error loading global recipes, using fallback data');
          setHistory(getPreloadedRecipesFallback());
          setGlobalImagesLoaded(true);
        });
    }
  }, [globalRecipesLoaded]);

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !userDataLoaded) {
      setUserDataLoaded(true);
      
      // Load recipes, ratings, and global images together, then merge in single update
      const loadRecipesAndRatings = async () => {
        try {
          const [recipesRes, ratingsRes, globalImagesRes] = await Promise.all([
            fetch('/api/recipes', { credentials: 'include' }),
            fetch('/api/ratings', { credentials: 'include' }),
            fetch('/api/recipe-images')
          ]);
          
          const recipes: any[] = recipesRes.ok ? await recipesRes.json() : [];
          const ratings: any[] = ratingsRes.ok ? await ratingsRes.json() : [];
          const globalImages: { recipeName: string; imageUrl: string }[] = globalImagesRes.ok ? await globalImagesRes.json() : [];
          
          // Create rating lookup map
          const ratingMap = new Map<string, number>();
          ratings.forEach((r: any) => {
            ratingMap.set(r.recipeName, r.rating);
          });
          
          // Create global image lookup map
          const globalImageMap = new Map<string, string>();
          globalImages.forEach(img => globalImageMap.set(img.recipeName, img.imageUrl));
          
          // Build custom recipes with ratings and global images applied
          const customRecipes: Cocktail[] = recipes.map((r: any) => ({
            id: `user-${r.id}`,
            name: r.name,
            description: r.instructions || '',
            ingredients: r.ingredients || [],
            instructions: Array.isArray(r.instructions) ? r.instructions : [r.instructions || ''],
            flavorProfile: r.flavorProfile || {},
            nutrition: r.nutrition ? {
              calories: r.nutrition.calories || 0,
              carbs: r.nutrition.sugarGrams || 0,
              abv: r.nutrition.abvPercent || 0
            } : undefined,
            category: r.category || 'Custom',
            imageUrl: r.imageUrl || globalImageMap.get(r.name),
            isUserCreated: true,
            rating: ratingMap.get(r.name),
            dateAdded: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
          }));
          
          // Apply ratings and global images to preloaded recipes and merge with custom recipes
          // Always prefer global App Storage images over any existing images
          // User recipes take priority - filter out global duplicates
          setHistory(prev => {
            // Create a set of user recipe names (case-insensitive) to check for duplicates
            const userRecipeNames = new Set(
              customRecipes.map(r => r.name.toLowerCase().trim())
            );
            
            // Filter out global recipes that have a user-created duplicate
            const filteredPreloaded = prev.filter(recipe => {
              const normalizedName = recipe.name.toLowerCase().trim();
              return !userRecipeNames.has(normalizedName);
            });
            
            const updatedPreloaded = filteredPreloaded.map(recipe => {
              const rating = ratingMap.get(recipe.name);
              const globalImage = globalImageMap.get(recipe.name);
              return { 
                ...recipe, 
                ...(rating !== undefined && { rating }),
                ...(globalImage && { imageUrl: globalImage })
              };
            });
            return [...customRecipes, ...updatedPreloaded];
          });
        } catch {
          // Silently fail - user will still see preloaded recipes
        }
      };
      
      loadRecipesAndRatings();

      // Load user's shopping list
      fetch('/api/shopping-list', { credentials: 'include' })
        .then(res => res.ok ? res.json() : [])
        .then((items: any[]) => {
          if (items.length > 0) {
            const shoppingItems = items.map((item: any) => ({
              id: `user-${item.id}`,
              name: item.ingredientName,
              category: item.category || 'Other',
              isOwned: item.isOwned || false,
              estimatedVolume: item.estimatedVolume
            }));
            setShoppingList(shoppingItems);
          }
        })
        .catch(() => {});

      // Load user's settings
      fetch('/api/settings', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then((userSettings: any) => {
          if (userSettings && Object.keys(userSettings).length > 0) {
            setSettings(prev => ({
              ...prev,
              ...(userSettings.lowStockKeywords && { lowStockKeywords: userSettings.lowStockKeywords }),
              ...(userSettings.allergies && { allergies: userSettings.allergies }),
              ...(userSettings.handedness && { handedness: userSettings.handedness }),
              ...(userSettings.flavorProfile && { flavorProfile: userSettings.flavorProfile })
            }));
          }
        })
        .catch(() => {});
    } else if (!isAuthenticated && !isAuthLoading && userDataLoaded) {
      // User logged out - reset and reload global recipes from database
      setUserDataLoaded(false);
      setGlobalImagesLoaded(false);
      setGlobalRecipesLoaded(false);
      setShoppingList([]);
      setSettings(INITIAL_SETTINGS);
    }
  }, [isAuthenticated, user, isAuthLoading, userDataLoaded]);
  
  const [pantry, setPantry] = useState<Ingredient[]>(INITIAL_PANTRY);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [toConcoct, setToConcoct] = useState<Set<string>>(new Set()); // Recipe names marked for making
  const [showToConcoctOnly, setShowToConcoctOnly] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editVolumeValue, setEditVolumeValue] = useState('');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  
  // Make It tab state
  const [selectedDiyItem, setSelectedDiyItem] = useState<string | null>(null);
  const [diyOutputVolume, setDiyOutputVolume] = useState<number>(8); // oz
  const [isScanningMenu, setIsScanningMenu] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  
  // Use refs for image tracking to persist across hot reloads and avoid render loops
  // Start fresh - clear any previous failed attempts on app load
  const attemptedRecipesRef = useRef<Set<string>>(new Set());
  const storedImagesRef = useRef<Map<string, string>>(() => {
    // Only load stored images cache (not failed attempts)
    try {
      const saved = localStorage.getItem('storedImages');
      if (saved) return new Map(JSON.parse(saved));
    } catch {}
    return new Map();
  });
  
  // Execute the initializer functions if refs contain functions (first render)
  if (typeof storedImagesRef.current === 'function') {
    storedImagesRef.current = (storedImagesRef.current as unknown as () => Map<string, string>)();
  }
  
  // Clear old tracking data on fresh load to allow retries
  useEffect(() => {
    localStorage.removeItem('attemptedRecipes');
    localStorage.removeItem('rateLimitPauseUntil');
  }, []);
  
  // Rate limit tracking - start fresh (not paused)
  const [rateLimitPaused, setRateLimitPaused] = useState<boolean>(false);
  
  // Helper to save attempt tracking to localStorage
  const saveAttemptedRecipes = () => {
    try {
      localStorage.setItem('attemptedRecipes', JSON.stringify([...attemptedRecipesRef.current]));
    } catch {}
  };
  
  const saveStoredImages = () => {
    try {
      localStorage.setItem('storedImages', JSON.stringify([...storedImagesRef.current.entries()]));
    } catch {}
  };
  
  // Handle rate limit - pause for 30 seconds then retry
  const handleRateLimitHit = () => {
    const pauseDuration = 30 * 1000; // 30 seconds
    const pauseUntil = Date.now() + pauseDuration;
    localStorage.setItem('rateLimitPauseUntil', pauseUntil.toString());
    setRateLimitPaused(true);
    console.log('Rate limit hit - pausing image generation for 30 seconds');
    
    // Auto-resume after 30 seconds
    setTimeout(() => {
      setRateLimitPaused(false);
      localStorage.removeItem('rateLimitPauseUntil');
      console.log('Rate limit pause expired - resuming image generation');
    }, pauseDuration);
  };
  
  // Rate Limiter State for Image Generation
  const [isImageGenCoolingDown, setIsImageGenCoolingDown] = useState(false);
  
  const [barHelpMode, setBarHelpMode] = useState<'selection' | 'result' | null>(null);
  const [barHelpResult, setBarHelpResult] = useState<{ script: string, suggestion: string, reasoning: string } | null>(null);
  const [isGeneratingHelp, setIsGeneratingHelp] = useState(false);

  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [recipeImporterInitialDraft, setRecipeImporterInitialDraft] = useState<Cocktail | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShoppingAddOpen, setIsShoppingAddOpen] = useState(false);
  const [isIngredientScannerOpen, setIsIngredientScannerOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
  const [familyTreeCocktail, setFamilyTreeCocktail] = useState<Cocktail | null>(null);
  const [recentMenuScans, setRecentMenuScans] = useState<Cocktail[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const menuInputRef = useRef<HTMLInputElement>(null);
  const fabPosition = settings.handedness === 'left' ? 'left-4' : 'right-4';

  // Swipe State
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

  // Scroll position refs for each tab (for navigation persistence)
  const palateScrollRef = useRef<HTMLDivElement>(null);
  const recipesScrollRef = useRef<HTMLDivElement>(null);
  const barScrollRef = useRef<HTMLDivElement>(null);
  const recommendScrollRef = useRef<HTMLDivElement>(null);
  
  // Store scroll positions when switching tabs
  const scrollPositionsRef = useRef<Record<string, number>>({
    palate: 0,
    recipes: 0,
    bar: 0,
    recommend: 0
  });
  
  // Save scroll position before switching tabs
  const handleTabChange = (newTab: 'palate' | 'recipes' | 'bar' | 'recommend') => {
    // Save current tab's scroll position
    const scrollRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      palate: palateScrollRef,
      recipes: recipesScrollRef,
      bar: barScrollRef,
      recommend: recommendScrollRef
    };
    const currentRef = scrollRefs[activeTab];
    if (currentRef?.current) {
      scrollPositionsRef.current[activeTab] = currentRef.current.scrollTop;
    }
    setActiveTab(newTab);
  };
  
  // Restore scroll position when switching to a tab
  useEffect(() => {
    const scrollRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      palate: palateScrollRef,
      recipes: recipesScrollRef,
      bar: barScrollRef,
      recommend: recommendScrollRef
    };
    const targetRef = scrollRefs[activeTab];
    if (targetRef?.current) {
      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.scrollTop = scrollPositionsRef.current[activeTab] || 0;
        }
      }, 0);
    }
  }, [activeTab]);

  const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = touchStart.y - touchEnd.y;
      
      // Determine if swipe is more horizontal than vertical
      const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
      const minSwipeDistance = 50; // Threshold in px

      if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
          const isSwipeLeft = distanceX > 0; // Finger moved Left, content moves Left (Go Next)
          const isSwipeRight = distanceX < 0; // Finger moved Right, content moves Right (Go Prev)
          
          // Switch SUB-TABS based on active page
          if (activeTab === 'palate') {
              if (isSwipeLeft && palateView === 'diagnosis') setPalateView('wheel');
              if (isSwipeRight && palateView === 'wheel') setPalateView('diagnosis');
          } else if (activeTab === 'recipes') {
              if (isSwipeLeft && formularyView === 'drinks') setFormularyView('creators');
              if (isSwipeRight && formularyView === 'creators') setFormularyView('drinks');
          } else if (activeTab === 'bar') {
              if (isSwipeLeft && barView === 'shopping') setBarView('pantry');
              if (isSwipeLeft && barView === 'pantry') setBarView('makeIt');
              if (isSwipeRight && barView === 'makeIt') setBarView('pantry');
              if (isSwipeRight && barView === 'pantry') setBarView('shopping');
          } else if (activeTab === 'recommend') {
              if (isSwipeLeft && rxView === 'recommend') setRxView('history');
              if (isSwipeRight && rxView === 'history') setRxView('recommend');
          }
      }
  };

  // Helper to get a unique key for tracking images (recipe name + creator type)
  const getImageCacheKey = (drink: Cocktail): string => {
    const isUserCreated = drink.id.startsWith('user-') || (drink as any).isUserCreated === true;
    // For user-created recipes, include user id if available; otherwise use 'user' prefix
    if (isUserCreated) {
      const creatorId = user?.id || 'user';
      return `${drink.name}::${creatorId}`;
    }
    // Classic recipes share images globally
    return `${drink.name}::classic`;
  };

  // --- THROTTLED IMAGE GENERATION QUEUE ---
  useEffect(() => {
    // Logic: Find one drink that needs an image, process it, then wait 4 seconds.
    // This prevents API overload when 200+ drinks are loaded.
    
    if (rateLimitPaused) return; // Paused due to rate limit
    if (isImageGenCoolingDown) return; // Wait for cool down
    if (generatingImages.size >= 1) return; // Strict Limit: 1 concurrent generation

    // Filter drinks that:
    // 1. Don't have an image
    // 2. Are not currently being generated
    // 3. Haven't already been attempted (by recipe+creator key - persists via ref and localStorage)
    const missingImageDrinks = history.filter(drink => {
      if (drink.imageUrl) return false;
      if (generatingImages.has(drink.id)) return false;
      const cacheKey = getImageCacheKey(drink);
      if (attemptedRecipesRef.current.has(cacheKey)) return false;
      return true;
    });

    if (missingImageDrinks.length > 0) {
      const drinkToVisualize = missingImageDrinks[0];
      
      // Mark as attempted immediately (via ref - persists across renders)
      const cacheKey = getImageCacheKey(drinkToVisualize);
      attemptedRecipesRef.current.add(cacheKey);
      saveAttemptedRecipes(); // Persist to localStorage
      
      // Start Cool Down Timer immediately to prevent other effects from firing
      setIsImageGenCoolingDown(true);
      
      handleGenerateImage(null, drinkToVisualize).finally(() => {
          // Keep cooling down for a few seconds AFTER completion to space out requests
          setTimeout(() => {
              setIsImageGenCoolingDown(false);
          }, 4000); // 4 second delay between generations
      });
    }
  }, [history, generatingImages, isImageGenCoolingDown, rateLimitPaused, user]);

  const enrichPantryItem = async (ingredient: Ingredient) => {
    if (ingredient.flavorNotes) return;
    const masterMatch = masterData.find(m => m.name.toLowerCase() === ingredient.name.toLowerCase());
    if (masterMatch && masterMatch.defaultFlavorNotes) {
         setPantry(prev => prev.map(item => 
             item.id === ingredient.id ? { ...item, flavorNotes: masterMatch.defaultFlavorNotes } : item
         ));
         return;
    }
    try {
       const notes = await enrichIngredientDetails(ingredient.name);
       setPantry(prev => prev.map(item => 
         item.id === ingredient.id ? { ...item, flavorNotes: notes } : item
       ));
    } catch (e) {
       console.error("Failed to enrich", ingredient.name);
    }
  };

  const getMissingIngredients = (ingredients: string[]) => {
      if (!ingredients || pantry.length === 0) return ingredients || [];
      return ingredients.filter(ing => !pantry.some(pItem => ing.toLowerCase().includes(pItem.name.toLowerCase())));
  };
  const getItemsToBuy = (missing: string[]) => {
      return missing.filter(ing => !shoppingList.some(item => item.name.toLowerCase() === ing.toLowerCase()));
  };

  const userPalate = useMemo(() => {
    const ratedDrinks = history.filter(drink => drink.rating !== undefined && drink.rating >= 3);
    if (ratedDrinks.length === 0) return INITIAL_PROFILE;
    const totals = { ...INITIAL_PROFILE };
    let totalWeight = 0;
    ratedDrinks.forEach(drink => {
      if (drink.rating) {
          const weight = (drink.rating === 5 ? 3 : drink.rating === 4 ? 2 : 1);
          totalWeight += weight;
          Object.keys(totals).forEach(key => {
            totals[key as FlavorDimension] += (drink.flavorProfile[key as FlavorDimension] || 0) * weight;
          });
      }
    });
    if (totalWeight === 0) return INITIAL_PROFILE;
    const average = { ...INITIAL_PROFILE };
    Object.keys(average).forEach(key => {
      average[key as FlavorDimension] = Math.round((totals[key as FlavorDimension] / totalWeight) * 10) / 10;
    });
    return average;
  }, [history]);

  const groupedCocktails = useMemo(() => {
    const map: Record<string, { displayName: string, drinks: Cocktail[] }> = {};
    const filteredHistory = history.filter(drink => {
        if (showFavoritesOnly && (drink.rating || 0) < 5) return false;
        if (showToConcoctOnly && !toConcoct.has(drink.name)) return false;
        
        // ABV FILTER LOGIC
        const abv = drink.nutrition?.abv || 0;
        if (abvFilter === 'zero') {
            if (abv > 0.5) return false;
        }
        if (abvFilter === 'low') {
            // Low ABV generally considered < 15% (wine strength or less) but > 0
            if (abv <= 0.5 || abv >= 16) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            drink.name.toLowerCase().includes(q) ||
            (drink.ingredients && drink.ingredients.some(i => i.toLowerCase().includes(q))) ||
            (drink.creator && drink.creator.toLowerCase().includes(q)) ||
            (drink.description && drink.description.toLowerCase().includes(q))
        );
    });
    filteredHistory.forEach(drink => {
      if (formularyView === 'creators') {
           const rawKey = drink.creator && drink.creator.trim() ? drink.creator.trim() : 'Unknown Source';
           if (!map[rawKey]) map[rawKey] = { displayName: rawKey, drinks: [] };
           map[rawKey].drinks.push(drink);
      } else {
           if (drink.source === 'Order') return;
           const family = drink.category || 'Uncategorized';
           if (!map[family]) map[family] = { displayName: family, drinks: [] };
           map[family].drinks.push(drink);
      }
    });
    const sortedKeys = Object.keys(map).sort();
    const finalGroups: Record<string, Cocktail[]> = {};
    sortedKeys.forEach(key => {
        if (map[key]) {
             const { displayName, drinks } = map[key];
             finalGroups[displayName] = drinks;
        }
    });
    return finalGroups;
  }, [history, formularyView, searchQuery, showFavoritesOnly, showToConcoctOnly, toConcoct, abvFilter]);

  const handleAddCocktail = async (cocktail: Cocktail, forceAdd: boolean = false) => {
    if (isAuthenticated) {
      try {
        const url = forceAdd ? '/api/recipes?force=true' : '/api/recipes';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: cocktail.name,
            ingredients: cocktail.ingredients,
            instructions: cocktail.instructions,
            category: cocktail.category,
            imageUrl: cocktail.imageUrl,
            flavorProfile: cocktail.flavorProfile
          })
        });
        
        if (res.ok) {
          const savedRecipe = await res.json();
          const cocktailWithDbId = { ...cocktail, id: `user-${savedRecipe.id}`, isUserCreated: true };
          setHistory(prev => [cocktailWithDbId, ...prev]);
        } else if (res.status === 409) {
          // Duplicate detected
          const duplicateInfo = await res.json();
          const shouldForce = duplicateInfo.canForce && window.confirm(
            `${duplicateInfo.message}\n\nWould you like to add it anyway?`
          );
          
          if (shouldForce) {
            // Retry with force flag
            return handleAddCocktail(cocktail, true);
          } else {
            // Show notification but don't add
            alert(duplicateInfo.message);
          }
        } else {
          // Other error - fallback to local storage
          setHistory(prev => [cocktail, ...prev]);
        }
      } catch {
        setHistory(prev => [cocktail, ...prev]);
      }
    } else {
      // Guest mode - add locally (no duplicate check for guests)
      setHistory(prev => [cocktail, ...prev]);
    }
  };
  
  const handleDeleteCocktail = (e: React.MouseEvent | null, id: string) => {
    e?.stopPropagation();
    setHistory(prev => prev.filter(c => c.id !== id));
    
    if (isAuthenticated && id.startsWith('user-')) {
      const dbId = id.replace('user-', '');
      fetch(`/api/recipes/${dbId}`, {
        method: 'DELETE',
        credentials: 'include'
      }).catch(() => {});
    }
  };
  
  const handleRateCocktail = (e: React.MouseEvent | null, id: string, rating: number) => {
      e?.stopPropagation();
      setHistory(prev => prev.map(c => c.id === id ? { ...c, rating } : c));
      if (selectedCocktail?.id === id) { setSelectedCocktail(prev => prev ? ({ ...prev, rating }) : null); }
      
      if (isAuthenticated) {
        const cocktail = history.find(c => c.id === id);
        if (cocktail) {
          fetch('/api/ratings/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              recipeName: cocktail.name,
              rating: rating
            })
          }).catch(() => {});
        }
      }
  };

  const handleOrderPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, drink: Cocktail) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const inputElement = e.target;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const originalImageUrl = drink.imageUrl;
      
      setHistory(prev => prev.map(c => c.id === drink.id ? { ...c, imageUrl: base64 } : c));
      
      if (isAuthenticated) {
        try {
          const imageData = base64.split(',')[1];
          const creatorId = user?.id || undefined;
          
          const imageResponse = await fetch('/api/recipe-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              recipeName: drink.name,
              imageData: imageData,
              creatorId: creatorId
            })
          });
          
          if (imageResponse.ok) {
            const { imageUrl } = await imageResponse.json();
            
            if (drink.id.startsWith('user-')) {
              const dbId = drink.id.replace('user-', '');
              const updateResponse = await fetch(`/api/recipes/${dbId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ imageUrl })
              });
              
              if (updateResponse.ok) {
                setHistory(prev => prev.map(c => c.id === drink.id ? { ...c, imageUrl } : c));
              } else {
                setHistory(prev => prev.map(c => c.id === drink.id ? { ...c, imageUrl: originalImageUrl } : c));
              }
            } else {
              setHistory(prev => prev.map(c => c.id === drink.id ? { ...c, imageUrl } : c));
            }
          } else {
            setHistory(prev => prev.map(c => c.id === drink.id ? { ...c, imageUrl: originalImageUrl } : c));
          }
        } catch (error) {
          console.error('Failed to upload order photo:', error);
          setHistory(prev => prev.map(c => c.id === drink.id ? { ...c, imageUrl: originalImageUrl } : c));
        }
      }
      
      inputElement.value = '';
    };
    reader.readAsDataURL(file);
  };
  
  const handleSendToLab = (e: React.MouseEvent, drink: Cocktail) => {
    e.stopPropagation();
    setLabRecipe(drink);
    setLabMode('recipe');
    setActiveTab('recommend');
    setRxView('lab');
  };

  const handleSendToDeproof = (e: React.MouseEvent, drink: Cocktail) => {
    e.stopPropagation();
    setLabRecipe(drink);
    setLabMode('deproof');
    setActiveTab('recommend');
    setRxView('lab');
  };

  const handleResetRatings = () => {
    setHistory(prev => prev.map(c => ({ ...c, rating: undefined })));
    
    if (isAuthenticated) {
      fetch('/api/ratings/reset', {
        method: 'DELETE',
        credentials: 'include'
      }).catch(() => {});
    }
  };

  const handleResetToDefaults = () => {
    setShoppingList([]);
    setPantry(INITIAL_PANTRY);
    setSettings(INITIAL_SETTINGS);
    setUserDataLoaded(false);
    setGlobalImagesLoaded(false);
    setGlobalRecipesLoaded(false);
    
    if (isAuthenticated) {
      Promise.all([
        fetch('/api/ratings/reset', { method: 'DELETE', credentials: 'include' }),
        fetch('/api/recipes/reset', { method: 'DELETE', credentials: 'include' }),
        fetch('/api/shopping-list/reset', { method: 'DELETE', credentials: 'include' })
      ]).catch(() => {});
    }
  };
  
  const handleGenerateImage = async (e: React.MouseEvent | null, cocktail: Cocktail) => {
      e?.stopPropagation();
      if (generatingImages.has(cocktail.id)) return;
      
      // Determine if this is a user variation or classic recipe
      const isUserCreatedRecipe = cocktail.id.startsWith('user-') || (cocktail as any).isUserCreated === true;
      const creatorId = isUserCreatedRecipe && user?.id ? user.id : null;
      const cacheKey = creatorId ? `${cocktail.name}::${creatorId}` : `${cocktail.name}::classic`;
      
      // Check if we already have a cached image for this recipe+creator (via ref)
      const cachedImage = storedImagesRef.current.get(cacheKey);
      if (cachedImage) {
        console.log(`Using cached image for "${cocktail.name}" (${creatorId ? 'variation' : 'classic'})`);
        // Only update cocktails with matching creator type
        setHistory(prev => prev.map(c => {
          if (c.imageUrl) return c;
          const cIsUserCreated = c.id.startsWith('user-') || (c as any).isUserCreated === true;
          if (c.name === cocktail.name && cIsUserCreated === isUserCreatedRecipe) {
            return { ...c, imageUrl: cachedImage };
          }
          return c;
        }));
        return;
      }
      
      setGeneratingImages(prev => new Set(prev).add(cocktail.id));
      
      try {
          // Build check URL with optional creatorId for user variations
          let checkUrl = `/api/recipe-images/${encodeURIComponent(cocktail.name)}`;
          if (creatorId) {
            checkUrl += `?creatorId=${encodeURIComponent(creatorId)}`;
          }
          
          const checkResponse = await fetch(checkUrl);
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (checkResult.exists && checkResult.imageUrl) {
              // Use the existing image - cache in ref with proper key and save to localStorage
              console.log(`Using existing ${checkResult.creatorId ? 'variation' : 'classic'} image for "${cocktail.name}"`);
              storedImagesRef.current.set(cacheKey, checkResult.imageUrl);
              saveStoredImages();
              // Only update matching cocktails (same name and same creator type)
              setHistory(prev => prev.map(c => {
                const cIsUserCreated = c.id.startsWith('user-') || (c as any).isUserCreated === true;
                if (c.name === cocktail.name && cIsUserCreated === isUserCreatedRecipe) {
                  return { ...c, imageUrl: checkResult.imageUrl };
                }
                return c;
              }));
              return;
            }
          }
          
          // No existing image found - generate a new one
          console.log(`Generating new ${creatorId ? 'variation' : 'classic'} image for "${cocktail.name}"`);
          try {
            const imageData = await generateCocktailImage(cocktail.name, cocktail.description, cocktail.ingredients);
            if (imageData) {
                // Upload to Object Storage with optional creatorId for variations
                const response = await fetch('/api/recipe-images', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    recipeName: cocktail.name,
                    imageData: imageData,
                    creatorId: creatorId
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  const imageUrl = result.imageUrl;
                  // Cache with proper key and save to localStorage
                  storedImagesRef.current.set(cacheKey, imageUrl);
                  saveStoredImages();
                  setHistory(prev => prev.map(c => {
                    const cIsUserCreated = c.id.startsWith('user-') || (c as any).isUserCreated === true;
                    if (c.name === cocktail.name && cIsUserCreated === isUserCreatedRecipe) {
                      return { ...c, imageUrl };
                    }
                    return c;
                  }));
                } else {
                  console.warn(`Failed to upload image for "${cocktail.name}"`);
                }
            } else {
               console.warn(`Image generation failed for "${cocktail.name}" (likely rate limited)`);
            }
          } catch (genError: any) {
            // Check for rate limit error
            if (genError?.status === 429 || genError?.name === 'ApiError' && genError?.status === 429) {
              console.warn(`Rate limit hit for "${cocktail.name}" - pausing all image generation`);
              handleRateLimitHit();
            } else {
              console.error("Error generating image:", genError);
            }
          }
      } catch (e) {
          console.error("Error generating image for", cocktail.name, e);
      } finally {
          setGeneratingImages(prev => {
              const next = new Set(prev);
              next.delete(cocktail.id);
              return next;
          });
      }
  };
  
  const handleAddReferenceLink = (id: string, url: string) => {
      if (!url.trim()) return;
      setHistory(prev => prev.map(c => {
          if (c.id !== id) return c;
          const currentLinks = c.externalLinks || [];
          return { ...c, externalLinks: [...currentLinks, url.trim()] };
      }));
      if (selectedCocktail?.id === id) {
          setSelectedCocktail(prev => prev ? ({ 
              ...prev, 
              externalLinks: [...(prev.externalLinks || []), url.trim()] 
          }) : null);
      }
  };

  const handleViewRecipe = async (orderCocktail: Cocktail) => {
    const existingRecipe = history.find(c => c.source !== 'Order' && c.name.toLowerCase() === orderCocktail.name.toLowerCase());
    if (existingRecipe) { setSelectedCocktail(existingRecipe); return; }
    alert("Deducing recipe via AI Bartender...");
    try {
        const deducedData = await deduceRecipe(orderCocktail.name, orderCocktail.ingredients);
        const tempRecipe: Cocktail = {
            ...orderCocktail,
            id: `temp-ai-${Date.now()}`,
            source: 'Manual', 
            creator: 'AI Bartender',
            creatorType: 'Person',
            ingredients: deducedData.ingredients, 
            instructions: deducedData.instructions,
            description: deducedData.description || `AI Deduced recipe for ${orderCocktail.name}`,
            category: deducedData.category || 'Uncategorized',
            nutrition: deducedData.nutrition || estimateNutrition(deducedData.ingredients, masterData),
            dateAdded: new Date().toISOString()
        };
        setSelectedCocktail(tempRecipe);
        // Force generation for new view
        handleGenerateImage(null, tempRecipe);
    } catch (e) { alert("Could not generate recipe."); }
  };

  const handleSaveTemporaryCocktail = (cocktail: Cocktail) => {
      const permanentCocktail = { ...cocktail, id: `ai-gen-${Date.now()}` };
      setHistory(prev => [permanentCocktail, ...prev]);
      setSelectedCocktail(permanentCocktail);
  };
  
  const handleSaveRecommendation = (rec: Recommendation) => {
    const draft: Cocktail = {
        id: `draft-${Date.now()}`,
        name: rec.name,
        description: rec.description,
        category: 'Uncategorized', 
        ingredients: [...rec.ingredientsToUse, ...rec.missingIngredients],
        instructions: rec.instructions, 
        flavorProfile: rec.flavorProfile,
        nutrition: rec.nutrition || estimateNutrition([...rec.ingredientsToUse, ...rec.missingIngredients], masterData),
        source: 'Manual',
        creator: 'AI Recommendation',
        creatorType: 'Person',
        dateAdded: new Date().toISOString(),
        rating: 0
    };

    setRecipeImporterInitialDraft(draft);
    setIsImporterOpen(true);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
        const next = new Set(prev);
        if (next.has(groupKey)) { next.delete(groupKey); } else { next.add(groupKey); }
        return next;
    });
  };

  const handleIngredientsFound = (newIngredients: Ingredient[]) => {
    const existingNames = new Set(pantry.map(i => i.name.toLowerCase()));
    const uniqueNew = newIngredients.filter(i => !existingNames.has(i.name.toLowerCase()));
    if (uniqueNew.length === 0) return;
    uniqueNew.forEach(ing => enrichPantryItem(ing));
    setPantry(prev => [...prev, ...uniqueNew]);
  };

  const removeIngredient = (id: string) => { setPantry(prev => prev.filter(i => i.id !== id)); };
  const startEditingVolume = (item: Ingredient) => { setEditingIngredientId(item.id); setEditVolumeValue(item.volume || ''); };
  const saveEditingVolume = (id: string) => { setPantry(prev => prev.map(i => i.id === id ? { ...i, volume: editVolumeValue } : i)); setEditingIngredientId(null); };

  const handleAddToShoppingList = (ingredients: string[], recipeName?: string) => {
      setShoppingList(prev => {
          const currentNames = new Set(prev.map(i => i.name.toLowerCase()));
          const newItems = ingredients
              .filter(name => !currentNames.has(name.toLowerCase()))
              .map(name => ({ id: `shop-${Math.random().toString(36).substr(2, 9)}`, name: name, isChecked: false }));
          return [...prev, ...newItems];
      });
      // Mark recipe as "to concoct" if a recipe name is provided
      if (recipeName) {
          setToConcoct(prev => new Set([...prev, recipeName]));
      }
  };
  
  const removeFromToConcoct = (recipeName: string) => {
      setToConcoct(prev => {
          const next = new Set(prev);
          next.delete(recipeName);
          return next;
      });
  };
  const toggleShoppingItem = (id: string) => { setShoppingList(prev => prev.map(item => item.id === id ? { ...item, isChecked: !item.isChecked } : item)); };
  const removeShoppingItem = (id: string) => { setShoppingList(prev => prev.filter(i => i.id !== id)); };
  const clearShoppingList = () => { setShoppingList(prev => prev.filter(i => !i.isChecked)); };
  
  const handleMoveToPantry = (item: ShoppingListItem) => {
      setShoppingList(prev => prev.filter(i => i.id !== item.id));
      setPantry(prev => {
          if (prev.some(p => p.name.toLowerCase() === item.name.toLowerCase())) {
              return prev.map(p => p.name.toLowerCase() === item.name.toLowerCase() ? { ...p, volume: 'Refilled (Full)' } : p);
          }
          const masterMatch = masterData.find(m => m.name.toLowerCase() === item.name.toLowerCase());
          const newIngredient: Ingredient = {
              id: `manual-${Date.now()}`,
              name: item.name,
              category: masterMatch ? masterMatch.category : 'Other',
              volume: 'Full',
              flavorNotes: masterMatch?.defaultFlavorNotes 
          };
          if (!newIngredient.flavorNotes) {
             enrichPantryItem(newIngredient);
          }
          return [newIngredient, ...prev];
      });
  };

  const handleAddMasterItem = (item: MasterIngredient) => { setMasterData(prev => [...prev, item]); };
  const handleRemoveMasterItem = (id: string) => { setMasterData(prev => prev.filter(i => i.id !== id)); };
  
  const handleUpdateMasterItem = (updatedItem: MasterIngredient) => {
    setMasterData(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  // Handle "I Made This" for DIY ingredients
  const handleMakeDiyIngredient = (recipe: DiyRecipe, volumeOz: number) => {
    const now = new Date();
    const shelfLifeDays = parseShelfLifeToDays(recipe.shelfLife);
    const expiresDate = new Date(now.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
    
    const newIngredient: Ingredient = {
      id: `diy-${recipe.id}-${Date.now()}`,
      name: recipe.name,
      category: 'Mixer',
      volume: `${volumeOz}oz (Homemade)`,
      flavorNotes: recipe.description,
      isDiy: true,
      diyRecipeId: recipe.id,
      createdDate: now.toISOString(),
      expiresDate: expiresDate.toISOString()
    };
    
    // Check if already in pantry and update, or add new
    setPantry(prev => {
      const existingIdx = prev.findIndex(p => 
        p.name.toLowerCase() === recipe.name.toLowerCase() || 
        p.diyRecipeId === recipe.id
      );
      
      if (existingIdx >= 0) {
        // Update existing - refresh dates and add volume
        const existing = prev[existingIdx];
        const updatedPantry = [...prev];
        updatedPantry[existingIdx] = {
          ...existing,
          volume: `${volumeOz}oz (Fresh batch)`,
          createdDate: now.toISOString(),
          expiresDate: expiresDate.toISOString()
        };
        return updatedPantry;
      }
      
      return [newIngredient, ...prev];
    });
  };

  // Memoized DIY status map - computes status for all DIY recipes once per pantry change
  const diyStatusMap = React.useMemo(() => {
    const map: Record<string, {
      inPantry: boolean;
      item: Ingredient | null;
      daysRemaining: number | null;
      isRecent: boolean;
      isExpiringSoon: boolean;
      isExpired: boolean;
    }> = {};
    
    for (const recipe of DIY_RECIPES) {
      const pantryItem = pantry.find(p => 
        p.diyRecipeId === recipe.id || 
        p.name.toLowerCase() === recipe.name.toLowerCase()
      );
      
      if (!pantryItem) {
        map[recipe.id] = { inPantry: false, item: null, daysRemaining: null, isRecent: false, isExpiringSoon: false, isExpired: false };
      } else {
        const daysRemaining = getDaysRemaining(pantryItem.expiresDate);
        const isRecent = isMadeRecently(pantryItem.createdDate);
        const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
        const isExpired = daysRemaining !== null && daysRemaining <= 0;
        map[recipe.id] = { inPantry: true, item: pantryItem, daysRemaining, isRecent, isExpiringSoon, isExpired };
      }
    }
    
    return map;
  }, [pantry]);
  
  // Get DIY ingredient status from the memoized map
  const getDiyIngredientStatus = (recipeId: string, recipeName: string) => {
    if (diyStatusMap[recipeId]) {
      return diyStatusMap[recipeId];
    }
    // Fallback for any recipes not in the DIY_RECIPES list
    const pantryItem = pantry.find(p => 
      p.diyRecipeId === recipeId || 
      p.name.toLowerCase() === recipeName.toLowerCase()
    );
    
    if (!pantryItem) {
      return { inPantry: false, item: null, daysRemaining: null, isRecent: false, isExpiringSoon: false, isExpired: false };
    }
    
    const daysRemaining = getDaysRemaining(pantryItem.expiresDate);
    const isRecent = isMadeRecently(pantryItem.createdDate);
    const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    
    return { inPantry: true, item: pantryItem, daysRemaining, isRecent, isExpiringSoon, isExpired };
  };

  const generateRecs = async () => {
    if (pantry.length === 0 && history.length === 0) { alert("Please add some ingredients or log some drinks first!"); return; }
    setIsGeneratingRecs(true);
    try { const recs = await getRecommendations(userPalate, pantry.map(i => i.name)); setRecommendations(recs); } catch (e) { alert("Failed to generate recommendations."); } finally { setIsGeneratingRecs(false); }
  };

  const handleBarHelp = async (mode: 'typical' | 'adventurous') => {
      setIsGeneratingHelp(true);
      try { const result = await getBarOrderSuggestion(userPalate, mode); setBarHelpResult(result); setBarHelpMode('result'); } catch (e) { alert("Couldn't communicate with the bartender assistant."); setBarHelpMode(null); } finally { setIsGeneratingHelp(false); }
  };
  
  const handleLogMenuOrder = (cocktail: Cocktail) => {
    const newOrder: Cocktail = { ...cocktail, id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, source: 'Order', dateAdded: new Date().toISOString(), rating: 0 };
    setHistory(prev => [newOrder, ...prev]);
    setRecentMenuScans(prev => prev.filter(item => item.id !== cocktail.id));
    setRxView('history');
  };

  const handleMenuScan = async (file: File) => {
      if (!file) return;
      setIsScanningMenu(true);
      setIsImporterOpen(false);
      setActiveTab('recommend');
      setRxView('recommend');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
            const cocktails = await recommendFromMenu(base64String, userPalate);
            const menuItems: Cocktail[] = cocktails.map((rec, idx) => ({
                 id: `menu-scan-${Date.now()}-${idx}`,
                 name: rec.name,
                 description: rec.description,
                 ingredients: rec.ingredientsToUse,
                 instructions: rec.instructions,
                 flavorProfile: rec.flavorProfile,
                 source: 'Scan', creator: 'Menu Scan', creatorType: 'Establishment',
                 dateAdded: new Date().toISOString(), rating: 0, imageUrl: undefined, matchScore: rec.matchScore,
                 category: 'Uncategorized',
                 nutrition: rec.nutrition
            }));
            setRecentMenuScans(menuItems);
        } catch(e) { alert("Failed to digitize menu."); } finally { setIsScanningMenu(false); }
      };
      reader.readAsDataURL(file);
  };
  
  return (
    <div 
        className="h-[100dvh] bg-background text-stone-200 font-sans flex flex-col overflow-hidden selection:bg-primary selection:text-white relative touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      <header className="flex-none z-20 bg-background/95 backdrop-blur-md border-b border-stone-700 shadow-sm transition-all duration-300">
        <div className="p-4 max-w-md mx-auto w-full flex items-center justify-between h-9">
          {isSearchOpen ? (
             <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                   <input 
                      type="text"
                      autoFocus
                      placeholder="Search drinks, ingredients, creators..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-600 rounded-full py-1.5 pl-9 pr-4 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-primary"
                   />
                </div>
                <button 
                   onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                   className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>
          ) : (
            <>
               <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-secondary">
                  My Barmassist
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                 {activeTab === 'recipes' && (
                     <>
                        {toConcoct.size > 0 && (
                            <button 
                                onClick={() => setShowToConcoctOnly(!showToConcoctOnly)}
                                className={`p-2 rounded-full transition-colors border relative ${showToConcoctOnly ? 'bg-amber-900/50 text-amber-400 border-amber-700' : 'hover:bg-stone-800 text-stone-400 hover:text-white border-transparent'}`}
                                title="To Concoct"
                            >
                                <Beaker className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-900 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {toConcoct.size}
                                </span>
                            </button>
                        )}
                        <button 
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`p-2 rounded-full transition-colors border border-transparent ${showFavoritesOnly ? 'bg-stone-800 text-secondary' : 'hover:bg-stone-800 text-stone-400 hover:text-white'}`}
                        >
                            <Star className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors border border-transparent hover:border-stone-700"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                     </>
                 )}
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                 >
                    <Settings className="w-5 h-5" />
                 </button>
                 {isAuthLoading ? (
                    <div className="w-8 h-8 rounded-full bg-stone-800 animate-pulse" />
                 ) : isAuthenticated ? (
                    <div className="flex items-center gap-2">
                       {user?.profileImageUrl ? (
                          <img 
                             src={user.profileImageUrl} 
                             alt={user.firstName || 'User'} 
                             className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                          />
                       ) : (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                             {user?.firstName?.[0] || 'U'}
                          </div>
                       )}
                       <button 
                          onClick={() => {
                            window.location.href = '/api/logout';
                          }}
                          className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                          title="Log out"
                       >
                          <LogOut className="w-4 h-4" />
                       </button>
                    </div>
                 ) : (
                    <button 
                       onClick={() => {
                         window.location.href = '/api/login';
                       }}
                       className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-colors"
                    >
                       <LogIn className="w-4 h-4" />
                       <span>Log In</span>
                    </button>
                 )}
              </div>
            </>
          )}
        </div>
        
        {settings.allergies.length > 0 && (
            <div className="bg-red-900/90 backdrop-blur text-white text-[10px] font-bold py-1 px-4 text-center border-t border-red-700 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-3 h-3 text-red-400 fill-red-400/20" />
                <span>ALLERGIES: {settings.allergies.join(', ')}</span>
            </div>
        )}
      </header>

      <RecipeImporter 
        isOpen={isImporterOpen} 
        onClose={() => { setIsImporterOpen(false); setRecipeImporterInitialDraft(null); }} 
        onAddCocktail={handleAddCocktail} 
        onScanMenu={handleMenuScan}
        isScanningMenu={isScanningMenu}
        recentMenuDrafts={recentMenuScans}
        initialDraft={recipeImporterInitialDraft}
      />

      <RecipeDetail 
        cocktail={selectedCocktail}
        onClose={() => setSelectedCocktail(null)}
        pantry={pantry}
        shoppingList={shoppingList}
        onViewRecipe={handleViewRecipe}
        onSave={handleSaveTemporaryCocktail}
        onAddToShoppingList={handleAddToShoppingList}
        onRate={(rating) => selectedCocktail && handleRateCocktail(null, selectedCocktail.id, rating)}
        onDelete={(id) => { handleDeleteCocktail(null, id); setSelectedCocktail(null); }}
        onAddLink={handleAddReferenceLink}
        isToConcoct={selectedCocktail ? toConcoct.has(selectedCocktail.name) : false}
        onRemoveFromToConcoct={removeFromToConcoct}
        onViewFamilyTree={(cocktail) => {
          setSelectedCocktail(null);
          setFamilyTreeCocktail(cocktail);
        }}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        masterData={masterData}
        onAddMasterItem={handleAddMasterItem}
        onRemoveMasterItem={handleRemoveMasterItem}
        onUpdateMasterItem={handleUpdateMasterItem}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetRatings={handleResetRatings}
        onResetToDefaults={handleResetToDefaults}
        onRefreshRecipes={() => {
          // Refresh global recipes from database, preserving user recipes
          fetch('/api/global-recipes')
            .then(res => res.ok ? res.json() : [])
            .then((globalRecipes: any[]) => {
              if (globalRecipes.length > 0) {
                const newGlobalCocktails = globalRecipes.map((dbRecipe: any) => ({
                  id: `global-${dbRecipe.id}`,
                  name: dbRecipe.name,
                  description: dbRecipe.description || '',
                  ingredients: dbRecipe.ingredients || [],
                  instructions: dbRecipe.instructions || [],
                  flavorProfile: dbRecipe.flavorProfile || {},
                  nutrition: dbRecipe.nutrition ? {
                    calories: dbRecipe.nutrition.calories || 0,
                    carbs: dbRecipe.nutrition.sugarGrams || 0,
                    abv: dbRecipe.nutrition.abvPercent || 0
                  } : undefined,
                  category: dbRecipe.category || 'Uncategorized',
                  history: dbRecipe.history,
                  glassType: dbRecipe.glassType,
                  garnish: dbRecipe.garnish,
                  creator: dbRecipe.creator,
                  creatorType: dbRecipe.creatorType
                }));
                
                // Merge: keep user recipes, add new globals, filter duplicates
                setHistory(prev => {
                  // Get all user-created recipes (ids start with 'user-')
                  const userRecipes = prev.filter(r => r.id.startsWith('user-') || r.isUserCreated);
                  
                  // Create set of user recipe names for duplicate filtering
                  const userRecipeNames = new Set(
                    userRecipes.map(r => r.name.toLowerCase().trim())
                  );
                  
                  // Filter out global recipes that duplicate user recipes
                  const filteredGlobals = newGlobalCocktails.filter(
                    r => !userRecipeNames.has(r.name.toLowerCase().trim())
                  );
                  
                  // User recipes first, then filtered globals
                  return [...userRecipes, ...filteredGlobals];
                });
              }
            })
            .catch(() => {});
        }}
      />

      <ShoppingListAddModal 
        isOpen={isShoppingAddOpen}
        onClose={() => setIsShoppingAddOpen(false)}
        pantry={pantry}
        masterData={masterData}
        settings={settings}
        onAddToShoppingList={handleAddToShoppingList}
      />
      
       <IngredientScanner 
          onIngredientsFound={handleIngredientsFound}
          isOpenExternal={isIngredientScannerOpen}
          onCloseExternal={() => setIsIngredientScannerOpen(false)}
       />

       <HowItWorksModal 
          isOpen={isHowItWorksOpen}
          onClose={() => setIsHowItWorksOpen(false)}
       />

       <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })}
       />

       {familyTreeCocktail && (
          <DrinkFamilyTree
            cocktail={familyTreeCocktail}
            allRecipes={history}
            onClose={() => setFamilyTreeCocktail(null)}
            onSelectDrink={(drinkName) => {
              const foundDrink = history.find(d => d.name.toLowerCase() === drinkName.toLowerCase());
              if (foundDrink) {
                setFamilyTreeCocktail(null);
                setSelectedCocktail(foundDrink);
              }
            }}
          />
       )}

       <main className="flex-1 bg-background relative overflow-hidden">
        <div className="max-w-md mx-auto h-full relative">
            <div ref={palateScrollRef} className={`absolute inset-0 p-4 pb-24 flex flex-col gap-4 overflow-y-auto scrollbar-hide transition-opacity duration-300 ${activeTab === 'palate' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
               <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700 flex-none">
                   <button 
                      onClick={() => setPalateView('diagnosis')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${palateView === 'diagnosis' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <BarChart3 className="w-4 h-4" />
                      Profile
                   </button>
                   <button 
                      onClick={() => setPalateView('wheel')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${palateView === 'wheel' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <Disc className="w-4 h-4" />
                      Reference
                   </button>
                </div>
                 <div className="flex-1 min-h-0 bg-surface rounded-2xl p-4 border border-stone-700 shadow-xl flex flex-col">
                    {palateView === 'diagnosis' ? (
                        <>
                            <div className="text-center flex-none">
                                <p className="text-stone-400 text-xs uppercase tracking-widest font-bold">Based on rated order history</p>
                            </div>
                            <div className="flex-1 min-h-0 flex items-center justify-center relative py-2">
                                <FlavorRadar data={userPalate} height="100%" />
                            </div>
                            <div className="flex-none bg-stone-900/50 border border-stone-800 rounded-xl p-3 flex items-start gap-3 mt-2">
                                <Info className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] text-stone-400 leading-tight">
                                        This profile is an AI interpretation based on your rating history. It serves as a <strong>recommendation</strong> for exploration, not a prescription.
                                    </p>
                                    <button 
                                        onClick={() => setIsHowItWorksOpen(true)}
                                        className="text-[10px] text-secondary hover:text-white font-bold underline decoration-dotted underline-offset-2"
                                    >
                                        How this works
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-center flex-none">
                                <p className="text-stone-400 text-xs uppercase tracking-widest font-bold">Flavor Reference Guide</p>
                            </div>
                            <div className="flex-1 min-h-0 flex items-center justify-center relative">
                                <FlavorWheel userProfile={userPalate} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div ref={recipesScrollRef} className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'recipes' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                 <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
                   <button 
                      onClick={() => setFormularyView('drinks')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${formularyView === 'drinks' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <Layers className="w-4 h-4" />
                      Drinks
                   </button>
                   <button 
                      onClick={() => setFormularyView('creators')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${formularyView === 'creators' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <User className="w-4 h-4" />
                      Creators
                   </button>
                </div>

                {/* --- ABV FILTER UI --- */}
                <div className="flex justify-center gap-2">
                    <button 
                        onClick={() => setAbvFilter('all')}
                        className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold uppercase tracking-wide ${abvFilter === 'all' ? 'bg-stone-700 text-white border-stone-500' : 'bg-stone-900 text-stone-500 border-stone-800'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setAbvFilter('low')}
                        className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold uppercase tracking-wide flex items-center gap-1 ${abvFilter === 'low' ? 'bg-amber-900/50 text-amber-200 border-amber-700' : 'bg-stone-900 text-stone-500 border-stone-800'}`}
                    >
                        <Wine className="w-3 h-3" /> Low-ABV
                    </button>
                    <button 
                        onClick={() => setAbvFilter('zero')}
                        className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold uppercase tracking-wide flex items-center gap-1 ${abvFilter === 'zero' ? 'bg-secondary/30 text-secondary border-secondary/50' : 'bg-stone-900 text-stone-500 border-stone-800'}`}
                    >
                        <GlassWater className="w-3 h-3" /> Zero-Proof
                    </button>
                </div>

                {(searchQuery || showFavoritesOnly || showToConcoctOnly) && (
                    <div className="flex items-center justify-center animate-in fade-in slide-in-from-top-2">
                        <span className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-wide flex items-center gap-1 ${showToConcoctOnly ? 'text-amber-400 bg-amber-900/30 border-amber-700' : 'text-primary bg-primary/10 border-primary/20'}`}>
                            {showToConcoctOnly && <Beaker className="w-3 h-3" />}
                            {showFavoritesOnly && <Star className="w-3 h-3 fill-current" />}
                            {showToConcoctOnly ? (showFavoritesOnly || searchQuery ? 'To Concoct + Filter' : 'To Concoct') : (showFavoritesOnly && searchQuery ? 'Favorites + Search' : showFavoritesOnly ? 'Favorites Only' : 'Filtered Results')}
                        </span>
                    </div>
                )}
                
                <div>
                    {Object.keys(groupedCocktails).length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-stone-700 rounded-2xl bg-surface/30">
                            {searchQuery ? (
                                <>
                                    <Search className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                                    <p className="text-stone-400 text-sm font-bold">No matches found</p>
                                    <p className="text-stone-500 text-xs">Try a different search term.</p>
                                </>
                            ) : (
                                <p className="text-stone-500 text-sm">No entries found for this filter.</p>
                            )}
                        </div>
                    ) : (
                         <div className="space-y-3">
                            {Object.entries(groupedCocktails).map(([groupKey, drinks]: [string, Cocktail[]]) => {
                                const isExpanded = (searchQuery ? true : expandedGroups.has(groupKey));
                                const groupType = drinks[0]?.creatorType || 'Person';
                                return (
                                    <div key={groupKey} className={`bg-surface border border-stone-700 rounded-xl overflow-hidden`}>
                                        <button 
                                            onClick={() => toggleGroup(groupKey)}
                                            className="w-full px-4 py-3 bg-surface hover:bg-stone-700 flex items-center justify-center border-b border-stone-700/50 transition-colors relative"
                                        >
                                            <div className="flex items-center gap-2 absolute left-4">
                                                {formularyView === 'creators' && (
                                                    <>
                                                    {groupType === 'Establishment' && <Store className="w-4 h-4 text-secondary" />}
                                                    {groupType === 'Online' && <Globe className="w-4 h-4 text-stone-400" />}
                                                    {groupType === 'Person' && <User className="w-4 h-4 text-primary" />}
                                                    </>
                                                )}
                                                {formularyView === 'drinks' && <Layers className="w-4 h-4 text-stone-400" />}
                                                
                                                <span className="font-bold text-white text-sm truncate max-w-[200px] text-left">{groupKey}</span>
                                                <span className="text-[10px] bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded-full border border-stone-600">{drinks.length}</span>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-500 absolute right-4" /> : <ChevronDown className="w-4 h-4 text-stone-500 absolute right-4" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="p-3 gap-3 bg-background grid grid-cols-1">
                                                {drinks.map(drink => (
                                                    <div 
                                                      key={drink.id} 
                                                      onClick={() => setSelectedCocktail(drink)}
                                                      className="bg-surface rounded-lg border border-stone-700 relative overflow-hidden flex cursor-pointer hover:border-stone-500 transition-colors shadow-sm flex-row h-32"
                                                    >
                                                        <div className="flex-1 p-3 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                        <h4 className="text-sm font-bold text-white leading-tight line-clamp-1">{drink.name}</h4>
                                                                        {toConcoct.has(drink.name) && (
                                                                            <span className="text-[8px] bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded border border-amber-700 whitespace-nowrap flex items-center gap-0.5 flex-shrink-0">
                                                                                <Beaker className="w-2.5 h-2.5" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {drink.nutrition?.abv === 0 && (
                                                                        <span className="text-[8px] bg-green-900/50 text-green-200 px-1 rounded border border-green-800 ml-1 whitespace-nowrap">NA</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-secondary mb-1.5 flex items-center gap-1">
                                                                    {drink.source === 'Order' ? <Beer className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                                    {drink.creator || 'Unknown'}
                                                                    {drink.source === 'Order' && (
                                                                        <span className="text-stone-500 text-[10px] ml-1">
                                                                            • {new Date(drink.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-stone-400 line-clamp-2 italic leading-snug">"{drink.description}"</p>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-700/50">
                                                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <button
                                                                            key={star}
                                                                            onClick={(e) => handleRateCocktail(e, drink.id, star)}
                                                                            className="focus:outline-none p-1.5 active:scale-90 transition-transform"
                                                                        >
                                                                            <Star 
                                                                                className={`w-5 h-5 ${
                                                                                    (drink.rating || 0) >= star 
                                                                                    ? 'fill-secondary text-secondary' 
                                                                                    : 'text-stone-600' 
                                                                                }`} 
                                                                            />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={(e) => handleSendToLab(e, drink)}
                                                                        className="p-1.5 hover:bg-stone-700 rounded-lg transition-colors group"
                                                                        title="Send to Flavor Lab"
                                                                    >
                                                                        <FlaskConical className="w-4 h-4 text-stone-500 group-hover:text-secondary transition-colors" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleSendToDeproof(e, drink)}
                                                                        className="p-1.5 hover:bg-stone-700 rounded-lg transition-colors group"
                                                                        title="De-Proof this cocktail"
                                                                    >
                                                                        <GlassWater className="w-4 h-4 text-stone-500 group-hover:text-secondary transition-colors" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-28 bg-stone-900 relative shrink-0 border-l border-stone-700 group h-full">
                                                            {drink.imageUrl ? (
                                                                <>
                                                                    <img 
                                                                        src={drink.imageUrl} 
                                                                        alt={drink.name} 
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            // Don't clear imageUrl - just show fallback inline to prevent retry loops
                                                                            e.currentTarget.src = FALLBACK_IMAGE;
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-surface/50 to-transparent"></div>
                                                                    {drink.imageUrl?.startsWith('/cocktail-images/') && (
                                                                        <div className="absolute bottom-1 right-1 text-[8px] text-primary/90 font-bold uppercase flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded backdrop-blur-sm">
                                                                            <Sparkles className="w-2 h-2" /> AI Generated
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center flex-col gap-1 bg-stone-800/50">
                                                                    {generatingImages.has(drink.id) ? (
                                                                        <>
                                                                            <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                                                                            <span className="text-[8px] text-stone-500 animate-pulse">Dreaming...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Sparkles className="w-5 h-5 text-stone-600" />
                                                                            <span className="text-[8px] text-stone-600">Pending</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                         </div>
                    )}
                </div>

                <button 
                    onClick={() => setIsImporterOpen(true)}
                    className={`fixed bottom-24 ${fabPosition} z-40 bg-primary text-white p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>
            
            <div ref={barScrollRef} className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'bar' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                  <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
                   <button 
                      onClick={() => setBarView('shopping')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${barView === 'shopping' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Shopping
                   </button>
                   <button 
                      onClick={() => setBarView('pantry')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${barView === 'pantry' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <Wine className="w-3.5 h-3.5" />
                      Pantry
                   </button>
                   <button 
                      onClick={() => setBarView('makeIt')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${barView === 'makeIt' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <Beaker className="w-3.5 h-3.5" />
                      Make It
                   </button>
                </div>
                
                {barView === 'shopping' && (
                    <>
                    <div className="bg-gradient-to-br from-amber-950/40 to-stone-900 rounded-2xl p-4 border border-amber-800/30 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-white">Shopping List</h2>
                            <p className="text-xs text-stone-400">Track ingredients you need to buy</p>
                          </div>
                        </div>
                        <p className="text-sm text-stone-300 leading-relaxed">
                          Add missing ingredients from recipes or manually. Check items off as you shop, then move them to your Pantry.
                        </p>
                    </div>
                    <div className="bg-surface rounded-2xl p-4 border border-stone-700 relative overflow-hidden animate-in fade-in duration-300">
                         <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-secondary" />
                                To Buy
                            </h2>
                            {shoppingList.length > 0 && (
                                <button 
                                    onClick={clearShoppingList}
                                    className="text-xs text-stone-400 hover:text-white underline"
                                >
                                    Clear Checked
                                </button>
                            )}
                        </div>
                        {shoppingList.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-stone-700 rounded-xl bg-stone-900/50">
                                <ShoppingCart className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                                <p className="text-stone-500 text-sm">List is empty.</p>
                                <p className="text-[10px] text-stone-600">Add missing items from recipes.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {shoppingList.map(item => (
                                    <li key={item.id} className="flex items-center gap-3 bg-stone-900 p-3 rounded-lg border border-stone-800 group">
                                        <button 
                                            onClick={() => toggleShoppingItem(item.id)}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.isChecked ? 'bg-secondary border-secondary' : 'border-stone-600 hover:border-stone-400'}`}
                                        >
                                            {item.isChecked && <Check className="w-3.5 h-3.5 text-stone-900" />}
                                        </button>
                                        <span className={`flex-1 text-sm ${item.isChecked ? 'text-stone-500 line-through' : 'text-stone-200'}`}>
                                            {item.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleMoveToPantry(item)}
                                                className="p-1 text-stone-500 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Add to Inventory"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => removeShoppingItem(item.id)}
                                                className="text-stone-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                         <button 
                            onClick={() => setIsShoppingAddOpen(true)}
                            className={`fixed bottom-24 ${fabPosition} z-40 bg-secondary text-stone-900 p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                    </>
                )}

                {barView === 'pantry' && (
                     <div className="space-y-6 animate-in fade-in duration-300">
                         <button 
                            onClick={() => setIsIngredientScannerOpen(true)}
                            className={`fixed bottom-24 ${fabPosition} z-40 bg-secondary text-stone-900 p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                        
                        <div className="bg-gradient-to-br from-amber-950/40 to-stone-900 rounded-2xl p-4 border border-amber-800/30">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
                                <Wine className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h2 className="text-lg font-bold text-white">Your Pantry</h2>
                                <p className="text-xs text-stone-400">Track what's in your bar</p>
                              </div>
                            </div>
                            <p className="text-sm text-stone-300 leading-relaxed">
                              Scan bottles or manually add ingredients. AI estimates volume and identifies flavor profiles to power recommendations.
                            </p>
                        </div>
                        
                        <div className="bg-surface rounded-2xl p-4 border border-stone-700">
                             <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Archive className="w-5 h-5 text-secondary" />
                                Stock
                            </h2>
                            {pantry.length === 0 ? (
                                <div className="text-stone-500 text-center py-12 italic text-sm border border-dashed border-stone-700 rounded-xl bg-stone-900/50">
                                    <Wine className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                                    Cabinet is empty.<br/>Tap + to scan bottles.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Expiring Soon Warning */}
                                    {(() => {
                                        const expiringItems = pantry.filter(item => {
                                            const days = getDaysRemaining(item.expiresDate);
                                            return days !== null && days <= 7 && days > 0;
                                        });
                                        const expiredItems = pantry.filter(item => {
                                            const days = getDaysRemaining(item.expiresDate);
                                            return days !== null && days <= 0;
                                        });
                                        
                                        if (expiredItems.length > 0 || expiringItems.length > 0) {
                                            return (
                                                <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 mb-2">
                                                    {expiredItems.length > 0 && (
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                            <div className="text-xs text-red-300">
                                                                <span className="font-bold">Expired:</span> {expiredItems.map(i => i.name).join(', ')}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {expiringItems.length > 0 && (
                                                        <div className="flex items-start gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                            <div className="text-xs text-amber-300">
                                                                <span className="font-bold">Expiring soon:</span> {expiringItems.map(i => {
                                                                    const days = getDaysRemaining(i.expiresDate);
                                                                    return `${i.name} (${days}d)`;
                                                                }).join(', ')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    
                                    {pantry.map(item => {
                                        const daysRemaining = getDaysRemaining(item.expiresDate);
                                        const isExpired = daysRemaining !== null && daysRemaining <= 0;
                                        const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
                                        const isRecent = isMadeRecently(item.createdDate);
                                        
                                        return (
                                            <div key={item.id} className={`bg-background p-3 rounded-lg border relative group ${isExpired ? 'border-red-900/50' : isExpiringSoon ? 'border-amber-900/50' : 'border-stone-700'}`}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 mr-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                                                {item.isDiy && (
                                                                    <Beaker className="w-3 h-3 text-secondary flex-shrink-0" />
                                                                )}
                                                                {isRecent && (
                                                                    <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">NEW</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded uppercase">{item.category}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {editingIngredientId === item.id ? (
                                                                <div className="flex items-center gap-1 bg-stone-800 rounded p-1">
                                                                    <input 
                                                                        type="text"
                                                                        value={editVolumeValue}
                                                                        onChange={(e) => setEditVolumeValue(e.target.value)}
                                                                        className="bg-stone-900 text-xs text-white px-2 py-1 rounded w-24 outline-none border border-stone-600 focus:border-primary"
                                                                        autoFocus
                                                                    />
                                                                    <button 
                                                                        onClick={() => saveEditingVolume(item.id)}
                                                                        className="text-green-400 hover:bg-stone-700 p-1 rounded"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer hover:text-white transition-colors" onClick={() => startEditingVolume(item)}>
                                                                    <Beaker className="w-3 h-3" />
                                                                    <span className="font-medium">{item.volume || 'Volume Unknown'}</span>
                                                                    <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Expiration Badge */}
                                                            {daysRemaining !== null && (
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-900/50 text-red-400' : isExpiringSoon ? 'bg-amber-900/50 text-amber-400' : 'bg-stone-800 text-stone-500'}`}>
                                                                    {isExpired ? 'Expired' : `${daysRemaining}d left`}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.flavorNotes ? (
                                                            <p className="text-[10px] text-stone-400 italic bg-stone-800/30 p-2 rounded-lg border border-stone-800/50">
                                                                "{item.flavorNotes}"
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] text-stone-600 animate-pulse">Fetching flavor profile...</p>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => removeIngredient(item.id)}
                                                        className="text-stone-600 hover:text-red-400 p-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                     </div>
                )}

                {barView === 'makeIt' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-gradient-to-br from-amber-950/40 to-stone-900 rounded-2xl p-4 border border-amber-800/30">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
                                <Beaker className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h2 className="text-lg font-bold text-white">DIY Bar Ingredients</h2>
                                <p className="text-xs text-stone-400">Make your own syrups and essentials</p>
                              </div>
                            </div>
                            <p className="text-sm text-stone-300 leading-relaxed">
                              Tap any recipe to see ingredients with a scaling calculator. Mark items as made to track freshness and expiration in your Pantry.
                            </p>
                        </div>

                        {/* Selected DIY Recipe Detail */}
                        {selectedDiyItem && (() => {
                            const recipe = DIY_RECIPES.find(r => r.id === selectedDiyItem);
                            if (!recipe) return null;
                            const scaleFactor = diyOutputVolume / recipe.baseYield;
                            const status = getDiyIngredientStatus(recipe.id, recipe.name);
                            
                            return (
                                <div className="bg-surface rounded-2xl border border-secondary/30 overflow-hidden shadow-lg">
                                    <div className="bg-gradient-to-r from-secondary/20 to-primary/10 p-4 border-b border-stone-700">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] bg-secondary/20 text-secondary px-2 py-0.5 rounded uppercase font-bold">{recipe.category}</span>
                                                    {status.inPantry && !status.isExpired && (
                                                        <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> In Stock
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-bold text-white mt-1">{recipe.name}</h3>
                                                <p className="text-xs text-stone-400 mt-1">{recipe.description}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedDiyItem(null)}
                                                className="text-stone-500 hover:text-white p-1"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        
                                        {/* Status Notifications */}
                                        {status.isRecent && (
                                            <div className="mt-3 bg-green-900/30 border border-green-800/50 rounded-lg p-2 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-green-400" />
                                                <span className="text-xs text-green-300">Fresh batch made recently! {status.daysRemaining} days until expiration.</span>
                                            </div>
                                        )}
                                        {status.isExpiringSoon && !status.isRecent && (
                                            <div className="mt-3 bg-amber-900/30 border border-amber-800/50 rounded-lg p-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                <span className="text-xs text-amber-300">Expires in {status.daysRemaining} days - use soon or make a fresh batch!</span>
                                            </div>
                                        )}
                                        {status.isExpired && (
                                            <div className="mt-3 bg-red-900/30 border border-red-800/50 rounded-lg p-2 flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-red-400" />
                                                <span className="text-xs text-red-300">Expired! Discard and make a fresh batch.</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Ratio Calculator */}
                                    <div className="p-4 bg-stone-900/50 border-b border-stone-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-secondary" />
                                                Output Calculator
                                            </span>
                                            <span className="text-[10px] text-stone-500">Base: {recipe.baseYield} oz</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-stone-400">I want to make:</span>
                                            <div className="flex items-center gap-2 flex-1">
                                                <button 
                                                    onClick={() => setDiyOutputVolume(prev => Math.max(2, prev - 2))}
                                                    className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 border border-stone-700"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <input 
                                                    type="number"
                                                    value={diyOutputVolume}
                                                    onChange={(e) => setDiyOutputVolume(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-16 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-center text-white font-bold outline-none focus:border-secondary"
                                                />
                                                <button 
                                                    onClick={() => setDiyOutputVolume(prev => prev + 2)}
                                                    className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 border border-stone-700"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <span className="text-sm text-stone-400">oz</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            {[8, 16, 24, 32].map(vol => (
                                                <button 
                                                    key={vol}
                                                    onClick={() => setDiyOutputVolume(vol)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${diyOutputVolume === vol ? 'bg-secondary text-stone-900' : 'bg-stone-800 text-stone-400 hover:text-white border border-stone-700'}`}
                                                >
                                                    {vol}oz
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scaled Ingredients */}
                                    <div className="p-4 border-b border-stone-700">
                                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                            <ListOrdered className="w-4 h-4 text-secondary" />
                                            Ingredients 
                                            <span className="text-[10px] text-stone-500 font-normal">({scaleFactor.toFixed(1)}x base recipe)</span>
                                        </h4>
                                        <ul className="space-y-2">
                                            {recipe.baseIngredients.map((ing, idx) => {
                                                const scaledAmount = ing.amount * scaleFactor;
                                                const displayAmount = scaledAmount >= 1 
                                                    ? (scaledAmount % 1 === 0 ? scaledAmount.toString() : scaledAmount.toFixed(2))
                                                    : scaledAmount.toFixed(2);
                                                
                                                return (
                                                    <li key={idx} className="flex items-center justify-between bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                                                        <span className="text-sm text-stone-300">{ing.name}</span>
                                                        <span className="text-sm font-bold text-white">
                                                            {displayAmount} {ing.unit}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>

                                    {/* Instructions */}
                                    <div className="p-4 border-b border-stone-700">
                                        <h4 className="text-sm font-bold text-white mb-3">Instructions</h4>
                                        <ol className="space-y-2">
                                            {recipe.instructions.map((step, idx) => (
                                                <li key={idx} className="flex gap-3 text-xs text-stone-400">
                                                    <span className="w-5 h-5 bg-stone-800 rounded-full flex items-center justify-center text-secondary font-bold flex-shrink-0">{idx + 1}</span>
                                                    <span className="pt-0.5">{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Tips & Info */}
                                    <div className="p-4 space-y-3">
                                        {recipe.tips && (
                                            <div className="flex items-start gap-2 bg-amber-950/30 p-3 rounded-lg border border-amber-900/30">
                                                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-200">{recipe.tips}</p>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-stone-500">Shelf Life:</span>
                                            <span className="text-stone-300">{recipe.shelfLife}</span>
                                        </div>
                                        {recipe.usedIn && recipe.usedIn.length > 0 && (
                                            <div className="pt-2 border-t border-stone-800">
                                                <span className="text-xs text-stone-500 block mb-2">Used in:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {recipe.usedIn.map((drink, idx) => (
                                                        <span key={idx} className="text-[10px] bg-stone-800 text-stone-400 px-2 py-1 rounded border border-stone-700">{drink}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* I Made This Button */}
                                        <button
                                            onClick={() => {
                                                handleMakeDiyIngredient(recipe, diyOutputVolume);
                                                setSelectedDiyItem(null);
                                            }}
                                            className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                            {status.inPantry ? 'I Made a Fresh Batch!' : 'I Made This!'}
                                        </button>
                                        <p className="text-[10px] text-stone-500 text-center">
                                            Adds {diyOutputVolume}oz to your pantry with a {parseShelfLifeToDays(recipe.shelfLife)}-day expiration
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Recipe Categories */}
                        {!selectedDiyItem && (
                            <div className="space-y-4">
                                {(['Syrup', 'Cordial', 'Shrub'] as const).map(category => {
                                    const categoryRecipes = DIY_RECIPES.filter(r => r.category === category);
                                    if (categoryRecipes.length === 0) return null;
                                    
                                    return (
                                        <div key={category} className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
                                            <div className="p-3 border-b border-stone-700 bg-stone-800/50">
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                    {category === 'Syrup' && <Beaker className="w-4 h-4 text-secondary" />}
                                                    {category === 'Cordial' && <Wine className="w-4 h-4 text-secondary" />}
                                                    {category === 'Shrub' && <Sparkles className="w-4 h-4 text-secondary" />}
                                                    {category}s
                                                    <span className="text-[10px] text-stone-500 font-normal">({categoryRecipes.length})</span>
                                                </h3>
                                            </div>
                                            <div className="divide-y divide-stone-800">
                                                {categoryRecipes.map(recipe => {
                                                    const recipeStatus = getDiyIngredientStatus(recipe.id, recipe.name);
                                                    return (
                                                        <button 
                                                            key={recipe.id}
                                                            onClick={() => { setSelectedDiyItem(recipe.id); setDiyOutputVolume(recipe.baseYield); }}
                                                            className="w-full p-3 flex items-center justify-between hover:bg-stone-800/50 transition-colors text-left group"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-sm font-medium text-white group-hover:text-secondary transition-colors truncate">{recipe.name}</div>
                                                                    {recipeStatus.inPantry && !recipeStatus.isExpired && !recipeStatus.isExpiringSoon && (
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                                    )}
                                                                    {recipeStatus.isExpiringSoon && (
                                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                                    )}
                                                                    {recipeStatus.isExpired && (
                                                                        <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-stone-500 truncate">{recipe.description}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                                {recipeStatus.inPantry && recipeStatus.daysRemaining !== null && (
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${recipeStatus.isExpired ? 'bg-red-900/40 text-red-400' : recipeStatus.isExpiringSoon ? 'bg-amber-900/40 text-amber-400' : 'bg-stone-800 text-stone-400'}`}>
                                                                        {recipeStatus.isExpired ? 'Expired' : `${recipeStatus.daysRemaining}d`}
                                                                    </span>
                                                                )}
                                                                <ChevronDown className="w-4 h-4 text-stone-600 group-hover:text-secondary transition-colors -rotate-90" />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div ref={recommendScrollRef} className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'recommend' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                  <div className="flex bg-stone-800 p-1 rounded-xl border border-secondary/30">
                   <button 
                      onClick={() => setRxView('recommend')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${rxView === 'recommend' ? 'bg-secondary/20 text-secondary shadow-lg border border-secondary/50' : 'text-stone-400 hover:text-secondary/70'}`}
                   >
                      <ChefHat className="w-4 h-4" />
                      Recommend
                   </button>
                   <button 
                      onClick={() => setRxView('lab')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${rxView === 'lab' ? 'bg-secondary/20 text-secondary shadow-lg border border-secondary/50' : 'text-stone-400 hover:text-secondary/70'}`}
                   >
                      <FlaskConical className="w-4 h-4" />
                      Flavor Lab
                   </button>
                   <button 
                      onClick={() => setRxView('history')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${rxView === 'history' ? 'bg-secondary/20 text-secondary shadow-lg border border-secondary/50' : 'text-stone-400 hover:text-secondary/70'}`}
                   >
                      <History className="w-4 h-4" />
                      History
                   </button>
                </div>
                
                <div className={`space-y-6 ${rxView === 'recommend' ? '' : 'hidden'}`}>
                <div className="bg-gradient-to-br from-secondary/20 to-stone-900 rounded-2xl p-4 border border-secondary/30">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-emerald-600 flex items-center justify-center">
                        <ChefHat className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Cocktail Recommendations</h2>
                        <p className="text-xs text-stone-400">AI-powered drink suggestions</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-300 leading-relaxed">
                      Get personalized cocktails based on your Pantry, scan a bar menu for what to order, or ask the Bar Assist for help.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={generateRecs}
                        disabled={isGeneratingRecs}
                        className="bg-surface text-stone-200 border border-stone-600 p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-stone-700 hover:border-secondary transition-all disabled:opacity-50 shadow-sm hover:text-white"
                    >
                        {isGeneratingRecs && !isScanningMenu ? <Loader2 className="w-6 h-6 animate-spin text-secondary" /> : <ChefHat className="w-6 h-6 text-secondary" />}
                        <span className="text-xs">From Pantry</span>
                    </button>

                    <button 
                        onClick={() => menuInputRef.current?.click()}
                        disabled={isGeneratingRecs}
                        className="bg-surface text-stone-200 border border-stone-600 p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-stone-700 hover:border-secondary transition-all disabled:opacity-50 shadow-sm hover:text-white"
                    >
                            {isScanningMenu ? <Loader2 className="w-6 h-6 animate-spin text-secondary" /> : <ScanLine className="w-6 h-6 text-secondary" />}
                        <span className="text-xs">Scan Menu</span>
                    </button>
                    <input 
                        type="file" 
                        accept="image/*"
                        ref={menuInputRef} 
                        className="hidden"
                        onChange={(e) => e.target.files && handleMenuScan(e.target.files[0])}
                    />

                    <button 
                        onClick={() => setBarHelpMode('selection')}
                        className="bg-surface text-stone-200 border border-stone-600 p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-stone-700 hover:border-secondary transition-all shadow-sm hover:text-white"
                    >
                         <HelpCircle className="w-6 h-6 text-secondary" />
                         <span className="text-xs">Bar Assist</span>
                    </button>
                </div>
                 <div className="space-y-4">
                    {recommendations.map((rec, idx) => (
                        <div key={idx} className="bg-surface rounded-2xl border border-stone-700 overflow-hidden flex flex-col shadow-md">
                            <div className="p-1 bg-gradient-to-r from-secondary to-emerald-500 h-1" />
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-white">{rec.name}</h3>
                                    <div className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold border border-secondary/20">
                                        {rec.matchScore}% Match
                                    </div>
                                </div>
                                <p className="text-stone-400 text-sm mb-4">{rec.description}</p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-stone-500 uppercase mb-2">Compounds</h4>
                                        <ul className="space-y-1">
                                            {[...rec.ingredientsToUse, ...rec.missingIngredients].map(ing => (
                                                <li key={ing} className="text-xs text-stone-300 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-600 shrink-0"></span>
                                                    {ing}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    
                                    {rec.missingIngredients.length > 0 && (
                                        <div className="bg-secondary/5 border border-secondary/10 p-3 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] text-secondary font-bold mb-1">Missing:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {rec.missingIngredients.map(ing => (
                                                        <span key={ing} className="text-[10px] text-stone-300 bg-background px-1.5 py-0.5 rounded border border-stone-700">{ing}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleAddToShoppingList(rec.missingIngredients)}
                                                className="ml-2 bg-stone-800 hover:bg-stone-700 p-2 rounded-full text-secondary shadow-sm"
                                                title="Add to Shopping List"
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-[10px] font-bold text-stone-500 uppercase mb-2">Procedure</h4>
                                        <div className="text-xs text-stone-300 space-y-2 pl-2 border-l border-stone-800">
                                            {rec.instructions.slice(0, 2).map((step, i) => (
                                                <p key={i} className="leading-snug">{step}</p>
                                            ))}
                                            {rec.instructions.length > 2 && (
                                                <p className="text-stone-500 italic text-[10px]">...and {rec.instructions.length - 2} more steps</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {rec.nutrition && (
                                        <div className="flex items-center gap-2 text-[10px] text-stone-500 bg-stone-900/50 p-2 rounded-lg border border-stone-800">
                                            <Activity className="w-3 h-3 text-secondary" />
                                            <span>Est: <strong>{rec.nutrition.calories} cal</strong> • {rec.nutrition.carbs}g carb</span>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button 
                                            onClick={() => handleSaveRecommendation(rec)}
                                            className="w-full bg-stone-800 text-stone-200 text-xs font-bold py-3 rounded-lg border border-stone-700 hover:bg-stone-700 hover:text-white transition-colors flex items-center justify-center gap-2 group"
                                        >
                                            <Edit3 className="w-4 h-4 text-stone-400 group-hover:text-white" />
                                            Review & Save to Barmulary
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                </div>

                <div className={`space-y-4 ${rxView === 'history' ? '' : 'hidden'}`}>
                        <div className="bg-gradient-to-br from-stone-800/60 to-stone-900 rounded-2xl p-4 border border-stone-700/50">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center">
                                <History className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h2 className="text-lg font-bold text-white">Order History</h2>
                                <p className="text-xs text-stone-400">Track drinks from bars and restaurants</p>
                              </div>
                            </div>
                            <p className="text-sm text-stone-300 leading-relaxed">
                              Log what you order when you're out. Rate drinks to refine your palate profile, or add recipes to your Barmulary to recreate at home.
                            </p>
                        </div>
                         {history.filter(d => d.source === 'Order').sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()).map(drink => (
                            <div 
                                key={drink.id} 
                                onClick={() => setSelectedCocktail(drink)}
                                className="bg-surface rounded-lg border border-stone-700 relative overflow-hidden flex cursor-pointer hover:border-stone-500 transition-colors shadow-sm flex-row h-32"
                            >
                                <div className="flex-1 p-3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-sm font-bold text-white leading-tight line-clamp-1">{drink.name}</h4>
                                        </div>
                                        
                                        <p className="text-[10px] text-secondary mb-1.5 flex items-center gap-1">
                                            <Store className="w-3 h-3" />
                                            {drink.creator || 'Unknown Establishment'}
                                            <span className="text-stone-500 text-[10px] ml-1">
                                                • {new Date(drink.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                                            </span>
                                        </p>

                                        <p className="text-xs text-stone-400 line-clamp-2 italic leading-snug">"{drink.description}"</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-700/50">
                                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={(e) => handleRateCocktail(e, drink.id, star)}
                                                    className="focus:outline-none p-1.5 active:scale-90 transition-transform"
                                                >
                                                    <Star 
                                                        className={`w-5 h-5 ${
                                                            (drink.rating || 0) >= star 
                                                            ? 'fill-secondary text-secondary' 
                                                            : 'text-stone-600' 
                                                        }`} 
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleViewRecipe(drink); }}
                                                className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold px-2 py-1 rounded border border-stone-600 flex items-center gap-1 transition-colors"
                                            >
                                                <BookOpen className="w-3 h-3 text-secondary" />
                                                Add to Barmulary
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteCocktail(e, drink.id)}
                                                className="text-stone-600 hover:text-red-400 p-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-28 bg-stone-900 relative shrink-0 border-l border-stone-700 group h-full">
                                    {drink.imageUrl ? (
                                        <>
                                            <img 
                                                src={drink.imageUrl} 
                                                alt={drink.name} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                     e.currentTarget.src = FALLBACK_IMAGE;
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-r from-surface/50 to-transparent"></div>
                                            <label 
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute bottom-1 right-1 p-1.5 bg-stone-900/80 rounded-full cursor-pointer hover:bg-stone-800 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Camera className="w-3.5 h-3.5 text-primary" />
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="hidden"
                                                    onChange={(e) => handleOrderPhotoUpload(e, drink)}
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <label 
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full h-full flex items-center justify-center flex-col gap-1 bg-stone-800/50 cursor-pointer hover:bg-stone-700/50 transition-colors"
                                        >
                                           <Camera className="w-6 h-6 text-stone-500 group-hover:text-primary transition-colors" />
                                           <span className="text-[9px] text-stone-500 group-hover:text-stone-400 font-medium">Add Photo</span>
                                           <input 
                                               type="file" 
                                               accept="image/*"
                                               capture="environment"
                                               className="hidden"
                                               onChange={(e) => handleOrderPhotoUpload(e, drink)}
                                           />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
                
                <div className={`${rxView === 'lab' ? '' : 'hidden'}`}>
                    <CocktailLab 
                      allRecipes={history}
                      initialRecipe={labRecipe}
                      initialMode={labMode}
                      onClearInitialRecipe={() => { setLabRecipe(null); setLabMode('recipe'); }}
                      onSaveExperiment={handleAddCocktail}
                    />
                </div>
            </div>
        </div>
      </main>
      
      <nav className="flex-none z-30 bg-surface border-t border-stone-700 pb-safe">
        <div className="grid grid-cols-4 h-20 max-w-md mx-auto">
          <button 
             onClick={() => handleTabChange('palate')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'palate' ? 'text-primary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <BarChart3 className={`w-7 h-7 ${activeTab === 'palate' ? 'fill-primary/20' : ''}`} />
            <span className="text-xs font-bold">Palate</span>
          </button>
          <button 
             onClick={() => handleTabChange('recipes')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'recipes' ? 'text-white' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <BookOpen className={`w-7 h-7 ${activeTab === 'recipes' ? 'fill-white/20' : ''}`} />
            <span className="text-xs font-bold">Barmulary</span>
          </button>
          <button 
             onClick={() => handleTabChange('bar')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'bar' ? 'text-secondary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <Wine className={`w-7 h-7 ${activeTab === 'bar' ? 'fill-secondary/20' : ''}`} />
            <span className="text-xs font-bold">Bar</span>
          </button>
          <button 
             onClick={() => handleTabChange('recommend')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'recommend' ? 'text-secondary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <ChefHat className={`w-7 h-7 ${activeTab === 'recommend' ? 'fill-secondary/20' : ''}`} />
            <span className="text-xs font-bold">Rx</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Share page wrapper component
function SharePageWrapper() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ type: string; id: string }>('/share/:type/:id');
  
  if (!match || !params) {
    return null;
  }
  
  const recipeType = params.type as 'global' | 'user' | 'riff';
  const recipeId = params.id;
  
  return (
    <SharedRecipePage
      recipeType={recipeType}
      recipeId={recipeId}
      isLoggedIn={isAuthenticated}
      currentUserId={user?.id}
      onBack={() => setLocation('/')}
      onAddToCollection={() => {
        // Navigate to main app after adding
        setLocation('/');
      }}
    />
  );
}

// Router wrapper component that handles share routes
function AppRouter() {
  const [match] = useRoute('/share/:type/:id');
  
  if (match) {
    return <SharePageWrapper />;
  }
  
  return <MainApp />;
}

// Main App export with routing
export default function App() {
  return <AppRouter />;
}
