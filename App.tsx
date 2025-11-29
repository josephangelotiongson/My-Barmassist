
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Beaker, ChefHat, BarChart3, Trash2, Sparkles, Loader2, Wine, BookOpen, ExternalLink, User, ChevronDown, ChevronUp, Layers, Star, Disc, Plus, ImageIcon, Pencil, Check, Camera, ScanLine, Beer, Calendar, MapPin, HelpCircle, ShieldCheck, Zap, XCircle, MessageCircle, Store, Globe, Search, X, ShoppingCart, Minus, Archive, Settings, AlertTriangle, CheckCircle2, ShoppingBag, History, Info, Edit3, ListOrdered, Activity, Ban, BatteryLow, LogIn, LogOut } from 'lucide-react';
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
import { Cocktail, Ingredient, FlavorProfile, FlavorDimension, Recommendation, ShoppingListItem, MasterIngredient, AppSettings, Nutrition } from './types';
import { getRecommendations, generateCocktailImage, enrichIngredientDetails, recommendFromMenu, getBarOrderSuggestion, deduceRecipe } from './services/geminiService';
import { INITIAL_MASTER_DATA, INITIAL_RECIPES_DATA } from './initialData';

// Default empty profile for fallback
const INITIAL_PROFILE: FlavorProfile = {
  Sweet: 0, Sour: 0, Bitter: 0, Boozy: 0, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0
};

