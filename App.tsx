
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Beaker, ChefHat, BarChart3, Trash2, Sparkles, Loader2, Wine, BookOpen, ExternalLink, User, ChevronDown, ChevronUp, Layers, Star, Disc, Plus, ImageIcon, Pencil, Check, Camera, ScanLine, Beer, Calendar, MapPin, HelpCircle, ShieldCheck, Zap, XCircle, MessageCircle, Store, Globe, Search, X, ShoppingCart, Minus, Archive, Settings, AlertTriangle, CheckCircle2, ShoppingBag } from 'lucide-react';
import FlavorRadar from './components/RadarChart';
import IngredientScanner from './components/IngredientScanner';
import RecipeImporter from './components/RecipeImporter';
import RecipeDetail from './components/RecipeDetail';
import FlavorWheel from './components/FlavorWheel';
import SettingsModal from './components/SettingsModal';
import ShoppingListAddModal from './components/ShoppingListAddModal';
import { Cocktail, Ingredient, FlavorProfile, FlavorDimension, Recommendation, ShoppingListItem, MasterIngredient, AppSettings } from './types';
import { getRecommendations, generateCocktailImage, enrichIngredientDetails, recommendFromMenu, getBarOrderSuggestion, deduceRecipe } from './services/geminiService';

// Default empty profile for fallback
const INITIAL_PROFILE: FlavorProfile = {
  Sweet: 0, Sour: 0, Bitter: 0, Boozy: 0, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0
};

// Initial Master Data for Ingredients
const INITIAL_MASTER_DATA: MasterIngredient[] = [
    { id: 'm-1', name: 'Vodka', category: 'Spirit' },
    { id: 'm-2', name: 'Gin', category: 'Spirit' },
    { id: 'm-3', name: 'Bourbon', category: 'Spirit' },
    { id: 'm-4', name: 'Rye Whiskey', category: 'Spirit' },
    { id: 'm-5', name: 'Tequila Blanco', category: 'Spirit' },
    { id: 'm-6', name: 'Mezcal', category: 'Spirit' },
    { id: 'm-7', name: 'White Rum', category: 'Spirit' },
    { id: 'm-8', name: 'Dark Rum', category: 'Spirit' },
    { id: 'm-9', name: 'Campari', category: 'Spirit' },
    { id: 'm-10', name: 'Aperol', category: 'Spirit' },
    { id: 'm-11', name: 'Sweet Vermouth', category: 'Spirit' },
    { id: 'm-12', name: 'Dry Vermouth', category: 'Spirit' },
    { id: 'm-13', name: 'Simple Syrup', category: 'Mixer' },
    { id: 'm-14', name: 'Lemon Juice', category: 'Mixer' },
    { id: 'm-15', name: 'Lime Juice', category: 'Mixer' },
    { id: 'm-16', name: 'Angostura Bitters', category: 'Other' },
    { id: 'm-17', name: 'Orange Bitters', category: 'Other' },
    { id: 'm-18', name: 'Soda Water', category: 'Mixer' },
    { id: 'm-19', name: 'Tonic Water', category: 'Mixer' },
    { id: 'm-20', name: 'Egg White', category: 'Other' },
];

const INITIAL_SETTINGS: AppSettings = {
    lowStockKeywords: ['empty', 'low', '10%', 'near empty', 'almost gone', 'running low'],
    allergies: [],
    handedness: 'right'
};

