import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Beaker, ChefHat, BarChart3, Trash2, Sparkles, Loader2, Wine, BookOpen, ExternalLink, User, ChevronDown, ChevronUp, Layers, Star, Disc, Plus, ImageIcon, Pencil, Check, Camera, ScanLine, Beer, Calendar, MapPin, HelpCircle, ShieldCheck, Zap, XCircle, MessageCircle, Store, Globe, Search, X, ShoppingCart, Minus, Archive, Settings, AlertTriangle, CheckCircle2, ShoppingBag, History, Info } from 'lucide-react';
import FlavorRadar from './components/RadarChart';
import IngredientScanner from './components/IngredientScanner';
import RecipeImporter from './components/RecipeImporter';
import RecipeDetail from './components/RecipeDetail';
import FlavorWheel from './components/FlavorWheel';
import SettingsModal from './components/SettingsModal';
import ShoppingListAddModal from './components/ShoppingListAddModal';
import HowItWorksModal from './components/HowItWorksModal';
import { Cocktail, Ingredient, FlavorProfile, FlavorDimension, Recommendation, ShoppingListItem, MasterIngredient, AppSettings } from './types';
import { getRecommendations, generateCocktailImage, enrichIngredientDetails, recommendFromMenu, getBarOrderSuggestion, deduceRecipe } from './services/geminiService';

// Default empty profile for fallback
const INITIAL_PROFILE: FlavorProfile = {
  Sweet: 0, Sour: 0, Bitter: 0, Boozy: 0, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0
};

// Expanded Master Data with Brands and Flavor Profiles
const INITIAL_MASTER_DATA: MasterIngredient[] = [
    // --- GIN ---
    { id: 'm-gin-gen', name: 'Gin (General)', category: 'Spirit', subCategory: 'Gin', abv: 40, isGeneric: true, defaultFlavorNotes: 'Juniper-forward, herbal, botanical backbone.' },
    { id: 'm-gin-ld', name: 'London Dry Gin', category: 'Spirit', subCategory: 'Gin', abv: 40, isGeneric: true, defaultFlavorNotes: 'Dry, crisp, heavy juniper, citrus peel.' },
    { id: 'm-gin-tanq', name: 'Tanqueray London Dry', category: 'Spirit', subCategory: 'Gin', abv: 47.3, isGeneric: false, defaultFlavorNotes: 'Bold juniper, coriander, angelica, licorice. Crisp.' },
    { id: 'm-gin-beef', name: 'Beefeater London Dry', category: 'Spirit', subCategory: 'Gin', abv: 44, isGeneric: false, defaultFlavorNotes: 'Classic, balanced, almond and orange notes.' },
    { id: 'm-gin-hend', name: 'Hendrick\'s Gin', category: 'Spirit', subCategory: 'Gin', abv: 41.4, isGeneric: false, defaultFlavorNotes: 'Rose and cucumber infusion, floral, non-traditional.' },
    { id: 'm-gin-plym', name: 'Plymouth Gin', category: 'Spirit', subCategory: 'Gin', abv: 41.2, isGeneric: false, defaultFlavorNotes: 'Earthy, less dry, citrus forward, softer juniper.' },
    { id: 'm-gin-monk', name: 'Monkey 47', category: 'Spirit', subCategory: 'Gin', abv: 47, isGeneric: false, defaultFlavorNotes: 'Complex, berry notes, woody, extremely herbal.' },
    { id: 'm-gin-bot', name: 'The Botanist', category: 'Spirit', subCategory: 'Gin', abv: 46, isGeneric: false, defaultFlavorNotes: 'Islay floral, menthol, sweet citrus, wild herbs.' },

    // --- WHISKEY (RYE) ---
    { id: 'm-rye-gen', name: 'Rye Whiskey', category: 'Spirit', subCategory: 'Rye', abv: 45, isGeneric: true, defaultFlavorNotes: 'Spicy, grainy, dry finish.' },
    { id: 'm-rye-ritt', name: 'Rittenhouse Rye', category: 'Spirit', subCategory: 'Rye', abv: 50, isGeneric: false, defaultFlavorNotes: 'Bottled-in-bond, cocoa, citrus, baking spices, robust.' },
    { id: 'm-rye-saz', name: 'Sazerac Rye', category: 'Spirit', subCategory: 'Rye', abv: 45, isGeneric: false, defaultFlavorNotes: 'Vanilla, pepper, anise, candied spices.' },
    { id: 'm-rye-bull', name: 'Bulleit Rye', category: 'Spirit', subCategory: 'Rye', abv: 45, isGeneric: false, defaultFlavorNotes: 'Russet, oaky, clean finish, cherry notes.' },
    { id: 'm-rye-over', name: 'Old Overholt Bonded', category: 'Spirit', subCategory: 'Rye', abv: 50, isGeneric: false, defaultFlavorNotes: 'Peanut brittle, rye spice, toasted oak.' },

    // --- WHISKEY (BOURBON) ---
    { id: 'm-bour-gen', name: 'Bourbon', category: 'Spirit', subCategory: 'Bourbon', abv: 40, isGeneric: true, defaultFlavorNotes: 'Sweet corn, caramel, vanilla, oak.' },
    { id: 'm-bour-buff', name: 'Buffalo Trace', category: 'Spirit', subCategory: 'Bourbon', abv: 45, isGeneric: false, defaultFlavorNotes: 'Molasses, mint, vanilla, brown sugar.' },
    { id: 'm-bour-mak', name: 'Maker\'s Mark', category: 'Spirit', subCategory: 'Bourbon', abv: 45, isGeneric: false, defaultFlavorNotes: 'Wheated, sweet, soft, butterscotch.' },
    { id: 'm-bour-wood', name: 'Woodford Reserve', category: 'Spirit', subCategory: 'Bourbon', abv: 45.2, isGeneric: false, defaultFlavorNotes: 'Dried fruit, orange, cocoa, tobacco.' },
    { id: 'm-bour-wild', name: 'Wild Turkey 101', category: 'Spirit', subCategory: 'Bourbon', abv: 50.5, isGeneric: false, defaultFlavorNotes: 'High rye kick, bold oak, caramel, spicy.' },

    // --- TEQUILA & MEZCAL ---
    { id: 'm-teq-bla', name: 'Tequila Blanco', category: 'Spirit', subCategory: 'Tequila', abv: 40, isGeneric: true, defaultFlavorNotes: 'Unaged, agave forward, citrus, pepper.' },
    { id: 'm-teq-repo', name: 'Tequila Reposado', category: 'Spirit', subCategory: 'Tequila', abv: 40, isGeneric: true, defaultFlavorNotes: 'Lightly aged, vanilla hint, softer agave.' },
    { id: 'm-teq-esp', name: 'Espolòn Blanco', category: 'Spirit', subCategory: 'Tequila', abv: 40, isGeneric: false, defaultFlavorNotes: 'Floral, tropical fruit, lemon zest, pepper.' },
    { id: 'm-teq-for', name: 'Fortaleza Blanco', category: 'Spirit', subCategory: 'Tequila', abv: 40, isGeneric: false, defaultFlavorNotes: 'Olive brine, butter, cooked agave, earth.' },
    { id: 'm-teq-cas', name: 'Casamigos Blanco', category: 'Spirit', subCategory: 'Tequila', abv: 40, isGeneric: false, defaultFlavorNotes: 'Extremely sweet, vanilla-forward, crowd pleaser.' },
    { id: 'm-mez-vid', name: 'Del Maguey Vida', category: 'Spirit', subCategory: 'Mezcal', abv: 42, isGeneric: false, defaultFlavorNotes: 'Smoke, honey, roast agave, fruity.' },

    // --- RUM ---
    { id: 'm-rum-white', name: 'White Rum', category: 'Spirit', subCategory: 'Rum', abv: 40, isGeneric: true, defaultFlavorNotes: 'Light, clean, molasses sweetness.' },
    { id: 'm-rum-bac', name: 'Bacardi Superior', category: 'Spirit', subCategory: 'Rum', abv: 40, isGeneric: false, defaultFlavorNotes: 'Neutral, vanilla, almond notes.' },
    { id: 'm-rum-plan', name: 'Plantation 3 Stars', category: 'Spirit', subCategory: 'Rum', abv: 41.2, isGeneric: false, defaultFlavorNotes: 'Tropical fruit, brown sugar, crisp.' },
    { id: 'm-rum-gos', name: 'Goslings Black Seal', category: 'Spirit', subCategory: 'Rum', abv: 40, isGeneric: false, defaultFlavorNotes: 'Dark, rich, stewed fruit, spice.' },
    { id: 'm-rum-smi', name: 'Smith & Cross', category: 'Spirit', subCategory: 'Rum', abv: 57, isGeneric: false, defaultFlavorNotes: 'Funky, hogo, rotting banana, spice, high proof.' },

    // --- APERITIFS & DIGESTIFS ---
    { id: 'm-am-camp', name: 'Campari', category: 'Spirit', subCategory: 'Amaro', abv: 24, isGeneric: false, defaultFlavorNotes: 'Intense bitter orange, rhubarb, herbs.' },
    { id: 'm-am-aper', name: 'Aperol', category: 'Spirit', subCategory: 'Amaro', abv: 11, isGeneric: false, defaultFlavorNotes: 'Sweet orange, gentian, rhubarb, light.' },
    { id: 'm-am-fer', name: 'Fernet-Branca', category: 'Spirit', subCategory: 'Amaro', abv: 39, isGeneric: false, defaultFlavorNotes: 'Menthol, saffron, chamomile, extremely bitter.' },
    { id: 'm-am-non', name: 'Amaro Nonino', category: 'Spirit', subCategory: 'Amaro', abv: 35, isGeneric: false, defaultFlavorNotes: 'Grappa based, orange, caramel, thyme, gentle.' },
    { id: 'm-am-mon', name: 'Amaro Montenegro', category: 'Spirit', subCategory: 'Amaro', abv: 23, isGeneric: false, defaultFlavorNotes: 'Rose, vanilla, orange peel, coriander, sweet.' },
    { id: 'm-am-chart', name: 'Green Chartreuse', category: 'Spirit', subCategory: 'Liqueur', abv: 55, isGeneric: false, defaultFlavorNotes: 'Complex herbs, pine, spice, honey, high proof.' },

    // --- VERMOUTH ---
    { id: 'm-ver-sweet', name: 'Sweet Vermouth', category: 'Spirit', subCategory: 'Vermouth', abv: 16, isGeneric: true, defaultFlavorNotes: 'Spiced wine, caramel, botanical sweetness.' },
    { id: 'm-ver-carp', name: 'Carpano Antica', category: 'Spirit', subCategory: 'Vermouth', abv: 16.5, isGeneric: false, defaultFlavorNotes: 'Rich vanilla, cocoa, dried fruit, bold.' },
    { id: 'm-ver-dol', name: 'Dolin Rouge', category: 'Spirit', subCategory: 'Vermouth', abv: 16, isGeneric: false, defaultFlavorNotes: 'Lighter, floral, herbal, balanced sweetness.' },
    { id: 'm-ver-dry', name: 'Dry Vermouth', category: 'Spirit', subCategory: 'Vermouth', abv: 16, isGeneric: true, defaultFlavorNotes: 'Crisp white wine, herbal, floral, dry.' },

    // --- MIXERS & BASICS ---
    { id: 'm-mix-simp', name: 'Simple Syrup', category: 'Mixer', subCategory: 'Syrup', abv: 0, isGeneric: true, defaultFlavorNotes: 'Pure sweetness, texture.' },
    { id: 'm-mix-lem', name: 'Lemon Juice', category: 'Mixer', subCategory: 'Citrus', abv: 0, isGeneric: true, defaultFlavorNotes: 'Bright acidity, sour.' },
    { id: 'm-mix-lim', name: 'Lime Juice', category: 'Mixer', subCategory: 'Citrus', abv: 0, isGeneric: true, defaultFlavorNotes: 'Tart, tropical acidity, zesty.' },
    { id: 'm-mix-ang', name: 'Angostura Bitters', category: 'Other', subCategory: 'Bitters', abv: 44.7, isGeneric: false, defaultFlavorNotes: 'Clove, cinnamon, baking spices, bitter backbone.' }
];