const INITIAL_SETTINGS: AppSettings = {
    lowStockKeywords: ['empty', 'low', '10%', 'near empty', 'almost gone', 'running low'],
    allergies: [],
    handedness: 'right'
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

export default function App() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'palate' | 'recipes' | 'bar' | 'recommend'>('palate');
  const [palateView, setPalateView] = useState<'diagnosis' | 'wheel'>('diagnosis');
  const [formularyView, setFormularyView] = useState<'drinks' | 'creators'>('drinks');
  const [rxView, setRxView] = useState<'recommend' | 'history'>('recommend');
  const [barView, setBarView] = useState<'shopping' | 'pantry'>('shopping');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const [abvFilter, setAbvFilter] = useState<'all' | 'low' | 'zero'>('all');
  const [masterData, setMasterData] = useState<MasterIngredient[]>(INITIAL_MASTER_DATA);

  // Get preloaded recipes with nutrition calculated
  const getPreloadedRecipes = () => {
    return INITIAL_RECIPES_DATA.map(drink => ({
        ...drink,
        nutrition: drink.nutrition || estimateNutrition(drink.ingredients, INITIAL_MASTER_DATA)
    }));
  };

  // Initialize history with preloaded recipes (works for guests)
  const [history, setHistory] = useState<Cocktail[]>(getPreloadedRecipes);

  // Track if we've loaded user data
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !userDataLoaded) {
      setUserDataLoaded(true);
      
      // Load recipes and ratings together, then merge in single update
      const loadRecipesAndRatings = async () => {
        try {
          const [recipesRes, ratingsRes] = await Promise.all([
            fetch('/api/recipes', { credentials: 'include' }),
            fetch('/api/ratings', { credentials: 'include' })
          ]);
          
          const recipes: any[] = recipesRes.ok ? await recipesRes.json() : [];
          const ratings: any[] = ratingsRes.ok ? await ratingsRes.json() : [];
          
          // Create rating lookup map
          const ratingMap = new Map<string, number>();
          ratings.forEach((r: any) => {
            ratingMap.set(r.recipeName, r.rating);
          });
          
          // Build custom recipes with ratings applied
          const customRecipes: Cocktail[] = recipes.map((r: any) => ({
            id: `user-${r.id}`,
            name: r.name,
            description: r.instructions || '',
            ingredients: r.ingredients || [],
            instructions: Array.isArray(r.instructions) ? r.instructions : [r.instructions || ''],
            flavorProfile: r.flavorProfile || {},
            nutrition: { calories: 0, carbs: 0, abv: 0 },
            category: r.category || 'Custom',
            imageUrl: r.imageUrl,
            isUserCreated: true,
            rating: ratingMap.get(r.name),
            dateAdded: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
          }));
          
          // Apply ratings to preloaded recipes and merge with custom recipes
          setHistory(prev => {
            const updatedPreloaded = prev.map(recipe => {
              const rating = ratingMap.get(recipe.name);
              return rating !== undefined ? { ...recipe, rating } : recipe;
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
      // User logged out - reset to preloaded recipes only
      setUserDataLoaded(false);
      setHistory(getPreloadedRecipes());
      setShoppingList([]);
      setSettings(INITIAL_SETTINGS);
    }
  }, [isAuthenticated, user, isAuthLoading, userDataLoaded]);
  
  const [pantry, setPantry] = useState<Ingredient[]>(INITIAL_PANTRY);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editVolumeValue, setEditVolumeValue] = useState('');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [isScanningMenu, setIsScanningMenu] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  
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
  const [recentMenuScans, setRecentMenuScans] = useState<Cocktail[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const menuInputRef = useRef<HTMLInputElement>(null);
  const fabPosition = settings.handedness === 'left' ? 'left-4' : 'right-4';

  // Swipe State
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

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
              if (isSwipeRight && barView === 'pantry') setBarView('shopping');
          } else if (activeTab === 'recommend') {
              if (isSwipeLeft && rxView === 'recommend') setRxView('history');
              if (isSwipeRight && rxView === 'history') setRxView('recommend');
          }
      }
  };

  // --- THROTTLED IMAGE GENERATION QUEUE ---
  useEffect(() => {
    // Logic: Find one drink that needs an image, process it, then wait 4 seconds.
    // This prevents API overload when 200+ drinks are loaded.
    
    if (isImageGenCoolingDown) return; // Wait for cool down
    if (generatingImages.size >= 1) return; // Strict Limit: 1 concurrent generation

    const missingImageDrinks = history.filter(drink => !drink.imageUrl && !generatingImages.has(drink.id));

    if (missingImageDrinks.length > 0) {
      const drinkToVisualize = missingImageDrinks[0];
      
      // Start Cool Down Timer immediately to prevent other effects from firing
      setIsImageGenCoolingDown(true);
      
      handleGenerateImage(null, drinkToVisualize).finally(() => {
          // Keep cooling down for a few seconds AFTER completion to space out requests
          setTimeout(() => {
              setIsImageGenCoolingDown(false);
          }, 4000); // 4 second delay between generations
      });
    }
  }, [history, generatingImages, isImageGenCoolingDown]);

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
  }, [history, formularyView, searchQuery, showFavoritesOnly, abvFilter]);

  const handleAddCocktail = async (cocktail: Cocktail) => {
    if (isAuthenticated) {
      try {
        const res = await fetch('/api/recipes', {
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
        } else {
          setHistory(prev => [cocktail, ...prev]);
        }
      } catch {
        setHistory(prev => [cocktail, ...prev]);
      }
    } else {
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
    setHistory(getPreloadedRecipes());
    setShoppingList([]);
    setPantry(INITIAL_PANTRY);
    setSettings(INITIAL_SETTINGS);
    setUserDataLoaded(false);
    
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
      
      setGeneratingImages(prev => new Set(prev).add(cocktail.id));
      
      try {
          const imageUrl = await generateCocktailImage(cocktail.name, cocktail.description, cocktail.ingredients);
          if (imageUrl) {
              setHistory(prev => prev.map(c => c.id === cocktail.id ? { ...c, imageUrl } : c));
          } else {
             // Set fallback if undefined returned
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
                             {user?.firstName?.[0] || user?.email?.[0] || 'U'}
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

       <main className="flex-1 bg-background relative overflow-hidden">
        <div className="max-w-md mx-auto h-full relative">
            <div className={`absolute inset-0 p-4 pb-24 flex flex-col gap-4 transition-opacity duration-300 ${activeTab === 'palate' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
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

            <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'recipes' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
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
                        className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold uppercase tracking-wide flex items-center gap-1 ${abvFilter === 'low' ? 'bg-blue-900/50 text-blue-200 border-blue-700' : 'bg-stone-900 text-stone-500 border-stone-800'}`}
                    >
                        <BatteryLow className="w-3 h-3" /> Low ABV
                    </button>
                    <button 
                        onClick={() => setAbvFilter('zero')}
                        className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold uppercase tracking-wide flex items-center gap-1 ${abvFilter === 'zero' ? 'bg-green-900/50 text-green-200 border-green-700' : 'bg-stone-900 text-stone-500 border-stone-800'}`}
                    >
                        <Ban className="w-3 h-3" /> Zero Proof
                    </button>
                </div>

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
                                                                    <h4 className="text-sm font-bold text-white leading-tight line-clamp-1">{drink.name}</h4>
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
            
            <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'bar' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
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
                         <button 
                            onClick={() => setIsShoppingAddOpen(true)}
                            className={`fixed bottom-24 ${fabPosition} z-40 bg-secondary text-stone-900 p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {barView === 'pantry' && (
                     <div className="space-y-6 animate-in fade-in duration-300">
                         <button 
                            onClick={() => setIsIngredientScannerOpen(true)}
                            className={`fixed bottom-24 ${fabPosition} z-40 bg-secondary text-stone-900 p-4 rounded-full shadow-xl shadow-black/50 border border-white/10 hover:scale-105 transition-transform`}
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
            
            <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 scrollbar-hide space-y-6 transition-opacity duration-300 ${activeTab === 'recommend' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
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
                                        <div className="bg-accent/5 border border-accent/10 p-3 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] text-accent font-bold mb-1">Missing:</p>
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
                </>
                ) : (
                    <div className="space-y-4">
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
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center flex-col gap-1 bg-stone-800/50">
                                           <Sparkles className="w-5 h-5 text-stone-600" />
                                           <span className="text-[8px] text-stone-600">Pending</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </main>
      
      <nav className="flex-none z-30 bg-surface border-t border-stone-700 pb-safe">
        <div className="grid grid-cols-4 h-20 max-w-md mx-auto">
          <button 
             onClick={() => setActiveTab('palate')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'palate' ? 'text-primary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <BarChart3 className={`w-7 h-7 ${activeTab === 'palate' ? 'fill-primary/20' : ''}`} />
            <span className="text-xs font-bold">Palate</span>
          </button>
          <button 
             onClick={() => setActiveTab('recipes')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'recipes' ? 'text-white' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <BookOpen className={`w-7 h-7 ${activeTab === 'recipes' ? 'fill-white/20' : ''}`} />
            <span className="text-xs font-bold">Barmulary</span>
          </button>
          <button 
             onClick={() => setActiveTab('bar')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'bar' ? 'text-secondary' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <Wine className={`w-7 h-7 ${activeTab === 'bar' ? 'fill-secondary/20' : ''}`} />
            <span className="text-xs font-bold">Bar</span>
          </button>
          <button 
             onClick={() => setActiveTab('recommend')} 
             className={`flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'recommend' ? 'text-accent' : 'text-stone-500 hover:text-stone-400'}`}
          >
            <ChefHat className={`w-7 h-7 ${activeTab === 'recommend' ? 'fill-accent/20' : ''}`} />
            <span className="text-xs font-bold">Rx</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