// Preloaded Classics with Ratings and Links
const INITIAL_RECIPES: Cocktail[] = [
  // --- WHISKEY SOUR FAMILY ---
  {
    id: 'ws-diff',
    name: 'Whiskey Sour',
    description: 'The Difford’s Guide standard. A precise balance of bourbon, fresh lemon, and sugar, smoothed by egg white for a silky texture.',
    ingredients: [
      '2 fl oz Bourbon whiskey',
      '3/4 fl oz Fresh lemon juice',
      '1/2 fl oz Sugar syrup (2:1)',
      '1/2 fresh Egg white',
      '3 dash Angostura Bitters'
    ],
    instructions: [
      'Shake all ingredients with ice to chill.',
      'Strain back into the shaker.',
      'Dry shake (without ice) vigorously to emulsify the egg white.',
      'Fine strain into a chilled coupe or rocks glass with fresh ice.',
      'Garnish with 3 drops of Angostura bitters on the foam.'
    ],
    flavorProfile: { Sweet: 4, Sour: 6, Bitter: 2, Boozy: 5, Herbal: 2, Fruity: 2, Spicy: 2, Smoky: 2 },
    source: 'Manual',
    creator: "Difford's Guide",
    creatorType: 'Online',
    originalLink: 'https://www.diffordsguide.com/cocktails/recipe/2077/whiskey-sour-diffords-recipe',
    dateAdded: new Date().toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1677521373499-4a06dbf2918e?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'ws-ny',
    name: 'New York Sour',
    description: 'A visually stunning riff on the Whiskey Sour with a red wine float that adds dryness and fruitiness.',
    ingredients: [
      '2 oz Rye Whiskey or Bourbon',
      '1 oz Fresh Lemon Juice',
      '0.75 oz Simple Syrup',
      '1 Egg White (optional)',
      '0.5 oz Red Wine (Malbec or Syrah) to float'
    ],
    instructions: [
      'Shake whiskey, lemon, syrup, and egg white with ice.',
      'Strain into a rocks glass over fresh ice.',
      'Slowly pour the red wine over the back of a bar spoon so it floats on top.',
      'Do not garnish.'
    ],
    flavorProfile: { Sweet: 4, Sour: 6, Bitter: 2, Boozy: 5, Herbal: 0, Fruity: 5, Spicy: 2, Smoky: 0 },
    source: 'Manual',
    creator: "Difford's Guide",
    creatorType: 'Online',
    dateAdded: new Date().toISOString(),
    rating: 4,
    imageUrl: 'https://images.unsplash.com/photo-1597075687490-8f673c6c17f6?q=80&w=400&auto=format&fit=crop'
  },

  // --- LEMON DROP ---
  {
    id: 'ld-liq',
    name: 'Lemon Drop',
    description: 'Liquor.com’s definitive recipe. Essentially a vodka crusta, balancing the clean taste of vodka with zesty lemon and a sugar rim.',
    ingredients: [
      '2 oz Vodka',
      '1/2 oz Triple Sec',
      '1 oz Fresh lemon juice',
      '1 oz Simple Syrup',
      'Sugar for rim'
    ],
    instructions: [
      'Coat the rim of a cocktail glass with sugar.',
      'Add vodka, triple sec, lemon juice, and simple syrup to a shaker with ice.',
      'Shake vigorously until well-chilled.',
      'Strain into a prepared glass.',
      'Garnish with a lemon twist.'
    ],
    flavorProfile: { Sweet: 7, Sour: 6, Bitter: 0, Boozy: 4, Herbal: 0, Fruity: 6, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Liquor.com',
    creatorType: 'Online',
    originalLink: 'https://www.liquor.com/recipes/lemon-drop/',
    dateAdded: new Date(Date.now() - 86400000).toISOString(),
    rating: 4,
    imageUrl: 'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?q=80&w=400&auto=format&fit=crop'
  },

  // --- MOJITO ---
  {
    id: 'moj-dc',
    name: 'Mojito',
    description: 'A refreshing Cuban classic as interpreted by Death & Co. Crisp, minty, and effervescent.',
    ingredients: [
      '2 oz White Rum (Flor de Caña)',
      '0.75 oz Lime Juice',
      '0.75 oz Simple Syrup',
      '6-8 Mint Leaves',
      'Club Soda to top'
    ],
    instructions: [
      'Lightly muddle mint leaves in a shaker with simple syrup.',
      'Add rum and lime juice.',
      'Shake briefly with a few pebbles of ice.',
      'Strain into a highball glass filled with fresh ice.',
      'Top with club soda.',
      'Garnish with a large mint sprig.'
    ],
    flavorProfile: { Sweet: 5, Sour: 4, Bitter: 1, Boozy: 3, Herbal: 8, Fruity: 1, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Death & Co',
    creatorType: 'Establishment',
    originalLink: 'https://www.deathandcompany.com/',
    dateAdded: new Date(Date.now() - 259200000).toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=400&auto=format&fit=crop'
  },

  // --- NEGRONI FAMILY ---
  {
    id: 'neg-classic',
    name: 'Negroni',
    description: 'The equal-parts classic. The definition of an aperitivo.',
    ingredients: [
      '1 oz London Dry Gin',
      '1 oz Campari',
      '1 oz Sweet Vermouth'
    ],
    instructions: [
      'Add all ingredients to a mixing glass with ice.',
      'Stir until well-chilled.',
      'Strain into a rocks glass filled with large ice.',
      'Garnish with an orange peel.'
    ],
    flavorProfile: { Sweet: 4, Sour: 0, Bitter: 8, Boozy: 6, Herbal: 7, Fruity: 2, Spicy: 1, Smoky: 0 },
    source: 'Manual',
    creator: 'Gary Regan',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'neg-white',
    name: 'White Negroni',
    description: 'A lighter, floral, and slightly more approachable riff on the classic.',
    ingredients: [
      '1.5 oz Gin',
      '1 oz Lillet Blanc',
      '0.75 oz Suze'
    ],
    instructions: [
      'Add all ingredients to a mixing glass with ice.',
      'Stir until chilled.',
      'Strain into a rocks glass over ice.',
      'Garnish with a grapefruit twist.'
    ],
    flavorProfile: { Sweet: 4, Sour: 0, Bitter: 6, Boozy: 6, Herbal: 8, Fruity: 1, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Wayne Collins',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 4,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  },
  {
    id: 'neg-mezcal',
    name: 'Mezcal Negroni',
    description: 'Smoky, earthy, and bitter. A modern classic substitution.',
    ingredients: [
      '1 oz Mezcal Espadin',
      '1 oz Campari',
      '1 oz Sweet Vermouth'
    ],
    instructions: [
      'Stir ingredients with ice.',
      'Strain over a large cube in a rocks glass.',
      'Garnish with an orange peel.'
    ],
    flavorProfile: { Sweet: 4, Sour: 0, Bitter: 8, Boozy: 6, Herbal: 5, Fruity: 2, Spicy: 1, Smoky: 8 },
    source: 'Manual',
    creator: 'Death & Co',
    creatorType: 'Establishment',
    dateAdded: new Date().toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  },

  // --- MARTINI FAMILY ---
  {
    id: 'mart-classic',
    name: 'Dry Martini',
    description: 'The King of Cocktails. Crisp, cold, and botanical.',
    ingredients: [
      '2.5 oz London Dry Gin',
      '0.5 oz Dry Vermouth',
      'Dash Orange Bitters'
    ],
    instructions: [
      'Add ingredients to a mixing glass filled with ice.',
      'Stir for at least 30 seconds.',
      'Strain into a chilled coupe or martini glass.',
      'Garnish with a lemon twist.'
    ],
    flavorProfile: { Sweet: 0, Sour: 0, Bitter: 2, Boozy: 9, Herbal: 7, Fruity: 1, Spicy: 1, Smoky: 0 },
    source: 'Manual',
    creator: 'Classic',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1575023782549-62ca2d2d388e?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'mart-dirty',
    name: 'Dirty Martini',
    description: 'Savory, salty, and polarizing.',
    ingredients: [
      '2.5 oz Vodka or Gin',
      '0.5 oz Dry Vermouth',
      '0.5 oz Olive Brine'
    ],
    instructions: [
      'Stir or shake (if you prefer shards of ice) with ice.',
      'Strain into a chilled glass.',
      'Garnish with 3 olives.'
    ],
    flavorProfile: { Sweet: 0, Sour: 1, Bitter: 3, Boozy: 8, Herbal: 3, Fruity: 0, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Classic',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 3,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  },
  {
    id: 'mart-espresso',
    name: 'Espresso Martini',
    description: 'A modern staple. Rich coffee flavor with a vodka backbone.',
    ingredients: [
      '2 oz Vodka',
      '1 oz Fresh Espresso',
      '0.5 oz Coffee Liqueur',
      '0.25 oz Simple Syrup (optional)'
    ],
    instructions: [
      'Add all ingredients to a shaker with ice.',
      'Shake very hard to generate foam.',
      'Fine strain into a chilled coupe.',
      'Garnish with 3 coffee beans.'
    ],
    flavorProfile: { Sweet: 6, Sour: 0, Bitter: 5, Boozy: 5, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Dick Bradsell',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1627365841176-102d0108866c?q=80&w=400&auto=format&fit=crop'
  },

   // --- DAIQUIRI FAMILY ---
   {
    id: 'daiq-classic',
    name: 'Daiquiri',
    description: 'The delicate balance of rum, lime, and sugar. The test of a bartender.',
    ingredients: [
      '2 oz White Rum',
      '1 oz Fresh Lime Juice',
      '0.75 oz Simple Syrup'
    ],
    instructions: [
      'Shake all ingredients with ice.',
      'Double strain into a chilled coupe.',
      'Garnish with a lime wheel.'
    ],
    flavorProfile: { Sweet: 4, Sour: 7, Bitter: 0, Boozy: 5, Herbal: 0, Fruity: 3, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Classic',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1615887023516-9b6c25001b73?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'daiq-hem',
    name: 'Hemingway Daiquiri',
    description: 'Papa Doble. Tart, complex, and refreshing.',
    ingredients: [
      '2 oz White Rum',
      '0.75 oz Lime Juice',
      '0.5 oz Grapefruit Juice',
      '0.5 oz Maraschino Liqueur'
    ],
    instructions: [
      'Shake with ice.',
      'Strain into a chilled coupe.',
      'Garnish with a lime wheel.'
    ],
    flavorProfile: { Sweet: 3, Sour: 8, Bitter: 1, Boozy: 6, Herbal: 1, Fruity: 4, Spicy: 0, Smoky: 0 },
    source: 'Manual',
    creator: 'Constante Ribalaigua Vert',
    creatorType: 'Person',
    dateAdded: new Date().toISOString(),
    rating: 4,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  }
];

// Mock Order History (Comprehensive Menu Simulation)
const INITIAL_ORDERS: Cocktail[] = [
  // --- ATTABOY (New York) ---
  {
    id: 'ord-attaboy-1',
    name: 'Penicillin',
    creator: 'Attaboy',
    creatorType: 'Establishment',
    description: 'Spicy ginger, honey sweetness, and a smoky scotch float. Incredible balance.',
    ingredients: ['2 oz Blended Scotch', '0.75 oz Lemon Juice', '0.75 oz Honey-Ginger Syrup', '0.25 oz Islay Scotch (Float)'],
    instructions: [
      'Muddle fresh ginger in a shaker or use ginger syrup.',
      'Add blended scotch, lemon juice, and honey syrup.',
      'Shake vigorously with ice.',
      'Strain into a rocks glass over fresh ice.',
      'Float the Islay scotch on top.',
      'Garnish with candied ginger.'
    ],
    flavorProfile: { Sweet: 4, Sour: 5, Bitter: 1, Boozy: 5, Herbal: 2, Fruity: 0, Spicy: 7, Smoky: 6 },
    source: 'Order',
    dateAdded: new Date('2023-10-15').toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1646251377013-327960133478?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'ord-attaboy-2',
    name: 'Paper Plane',
    creator: 'Attaboy',
    creatorType: 'Establishment',
    description: 'On the menu. Bourbon, Amaro Nonino, Aperol, Lemon. A modern classic.',
    ingredients: ['0.75 oz Bourbon', '0.75 oz Amaro Nonino', '0.75 oz Aperol', '0.75 oz Lemon Juice'],
    instructions: [
      'Add all equal parts to a shaker with ice.',
      'Shake vigorously.',
      'Fine strain into a chilled coupe glass.',
      'Garnish with a small paper plane (optional).'
    ],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 4, Boozy: 4, Herbal: 3, Fruity: 4, Spicy: 0, Smoky: 0 },
    source: 'Order',
    dateAdded: new Date('2023-10-15').toISOString(),
    rating: 0, // Untried
    imageUrl: 'https://images.unsplash.com/photo-1596711252242-b2962584480e?q=80&w=400&auto=format&fit=crop'
  },

  // --- DANTE (New York) ---
  {
    id: 'ord-dante-1',
    name: 'Garibaldi',
    creator: 'Dante',
    creatorType: 'Establishment',
    description: 'Fluffy orange juice and Campari. Simple perfection.',
    ingredients: ['1.5 oz Campari', '4 oz Fluffy Orange Juice'],
    instructions: [
      'Juice oranges at high speed to aerate ("fluff") them.',
      'Add Campari to a highball glass with ice.',
      'Top with the fluffy orange juice.',
      'Garnish with an orange wedge.'
    ],
    flavorProfile: { Sweet: 4, Sour: 3, Bitter: 6, Boozy: 3, Herbal: 4, Fruity: 8, Spicy: 0, Smoky: 0 },
    source: 'Order',
    dateAdded: new Date('2023-09-10').toISOString(),
    rating: 4,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'ord-dante-2',
    name: 'Negroni Sbagliato',
    creator: 'Dante',
    creatorType: 'Establishment',
    description: 'A mistake in the best way. Prosecco instead of Gin.',
    ingredients: ['1 oz Campari', '1 oz Sweet Vermouth', 'Top with Prosecco'],
    instructions: [
      'Build in a rocks glass or wine glass filled with ice.',
      'Add Campari and Sweet Vermouth.',
      'Top with Prosecco and stir gently.',
      'Garnish with an orange slice.'
    ],
    flavorProfile: { Sweet: 5, Sour: 2, Bitter: 5, Boozy: 3, Herbal: 4, Fruity: 3, Spicy: 0, Smoky: 0 },
    source: 'Order',
    dateAdded: new Date('2023-09-10').toISOString(),
    rating: 0, // Untried
    imageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=400&auto=format&fit=crop'
  },

  // --- DOUBLE CHICKEN PLEASE (New York) ---
  {
    id: 'ord-dcp-1',
    name: 'Espresso Martini',
    creator: 'Double Chicken Please',
    creatorType: 'Establishment',
    description: 'Rich, velvety, not too sweet. Excellent foam.',
    ingredients: ['2 oz Vodka', '1 oz Espresso', '0.5 oz Coffee Liqueur'],
    instructions: [
      'Shake vodka, espresso, and liqueur vigorously with plenty of ice.',
      'Strain into a chilled coupe.',
      'Ensure a thick foam head forms.',
      'Garnish with 3 coffee beans.'
    ],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 4, Boozy: 4, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0 },
    source: 'Order',
    dateAdded: new Date('2023-11-05').toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1627365841176-102d0108866c?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'ord-dcp-2',
    name: 'Cold Pizza',
    creator: 'Double Chicken Please',
    creatorType: 'Establishment',
    description: 'Tastes exactly like it sounds. Basil, tomato, cheese wash.',
    ingredients: ['Tequila', 'Parmigiano Reggiano', 'Burnt Toast', 'Tomato', 'Basil', 'Egg White'],
    instructions: [
      'Infuse tequila with burnt toast and cheese.',
      'Muddle basil and tomato.',
      'Shake with egg white for texture.',
      'Strain into a glass.'
    ],
    flavorProfile: { Sweet: 2, Sour: 4, Bitter: 1, Boozy: 5, Herbal: 7, Fruity: 1, Spicy: 2, Smoky: 1 },
    source: 'Order',
    dateAdded: new Date('2023-11-05').toISOString(),
    rating: 0, // Untried
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  },

  // --- THE DEAD RABBIT (New York) ---
  {
    id: 'ord-dr-1',
    name: 'Irish Coffee',
    creator: 'The Dead Rabbit',
    creatorType: 'Establishment',
    description: 'The world famous Irish Coffee. Nutmeg dust on top.',
    ingredients: ['1.5 oz Irish Whiskey', '4 oz Hot Coffee', '0.75 oz Demerara Syrup', 'Heavy Cream'],
    instructions: [
      'Preheat a glass with hot water, then discard.',
      'Add whiskey, syrup, and coffee. Stir to dissolve sugar.',
      'Gently float lightly whipped heavy cream on top.',
      'Grate fresh nutmeg over the cream.'
    ],
    flavorProfile: { Sweet: 6, Sour: 0, Bitter: 3, Boozy: 4, Herbal: 0, Fruity: 0, Spicy: 2, Smoky: 0 },
    source: 'Order',
    dateAdded: new Date('2023-12-20').toISOString(),
    rating: 5,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  },
  {
    id: 'ord-dr-2',
    name: 'Psycho Killer',
    creator: 'The Dead Rabbit',
    creatorType: 'Establishment',
    description: 'Cocoa nib infused Campari, Banana liqueur, White Chocolate. Intense.',
    ingredients: ['Irish Whiskey', 'Cocoa Nib Campari', 'Banana Liqueur', 'White Chocolate', 'Absinthe'],
    instructions: [
      'Stir all ingredients with ice.',
      'Strain into a chilled glass.',
      'Rinse glass with absinthe prior to pouring.'
    ],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 6, Boozy: 7, Herbal: 4, Fruity: 3, Spicy: 1, Smoky: 0 },
    source: 'Order',
    dateAdded: new Date('2023-12-20').toISOString(),
    rating: 0, // Untried
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400'
  }
];

// Preloaded Pantry Items (Tequila, Campari, Gin)
const INITIAL_PANTRY: Ingredient[] = [
  { id: 'teq-01', name: 'Blanco Tequila', category: 'Spirit', volume: '750ml Full', flavorNotes: 'Bright agave, white pepper, and citrus notes with a clean finish.' },
  { id: 'camp-01', name: 'Campari', category: 'Spirit', volume: 'Half Bottle', flavorNotes: 'Intensely bitter, herbal, with notes of orange peel, cherry, and clove.' },
  { id: 'gin-01', name: 'London Dry Gin', category: 'Spirit', volume: 'Nearly Empty', flavorNotes: 'Juniper-forward, dry, with hints of coriander, angelica, and citrus peel.' }
];

// --- Expert Mixologist Agent Logic for Classification ---
const getExpertFamily = (cocktail: Cocktail): string => {
    const name = cocktail.name.toLowerCase();
    const desc = cocktail.description.toLowerCase();
    
    // 1. SPECIFIC MODERN CLASSICS / EDGE CASES
    if (name.includes('espresso martini')) return 'Modern Classics';
    if (name.includes('paper plane')) return 'Modern Classics';
    if (name.includes('penicillin')) return 'Modern Classics';
    if (name.includes('naked and famous')) return 'Modern Classics';
    if (name.includes('cold pizza')) return 'Modern Classics';

    // 2. THE NEGRONI FAMILY (Aperitifs)
    if (name.includes('negroni') || name.includes('boulevardier') || name.includes('americano') || name.includes('garibaldi')) return 'Negroni & Aperitifs';

    // 3. THE MARTINI FAMILY (Spirit Forward, Gin/Vodka + Vermouth)
    // Note: Espresso Martini caught above
    if (name.includes('martini') || name.includes('vesper') || name.includes('gibson')) return 'The Martini Family';
    if (name.includes('manhattan') || name.includes('brooklyn') || name.includes('vieux')) return 'Manhattan & Spirit Forward';
    if (name.includes('old fashioned') || name.includes('sazerac')) return 'Old Fashioneds';

    // 4. AGAVE CLASSICS
    if (name.includes('margarita') || name.includes('paloma') || name.includes('mezcal')) return 'Agave Classics';

    // 5. RUM & CANE (Tropical/Tiki)
    if (name.includes('daiquiri') || name.includes('mojito') || name.includes('mai tai') || name.includes('zombie')) return 'Rum & Cane';

    // 6. SOURS (General)
    if (name.includes('sour') || name.includes('gimlet') || name.includes('sidecar') || name.includes('lemon drop')) return 'Sours & Daisies';

    // 7. HIGHBALLS & FIZZES
    if (name.includes('tonic') || name.includes('soda') || name.includes('fizz') || name.includes('collins') || name.includes('spritz') || name.includes('irish coffee')) return 'Highballs, Fizzes & Warmers';

    return 'Other Cocktails';
};


export default function App() {
  const [activeTab, setActiveTab] = useState<'palate' | 'recipes' | 'bar' | 'recommend'>('palate');
  const [palateView, setPalateView] = useState<'diagnosis' | 'wheel'>('diagnosis');
  const [formularyView, setFormularyView] = useState<'drinks' | 'creators' | 'orders'>('drinks');
  const [barView, setBarView] = useState<'shopping' | 'pantry'>('shopping'); // New State for Bar View
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Combine Initial Recipes and Orders
  const [history, setHistory] = useState<Cocktail[]>([...INITIAL_RECIPES, ...INITIAL_ORDERS]);
  const [pantry, setPantry] = useState<Ingredient[]>(INITIAL_PANTRY);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [masterData, setMasterData] = useState<MasterIngredient[]>(INITIAL_MASTER_DATA);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editVolumeValue, setEditVolumeValue] = useState('');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [isScanningMenu, setIsScanningMenu] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  
  // Bar Assist State
  const [barHelpMode, setBarHelpMode] = useState<'selection' | 'result' | null>(null);
  const [barHelpResult, setBarHelpResult] = useState<{ script: string, suggestion: string, reasoning: string } | null>(null);
  const [isGeneratingHelp, setIsGeneratingHelp] = useState(false);

  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShoppingAddOpen, setIsShoppingAddOpen] = useState(false);
  const [isIngredientScannerOpen, setIsIngredientScannerOpen] = useState(false); // Manually control scanner state

  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
  const [recentMenuScans, setRecentMenuScans] = useState<Cocktail[]>([]);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Class for Handedness Positioning
  const fabPosition = settings.handedness === 'left' ? 'left-4' : 'right-4';

  // Auto-visualize missing images on load
  useEffect(() => {
    const missingImageDrinks = history.filter(drink => !drink.imageUrl && !generatingImages.has(drink.id));
    
    if (missingImageDrinks.length > 0) {
      const drinkToVisualize = missingImageDrinks[0]; // Process one at a time
      handleGenerateImage(null, drinkToVisualize);
    }
  }, [history, generatingImages]);

  // Enrichment Effect for Pantry
  const enrichPantryItem = async (ingredient: Ingredient) => {
    if (ingredient.flavorNotes) return; // Already enriched
    
    try {
       const notes = await enrichIngredientDetails(ingredient.name);
       setPantry(prev => prev.map(item => 
         item.id === ingredient.id ? { ...item, flavorNotes: notes } : item
       ));
    } catch (e) {
       console.error("Failed to enrich", ingredient.name);
    }
  };

  // Helper to check what ingredients are missing for a given drink
  const getMissingIngredients = (ingredients: string[]) => {
      if (!ingredients || pantry.length === 0) return ingredients || [];
      return ingredients.filter(ing => 
         !pantry.some(pItem => ing.toLowerCase().includes(pItem.name.toLowerCase()))
      );
  };

  // Helper to check if missing ingredients are already in shopping list
  const getItemsToBuy = (missing: string[]) => {
      return missing.filter(ing => !shoppingList.some(item => item.name.toLowerCase() === ing.toLowerCase()));
  };

  // Derived State: Calculate Average Palate from HIGHLY RATED drinks
  const userPalate = useMemo(() => {
    // Filter for rated drinks (3 stars or more)
    const ratedDrinks = history.filter(drink => drink.rating !== undefined && drink.rating >= 3);
    
    if (ratedDrinks.length === 0) return INITIAL_PROFILE;

    const totals = { ...INITIAL_PROFILE };
    ratedDrinks.forEach(drink => {
      Object.keys(totals).forEach(key => {
        totals[key as FlavorDimension] += drink.flavorProfile[key as FlavorDimension] || 0;
      });
    });

    const average = { ...INITIAL_PROFILE };
    Object.keys(average).forEach(key => {
      average[key as FlavorDimension] = Math.round((totals[key as FlavorDimension] / ratedDrinks.length) * 10) / 10;
    });

    return average;
  }, [history]);

  // Grouping Logic for Barmulary (with Search Filter)
  const groupedCocktails = useMemo(() => {
    const map: Record<string, { displayName: string, drinks: Cocktail[] }> = {};
    
    // 1. Filter by search query first
    const filteredHistory = history.filter(drink => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            drink.name.toLowerCase().includes(q) ||
            (drink.ingredients && drink.ingredients.some(i => i.toLowerCase().includes(q))) ||
            (drink.creator && drink.creator.toLowerCase().includes(q)) ||
            (drink.description && drink.description.toLowerCase().includes(q))
        );
    });

    // 2. Group filtered results
    filteredHistory.forEach(drink => {
      if (formularyView === 'orders') {
           // STRICTLY ORDERS (Flat List sorted by Date)
           if (drink.source !== 'Order') return;
           const rawKey = 'Logbook'; // Single Group for flat list
           if (!map[rawKey]) map[rawKey] = { displayName: rawKey, drinks: [] };
           map[rawKey].drinks.push(drink);

      } else if (formularyView === 'creators') {
           // COMBINED CREATORS & LOCATIONS (Recipes AND Orders)
           const rawKey = drink.creator && drink.creator.trim() ? drink.creator.trim() : 'Unknown Source';
           if (!map[rawKey]) map[rawKey] = { displayName: rawKey, drinks: [] };
           map[rawKey].drinks.push(drink);

      } else {
           // DRINKS VIEW (Expert Family Classification)
           if (drink.source === 'Order') return;

           const family = getExpertFamily(drink);
           
           if (!map[family]) map[family] = { displayName: family, drinks: [] };
           map[family].drinks.push(drink);
      }
    });
    
    // Sort groups
    let sortedKeys;
    if (formularyView === 'orders') {
         // Sort drinks within the 'Logbook' group by date descending
        if (map['Logbook']) {
             map['Logbook'].drinks.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        }
        sortedKeys = ['Logbook']; // Only one key
    } else {
        // Sort alphabetical for other views
        sortedKeys = Object.keys(map).sort();
    }
    
    const finalGroups: Record<string, Cocktail[]> = {};
    sortedKeys.forEach(key => {
        if (map[key]) {
             const { displayName, drinks } = map[key];
             finalGroups[displayName] = drinks;
        }
    });
    
    return finalGroups;
  }, [history, formularyView, searchQuery]);

  const handleAddCocktail = (cocktail: Cocktail) => {
    setHistory(prev => [cocktail, ...prev]);
  };

  const handleDeleteCocktail = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(c => c.id !== id));
  };
  
  const handleRateCocktail = (e: React.MouseEvent, id: string, rating: number) => {
      e.stopPropagation();
      setHistory(prev => prev.map(c => c.id === id ? { ...c, rating } : c));
  };

  const handleGenerateImage = async (e: React.MouseEvent | null, cocktail: Cocktail) => {
      e?.stopPropagation();
      if (generatingImages.has(cocktail.id)) return;
      
      setGeneratingImages(prev => new Set(prev).add(cocktail.id));
      try {
          const imageUrl = await generateCocktailImage(cocktail.name, cocktail.description, cocktail.ingredients);
          if (imageUrl) {
              setHistory(prev => prev.map(c => c.id === cocktail.id ? { ...c, imageUrl } : c));
          }
      } catch (e) {
          if (e) console.log("Failed to generate image for", cocktail.name);
      } finally {
          setGeneratingImages(prev => {
              const next = new Set(prev);
              next.delete(cocktail.id);
              return next;
          });
      }
  };

  // Convert an Order to a Recipe via AI if needed
  const handleViewRecipe = async (orderCocktail: Cocktail) => {
    // 1. Check if we already have a manual recipe for this drink (deduplication)
    const existingRecipe = history.find(c => 
        c.source !== 'Order' && 
        c.name.toLowerCase() === orderCocktail.name.toLowerCase()
    );

    if (existingRecipe) {
        setSelectedCocktail(existingRecipe);
        return;
    }

    // 2. If not, generate a TEMPORARY DRAFT (do not save to history yet)
    alert("Deducing recipe via AI Bartender...");
    try {
        const deducedData = await deduceRecipe(orderCocktail.name, orderCocktail.ingredients);
        
        const tempRecipe: Cocktail = {
            ...orderCocktail,
            id: `temp-ai-${Date.now()}`, // Marked as temporary
            source: 'Manual', 
            creator: 'AI Bartender',
            creatorType: 'Person',
            ingredients: deducedData.ingredients, 
            instructions: deducedData.instructions,
            description: deducedData.description || `AI Deduced recipe for ${orderCocktail.name}`,
            dateAdded: new Date().toISOString()
        };

        // Open directly without adding to history
        setSelectedCocktail(tempRecipe);
        
        // Trigger image generation in background for this temp draft if needed (optional)
        handleGenerateImage(null, tempRecipe);
    } catch (e) {
        alert("Could not generate recipe.");
    }
  };

  const handleSaveTemporaryCocktail = (cocktail: Cocktail) => {
      const permanentCocktail = {
          ...cocktail,
          id: `ai-gen-${Date.now()}` // Finalize ID
      };
      setHistory(prev => [permanentCocktail, ...prev]);
      setSelectedCocktail(permanentCocktail);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
        const next = new Set(prev);
        if (next.has(groupKey)) {
            next.delete(groupKey);
        } else {
            next.add(groupKey);
        }
        return next;
    });
  };

  const handleIngredientsFound = (newIngredients: Ingredient[]) => {
    // Use the pantry state from the component scope
    const existingNames = new Set(pantry.map(i => i.name.toLowerCase()));
    const uniqueNew = newIngredients.filter(i => !existingNames.has(i.name.toLowerCase()));
    
    if (uniqueNew.length === 0) return;

    // Trigger enrichment effect OUTSIDE of the state setter
    uniqueNew.forEach(ing => enrichPantryItem(ing));
    
    // Update state
    setPantry(prev => [...prev, ...uniqueNew]);
  };

  const removeIngredient = (id: string) => {
    setPantry(prev => prev.filter(i => i.id !== id));
  };

  const startEditingVolume = (item: Ingredient) => {
      setEditingIngredientId(item.id);
      setEditVolumeValue(item.volume || '');
  };

  const saveEditingVolume = (id: string) => {
      setPantry(prev => prev.map(i => i.id === id ? { ...i, volume: editVolumeValue } : i));
      setEditingIngredientId(null);
  };

  // --- Shopping List Logic ---
  const handleAddToShoppingList = (ingredients: string[]) => {
      setShoppingList(prev => {
          const currentNames = new Set(prev.map(i => i.name.toLowerCase()));
          const newItems = ingredients
              .filter(name => !currentNames.has(name.toLowerCase()))
              .map(name => ({
                  id: `shop-${Math.random().toString(36).substr(2, 9)}`,
                  name: name,
                  isChecked: false
              }));
          return [...prev, ...newItems];
      });
      if (isShoppingAddOpen) {
          // No alert if coming from modal, close modal handles UX
      } else {
         // Removed alert() to allow for inline visual confirmation logic in UI components
      }
  };

  const toggleShoppingItem = (id: string) => {
      setShoppingList(prev => prev.map(item => 
          item.id === id ? { ...item, isChecked: !item.isChecked } : item
      ));
  };

  const removeShoppingItem = (id: string) => {
      setShoppingList(prev => prev.filter(i => i.id !== id));
  };

  const clearShoppingList = () => {
      // Remove only checked items
      setShoppingList(prev => prev.filter(i => !i.isChecked));
  };
  
  const handleMoveToPantry = (item: ShoppingListItem) => {
      // Remove from shopping list
      setShoppingList(prev => prev.filter(i => i.id !== item.id));

      // Add to pantry
      setPantry(prev => {
          // Check if item already exists (case-insensitive)
          if (prev.some(p => p.name.toLowerCase() === item.name.toLowerCase())) {
              // Update volume to 'Refilled (Full)' if it exists
              return prev.map(p => 
                  p.name.toLowerCase() === item.name.toLowerCase() 
                  ? { ...p, volume: 'Refilled (Full)' } 
                  : p
              );
          }
          
          // Create new ingredient
          const newIngredient: Ingredient = {
              id: `manual-${Date.now()}`,
              name: item.name,
              category: 'Other', // Default category
              volume: 'Full'
          };
          
          enrichPantryItem(newIngredient); // Background fetch flavor notes
          return [newIngredient, ...prev];
      });
  };

  // --- Settings / Master Data Logic ---
  const handleAddMasterItem = (item: MasterIngredient) => {
      setMasterData(prev => [...prev, item]);
  };

  const handleRemoveMasterItem = (id: string) => {
      setMasterData(prev => prev.filter(i => i.id !== id));
  };

  const generateRecs = async () => {
    if (pantry.length === 0 && history.length === 0) {
      alert("Please add some ingredients or log some drinks first!");
      return;
    }
    setIsGeneratingRecs(true);
    try {
      const recs = await getRecommendations(userPalate, pantry.map(i => i.name));
      setRecommendations(recs);
    } catch (e) {
      alert("Failed to generate recommendations.");
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  const handleBarHelp = async (mode: 'typical' | 'adventurous') => {
      setIsGeneratingHelp(true);
      try {
          const result = await getBarOrderSuggestion(userPalate, mode);
          setBarHelpResult(result);
          setBarHelpMode('result');
      } catch (e) {
          alert("Couldn't communicate with the bartender assistant.");
          setBarHelpMode(null);
      } finally {
          setIsGeneratingHelp(false);
      }
  };

  // This function now accepts a raw File object to be called from child components
  const handleMenuScan = async (file: File) => {
      if (!file) return;
      
      setIsScanningMenu(true);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
            const cocktails = await recommendFromMenu(base64String, userPalate);
            
            // Map recommendations to Cocktail objects (Drafts)
            const menuItems: Cocktail[] = cocktails.map((rec, idx) => ({
                 id: `menu-scan-${Date.now()}-${idx}`,
                 name: rec.name,
                 description: rec.description,
                 ingredients: rec.ingredientsToUse,
                 instructions: ['From Menu Scan'],
                 flavorProfile: rec.flavorProfile,
                 source: 'Scan', // Mark as Scan
                 creator: 'Menu Scan',
                 creatorType: 'Establishment',
                 dateAdded: new Date().toISOString(),
                 rating: 0 // Untried
            }));
            
            setRecentMenuScans(menuItems);
            
            // Auto-add to history as "Scans"
            setHistory(prev => [...menuItems, ...prev]);
            
            alert(`Digitized ${menuItems.length} drinks from menu! Check Barmulary.`);
            
        } catch(e) {
            alert("Failed to digitize menu.");
        } finally {
            setIsScanningMenu(false);
        }
      };
      reader.readAsDataURL(file);
  };

  const contributingDrinksCount = history.filter(d => d.rating && d.rating >= 3).length;

  return (
    <div className="h-[100dvh] bg-background text-stone-200 font-sans flex flex-col overflow-hidden selection:bg-primary selection:text-white relative">
      
      {/* Fixed Header */}
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
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Beaker className="text-white w-5 h-5 fill-current" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  My <span className="text-primary">Barmassist</span>
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                 {activeTab === 'recipes' && (
                     <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors border border-transparent hover:border-stone-700"
                     >
                        <Search className="w-5 h-5" />
                     </button>
                 )}
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                 >
                    <Settings className="w-5 h-5" />
                 </button>
              </div>
            </>
          )}
        </div>
        
        {/* Persistent Allergy Warning Banner */}
        {settings.allergies.length > 0 && (
            <div className="bg-red-900/90 backdrop-blur text-white text-[10px] font-bold py-1 px-4 text-center border-t border-red-700 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-3 h-3 text-red-400 fill-red-400/20" />
                <span>ALLERGIES: {settings.allergies.join(', ')}</span>
            </div>
        )}
      </header>

      {/* Modal Importer */}
      <RecipeImporter 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
        onAddCocktail={handleAddCocktail} 
        onScanMenu={handleMenuScan}
        isScanningMenu={isScanningMenu}
        recentMenuDrafts={recentMenuScans}
      />

      {/* Detail View Modal */}
      <RecipeDetail 
        cocktail={selectedCocktail}
        onClose={() => setSelectedCocktail(null)}
        pantry={pantry}
        shoppingList={shoppingList}
        onViewRecipe={handleViewRecipe}
        onSave={handleSaveTemporaryCocktail}
        onAddToShoppingList={handleAddToShoppingList}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        masterData={masterData}
        onAddMasterItem={handleAddMasterItem}
        onRemoveMasterItem={handleRemoveMasterItem}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Shopping List Add Modal */}
      <ShoppingListAddModal 
        isOpen={isShoppingAddOpen}
        onClose={() => setIsShoppingAddOpen(false)}
        pantry={pantry}
        masterData={masterData}
        settings={settings}
        onAddToShoppingList={handleAddToShoppingList}
      />
      
      {/* Ingredient Scanner Modal */}
       <IngredientScanner 
          // Manually wire up scanner modal state from App level to share button logic
          onIngredientsFound={handleIngredientsFound}
          // The scanner component manages its own open state internally based on button click, 
          // but we will override its trigger button
          isOpenExternal={isIngredientScannerOpen}
          onCloseExternal={() => setIsIngredientScannerOpen(false)}
       />


      {/* Bar Help Modal */}
      {barHelpMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-700 p-6 relative animate-in zoom-in-95 duration-200">
                  <button 
                      onClick={() => { setBarHelpMode(null); setBarHelpResult(null); }}
                      className="absolute top-4 right-4 text-stone-400 hover:text-white"
                  >
                      <XCircle className="w-6 h-6" />
                  </button>
                  
                  {barHelpMode === 'selection' && (
                      <div className="text-center space-y-6">
                          <h2 className="text-xl font-bold text-white">How are you feeling?</h2>
                          <div className="grid grid-cols-2 gap-4">
                              <button 
                                  onClick={() => handleBarHelp('typical')}
                                  disabled={isGeneratingHelp}
                                  className="bg-stone-800 hover:bg-stone-700 p-6 rounded-xl border border-stone-600 flex flex-col items-center gap-3 group transition-all"
                              >
                                  <ShieldCheck className="w-10 h-10 text-secondary group-hover:scale-110 transition-transform" />
                                  <span className="font-bold text-white">My Typical</span>
                                  <span className="text-[10px] text-stone-400">Stick to what I know I love.</span>
                              </button>
                              
                              <button 
                                  onClick={() => handleBarHelp('adventurous')}
                                  disabled={isGeneratingHelp}
                                  className="bg-stone-800 hover:bg-stone-700 p-6 rounded-xl border border-stone-600 flex flex-col items-center gap-3 group transition-all"
                              >
                                  {isGeneratingHelp ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <Zap className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />}
                                  <span className="font-bold text-white">Adventurous</span>
                                  <span className="text-[10px] text-stone-400">Surprise me. Challenge me.</span>
                              </button>
                          </div>
                      </div>
                  )}

                  {barHelpMode === 'result' && barHelpResult && (
                      <div className="text-center space-y-6">
                          <div>
                              <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Tell the bartender:</div>
                              <div className="bg-white text-stone-950 p-6 rounded-xl font-bold text-xl shadow-xl leading-snug relative">
                                  <MessageCircle className="absolute -top-3 -left-3 w-8 h-8 text-primary fill-white" />
                                  "{barHelpResult.script}"
                              </div>
                          </div>
                          
                          <div className="bg-stone-800 p-4 rounded-xl border border-stone-700">
                              <div className="text-[10px] font-bold text-secondary uppercase mb-1">Pocket Suggestion</div>
                              <div className="text-lg font-bold text-white">{barHelpResult.suggestion}</div>
                              <div className="text-xs text-stone-400 mt-1 italic">{barHelpResult.reasoning}</div>
                          </div>

                          <button 
                              onClick={() => setBarHelpMode('selection')}
                              className="text-sm text-stone-400 hover:text-white underline"
                          >
                              Try another approach
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-md mx-auto p-4 pb-24 space-y-6 min-h-full relative">
          
          {/* PALATE TAB */}
          {activeTab === 'palate' && (
            <div className="space-y-6">
                <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
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

                {palateView === 'diagnosis' ? (
                     <div className="bg-surface rounded-2xl p-6 border border-stone-700 shadow-xl space-y-6">
                        <div>
                            <p className="text-stone-400 text-xs uppercase tracking-widest font-bold">Based on rated order history</p>
                        </div>
                        
                        <div className="-ml-4 -mr-4">
                           <FlavorRadar data={userPalate} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background p-3 rounded-xl border border-stone-700 text-center">
                                <div className="text-stone-500 text-[10px] uppercase tracking-widest mb-1">Dominant</div>
                                <div className="text-lg font-bold text-primary">
                                    {Object.entries(userPalate).reduce((a, b) => a[1] > b[1] ? a : b)[1] > 0 
                                        ? Object.entries(userPalate).reduce((a, b) => a[1] > b[1] ? a : b)[0] 
                                        : '-'}
                                </div>
                            </div>
                            <div className="bg-background p-3 rounded-xl border border-stone-700 text-center">
                                <div className="text-stone-500 text-[10px] uppercase tracking-widest mb-1">Lacking</div>
                                <div className="text-lg font-bold text-stone-400">
                                    {Object.entries(userPalate).reduce((a, b) => a[1] < b[1] ? a : b)[1] > 0
                                        ? Object.entries(userPalate).reduce((a, b) => a[1] < b[1] ? a : b)[0]
                                        : '-'}
                                </div>
                            </div>
                        </div>
                     </div>
                ) : (
                     <div className="bg-surface rounded-2xl p-4 border border-stone-700 shadow-xl text-center space-y-4">
                        <FlavorWheel userProfile={userPalate} />
                     </div>
                )}
            </div>
          )}

          {/* BARMULARY TAB */}
          {activeTab === 'recipes' && (
             <div className="space-y-8">
                <div>
                    <div className="flex items-center justify-between mb-4 gap-2 sticky top-0 bg-background/95 py-2 z-10">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-3 h-3" />
                                Barmulary
                            </h3>
                            {searchQuery && (
                                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Filtered</span>
                            )}
                        </div>
                        
                        <div className="flex bg-stone-800 rounded-lg p-1 border border-stone-700">
                            <button 
                                onClick={() => setFormularyView('drinks')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formularyView === 'drinks' ? 'bg-surface text-white shadow border border-stone-600' : 'text-stone-400'}`}
                            >
                                Drinks
                            </button>
                            <button 
                                onClick={() => setFormularyView('creators')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formularyView === 'creators' ? 'bg-surface text-white shadow border border-stone-600' : 'text-stone-400'}`}
                            >
                                Creators
                            </button>
                            <button 
                                onClick={() => setFormularyView('orders')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formularyView === 'orders' ? 'bg-surface text-secondary shadow border border-stone-600' : 'text-stone-400'}`}
                            >
                                Orders
                            </button>
                        </div>
                    </div>

                    {Object.keys(groupedCocktails).length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-stone-700 rounded-2xl bg-surface/30">
                            {searchQuery ? (
                                <>
                                    <Search className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                                    <p className="text-stone-400 text-sm font-bold">No matches found</p>
                                    <p className="text-stone-500 text-xs">Try a different search term.</p>
                                </>
                            ) : (
                                <p className="text-stone-500 text-sm">No entries found in this view.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(groupedCocktails).map(([groupKey, drinks]: [string, Cocktail[]]) => {
                                // When searching, always expand groups to show matches
                                // For orders view, effectively ignore expansion (it's always shown as list)
                                const isExpanded = (formularyView === 'orders') || (searchQuery ? true : expandedGroups.has(groupKey));
                                // Determine group type for icon
                                const groupType = drinks[0]?.creatorType || 'Person';
                                
                                return (
                                    <div key={groupKey} className={`bg-surface border border-stone-700 rounded-xl overflow-hidden ${formularyView === 'orders' ? 'border-none bg-transparent' : ''}`}>
                                        
                                        {/* Group Header - Hidden for Orders View to show flat list */}
                                        {formularyView !== 'orders' && (
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
                                        )}

                                        {isExpanded && (
                                            <div className={`p-3 gap-3 bg-background grid grid-cols-1`}>
                                                {drinks.map(drink => {
                                                    const missingIngredients = getMissingIngredients(drink.ingredients);
                                                    const itemsToBuy = getItemsToBuy(missingIngredients);
                                                    
                                                    return (
                                                    <div 
                                                      key={drink.id} 
                                                      onClick={() => setSelectedCocktail(drink)}
                                                      className={`bg-surface rounded-lg border border-stone-700 relative overflow-hidden flex cursor-pointer hover:border-stone-500 transition-colors shadow-sm flex-row h-32`}
                                                    >
                                                        {/* Left Column: Text */}
                                                        <div className="flex-1 p-3 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h4 className="text-sm font-bold text-white leading-tight line-clamp-1">{drink.name}</h4>
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
                                                                <div className="flex items-center gap-0.5">
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <button
                                                                            key={star}
                                                                            onClick={(e) => handleRateCocktail(e, drink.id, star)}
                                                                            className="focus:outline-none p-0.5"
                                                                        >
                                                                            <Star 
                                                                                className={`w-3 h-3 ${
                                                                                    (drink.rating || 0) >= star 
                                                                                    ? 'fill-secondary text-secondary' 
                                                                                    : 'text-stone-600' 
                                                                                }`} 
                                                                            />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {missingIngredients.length > 0 ? (
                                                                        itemsToBuy.length === 0 ? (
                                                                             <div className="p-1 text-secondary flex items-center gap-1 bg-secondary/10 rounded px-2" title="Items in Cart">
                                                                                 <ShoppingCart className="w-3.5 h-3.5" />
                                                                                 <Check className="w-3 h-3" />
                                                                             </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleAddToShoppingList(itemsToBuy); }}
                                                                                className="p-1 text-stone-500 hover:text-secondary hover:bg-stone-800 rounded transition-colors flex items-center gap-1"
                                                                                title={`Add ${itemsToBuy.length} items to list`}
                                                                            >
                                                                                <div className="relative">
                                                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full flex items-center justify-center text-[6px] font-bold text-black border border-stone-900">+</div>
                                                                                </div>
                                                                            </button>
                                                                        )
                                                                    ) : (
                                                                        <div className="p-1 text-green-500" title="In Stock">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                    <button 
                                                                        onClick={(e) => handleDeleteCocktail(e, drink.id)}
                                                                        className="text-stone-600 hover:text-red-400 p-1"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right Column: Visual */}
                                                        <div className="w-28 bg-stone-900 relative shrink-0 border-l border-stone-700 group h-full">
                                                            {drink.imageUrl ? (
                                                                <>
                                                                    <img 
                                                                        src={drink.imageUrl} 
                                                                        alt={drink.name} 
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            const target = e.currentTarget;
                                                                            if (target.src !== 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400') {
                                                                                target.src = 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400';
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-surface/50 to-transparent"></div>
                                                                    {drink.creator === 'AI Bartender' && (
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
                                                )}})}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* FAB - Recipe Importer */}
                <button 
                    onClick={() => setIsImporterOpen(true)}
                    className={`fixed bottom-20 ${fabPosition} z-40 bg-primary text-white p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                >
                    <Plus className="w-6 h-6" />
                </button>
             </div>
          )}

          {/* BAR TAB */}
          {activeTab === 'bar' && (
            <div className="space-y-6">
                
                {/* View Toggle */}
                <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
                   <button 
                      onClick={() => setBarView('shopping')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${barView === 'shopping' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <ShoppingCart className="w-4 h-4" />
                      Shopping List
                   </button>
                   <button 
                      onClick={() => setBarView('pantry')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${barView === 'pantry' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <Wine className="w-4 h-4" />
                      Pantry Inventory
                   </button>
                </div>

                {/* Shopping List Section */}
                {barView === 'shopping' && (
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

                         {/* Shopping List FAB */}
                         <button 
                            onClick={() => setIsShoppingAddOpen(true)}
                            className={`fixed bottom-20 ${fabPosition} z-40 bg-secondary text-stone-900 p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {/* Pantry Inventory Section */}
                {barView === 'pantry' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                         {/* Pantry FAB logic handled inside IngredientScanner via props now */}
                         <button 
                            onClick={() => setIsIngredientScannerOpen(true)}
                            className={`fixed bottom-20 ${fabPosition} z-40 bg-secondary text-stone-900 p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                        
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
                                    {pantry.map(item => (
                                        <div key={item.id} className="bg-background p-3 rounded-lg border border-stone-700 relative group">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 mr-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                       <p className="text-sm font-bold text-white truncate">{item.name}</p>
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
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
          )}

          {/* RECOMMEND TAB */}
          {activeTab === 'recommend' && (
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-secondary/10 to-primary/5 p-6 rounded-2xl border border-secondary/20 space-y-4">
                    <div>
                        <h2 className="text-xl font-bold text-primary">Prescription</h2>
                        <p className="text-stone-400 text-xs mt-1">
                            Get a diagnosis for your home bar or a night out.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={generateRecs}
                            disabled={isGeneratingRecs}
                            className="bg-primary text-stone-950 px-4 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {isGeneratingRecs && !isScanningMenu ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChefHat className="w-6 h-6" />}
                            <span className="text-xs">From Pantry</span>
                        </button>

                        <button 
                            onClick={() => menuInputRef.current?.click()}
                            disabled={isGeneratingRecs}
                            className="bg-surface text-stone-200 border border-stone-600 px-4 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-stone-700 hover:border-primary transition-all disabled:opacity-50 shadow-lg"
                        >
                             {isScanningMenu ? <Loader2 className="w-6 h-6 animate-spin text-secondary" /> : <ScanLine className="w-6 h-6 text-secondary" />}
                            <span className="text-xs">Scan Menu</span>
                        </button>
                        <input 
                            type="file" 
                            accept="image/*"
                            capture="environment" 
                            ref={menuInputRef} 
                            className="hidden"
                            onChange={(e) => e.target.files && handleMenuScan(e.target.files[0])}
                        />
                    </div>

                    <div className="pt-4 border-t border-secondary/10">
                        <button 
                            onClick={() => setBarHelpMode('selection')}
                            className="w-full bg-stone-800 border border-stone-700 text-stone-300 p-4 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-700 hover:border-white/20 transition-all group"
                        >
                            <div className="bg-stone-700 p-2 rounded-full group-hover:bg-stone-600 transition-colors">
                                <HelpCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-white">Bar Assist</div>
                                <div className="text-[10px] text-stone-500">Not sure what to order?</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {recommendations.map((rec, idx) => (
                        <div key={idx} className="bg-surface rounded-2xl border border-stone-700 overflow-hidden flex flex-col shadow-md">
                            <div className="p-1 bg-gradient-to-r from-primary to-secondary h-1" />
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-white">{rec.name}</h3>
                                    <div className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] font-bold border border-secondary/20">
                                        {rec.matchScore}% Match
                                    </div>
                                </div>
                                <p className="text-stone-400 text-sm mb-4">{rec.description}</p>
                                
                                <div className="space-y-3">
                                    {/* Ingredients List */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-stone-500 uppercase mb-1">Ingredients</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {rec.ingredientsToUse.map(ing => (
                                                <span key={ing} className="text-[10px] text-stone-300 bg-background px-2 py-1 rounded border border-stone-700">{ing}</span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Missing Ingredients */}
                                    {rec.missingIngredients.length > 0 && (
                                        <div className="bg-accent/5 border border-accent/10 p-3 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] text-accent font-bold mb-1">Acquire Compounds:</p>
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

                                    {/* Procedure / Notes */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-stone-500 uppercase mb-1">Procedure</h4>
                                        <p className="text-xs text-stone-300 bg-background p-3 rounded-lg border border-stone-700 leading-relaxed">{rec.instructions}</p>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

        </div>
      </main>

      {/* Fixed Bottom Nav */}
      <nav className="flex-none z-30 bg-surface border-t border-stone-700 pb-safe">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          <button 
             onClick={() => setActiveTab('palate')} 
             className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'palate' ? 'text-primary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'palate' ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] font-bold">Palate</span>
          </button>
          <button 
             onClick={() => setActiveTab('recipes')} 
             className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'recipes' ? 'text-white' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === 'recipes' ? 'fill-white/20' : ''}`} />
            <span className="text-[10px] font-bold">Barmulary</span>
          </button>
          <button 
             onClick={() => setActiveTab('bar')} 
             className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'bar' ? 'text-secondary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <Wine className={`w-5 h-5 ${activeTab === 'bar' ? 'fill-secondary/20' : ''}`} />
            <span className="text-[10px] font-bold">Bar</span>
          </button>
          <button 
             onClick={() => setActiveTab('recommend')} 
             className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'recommend' ? 'text-accent' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <ChefHat className={`w-5 h-5 ${activeTab === 'recommend' ? 'fill-accent/20' : ''}`} />
            <span className="text-[10px] font-bold">Rx</span>
          </button>
        </div>
      </nav>
    </div>
  );
}