const INITIAL_SETTINGS: AppSettings = {
    lowStockKeywords: ['empty', 'low', '10%', 'near empty', 'almost gone', 'running low'],
    allergies: [],
    handedness: 'right'
};

// HIGH-END MIXOLOGY LIBRARY
const INITIAL_RECIPES: Cocktail[] = [
  // --- MODERN CLASSICS (NYC, London, etc) ---
  {
    id: 'oaxacan-old-fashioned',
    name: 'Oaxacan Old Fashioned',
    description: 'The modern classic that introduced Mezcal to the masses.',
    ingredients: ['1.5 oz Reposado Tequila', '0.5 oz Mezcal', '1 tsp Agave Nectar', '2 dashes Angostura Bitters'],
    instructions: ['Stir with ice.', 'Strain into rocks glass over one large ice cube.', 'Garnish with a flamed orange twist.'],
    flavorProfile: { Sweet: 3, Sour: 0, Bitter: 2, Boozy: 7, Herbal: 2, Fruity: 1, Spicy: 2, Smoky: 6 },
    source: 'Manual', creator: 'Phil Ward (Death & Co)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'naked-and-famous',
    name: 'Naked and Famous',
    description: 'A smoky, herbal relative of the Paper Plane and Last Word.',
    ingredients: ['0.75 oz Mezcal', '0.75 oz Yellow Chartreuse', '0.75 oz Aperol', '0.75 oz Lime Juice'],
    instructions: ['Shake with ice.', 'Double strain into chilled coupe.'],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 4, Boozy: 5, Herbal: 6, Fruity: 2, Spicy: 0, Smoky: 5 },
    source: 'Manual', creator: 'Joaquin Simo (Death & Co)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'penicillin',
    name: 'Penicillin',
    description: 'The gold standard of modern scotch cocktails. Spicy, smoky, and curing.',
    ingredients: ['2 oz Blended Scotch', '0.75 oz Lemon Juice', '0.75 oz Honey-Ginger Syrup', '0.25 oz Islay Scotch (Float)'],
    instructions: ['Shake blended scotch, lemon, and syrup with ice.', 'Strain over fresh ice in rocks glass.', 'Float Islay scotch on top.', 'Garnish with candied ginger.'],
    flavorProfile: { Sweet: 4, Sour: 5, Bitter: 1, Boozy: 5, Herbal: 1, Fruity: 0, Spicy: 6, Smoky: 7 },
    source: 'Manual', creator: 'Sam Ross (Milk & Honey)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'paper-plane',
    name: 'Paper Plane',
    description: 'A perfectly balanced modern classic bourbon sour.',
    ingredients: ['0.75 oz Bourbon', '0.75 oz Aperol', '0.75 oz Amaro Nonino', '0.75 oz Lemon Juice'],
    instructions: ['Shake with ice.', 'Double strain into chilled coupe.'],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 3, Boozy: 5, Herbal: 3, Fruity: 3, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Sam Ross (Milk & Honey)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'gold-rush',
    name: 'Gold Rush',
    description: 'A Whiskey Sour made with honey syrup. Simple and effective.',
    ingredients: ['2 oz Bourbon', '0.75 oz Lemon Juice', '0.75 oz Honey Syrup'],
    instructions: ['Shake with ice.', 'Strain into rocks glass over large ice.'],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 0, Boozy: 5, Herbal: 0, Fruity: 1, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'T.J. Siegal (Milk & Honey)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'division-bell',
    name: 'Division Bell',
    description: 'A mezcal-forward Last Word riff with Aperol.',
    ingredients: ['1 oz Mezcal', '0.75 oz Aperol', '0.5 oz Maraschino Liqueur', '0.75 oz Lime Juice'],
    instructions: ['Shake with ice.', 'Double strain into chilled coupe.', 'Garnish with grapefruit twist.'],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 3, Boozy: 6, Herbal: 2, Fruity: 2, Spicy: 0, Smoky: 5 },
    source: 'Manual', creator: 'Phil Ward (Mayahuel)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'enzoni',
    name: 'Enzoni',
    description: 'A cross between a Negroni and a Gin Sour with fresh grapes.',
    ingredients: ['1 oz Gin', '1 oz Campari', '0.75 oz Lemon Juice', '0.5 oz Simple Syrup', '5 Grapes'],
    instructions: ['Muddle grapes in shaker.', 'Add remaining ingredients and shake with ice.', 'Double strain into rocks glass over ice.'],
    flavorProfile: { Sweet: 4, Sour: 5, Bitter: 5, Boozy: 4, Herbal: 2, Fruity: 4, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Vincenzo Errico', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'old-cuban',
    name: 'Old Cuban',
    description: 'An elegant update to the Mojito using aged rum and champagne.',
    ingredients: ['1.5 oz Aged Rum', '0.75 oz Lime Juice', '1 oz Simple Syrup', '2 dashes Angostura', '6 Mint Leaves', '2 oz Champagne'],
    instructions: ['Shake all but champagne with ice.', 'Double strain into coupe.', 'Top with champagne.'],
    flavorProfile: { Sweet: 4, Sour: 4, Bitter: 1, Boozy: 5, Herbal: 4, Fruity: 2, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Audrey Saunders (Pegu Club)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'espresso-martini',
    name: 'Espresso Martini',
    description: 'The definitive pick-me-up cocktail.',
    ingredients: ['2 oz Vodka', '1 oz Espresso (hot)', '0.5 oz Coffee Liqueur', '0.25 oz Simple Syrup'],
    instructions: ['Shake hard with ice to aerate.', 'Strain into chilled coupe.', 'Garnish with 3 coffee beans.'],
    flavorProfile: { Sweet: 6, Sour: 0, Bitter: 4, Boozy: 5, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 1 },
    source: 'Manual', creator: 'Dick Bradsell', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'siesta',
    name: 'Siesta',
    description: 'A Hemingway Daiquiri meets the Margarita with Campari.',
    ingredients: ['1.5 oz Tequila Blanco', '0.5 oz Campari', '0.5 oz Grapefruit Juice', '0.5 oz Lime Juice', '0.5 oz Simple Syrup'],
    instructions: ['Shake with ice.', 'Strain into chilled coupe.', 'Garnish with grapefruit twist.'],
    flavorProfile: { Sweet: 4, Sour: 6, Bitter: 4, Boozy: 5, Herbal: 2, Fruity: 4, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Katie Stipe (Flatiron Lounge)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'revolver',
    name: 'Revolver',
    description: 'A bourbon Manhattan with coffee liqueur in place of vermouth.',
    ingredients: ['2 oz Bourbon', '0.5 oz Coffee Liqueur', '2 dashes Orange Bitters'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with flamed orange peel.'],
    flavorProfile: { Sweet: 4, Sour: 0, Bitter: 1, Boozy: 8, Herbal: 0, Fruity: 1, Spicy: 2, Smoky: 1 },
    source: 'Manual', creator: 'Jon Santer', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'black-manhattan',
    name: 'Black Manhattan',
    description: 'Substituting sweet vermouth with Amaro Averna.',
    ingredients: ['2 oz Rye Whiskey', '1 oz Amaro Averna', '1 dash Angostura Bitters', '1 dash Orange Bitters'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with cherry.'],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 4, Boozy: 8, Herbal: 5, Fruity: 1, Spicy: 2, Smoky: 0 },
    source: 'Manual', creator: 'Todd Smith (Bourbon & Branch)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },

  // --- NEGRONI & APERITIFS ---
  {
    id: 'negroni',
    name: 'Negroni',
    description: 'The king of Italian cocktails. Equal parts balance.',
    ingredients: ['1 oz Gin', '1 oz Campari', '1 oz Sweet Vermouth'],
    instructions: ['Stir with ice.', 'Strain into rocks glass over ice.', 'Garnish with orange peel.'],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 6, Boozy: 6, Herbal: 6, Fruity: 2, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'boulevardier',
    name: 'Boulevardier',
    description: 'The whiskey variation of the Negroni.',
    ingredients: ['1.5 oz Bourbon or Rye', '1 oz Campari', '1 oz Sweet Vermouth'],
    instructions: ['Stir with ice.', 'Strain into rocks glass over ice.', 'Garnish with orange peel.'],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 6, Boozy: 7, Herbal: 4, Fruity: 2, Spicy: 2, Smoky: 0 },
    source: 'Manual', creator: 'Harry McElhone', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'white-negroni',
    name: 'White Negroni',
    description: 'A lighter, floral take on the classic.',
    ingredients: ['1.5 oz Gin', '1 oz Lillet Blanc', '0.75 oz Suze'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe or rocks glass.', 'Garnish with lemon twist.'],
    flavorProfile: { Sweet: 4, Sour: 1, Bitter: 7, Boozy: 6, Herbal: 7, Fruity: 2, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Wayne Collins', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'negroni-sbagliato',
    name: 'Negroni Sbagliato',
    description: 'A "mistaken" Negroni with Prosecco instead of Gin.',
    ingredients: ['1 oz Campari', '1 oz Sweet Vermouth', '1 oz Prosecco'],
    instructions: ['Build in glass over ice.', 'Stir gently.', 'Garnish with orange slice.'],
    flavorProfile: { Sweet: 6, Sour: 2, Bitter: 5, Boozy: 3, Herbal: 4, Fruity: 3, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Bar Basso', creatorType: 'Establishment', dateAdded: new Date().toISOString()
  },
  {
    id: 'hanky-panky',
    name: 'Hanky Panky',
    description: 'A sweet martini style drink with a Fernet kick.',
    ingredients: ['1.5 oz Gin', '1.5 oz Sweet Vermouth', '2 dashes Fernet-Branca'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with orange twist.'],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 5, Boozy: 6, Herbal: 7, Fruity: 2, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Ada Coleman (Savoy)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },

  // --- SPIRIT FORWARD (MANHATTAN / MARTINI) ---
  {
    id: 'manhattan',
    name: 'Manhattan',
    description: 'The essential whiskey classic.',
    ingredients: ['2 oz Rye Whiskey', '1 oz Sweet Vermouth', '2 dashes Angostura Bitters'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with cherry.'],
    flavorProfile: { Sweet: 4, Sour: 0, Bitter: 2, Boozy: 7, Herbal: 2, Fruity: 1, Spicy: 2, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'vieux-carre',
    name: 'Vieux Carré',
    description: 'A complex, herbal New Orleans classic.',
    ingredients: ['1 oz Rye Whiskey', '1 oz Cognac', '1 oz Sweet Vermouth', '1 tsp Benedictine', '2 dashes Peychaud\'s', '2 dashes Angostura'],
    instructions: ['Stir with ice.', 'Strain into rocks glass over ice.', 'Garnish with lemon twist.'],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 2, Boozy: 8, Herbal: 5, Fruity: 2, Spicy: 2, Smoky: 0 },
    source: 'Manual', creator: 'Walter Bergeron (Hotel Monteleone)', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'la-louisiane',
    name: 'La Louisiane',
    description: 'The Rye and Absinthe powerhouse of New Orleans.',
    ingredients: ['2 oz Rye Whiskey', '0.75 oz Sweet Vermouth', '0.5 oz Benedictine', '3 dashes Absinthe', '3 dashes Peychaud\'s'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with cherry.'],
    flavorProfile: { Sweet: 5, Sour: 0, Bitter: 1, Boozy: 8, Herbal: 7, Fruity: 1, Spicy: 3, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'sazerac',
    name: 'Sazerac',
    description: 'The official cocktail of New Orleans.',
    ingredients: ['2 oz Rye Whiskey', '0.25 oz Simple Syrup', '4 dashes Peychaud\'s Bitters', 'Absinthe (rinse)'],
    instructions: ['Rinse chilled glass with absinthe.', 'Stir whiskey, sugar, bitters with ice.', 'Strain into glass (neat).', 'Express lemon oil and discard peel.'],
    flavorProfile: { Sweet: 3, Sour: 0, Bitter: 2, Boozy: 9, Herbal: 4, Fruity: 0, Spicy: 4, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'martinez',
    name: 'Martinez',
    description: 'The precursor to the Martini.',
    ingredients: ['1.5 oz Old Tom Gin', '1.5 oz Sweet Vermouth', '1 tsp Maraschino Liqueur', '2 dashes Orange Bitters'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with lemon twist.'],
    flavorProfile: { Sweet: 6, Sour: 0, Bitter: 1, Boozy: 6, Herbal: 4, Fruity: 2, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Jerry Thomas', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'dry-martini',
    name: 'Dry Martini',
    description: 'The ultimate test of a bartender.',
    ingredients: ['2.5 oz London Dry Gin', '0.5 oz Dry Vermouth', '1 dash Orange Bitters'],
    instructions: ['Stir with ice.', 'Strain into chilled coupe.', 'Garnish with lemon twist or olive.'],
    flavorProfile: { Sweet: 0, Sour: 1, Bitter: 2, Boozy: 9, Herbal: 6, Fruity: 1, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },

  // --- AGAVE CLASSICS ---
  {
    id: 'tommys-margarita',
    name: 'Tommy\'s Margarita',
    description: 'The modern standard, highlighting agave flavor.',
    ingredients: ['2 oz Blanco Tequila', '1 oz Lime Juice', '0.5 oz Agave Nectar'],
    instructions: ['Shake with ice.', 'Strain into rocks glass over ice.', 'Salt rim optional.'],
    flavorProfile: { Sweet: 4, Sour: 6, Bitter: 0, Boozy: 5, Herbal: 2, Fruity: 1, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Julio Bermejo', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'paloma',
    name: 'Paloma',
    description: 'Mexico\'s most beloved cocktail.',
    ingredients: ['2 oz Tequila', '0.5 oz Lime Juice', 'Top with Grapefruit Soda', 'Pinch of Salt'],
    instructions: ['Build in highball glass with ice.', 'Stir gently.'],
    flavorProfile: { Sweet: 4, Sour: 5, Bitter: 2, Boozy: 4, Herbal: 1, Fruity: 6, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'el-diablo',
    name: 'El Diablo',
    description: 'Tequila, cassis, and ginger. A perfect balance.',
    ingredients: ['1.5 oz Reposado Tequila', '0.5 oz Crème de Cassis', '0.5 oz Lime Juice', '3 oz Ginger Beer'],
    instructions: ['Build tequila, lime, and ginger beer in highball with ice.', 'Float Cassis on top.'],
    flavorProfile: { Sweet: 5, Sour: 4, Bitter: 0, Boozy: 4, Herbal: 0, Fruity: 5, Spicy: 4, Smoky: 0 },
    source: 'Manual', creator: 'Trader Vic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },

  // --- TIKI & RUM ---
  {
    id: 'mai-tai',
    name: 'Mai Tai',
    description: 'The definition of the Tropical cocktail. Accept no substitutes.',
    ingredients: ['1 oz Aged Jamaican Rum', '1 oz Martinique Rhum Agricole', '0.5 oz Dry Curacao', '0.25 oz Orgeat', '0.25 oz Simple Syrup', '1 oz Lime Juice'],
    instructions: ['Shake with crushed ice.', 'Pour unstrained into double rocks glass.', 'Garnish with mint sprig and spent lime shell.'],
    flavorProfile: { Sweet: 5, Sour: 6, Bitter: 0, Boozy: 6, Herbal: 1, Fruity: 3, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Trader Vic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'jungle-bird',
    name: 'Jungle Bird',
    description: 'A 70s tiki classic using Campari.',
    ingredients: ['1.5 oz Black Blended Rum', '0.75 oz Campari', '1.5 oz Pineapple Juice', '0.5 oz Lime Juice', '0.5 oz Demerara Syrup'],
    instructions: ['Shake with ice.', 'Strain into rocks glass over ice.'],
    flavorProfile: { Sweet: 6, Sour: 5, Bitter: 5, Boozy: 5, Herbal: 2, Fruity: 7, Spicy: 1, Smoky: 1 },
    source: 'Manual', creator: 'Aviary Bar (KL)', creatorType: 'Establishment', dateAdded: new Date().toISOString()
  },
  {
    id: 'zombie',
    name: 'Zombie',
    description: 'The deadly original that started it all.',
    ingredients: ['1.5 oz Jamaican Rum', '1.5 oz Gold Puerto Rican Rum', '1 oz 151 Demerara Rum', '0.75 oz Lime Juice', '0.5 oz Falernum', '0.5 oz Donn\'s Mix', '1 tsp Grenadine', '1 dash Angostura', '6 drops Pernod'],
    instructions: ['Flash blend with crushed ice.', 'Pour into tall glass.', 'Garnish with mint.'],
    flavorProfile: { Sweet: 6, Sour: 6, Bitter: 1, Boozy: 9, Herbal: 4, Fruity: 5, Spicy: 4, Smoky: 0 },
    source: 'Manual', creator: 'Donn Beach', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'painkiller',
    name: 'Painkiller',
    description: 'A rich coconut and pineapple classic from the BVI.',
    ingredients: ['2 oz Pusser\'s Rum', '4 oz Pineapple Juice', '1 oz Orange Juice', '1 oz Cream of Coconut'],
    instructions: ['Shake with ice.', 'Pour unstrained into tall glass.', 'Garnish with fresh nutmeg.'],
    flavorProfile: { Sweet: 8, Sour: 3, Bitter: 0, Boozy: 4, Herbal: 0, Fruity: 9, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Soggy Dollar Bar', creatorType: 'Establishment', dateAdded: new Date().toISOString()
  },
  {
    id: 'chartreuse-swizzle',
    name: 'Chartreuse Swizzle',
    description: 'A modern tiki classic using Green Chartreuse as the base.',
    ingredients: ['1.25 oz Green Chartreuse', '0.5 oz Falernum', '1 oz Pineapple Juice', '0.75 oz Lime Juice'],
    instructions: ['Build in highball glass.', 'Fill with crushed ice.', 'Swizzle until frosty.', 'Garnish with mint and nutmeg.'],
    flavorProfile: { Sweet: 6, Sour: 5, Bitter: 1, Boozy: 6, Herbal: 9, Fruity: 5, Spicy: 3, Smoky: 0 },
    source: 'Manual', creator: 'Marco Dionysos', creatorType: 'Person', dateAdded: new Date().toISOString()
  },

  // --- SOURS & DAISIES ---
  {
    id: 'last-word',
    name: 'The Last Word',
    description: 'A prohibition era masterpiece of equal parts.',
    ingredients: ['0.75 oz Gin', '0.75 oz Green Chartreuse', '0.75 oz Maraschino Liqueur', '0.75 oz Lime Juice'],
    instructions: ['Shake with ice.', 'Double strain into chilled coupe.'],
    flavorProfile: { Sweet: 6, Sour: 6, Bitter: 1, Boozy: 6, Herbal: 9, Fruity: 2, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Detroit Athletic Club', creatorType: 'Establishment', dateAdded: new Date().toISOString()
  },
  {
    id: 'aviation',
    name: 'Aviation',
    description: 'A floral gin sour that captures the sky.',
    ingredients: ['2 oz Gin', '0.5 oz Maraschino Liqueur', '0.25 oz Crème de Violette', '0.75 oz Lemon Juice'],
    instructions: ['Shake with ice.', 'Double strain into chilled coupe.', 'Garnish with cherry.'],
    flavorProfile: { Sweet: 5, Sour: 6, Bitter: 0, Boozy: 5, Herbal: 2, Fruity: 2, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Hugo Ensslin', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'corpse-reviver-2',
    name: 'Corpse Reviver No. 2',
    description: 'To be taken before 11am, or whenever steam and energy are needed.',
    ingredients: ['0.75 oz Gin', '0.75 oz Lillet Blanc', '0.75 oz Cointreau', '0.75 oz Lemon Juice', 'Absinthe (rinse)'],
    instructions: ['Rinse coupe with absinthe.', 'Shake remaining ingredients with ice.', 'Strain into coupe.'],
    flavorProfile: { Sweet: 4, Sour: 6, Bitter: 1, Boozy: 5, Herbal: 4, Fruity: 3, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Harry Craddock', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'whiskey-sour',
    name: 'Whiskey Sour',
    description: 'The standard. Must contain egg white for texture.',
    ingredients: ['2 oz Bourbon', '0.75 oz Lemon Juice', '0.75 oz Simple Syrup', '1 Egg White'],
    instructions: ['Dry shake (no ice) to emulsify.', 'Shake with ice.', 'Strain into coupe.', 'Garnish with Angostura drops.'],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 1, Boozy: 5, Herbal: 0, Fruity: 1, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'bramble',
    name: 'Bramble',
    description: 'A modern classic gin sour with blackberry.',
    ingredients: ['2 oz Gin', '1 oz Lemon Juice', '0.5 oz Simple Syrup', '0.5 oz Crème de Mûre'],
    instructions: ['Build gin, lemon, sugar in rocks glass with crushed ice.', 'Float Crème de Mûre on top.', 'Garnish with blackberry.'],
    flavorProfile: { Sweet: 5, Sour: 6, Bitter: 0, Boozy: 4, Herbal: 2, Fruity: 6, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Dick Bradsell', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'gimlet',
    name: 'Gimlet',
    description: 'Gin and Lime. Simple perfection.',
    ingredients: ['2 oz Gin', '0.75 oz Lime Cordial or Juice', '0.5 oz Simple Syrup'],
    instructions: ['Shake with ice.', 'Strain into chilled coupe.'],
    flavorProfile: { Sweet: 4, Sour: 6, Bitter: 1, Boozy: 5, Herbal: 3, Fruity: 2, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'clover-club',
    name: 'Clover Club',
    description: 'A pre-prohibition classic with raspberry and egg white.',
    ingredients: ['2 oz Gin', '0.5 oz Lemon Juice', '0.5 oz Raspberry Syrup', '1 Egg White'],
    instructions: ['Dry shake.', 'Shake with ice.', 'Strain into coupe.'],
    flavorProfile: { Sweet: 5, Sour: 5, Bitter: 0, Boozy: 5, Herbal: 2, Fruity: 5, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },

  // --- HIGHBALLS & FIZZES ---
  {
    id: 'dark-n-stormy',
    name: 'Dark \'n\' Stormy',
    description: 'The national drink of Bermuda.',
    ingredients: ['2 oz Goslings Black Seal Rum', '0.5 oz Lime Juice', 'Top with Ginger Beer'],
    instructions: ['Build in highball glass with ice.', 'Garnish with lime wedge.'],
    flavorProfile: { Sweet: 6, Sour: 3, Bitter: 1, Boozy: 4, Herbal: 0, Fruity: 1, Spicy: 6, Smoky: 1 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'moscow-mule',
    name: 'Moscow Mule',
    description: 'The drink that sold America on Vodka.',
    ingredients: ['2 oz Vodka', '0.5 oz Lime Juice', 'Top with Ginger Beer'],
    instructions: ['Build in copper mug with ice.', 'Garnish with lime wheel.'],
    flavorProfile: { Sweet: 5, Sour: 4, Bitter: 0, Boozy: 4, Herbal: 0, Fruity: 1, Spicy: 5, Smoky: 0 },
    source: 'Manual', creator: 'Classic', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'gin-basil-smash',
    name: 'Gin Basil Smash',
    description: 'A modern herbaceous classic from Hamburg.',
    ingredients: ['2 oz Gin', '0.75 oz Lemon Juice', '0.75 oz Simple Syrup', '10-12 Basil Leaves'],
    instructions: ['Muddle basil with lemon and sugar.', 'Add gin and shake vigorously with ice.', 'Double strain into rocks glass with ice.'],
    flavorProfile: { Sweet: 4, Sour: 5, Bitter: 1, Boozy: 5, Herbal: 9, Fruity: 1, Spicy: 1, Smoky: 0 },
    source: 'Manual', creator: 'Jörg Meyer', creatorType: 'Person', dateAdded: new Date().toISOString()
  },
  {
    id: 'irish-coffee',
    name: 'Irish Coffee',
    description: 'The only hot drink that matters.',
    ingredients: ['1.5 oz Irish Whiskey', '4 oz Hot Coffee', '2 tsp Brown Sugar', 'Heavy Cream (lightly whipped)'],
    instructions: ['Dissolve sugar in hot coffee.', 'Stir in whiskey.', 'Float cream on top.'],
    flavorProfile: { Sweet: 5, Sour: 1, Bitter: 4, Boozy: 5, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Buena Vista Cafe', creatorType: 'Establishment', dateAdded: new Date().toISOString()
  },
  {
    id: 'ramos-gin-fizz',
    name: 'Ramos Gin Fizz',
    description: 'The ultimate arm workout. Like drinking a cloud.',
    ingredients: ['2 oz Gin', '0.5 oz Lemon Juice', '0.5 oz Lime Juice', '1 oz Simple Syrup', '1 oz Heavy Cream', '1 Egg White', '3 drops Orange Flower Water', 'Soda Water'],
    instructions: ['Dry shake all ingredients (except soda) for 2 minutes.', 'Add ice and shake for 1 minute.', 'Strain into highball glass.', 'Top slowly with soda to create foam tower.'],
    flavorProfile: { Sweet: 5, Sour: 4, Bitter: 0, Boozy: 4, Herbal: 2, Fruity: 2, Spicy: 0, Smoky: 0 },
    source: 'Manual', creator: 'Henry C. Ramos', creatorType: 'Person', dateAdded: new Date().toISOString()
  }
];

// Preloaded Pantry Items (Tequila, Campari, Gin)
const INITIAL_PANTRY: Ingredient[] = [
  { id: 'teq-01', name: 'Blanco Tequila', category: 'Spirit', volume: '750ml Full', flavorNotes: 'Bright agave, white pepper, and citrus notes with a clean finish.' },
  { id: 'camp-01', name: 'Campari', category: 'Spirit', volume: 'Half Bottle', flavorNotes: 'Intensely bitter, herbal, with notes of orange peel, cherry, and clove.' },
  { id: 'gin-01', name: 'London Dry Gin', category: 'Spirit', volume: 'Nearly Empty', flavorNotes: 'Juniper-forward, dry, with hints of coriander, angelica, and citrus peel.' }
];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400';

// --- Expert Mixologist Agent Logic for Classification ---
const getExpertFamily = (cocktail: Cocktail): string => {
    const name = cocktail.name.toLowerCase();
    
    // Explicit overrides for known classics
    if (name.includes('negroni') || name.includes('boulevardier') || name.includes('americano') || name.includes('garibaldi') || name.includes('aperol') || name.includes('sbagliato') || name.includes('hanky panky') || name.includes('bijou')) return 'Negroni & Aperitifs';
    if (name.includes('martini') || name.includes('vesper') || name.includes('gibson') || name.includes('martinez') || name.includes('tuxedo') || name.includes('bamboo') || name.includes('white lady')) return 'The Martini Family';
    if (name.includes('manhattan') || name.includes('brooklyn') || name.includes('vieux') || name.includes('rusty nail') || name.includes('rob roy') || name.includes('tipperary') || name.includes('toronto') || name.includes('remember the maine') || name.includes('widow') || name.includes('la louisiane') || name.includes('diamondback')) return 'Manhattan & Spirit Forward';
    if (name.includes('old fashioned') || name.includes('sazerac') || name.includes('godfather') || name.includes('stinger') || name.includes('angel face') || name.includes('fancy')) return 'Old Fashioneds';
    if (name.includes('margarita') || name.includes('paloma') || name.includes('mezcal') || name.includes('tequila') || name.includes('diablo') || name.includes('caipiroska') || name.includes('oaxacan')) return 'Agave Classics';
    if (name.includes('daiquiri') || name.includes('mojito') || name.includes('mai tai') || name.includes('zombie') || name.includes('piña') || name.includes('colada') || name.includes('caipirinha') || name.includes('painkiller') || name.includes('hurricane') || name.includes('fog cutter') || name.includes('three dots') || name.includes('singapore') || name.includes('planter') || name.includes('mary pickford') || name.includes('jet pilot') || name.includes('navy grog') || name.includes('saturn') || name.includes('swizzle') || name.includes('hotel nacional') || name.includes('scofflaw') || name.includes('12 mile') || name.includes('chet baker') || name.includes('lions tail') || name.includes('bankers')) return 'Rum & Cane';
    if (name.includes('sour') || name.includes('gimlet') || name.includes('sidecar') || name.includes('lemon drop') || name.includes('aviation') || name.includes('last word') || name.includes('clover') || name.includes('bramble') || name.includes('knees') || name.includes('corpse') || name.includes('jack rose')) return 'Sours & Daisies';
    if (name.includes('tonic') || name.includes('soda') || name.includes('fizz') || name.includes('collins') || name.includes('spritz') || name.includes('irish coffee') || name.includes('mule') || name.includes('bloody') || name.includes('stormy') || name.includes('island') || name.includes('cuba libre') || name.includes('sea breeze') || name.includes('screwdriver') || name.includes('michelada') || name.includes('hot toddy') || name.includes('highball')) return 'Highballs, Fizzes & Warmers';
    
    // Catch-all Modern Classics
    const modernClassics = ['penicillin', 'paper plane', 'naked and famous', 'gold rush', 'division bell', 'enzoni', 'gin basil smash', 'trinidad sour', 'old cuban', 'black manhattan', 'revolver', 'chartreuse swizzle', 'jungle bird', 'espresso martini', 'cold pizza', 'key lime pie', 'earl grey', 'siesta', 'joy division', 'conference', 'elder fashioned', 'mata hari', 'billionaire', 'greenpoint', 'red hook', 'bensonhurst', 'mezcal mule', 'benton', 'white negroni'];
    if (modernClassics.some(m => name.includes(m))) return 'Modern Classics';
    
    return 'Other Cocktails';
};

const TABS: Array<'palate' | 'recipes' | 'bar' | 'recommend'> = ['palate', 'recipes', 'bar', 'recommend'];

export default function App() {
  // ... (Rest of component logic remains identical to previous version, only INITIAL_RECIPES updated)
  const [activeTab, setActiveTab] = useState<'palate' | 'recipes' | 'bar' | 'recommend'>('palate');
  const [palateView, setPalateView] = useState<'diagnosis' | 'wheel'>('diagnosis');
  const [formularyView, setFormularyView] = useState<'drinks' | 'creators'>('drinks');
  const [rxView, setRxView] = useState<'recommend' | 'history'>('recommend');
  const [barView, setBarView] = useState<'shopping' | 'pantry'>('shopping');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [history, setHistory] = useState<Cocktail[]>(INITIAL_RECIPES);
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
  
  const [barHelpMode, setBarHelpMode] = useState<'selection' | 'result' | null>(null);
  const [barHelpResult, setBarHelpResult] = useState<{ script: string, suggestion: string, reasoning: string } | null>(null);
  const [isGeneratingHelp, setIsGeneratingHelp] = useState(false);

  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShoppingAddOpen, setIsShoppingAddOpen] = useState(false);
  const [isIngredientScannerOpen, setIsIngredientScannerOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
  const [recentMenuScans, setRecentMenuScans] = useState<Cocktail[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const menuInputRef = useRef<HTMLInputElement>(null);
  const fabPosition = settings.handedness === 'left' ? 'left-4' : 'right-4';

  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

  // ... (Touch handlers and UseEffect hooks remain unchanged)
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
      const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
      const minSwipeDistance = 50;
      if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
          const currentIndex = TABS.indexOf(activeTab);
          if (distanceX > 0 && currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1]);
          if (distanceX < 0 && currentIndex > 0) setActiveTab(TABS[currentIndex - 1]);
      }
  };

  useEffect(() => {
    const missingImageDrinks = history.filter(drink => !drink.imageUrl && !generatingImages.has(drink.id));
    if (missingImageDrinks.length > 0 && generatingImages.size < 3) {
      const drinkToVisualize = missingImageDrinks[0];
      handleGenerateImage(null, drinkToVisualize);
    }
  }, [history, generatingImages]);

  // Enrichment Effect for Pantry
  const enrichPantryItem = async (ingredient: Ingredient) => {
    if (ingredient.flavorNotes) return; // Already enriched
    
    // Check master data for a match first to avoid API call
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

  // ... (Helper functions remain unchanged)
  const cleanJsonString = (text: string): string => {
    let clean = text;
    clean = clean.replace(/```json/gi, '').replace(/```/g, '');
    return clean.trim();
  };
  const getMissingIngredients = (ingredients: string[]) => {
      if (!ingredients || pantry.length === 0) return ingredients || [];
      return ingredients.filter(ing => !pantry.some(pItem => ing.toLowerCase().includes(pItem.name.toLowerCase())));
  };
  const getItemsToBuy = (missing: string[]) => {
      return missing.filter(ing => !shoppingList.some(item => item.name.toLowerCase() === ing.toLowerCase()));
  };

  // ... (Derived State: userPalate, groupedCocktails remain unchanged)
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
           const family = getExpertFamily(drink);
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
  }, [history, formularyView, searchQuery, showFavoritesOnly]);

  // ... (Handlers remain mostly unchanged, updated MoveToPantry logic below)
  const handleAddCocktail = (cocktail: Cocktail) => { setHistory(prev => [cocktail, ...prev]); };
  const handleDeleteCocktail = (e: React.MouseEvent | null, id: string) => { e?.stopPropagation(); setHistory(prev => prev.filter(c => c.id !== id)); };
  const handleRateCocktail = (e: React.MouseEvent | null, id: string, rating: number) => {
      e?.stopPropagation();
      setHistory(prev => prev.map(c => c.id === id ? { ...c, rating } : c));
      if (selectedCocktail?.id === id) { setSelectedCocktail(prev => prev ? ({ ...prev, rating }) : null); }
  };
  const handleResetPalate = () => { setHistory(prev => prev.map(c => ({ ...c, rating: undefined }))); };
  
  const handleGenerateImage = async (e: React.MouseEvent | null, cocktail: Cocktail) => {
      e?.stopPropagation();
      if (generatingImages.has(cocktail.id)) return;
      setGeneratingImages(prev => new Set(prev).add(cocktail.id));
      try {
          const imageUrl = await generateCocktailImage(cocktail.name, cocktail.description, cocktail.ingredients);
          if (imageUrl) {
              setHistory(prev => prev.map(c => c.id === cocktail.id ? { ...c, imageUrl } : c));
          } else {
             setHistory(prev => prev.map(c => c.id === cocktail.id ? { ...c, imageUrl: FALLBACK_IMAGE } : c));
          }
      } catch (e) {
          if (e) console.log("Failed to generate image for", cocktail.name);
          setHistory(prev => prev.map(c => c.id === cocktail.id ? { ...c, imageUrl: FALLBACK_IMAGE } : c));
      } finally {
          setGeneratingImages(prev => {
              const next = new Set(prev);
              next.delete(cocktail.id);
              return next;
          });
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
            dateAdded: new Date().toISOString()
        };
        setSelectedCocktail(tempRecipe);
        handleGenerateImage(null, tempRecipe);
    } catch (e) { alert("Could not generate recipe."); }
  };

  const handleSaveTemporaryCocktail = (cocktail: Cocktail) => {
      const permanentCocktail = { ...cocktail, id: `ai-gen-${Date.now()}` };
      setHistory(prev => [permanentCocktail, ...prev]);
      setSelectedCocktail(permanentCocktail);
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

  const handleAddToShoppingList = (ingredients: string[]) => {
      setShoppingList(prev => {
          const currentNames = new Set(prev.map(i => i.name.toLowerCase()));
          const newItems = ingredients
              .filter(name => !currentNames.has(name.toLowerCase()))
              .map(name => ({ id: `shop-${Math.random().toString(36).substr(2, 9)}`, name: name, isChecked: false }));
          return [...prev, ...newItems];
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
          // Lookup Master Data for quick enrichment
          const masterMatch = masterData.find(m => m.name.toLowerCase() === item.name.toLowerCase());
          
          const newIngredient: Ingredient = {
              id: `manual-${Date.now()}`,
              name: item.name,
              category: masterMatch ? masterMatch.category : 'Other',
              volume: 'Full',
              flavorNotes: masterMatch?.defaultFlavorNotes // Use default notes if available
          };
          if (!newIngredient.flavorNotes) {
             enrichPantryItem(newIngredient);
          }
          return [newIngredient, ...prev];
      });
  };

  const handleAddMasterItem = (item: MasterIngredient) => { setMasterData(prev => [...prev, item]); };
  const handleRemoveMasterItem = (id: string) => { setMasterData(prev => prev.filter(i => i.id !== id)); };
  
  // New handler for updating master items
  const handleUpdateMasterItem = (updatedItem: MasterIngredient) => {
    setMasterData(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
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
                 instructions: ['Ordered at bar'],
                 flavorProfile: rec.flavorProfile,
                 source: 'Scan', creator: 'Menu Scan', creatorType: 'Establishment',
                 dateAdded: new Date().toISOString(), rating: 0, imageUrl: undefined, matchScore: rec.matchScore
            }));
            setRecentMenuScans(menuItems);
        } catch(e) { alert("Failed to digitize menu."); } finally { setIsScanningMenu(false); }
      };
      reader.readAsDataURL(file);
  };

  return (
    // ... (JSX Layout remains unchanged, logic is sufficient)
    <div 
        className="h-[100dvh] bg-background text-stone-200 font-sans flex flex-col overflow-hidden selection:bg-primary selection:text-white relative touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
        {/* ... (Rest of UI) */}
        {/* Render logic is effectively handled by child components like ShoppingListAddModal and SettingsModal which are updated separately */}
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
                <h1 className="text-lg font-bold tracking-tight text-secondary">
                  My Barmassist
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                 {activeTab === 'recipes' && (
                     <>
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
        onRate={(rating) => selectedCocktail && handleRateCocktail(null, selectedCocktail.id, rating)}
        onDelete={(id) => { handleDeleteCocktail(null, id); setSelectedCocktail(null); }}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        masterData={masterData}
        onAddMasterItem={handleAddMasterItem}
        onRemoveMasterItem={handleRemoveMasterItem}
        onUpdateMasterItem={handleUpdateMasterItem}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetPalate={handleResetPalate}
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

       {/* How It Works Modal */}
       <HowItWorksModal 
          isOpen={isHowItWorksOpen}
          onClose={() => setIsHowItWorksOpen(false)}
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
      <main className="flex-1 bg-background relative overflow-hidden">
        <div className="max-w-md mx-auto h-full relative">
          
          {/* PALATE TAB - FIXED LAYOUT (NO SCROLL) */}
          <div className={`absolute inset-0 p-4 pb-20 flex flex-col gap-4 transition-opacity duration-300 ${activeTab === 'palate' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                {/* Toggle */}
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

                {/* Card Content - Takes available space */}
                <div className="flex-1 min-h-0 bg-surface rounded-2xl p-4 border border-stone-700 shadow-xl flex flex-col">
                    {palateView === 'diagnosis' ? (
                        <>
                            <div className="text-center flex-none">
                                <p className="text-stone-400 text-xs uppercase tracking-widest font-bold">Based on rated order history</p>
                            </div>
                            
                            {/* Flex-1 container for chart ensures it fits available height */}
                            <div className="flex-1 min-h-0 flex items-center justify-center relative py-2">
                                <FlavorRadar data={userPalate} height="100%" />
                            </div>

                            {/* Disclaimer Box - Pushed to bottom */}
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

          {/* BARMULARY TAB - SCROLLABLE */}
          <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'recipes' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                {/* View Toggle */}
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

                {/* Filter Status Badge */}
                {(searchQuery || showFavoritesOnly) && (
                    <div className="flex items-center justify-center animate-in fade-in slide-in-from-top-2">
                        <span className="text-[10px] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 font-bold uppercase tracking-wide flex items-center gap-1">
                            {showFavoritesOnly && <Star className="w-3 h-3 fill-current" />}
                            {showFavoritesOnly && searchQuery ? 'Favorites + Search' : showFavoritesOnly ? 'Favorites Only' : 'Filtered Results'}
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
                                <p className="text-stone-500 text-sm">No entries found in this view.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(groupedCocktails).map(([groupKey, drinks]: [string, Cocktail[]]) => {
                                // When searching, always expand groups to show matches
                                const isExpanded = (searchQuery ? true : expandedGroups.has(groupKey));
                                // Determine group type for icon
                                const groupType = drinks[0]?.creatorType || 'Person';
                                
                                return (
                                    <div key={groupKey} className={`bg-surface border border-stone-700 rounded-xl overflow-hidden`}>
                                        
                                        {/* Group Header */}
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
                                                {drinks.map(drink => {
                                                    const missingIngredients = getMissingIngredients(drink.ingredients);
                                                    const itemsToBuy = getItemsToBuy(missingIngredients);
                                                    
                                                    return (
                                                    <div 
                                                      key={drink.id} 
                                                      onClick={() => setSelectedCocktail(drink)}
                                                      className="bg-surface rounded-lg border border-stone-700 relative overflow-hidden flex cursor-pointer hover:border-stone-500 transition-colors shadow-sm flex-row h-32"
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
                                                                    {/* Removed Action Buttons */}
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
                                                                            // IF IMAGE FAILS, SET TO UNDEFINED TO TRIGGER AI REGENERATION
                                                                            if (drink.imageUrl && drink.imageUrl.includes('unsplash.com')) {
                                                                                setHistory(prev => prev.map(d => d.id === drink.id ? { ...d, imageUrl: undefined } : d));
                                                                            } else {
                                                                                e.currentTarget.src = FALLBACK_IMAGE;
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
                                                );
                                                })}
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

          {/* BAR TAB - SCROLLABLE */}
          <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'bar' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                {/* (Bar Tab Content) */}
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
                        {/* ... Shopping List UI */}
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
                        {/* ... Pantry UI */}
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

          {/* RECOMMEND TAB - SCROLLABLE */}
          <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'recommend' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
              {/* (Recommend Tab Content - No changes needed) */}
                
                {/* View Toggle */}
                <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
                   <button 
                      onClick={() => setRxView('recommend')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${rxView === 'recommend' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <ChefHat className="w-4 h-4" />
                      Recommend
                   </button>
                   <button 
                      onClick={() => setRxView('history')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${rxView === 'history' ? 'bg-surface text-white shadow-lg border border-stone-600' : 'text-stone-400'}`}
                   >
                      <History className="w-4 h-4" />
                      Rx History
                   </button>
                </div>

                {rxView === 'recommend' ? (
                <>
                {/* Simplified Action Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={generateRecs}
                        disabled={isGeneratingRecs}
                        className="bg-surface text-stone-200 border border-stone-600 p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-stone-700 hover:border-primary transition-all disabled:opacity-50 shadow-sm hover:text-white"
                    >
                        {isGeneratingRecs && !isScanningMenu ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ChefHat className="w-6 h-6 text-primary" />}
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
                        className="bg-surface text-stone-200 border border-stone-600 p-3 rounded-xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-stone-700 hover:border-white/20 transition-all shadow-sm hover:text-white"
                    >
                         <HelpCircle className="w-6 h-6 text-white" />
                         <span className="text-xs">Bar Assist</span>
                    </button>
                </div>

                {/* Scanned Menu Results (MOVED BELOW BUTTONS & LISTS ALL) */}
                {recentMenuScans.length > 0 && (
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-4 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <ScanLine className="w-4 h-4 text-secondary" />
                                Menu Options ({recentMenuScans.length})
                            </h3>
                            <button 
                                onClick={() => setRecentMenuScans([])}
                                className="text-xs text-stone-500 hover:text-red-400"
                            >
                                Clear
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {recentMenuScans.map(item => (
                                <div key={item.id} className="bg-surface border border-stone-700 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                         <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-white text-lg">{item.name}</h4>
                                                {item.matchScore !== undefined && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                        item.matchScore >= 80 ? 'bg-green-900/30 text-green-400 border-green-800' :
                                                        item.matchScore >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                                        'bg-stone-800 text-stone-500 border-stone-700'
                                                    }`}>
                                                        {item.matchScore}% Match
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.description}</p>
                                         </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1">
                                        {item.ingredients.map(ing => (
                                            <span key={ing} className="text-[10px] bg-stone-900 text-stone-300 px-2 py-1 rounded border border-stone-800">{ing}</span>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => handleLogMenuOrder(item)}
                                        className="w-full bg-secondary text-stone-900 font-bold py-2 rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        I Ordered This
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations List (From Pantry) */}
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
                </>
                ) : (
                    // RX HISTORY VIEW
                    <div className="space-y-4">
                        {history.filter(d => d.source === 'Order').sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()).map(drink => (
                            <div 
                                key={drink.id} 
                                onClick={() => setSelectedCocktail(drink)}
                                className="bg-surface rounded-lg border border-stone-700 relative overflow-hidden flex cursor-pointer hover:border-stone-500 transition-colors shadow-sm flex-row h-32"
                            >
                                {/* Left Column: Text */}
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

                                {/* Right Column: Visual */}
                                <div className="w-28 bg-stone-900 relative shrink-0 border-l border-stone-700 group h-full">
                                    {drink.imageUrl ? (
                                        <>
                                            <img 
                                                src={drink.imageUrl} 
                                                alt={drink.name} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    if (drink.imageUrl && drink.imageUrl.includes('unsplash.com')) {
                                                        setHistory(prev => prev.map(d => d.id === drink.id ? { ...d, imageUrl: undefined } : d));
                                                    } else {
                                                        e.currentTarget.src = FALLBACK_IMAGE;
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-r from-surface/50 to-transparent"></div>
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
                        {history.filter(d => d.source === 'Order').length === 0 && (
                            <div className="text-center py-12 border border-dashed border-stone-700 rounded-xl bg-stone-900/50">
                                <History className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                                <p className="text-stone-500 text-sm">No orders logged.</p>
                                <p className="text-[10px] text-stone-600">Use 'Log Order' in the + menu.</p>
                            </div>
                        )}
                    </div>
                )}
          </div>
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