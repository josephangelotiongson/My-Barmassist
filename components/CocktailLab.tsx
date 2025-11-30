import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FlaskConical, Sparkles, ChevronDown, ChevronUp, ArrowRight, 
  Loader2, RefreshCw, Beaker, Target, Lightbulb, Check, X,
  Plus, Minus, Shuffle, Disc, Sliders, Save, Wine, BookOpen,
  ExternalLink, Database, GlassWater
} from 'lucide-react';
import { Cocktail, FlavorProfile, FlavorDimension } from '../types';
import { calculateTotalVolume, formatVolumeForDisplay, calculateVolumeOverage } from '../shared/volumeUtils';
import { FLAVOR_TAXONOMY } from '../shared/flavorTaxonomy';
import VolumeLever from './VolumeLever';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from 'recharts';
import EditableFlavorWheel, { NoteProfile } from './EditableFlavorWheel';

interface Props {
  allRecipes: Cocktail[];
  onSaveExperiment?: (recipe: Cocktail) => void;
  initialRecipe?: Cocktail | null;
  onClearInitialRecipe?: () => void;
  initialMode?: 'recipe' | 'build' | 'deproof';
}

interface Substitution {
  original: string;
  replacement: string;
  rationale: string;
}

interface Addition {
  ingredient: string;
  amount: string;
  rationale: string;
}

interface LabResult {
  substitutions: Substitution[];
  additions: Addition[];
  predictedProfile: FlavorProfile;
  rationale: string;
  newIngredients: string[];
}

const DEFAULT_PROFILE: FlavorProfile = {
  [FlavorDimension.SWEET]: 5,
  [FlavorDimension.FRUITY]: 4,
  [FlavorDimension.FLORAL]: 2,
  [FlavorDimension.HERBAL]: 3,
  [FlavorDimension.SPICY]: 2,
  [FlavorDimension.EARTHY]: 1,
  [FlavorDimension.SOUR]: 5,
  [FlavorDimension.BOOZY]: 5,
};

interface ExistingRiff {
  id: number;
  slug: string;
  name: string;
  ingredients: string[];
  flavorProfile: FlavorProfile | null;
  description?: string;
  parentRecipeName: string;
}

interface MasterIngredient {
  id: number;
  slug: string;
  name: string;
  category: string;
  subCategory?: string;
  abv?: number;
  flavorNotes?: string;
}

interface BuildResult {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  predictedProfile: FlavorProfile;
  rationale: string;
}

const CATEGORY_ID_TO_DIMENSION: Record<string, FlavorDimension> = {
  'sweet': FlavorDimension.SWEET,
  'fruity': FlavorDimension.FRUITY,
  'floral': FlavorDimension.FLORAL,
  'herbal': FlavorDimension.HERBAL,
  'spicy': FlavorDimension.SPICY,
  'earthy': FlavorDimension.EARTHY,
  'sour': FlavorDimension.SOUR,
  'boozy': FlavorDimension.BOOZY,
};

const deriveNoteProfileFromCategories = (categoryProfile: FlavorProfile): NoteProfile => {
  const noteProfile: NoteProfile = {};
  FLAVOR_TAXONOMY.forEach(category => {
    const dimension = CATEGORY_ID_TO_DIMENSION[category.id];
    const categoryValue = dimension ? categoryProfile[dimension] || 0 : 0;
    category.subcategories?.forEach(subcategory => {
      subcategory.notes?.forEach(note => {
        noteProfile[note.id] = categoryValue;
      });
    });
  });
  return noteProfile;
};

const extractModifiedNotes = (
  currentNoteProfile: NoteProfile | undefined,
  baseNoteProfile: NoteProfile | undefined
): string[] => {
  if (!currentNoteProfile) return [];
  
  const modifiedNotes: string[] = [];
  const noteIdToLabel = new Map<string, string>();
  
  FLAVOR_TAXONOMY.forEach(category => {
    category.subcategories?.forEach(subcategory => {
      subcategory.notes?.forEach(note => {
        noteIdToLabel.set(note.id, note.label);
      });
    });
  });
  
  Object.entries(currentNoteProfile).forEach(([noteId, currentValue]) => {
    const baseValue = baseNoteProfile?.[noteId] ?? 0;
    if (currentValue > baseValue) {
      const label = noteIdToLabel.get(noteId);
      if (label) {
        modifiedNotes.push(label);
      }
    }
  });
  
  return modifiedNotes;
};

interface DeproofResult {
  isPossible: boolean;
  impossibilityReason?: string;
  substitutions: Substitution[];
  additions: Addition[];
  removals: string[];
  predictedProfile: FlavorProfile;
  rationale: string;
  newIngredients: string[];
  proofLevel: 'zero' | 'low' | 'low-abv';
  estimatedAbv: number;
}

const CocktailLab: React.FC<Props> = ({ allRecipes, onSaveExperiment, initialRecipe, onClearInitialRecipe, initialMode }) => {
  const [labMode, setLabMode] = useState<'recipe' | 'build' | 'deproof'>(initialMode || 'recipe');
  const [selectedRecipe, setSelectedRecipe] = useState<Cocktail | null>(initialRecipe || null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [targetProfile, setTargetProfile] = useState<FlavorProfile>(DEFAULT_PROFILE);
  const [targetNoteProfile, setTargetNoteProfile] = useState<NoteProfile | undefined>(undefined);
  const [baseNoteProfile, setBaseNoteProfile] = useState<NoteProfile | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSubs, setAppliedSubs] = useState<Set<number>>(new Set());
  const [appliedAdds, setAppliedAdds] = useState<Set<number>>(new Set());
  const [editorMode, setEditorMode] = useState<'wheel' | 'sliders'>('wheel');
  const wheelKeyRef = useRef<number>(0);
  
  // Build mode states
  const [masterIngredients, setMasterIngredients] = useState<MasterIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<MasterIngredient[]>([]);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  
  // Riff saving states
  const [riffName, setRiffName] = useState('');
  const [isSavingRiff, setIsSavingRiff] = useState(false);
  const [existingRiff, setExistingRiff] = useState<ExistingRiff | null>(null);
  const [isCheckingRiff, setIsCheckingRiff] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedRiff, setSavedRiff] = useState<ExistingRiff | null>(null);
  
  // Build mode save states
  const [isSavingBuild, setIsSavingBuild] = useState(false);
  const [buildSaveSuccess, setBuildSaveSuccess] = useState(false);
  
  // Volume lever states
  const [volumeAdjustedIngredients, setVolumeAdjustedIngredients] = useState<string[] | null>(null);
  const [showVolumeLever, setShowVolumeLever] = useState(false);
  
  // De-proof mode states
  const [deproofTarget, setDeproofTarget] = useState<'zero' | 'low' | 'low-abv'>('zero');
  const [deproofResult, setDeproofResult] = useState<DeproofResult | null>(null);
  const [isDeproofing, setIsDeproofing] = useState(false);
  const [appliedDeproofSubs, setAppliedDeproofSubs] = useState<Set<number>>(new Set());
  const [showDeproofRecipeSelector, setShowDeproofRecipeSelector] = useState(false);
  const [deproofSearchQuery, setDeproofSearchQuery] = useState('');
  const [selectedDeproofRecipe, setSelectedDeproofRecipe] = useState<Cocktail | null>(null);

  useEffect(() => {
    if (initialRecipe) {
      if (initialMode === 'deproof') {
        setLabMode('deproof');
        setSelectedDeproofRecipe(initialRecipe);
        setDeproofResult(null);
        setAppliedDeproofSubs(new Set());
      } else {
        setLabMode('recipe');
        setSelectedRecipe(initialRecipe);
        const profile = initialRecipe.flavorProfile && Object.keys(initialRecipe.flavorProfile).length > 0 
          ? { ...initialRecipe.flavorProfile } 
          : { ...DEFAULT_PROFILE };
        setTargetProfile(profile);
        setTargetNoteProfile(undefined);
        setBaseNoteProfile(deriveNoteProfileFromCategories(profile));
        setLabResult(null);
        setErrorMessage(null);
        setAppliedSubs(new Set());
        setAppliedAdds(new Set());
        wheelKeyRef.current += 1;
      }
      
      onClearInitialRecipe?.();
    }
  }, [initialRecipe?.id, initialMode]);

  useEffect(() => {
    const fetchMasterIngredients = async () => {
      try {
        const response = await fetch('/api/ingredients');
        if (response.ok) {
          const data = await response.json();
          setMasterIngredients(data);
        }
      } catch (err) {
        console.error('Failed to load master ingredients:', err);
      }
    };
    fetchMasterIngredients();
  }, []);


  const filteredIngredients = useMemo(() => {
    if (!ingredientSearchQuery.trim()) return masterIngredients.slice(0, 50);
    const q = ingredientSearchQuery.toLowerCase();
    return masterIngredients.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category.toLowerCase().includes(q) ||
      i.subCategory?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [masterIngredients, ingredientSearchQuery]);

  const ingredientsByCategory = useMemo(() => {
    const grouped: Record<string, MasterIngredient[]> = {};
    filteredIngredients.forEach(ing => {
      if (!grouped[ing.category]) grouped[ing.category] = [];
      grouped[ing.category].push(ing);
    });
    return grouped;
  }, [filteredIngredients]);

  const handleAddIngredient = (ingredient: MasterIngredient) => {
    if (!selectedIngredients.find(i => i.id === ingredient.id)) {
      setSelectedIngredients(prev => [...prev, ingredient]);
    }
  };

  const handleRemoveIngredient = (ingredientId: number) => {
    setSelectedIngredients(prev => prev.filter(i => i.id !== ingredientId));
  };

  const buildCocktail = async () => {
    if (selectedIngredients.length === 0) return;
    
    setIsBuilding(true);
    setBuildResult(null);
    setBuildSaveSuccess(false);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/lab/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ingredients: selectedIngredients.map(i => ({
            name: i.name,
            category: i.category,
            abv: i.abv,
            flavorNotes: i.flavorNotes
          })),
          targetProfile
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to build cocktail');
      }
      
      const result = await response.json();
      setBuildResult(result);
    } catch (err) {
      setErrorMessage('Failed to build cocktail. Please try again.');
      console.error('Build error:', err);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleModeSwitch = (mode: 'recipe' | 'build' | 'deproof') => {
    if (mode === 'build') {
      setTargetProfile({ ...DEFAULT_PROFILE });
      setLabResult(null);
      setSelectedRecipe(null);
      setAppliedSubs(new Set());
      setBuildResult(null);
      setBuildSaveSuccess(false);
      setDeproofResult(null);
      setSelectedDeproofRecipe(null);
    } else if (mode === 'deproof') {
      setLabResult(null);
      setBuildResult(null);
      setBuildSaveSuccess(false);
      setSelectedIngredients([]);
      setAppliedSubs(new Set());
      setAppliedDeproofSubs(new Set());
    } else {
      setBuildResult(null);
      setBuildSaveSuccess(false);
      setSelectedIngredients([]);
      setDeproofResult(null);
      setSelectedDeproofRecipe(null);
    }
    setLabMode(mode);
    setErrorMessage(null);
  };

  const filteredDeproofRecipes = useMemo(() => {
    if (!deproofSearchQuery.trim()) return allRecipes.slice(0, 50);
    const q = deproofSearchQuery.toLowerCase();
    return allRecipes.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.category?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [allRecipes, deproofSearchQuery]);

  const handleSelectDeproofRecipe = (recipe: Cocktail) => {
    setSelectedDeproofRecipe(recipe);
    setShowDeproofRecipeSelector(false);
    setDeproofResult(null);
    setErrorMessage(null);
    setAppliedDeproofSubs(new Set());
  };

  const analyzeDeproof = async () => {
    if (!selectedDeproofRecipe) return;
    
    setIsDeproofing(true);
    setDeproofResult(null);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/lab/deproof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          baseRecipe: {
            name: selectedDeproofRecipe.name,
            ingredients: selectedDeproofRecipe.ingredients,
            flavorProfile: getRecipeProfile(selectedDeproofRecipe),
            targetVolume: selectedDeproofRecipe.targetVolume
          },
          targetProofLevel: deproofTarget
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeproofResult(data);
        setAppliedDeproofSubs(new Set());
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || 'Failed to analyze. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsDeproofing(false);
    }
  };

  const toggleDeproofSubstitution = (idx: number) => {
    setAppliedDeproofSubs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const getRecipeProfile = (recipe: Cocktail): FlavorProfile => {
    return recipe.flavorProfile && Object.keys(recipe.flavorProfile).length > 0 
      ? recipe.flavorProfile 
      : DEFAULT_PROFILE;
  };

  const hasValidProfile = (recipe: Cocktail): boolean => {
    return !!(recipe.flavorProfile && Object.keys(recipe.flavorProfile).length > 0);
  };

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return allRecipes.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return allRecipes.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.category?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [allRecipes, searchQuery]);

  const handleSelectRecipe = (recipe: Cocktail) => {
    const recipeProfile = getRecipeProfile(recipe);
    setSelectedRecipe(recipe);
    setTargetProfile({ ...recipeProfile });
    setTargetNoteProfile(undefined);
    setBaseNoteProfile(deriveNoteProfileFromCategories(recipeProfile));
    setShowRecipeSelector(false);
    setLabResult(null);
    setErrorMessage(null);
    setAppliedSubs(new Set());
    setAppliedAdds(new Set());
    wheelKeyRef.current += 1;
  };

  const adjustFlavor = (dim: FlavorDimension, delta: number) => {
    setTargetProfile(prev => ({
      ...prev,
      [dim]: Math.max(0, Math.min(10, prev[dim] + delta))
    }));
  };

  const analyzeSubstitutions = async () => {
    if (!selectedRecipe) return;
    
    setIsAnalyzing(true);
    setLabResult(null);
    setErrorMessage(null);
    
    const specificNotes = extractModifiedNotes(targetNoteProfile, baseNoteProfile);
    
    try {
      const response = await fetch('/api/lab/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          baseRecipe: {
            name: selectedRecipe.name,
            ingredients: selectedRecipe.ingredients,
            flavorProfile: getRecipeProfile(selectedRecipe),
            targetVolume: selectedRecipe.targetVolume
          },
          targetProfile,
          targetNotes: specificNotes.length > 0 ? specificNotes : undefined
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLabResult(data);
        setAppliedSubs(new Set());
        setAppliedAdds(new Set());
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || 'Failed to analyze. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSubstitution = (idx: number) => {
    setAppliedSubs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAddition = (idx: number) => {
    setAppliedAdds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const getRawModifiedIngredients = (): string[] => {
    if (!selectedRecipe || !labResult) return selectedRecipe?.ingredients || [];
    
    let ingredients = [...selectedRecipe.ingredients];
    
    labResult.substitutions.forEach((sub, idx) => {
      if (appliedSubs.has(idx)) {
        ingredients = ingredients.map(ing => {
          const ingLower = ing.toLowerCase();
          const origLower = sub.original.toLowerCase();
          if (ingLower.includes(origLower)) {
            return ing.replace(new RegExp(sub.original, 'gi'), sub.replacement);
          }
          return ing;
        });
      }
    });
    
    if (labResult.additions) {
      labResult.additions.forEach((add, idx) => {
        if (appliedAdds.has(idx)) {
          ingredients.push(`${add.amount} ${add.ingredient}`);
        }
      });
    }
    
    return ingredients;
  };
  
  const getModifiedIngredients = (): string[] => {
    if (volumeAdjustedIngredients) {
      return volumeAdjustedIngredients;
    }
    return getRawModifiedIngredients();
  };
  
  const volumeOverage = useMemo(() => {
    if (!selectedRecipe || !labResult) return null;
    const effectiveIngredients = volumeAdjustedIngredients || getRawModifiedIngredients();
    return calculateVolumeOverage(
      selectedRecipe.ingredients,
      effectiveIngredients,
      selectedRecipe.targetVolume
    );
  }, [selectedRecipe, labResult, appliedSubs, appliedAdds, volumeAdjustedIngredients]);
  
  useEffect(() => {
    if (volumeOverage?.requiresBalance && !volumeAdjustedIngredients) {
      setShowVolumeLever(true);
    }
  }, [volumeOverage, volumeAdjustedIngredients]);
  
  useEffect(() => {
    setVolumeAdjustedIngredients(null);
    setShowVolumeLever(false);
  }, [appliedSubs, appliedAdds]);

  // Get applied substitutions array
  const getAppliedSubstitutions = () => {
    if (!labResult) return [];
    return labResult.substitutions.filter((_, idx) => appliedSubs.has(idx));
  };

  // Generate a default riff name
  const generateRiffName = () => {
    if (!selectedRecipe) return '';
    const subs = getAppliedSubstitutions();
    if (subs.length === 0) return `${selectedRecipe.name} Riff`;
    const mainSub = subs[0];
    return `${selectedRecipe.name} (${mainSub.replacement} Riff)`;
  };

  // Check if a similar riff already exists
  const checkForExistingRiff = async () => {
    if (!selectedRecipe) return;
    
    const modifiedIngredients = getModifiedIngredients();
    const parentSlug = selectedRecipe.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    
    setIsCheckingRiff(true);
    setExistingRiff(null);
    
    try {
      const response = await fetch('/api/lab/riffs/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          parentRecipeSlug: parentSlug,
          ingredients: modifiedIngredients,
          proposedName: riffName || generateRiffName()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.riff) {
          setExistingRiff(data.riff);
        }
      }
    } catch (error) {
      console.error('Error checking for existing riff:', error);
    } finally {
      setIsCheckingRiff(false);
    }
  };

  // Save the riff to the database
  const saveRiff = async () => {
    if (!selectedRecipe || (appliedSubs.size === 0 && appliedAdds.size === 0)) return;
    
    const name = riffName || generateRiffName();
    const parentSlug = selectedRecipe.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const modifiedIngredients = getModifiedIngredients();
    const appliedSubstitutions = getAppliedSubstitutions();
    
    setIsSavingRiff(true);
    setSaveSuccess(false);
    
    try {
      const response = await fetch('/api/lab/riffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          parentRecipeSlug: parentSlug,
          parentRecipeName: selectedRecipe.name,
          ingredients: modifiedIngredients,
          instructions: selectedRecipe.instructions || [],
          substitutions: appliedSubstitutions,
          flavorProfile: labResult?.predictedProfile || targetProfile
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedRiff(data);
        setSaveSuccess(true);
      } else if (response.status === 409) {
        // Duplicate exists
        const data = await response.json();
        setExistingRiff(data.existingRiff);
      } else if (response.status === 401) {
        setErrorMessage('Please log in to save your riff.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.message || 'Failed to save riff. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSavingRiff(false);
    }
  };

  // Reset riff state when substitutions change
  React.useEffect(() => {
    setSaveSuccess(false);
    setSavedRiff(null);
    setExistingRiff(null);
  }, [appliedSubs.size, appliedAdds.size, selectedRecipe?.name]);

  // Generate default riff name when modifications are applied
  React.useEffect(() => {
    if ((appliedSubs.size > 0 || appliedAdds.size > 0) && selectedRecipe && labResult) {
      const subs = labResult.substitutions.filter((_, idx) => appliedSubs.has(idx));
      const adds = labResult.additions?.filter((_, idx) => appliedAdds.has(idx)) || [];
      
      if (subs.length > 0) {
        const mainSub = subs[0];
        setRiffName(`${selectedRecipe.name} (${mainSub.replacement} Riff)`);
      } else if (adds.length > 0) {
        const mainAdd = adds[0];
        setRiffName(`${selectedRecipe.name} (with ${mainAdd.ingredient})`);
      } else {
        setRiffName(`${selectedRecipe.name} Riff`);
      }
    }
  }, [appliedSubs.size, appliedAdds.size, selectedRecipe?.name, labResult?.substitutions, labResult?.additions]);

  const originalProfile = useMemo(() => {
    return selectedRecipe ? getRecipeProfile(selectedRecipe) : DEFAULT_PROFILE;
  }, [selectedRecipe]);

  const chartData = useMemo(() => {
    return Object.values(FlavorDimension).map((dim) => ({
      subject: dim,
      Original: originalProfile[dim] || 0,
      Target: targetProfile[dim] || 0,
      Predicted: labResult?.predictedProfile[dim] || 0,
      fullMark: 10,
    }));
  }, [originalProfile, targetProfile, labResult]);

  const hasChanges = useMemo(() => {
    if (!selectedRecipe) return false;
    return Object.values(FlavorDimension).some(
      dim => targetProfile[dim] !== originalProfile[dim]
    );
  }, [selectedRecipe, targetProfile, originalProfile]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-950/40 to-stone-900 rounded-2xl p-4 border border-amber-800/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Flavor Laboratory</h2>
            <p className="text-xs text-stone-400">Experiment with recipes and discover new flavors</p>
          </div>
        </div>
        
        <p className="text-sm text-stone-300 leading-relaxed">
          {labMode === 'recipe' 
            ? 'Select a cocktail as your starting point, adjust the target flavor profile, and let AI suggest ingredient substitutions.'
            : labMode === 'build'
            ? 'Pick your ingredients and target flavor profile, and AI will create a custom cocktail recipe for you.'
            : 'Transform any cocktail into a zero or low-proof version while preserving its essential character.'
          }
        </p>
      </div>

      <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
        <button
          onClick={() => handleModeSwitch('recipe')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            labMode === 'recipe' 
              ? 'bg-surface text-white shadow-lg border border-stone-600' 
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Beaker className="w-3.5 h-3.5" />
          Modify
        </button>
        <button
          onClick={() => handleModeSwitch('build')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            labMode === 'build' 
              ? 'bg-surface text-white shadow-lg border border-stone-600' 
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Build
        </button>
        <button
          onClick={() => handleModeSwitch('deproof')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            labMode === 'deproof' 
              ? 'bg-surface text-white shadow-lg border border-stone-600' 
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <GlassWater className="w-3.5 h-3.5" />
          De-Proof
        </button>
      </div>

      {labMode === 'recipe' ? (
        <>
          <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
            <button
              onClick={() => setShowRecipeSelector(!showRecipeSelector)}
              className="w-full p-4 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Beaker className="w-5 h-5 text-secondary" />
                <div className="text-left">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Base Recipe</p>
                  <p className="text-white font-bold">
                    {selectedRecipe ? selectedRecipe.name : 'Select a cocktail...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRecipe && (
                  <span className="text-xs bg-stone-800 text-stone-300 px-2 py-1 rounded-lg flex items-center gap-1 border border-stone-700">
                    <GlassWater className="w-3 h-3" />
                    {formatVolumeForDisplay(selectedRecipe.targetVolume, selectedRecipe.ingredients)}
                  </span>
                )}
                {showRecipeSelector ? (
                  <ChevronUp className="w-5 h-5 text-stone-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-400" />
                )}
              </div>
            </button>
            
            {showRecipeSelector && (
              <div className="border-t border-stone-700 p-3 max-h-64 overflow-y-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes..."
                  className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white mb-2 outline-none focus:border-secondary"
                />
                <div className="space-y-1">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelectRecipe(recipe)}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedRecipe?.id === recipe.id 
                          ? 'bg-amber-900/30 border border-amber-700/50' 
                          : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">{recipe.name}</p>
                          <p className="text-xs text-stone-500">{recipe.category || 'Classic'}</p>
                        </div>
                        {!hasValidProfile(recipe) && (
                          <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-full border border-stone-700">
                            No profile
                          </span>
                        )}
                      </div>
                      {selectedRecipe?.id === recipe.id && (
                        <Check className="w-4 h-4 text-secondary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedRecipe && (
            <>
              <div className="bg-surface rounded-2xl border border-stone-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-secondary" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Flavor Profile</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                      <button
                        onClick={() => setEditorMode('wheel')}
                        className={`p-1.5 rounded transition-colors ${editorMode === 'wheel' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'}`}
                        title="Wheel View"
                      >
                        <Disc className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditorMode('sliders')}
                        className={`p-1.5 rounded transition-colors ${editorMode === 'sliders' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'}`}
                        title="Sliders View"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setTargetProfile({ ...originalProfile });
                        setTargetNoteProfile(undefined);
                        setBaseNoteProfile(deriveNoteProfileFromCategories(originalProfile));
                        wheelKeyRef.current += 1;
                      }}
                      className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                </div>

                {!hasValidProfile(selectedRecipe) && (
                  <div className="bg-stone-800/50 border border-stone-700 rounded-lg p-2.5 mb-3">
                    <p className="text-xs text-stone-400">
                      This recipe doesn't have flavor data yet. Using default profile as starting point.
                    </p>
                  </div>
                )}
                
                <div className={editorMode === 'wheel' ? 'block' : 'hidden'}>
                  <EditableFlavorWheel
                    key={`wheel-${selectedRecipe?.id || 'none'}-${wheelKeyRef.current}`}
                    recipeId={selectedRecipe?.id}
                    baseProfile={originalProfile as unknown as Record<string, number>}
                    currentProfile={targetProfile as unknown as Record<string, number>}
                    noteProfile={targetNoteProfile}
                    onProfileChange={(profile, noteProfile) => {
                      setTargetProfile(profile);
                      setTargetNoteProfile(noteProfile);
                    }}
                    responsive={true}
                  />
                </div>
                <div className={editorMode === 'sliders' ? 'grid grid-cols-2 gap-3' : 'hidden'}>
                  {Object.values(FlavorDimension).map((dim) => {
                    const original = originalProfile[dim];
                    const target = targetProfile[dim];
                    const diff = target - original;
                    
                    return (
                      <div key={dim} className="bg-stone-800/50 rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-stone-300">{dim}</span>
                          <div className="flex items-center gap-1">
                            {diff !== 0 && (
                              <span className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                            <span className="text-xs font-bold text-white w-4 text-center">{target}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => adjustFlavor(dim, -1)}
                            className="w-7 h-7 rounded bg-stone-700 hover:bg-stone-600 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3 text-stone-300" />
                          </button>
                          <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-600 to-orange-500 transition-all duration-200"
                              style={{ width: `${(target / 10) * 100}%` }}
                            />
                          </div>
                          <button
                            onClick={() => adjustFlavor(dim, 1)}
                            className="w-7 h-7 rounded bg-stone-700 hover:bg-stone-600 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3 text-stone-300" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-surface rounded-2xl border border-stone-700 p-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  Flavor Comparison
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                      <PolarGrid stroke="#44403c" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 600 }} 
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                      
                      <Radar
                        name="Original"
                        dataKey="Original"
                        stroke="#6b7280"
                        strokeWidth={2}
                        fill="#6b7280"
                        fillOpacity={0.2}
                        strokeDasharray="4 4"
                      />
                      
                      <Radar
                        name="Target"
                        dataKey="Target"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="#f59e0b"
                        fillOpacity={0.3}
                      />
                      
                      {labResult && (
                        <Radar
                          name="Predicted"
                          dataKey="Predicted"
                          stroke="#22c55e"
                          strokeWidth={3}
                          fill="#22c55e"
                          fillOpacity={0.2}
                        />
                      )}
                      
                      <Legend 
                        wrapperStyle={{ fontSize: '10px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-2 text-[10px] justify-center mt-2">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-stone-500" style={{ borderStyle: 'dashed' }}></span>
                    <span className="text-stone-400">Original</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-amber-500"></span>
                    <span className="text-stone-400">Target</span>
                  </span>
                  {labResult && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-green-500"></span>
                      <span className="text-stone-400">Predicted</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={analyzeSubstitutions}
                disabled={isAnalyzing || !hasChanges}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-stone-700 disabled:to-stone-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI Analyzing Modifications...
                  </>
                ) : (
                  <>
                    <Shuffle className="w-5 h-5" />
                    {hasChanges ? 'Get AI Recommendations' : 'Adjust Target Profile First'}
                  </>
                )}
              </button>

              {errorMessage && (
                <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-3 flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-400">{errorMessage}</p>
                    <button 
                      onClick={() => setErrorMessage(null)}
                      className="text-xs text-stone-400 hover:text-white mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {labResult && (
                <div className="space-y-4">
                  <div className="bg-surface rounded-2xl border border-stone-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-secondary" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Recommendations</h3>
                    </div>
                    
                    <p className="text-sm text-stone-300 mb-4 leading-relaxed bg-stone-800/50 p-3 rounded-lg border-l-2 border-secondary">
                      {labResult.rationale}
                    </p>
                    
                    {(labResult.substitutions.length > 0 || (labResult.additions && labResult.additions.length > 0)) ? (
                      <div className="space-y-4">
                        {labResult.substitutions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Swap Ingredients</p>
                            {labResult.substitutions.map((sub, idx) => (
                              <button
                                key={idx}
                                onClick={() => toggleSubstitution(idx)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                  appliedSubs.has(idx)
                                    ? 'bg-secondary/10 border-secondary/50'
                                    : 'bg-stone-800/50 border-stone-700 hover:border-secondary/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-stone-500 line-through">{sub.original}</span>
                                    <ArrowRight className="w-3 h-3 text-stone-500" />
                                    <span className="text-sm text-secondary font-medium">{sub.replacement}</span>
                                  </div>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                    appliedSubs.has(idx)
                                      ? 'bg-secondary border-secondary'
                                      : 'border-stone-600'
                                  }`}>
                                    {appliedSubs.has(idx) && <Check className="w-3 h-3 text-stone-900" />}
                                  </div>
                                </div>
                                <p className="text-xs text-stone-400">{sub.rationale}</p>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {labResult.additions && labResult.additions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Plus className="w-3 h-3" />
                              Add Ingredients
                            </p>
                            {labResult.additions.map((add, idx) => (
                              <button
                                key={idx}
                                onClick={() => toggleAddition(idx)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                  appliedAdds.has(idx)
                                    ? 'bg-green-900/20 border-green-700/50'
                                    : 'bg-stone-800/50 border-stone-700 hover:border-green-700/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Plus className="w-3 h-3 text-green-500" />
                                    <span className="text-sm text-green-400 font-medium">{add.amount} {add.ingredient}</span>
                                  </div>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                    appliedAdds.has(idx)
                                      ? 'bg-green-600 border-green-600'
                                      : 'border-stone-600'
                                  }`}>
                                    {appliedAdds.has(idx) && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                                <p className="text-xs text-stone-400">{add.rationale}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-stone-500 text-sm">
                        The original recipe already achieves the target profile well!
                      </div>
                    )}
                  </div>

                  {/* Volume Lever - shown when modifications exceed target volume */}
                  {(appliedSubs.size > 0 || appliedAdds.size > 0) && volumeOverage?.requiresBalance && showVolumeLever && selectedRecipe && (
                    <VolumeLever
                      originalIngredients={selectedRecipe.ingredients}
                      modifiedIngredients={getRawModifiedIngredients()}
                      instructions={selectedRecipe.instructions}
                      targetVolume={selectedRecipe.targetVolume}
                      predictedProfile={labResult?.predictedProfile}
                      onReductionsApply={(adjusted) => {
                        setVolumeAdjustedIngredients(adjusted);
                        setShowVolumeLever(false);
                      }}
                      onCancel={() => setShowVolumeLever(false)}
                    />
                  )}

                  {(appliedSubs.size > 0 || appliedAdds.size > 0) && (
                    <div className="bg-gradient-to-br from-stone-900 to-stone-950 rounded-2xl border border-amber-800/30 overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/30 px-4 py-3 border-b border-amber-800/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wine className="w-5 h-5 text-amber-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your New Riff</h3>
                          </div>
                          {existingRiff && (
                            <span className="flex items-center gap-1 text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full border border-blue-700/50">
                              <Database className="w-3 h-3" />
                              Existing Riff Found
                            </span>
                          )}
                          {saveSuccess && (
                            <span className="flex items-center gap-1 text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full border border-green-700/50">
                              <Check className="w-3 h-3" />
                              Saved!
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {/* Riff Name Input */}
                        {!saveSuccess && !existingRiff && (
                          <div>
                            <label className="block text-xs text-stone-400 mb-1.5 uppercase tracking-wider">Riff Name</label>
                            <input
                              type="text"
                              value={riffName}
                              onChange={(e) => setRiffName(e.target.value)}
                              placeholder={generateRiffName()}
                              className="w-full bg-stone-800/80 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-600 transition-colors"
                            />
                          </div>
                        )}
                        
                        {/* Show saved or existing riff name */}
                        {(saveSuccess || existingRiff) && (
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-700/50 to-orange-800/50 flex items-center justify-center border border-amber-700/30">
                              <FlaskConical className="w-6 h-6 text-amber-300" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">
                                {savedRiff?.name || existingRiff?.name}
                              </h4>
                              <p className="text-xs text-stone-400">
                                Riff of {selectedRecipe?.name}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Ingredients List */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-stone-500 uppercase tracking-wider">Ingredients</p>
                            {volumeAdjustedIngredients && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Volume Balanced
                              </span>
                            )}
                            {volumeOverage?.requiresBalance && !volumeAdjustedIngredients && !showVolumeLever && (
                              <button
                                onClick={() => setShowVolumeLever(true)}
                                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                              >
                                <Sliders className="w-3 h-3" />
                                Adjust Volume
                              </button>
                            )}
                          </div>
                          <div className="bg-stone-800/50 rounded-xl p-3 space-y-1.5">
                            {getModifiedIngredients().map((ing, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-stone-300">{ing}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Flavor Profile Preview */}
                        {labResult?.predictedProfile && (
                          <div>
                            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Predicted Flavor Profile</p>
                            <div className="grid grid-cols-4 gap-2">
                              {Object.entries(labResult.predictedProfile).map(([dim, value]) => (
                                <div key={dim} className="text-center">
                                  <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden mb-1">
                                    <div 
                                      className="h-full bg-gradient-to-r from-amber-600 to-orange-500"
                                      style={{ width: `${(Number(value) / 10) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-stone-400">{dim}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Substitutions Applied */}
                        <div>
                          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Modifications Made</p>
                          <div className="space-y-1.5">
                            {getAppliedSubstitutions().map((sub, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs bg-stone-800/50 rounded-lg px-2 py-1.5">
                                <span className="text-red-400 line-through">{sub.original}</span>
                                <ArrowRight className="w-3 h-3 text-stone-500" />
                                <span className="text-green-400 font-medium">{sub.replacement}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Existing Riff Message */}
                        {existingRiff && (
                          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-3">
                            <p className="text-sm text-blue-300 mb-2">
                              This riff already exists in your collection!
                            </p>
                            <p className="text-xs text-stone-400">
                              {existingRiff.description || `A variation of ${existingRiff.parentRecipeName} with similar ingredients.`}
                            </p>
                          </div>
                        )}
                        
                        {/* Save Button */}
                        {!saveSuccess && !existingRiff && (
                          <button
                            onClick={saveRiff}
                            disabled={isSavingRiff}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-stone-700 disabled:to-stone-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                          >
                            {isSavingRiff ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving Riff...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save Riff to Collection
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Success Message */}
                        {saveSuccess && savedRiff && (
                          <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-3 text-center">
                            <p className="text-sm text-green-300 mb-1">
                              Your riff has been saved and added to the cocktail family tree!
                            </p>
                            <p className="text-xs text-stone-400">
                              Find it in your Barmulary under Lab Riffs.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedRecipe && (
            <div className="bg-stone-900/50 rounded-2xl border border-stone-800 p-8 text-center">
              <FlaskConical className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Select a cocktail to start experimenting</p>
            </div>
          )}
        </>
      ) : labMode === 'build' ? (
        <>
          <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
            <button
              onClick={() => setShowIngredientPicker(!showIngredientPicker)}
              className="w-full p-4 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-secondary" />
                <div className="text-left">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Your Ingredients</p>
                  <p className="text-white font-bold">
                    {selectedIngredients.length > 0 
                      ? `${selectedIngredients.length} selected` 
                      : 'Pick ingredients to start...'}
                  </p>
                </div>
              </div>
              {showIngredientPicker ? (
                <ChevronUp className="w-5 h-5 text-stone-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-stone-400" />
              )}
            </button>

            {selectedIngredients.length > 0 && !showIngredientPicker && (
              <div className="border-t border-stone-700 p-3">
                <div className="flex flex-wrap gap-2">
                  {selectedIngredients.map((ing) => (
                    <span
                      key={ing.id}
                      className="inline-flex items-center gap-1.5 bg-secondary/20 text-secondary border border-secondary/30 px-2.5 py-1 rounded-full text-xs font-medium"
                    >
                      {ing.name}
                      <button
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {showIngredientPicker && (
              <div className="border-t border-stone-700 p-3 max-h-72 overflow-y-auto">
                <input
                  type="text"
                  value={ingredientSearchQuery}
                  onChange={(e) => setIngredientSearchQuery(e.target.value)}
                  placeholder="Search ingredients..."
                  className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white mb-3 outline-none focus:border-secondary"
                />

                {selectedIngredients.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Selected</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIngredients.map((ing) => (
                        <span
                          key={ing.id}
                          className="inline-flex items-center gap-1 bg-secondary/20 text-secondary border border-secondary/30 px-2 py-0.5 rounded-full text-xs"
                        >
                          {ing.name}
                          <button onClick={() => handleRemoveIngredient(ing.id)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {(Object.entries(ingredientsByCategory) as [string, MasterIngredient[]][]).map(([category, ingredients]) => (
                    <div key={category}>
                      <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1.5">{category}</p>
                      <div className="space-y-1">
                        {ingredients.map((ing) => {
                          const isSelected = selectedIngredients.some(s => s.id === ing.id);
                          return (
                            <button
                              key={ing.id}
                              onClick={() => isSelected ? handleRemoveIngredient(ing.id) : handleAddIngredient(ing)}
                              className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-secondary/20 border border-secondary/30' 
                                  : 'hover:bg-stone-800'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-white">{ing.name}</p>
                                {ing.flavorNotes && (
                                  <p className="text-[10px] text-stone-500 line-clamp-1">{ing.flavorNotes}</p>
                                )}
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-secondary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedIngredients.length > 0 && (
            <>
              <div className="bg-surface rounded-2xl border border-stone-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-secondary" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Flavor Profile</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                      <button
                        onClick={() => setEditorMode('wheel')}
                        className={`p-1.5 rounded transition-colors ${editorMode === 'wheel' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'}`}
                        title="Wheel View"
                      >
                        <Disc className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditorMode('sliders')}
                        className={`p-1.5 rounded transition-colors ${editorMode === 'sliders' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'}`}
                        title="Sliders View"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setTargetProfile({ ...DEFAULT_PROFILE });
                        setTargetNoteProfile(undefined);
                        setBaseNoteProfile(deriveNoteProfileFromCategories(DEFAULT_PROFILE));
                      }}
                      className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                </div>

                {editorMode === 'wheel' ? (
                  <EditableFlavorWheel
                    key={`build-wheel-${selectedIngredients.length}`}
                    baseProfile={DEFAULT_PROFILE as unknown as Record<string, number>}
                    currentProfile={targetProfile as unknown as Record<string, number>}
                    noteProfile={targetNoteProfile}
                    onProfileChange={(profile, noteProfile) => {
                      setTargetProfile(profile);
                      setTargetNoteProfile(noteProfile);
                    }}
                    responsive={true}
                  />
                ) : (
                  <div className="space-y-3">
                    {Object.values(FlavorDimension).map((dim) => (
                      <div key={dim} className="flex items-center gap-3">
                        <span className="text-xs text-stone-400 w-16">{dim}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            onClick={() => adjustFlavor(dim, -1)}
                            className="p-1 hover:bg-stone-700 rounded transition-colors"
                          >
                            <Minus className="w-3 h-3 text-stone-400" />
                          </button>
                          <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-secondary to-amber-500 transition-all"
                              style={{ width: `${(targetProfile[dim] / 10) * 100}%` }}
                            />
                          </div>
                          <button
                            onClick={() => adjustFlavor(dim, 1)}
                            className="p-1 hover:bg-stone-700 rounded transition-colors"
                          >
                            <Plus className="w-3 h-3 text-stone-400" />
                          </button>
                          <span className="text-xs text-white w-6 text-center">{targetProfile[dim]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={buildCocktail}
                disabled={isBuilding || selectedIngredients.length === 0}
                className="w-full bg-gradient-to-r from-secondary to-amber-500 hover:from-amber-500 hover:to-secondary disabled:from-stone-700 disabled:to-stone-700 text-stone-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Your Cocktail...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Cocktail
                  </>
                )}
              </button>
            </>
          )}

          {errorMessage && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-3 text-center">
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {buildResult && (
            <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden shadow-xl">
              <div className="relative h-32 bg-gradient-to-br from-secondary/30 via-stone-800 to-stone-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-stone-800/80 border-2 border-secondary/50 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-secondary" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 bg-secondary/90 text-stone-900 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" />
                  AI Created
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
              </div>
              
              <div className="p-4 -mt-4 relative">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">{buildResult.name}</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">{buildResult.description}</p>
                </div>

                <div className="bg-stone-800/50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wine className="w-3 h-3 text-secondary" />
                    Ingredients
                  </p>
                  <ul className="space-y-1.5">
                    {buildResult.ingredients.map((ing, idx) => (
                      <li key={idx} className="text-sm text-stone-200 flex items-start gap-2">
                        <span className="text-secondary mt-0.5">•</span>
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-stone-800/50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-secondary" />
                    Instructions
                  </p>
                  <ol className="space-y-2">
                    {buildResult.instructions.map((step, idx) => (
                      <li key={idx} className="text-sm text-stone-300 flex gap-2">
                        <span className="text-secondary font-bold min-w-[18px]">{idx + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-stone-800/30 border border-stone-700 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-secondary" />
                    Why This Works
                  </p>
                  <p className="text-xs text-stone-400 leading-relaxed">{buildResult.rationale}</p>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-secondary" />
                    Predicted Flavor Profile
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(buildResult.predictedProfile).map(([dim, value]) => (
                      <div key={dim} className="text-center">
                        <div className="h-2 bg-stone-700 rounded-full overflow-hidden mb-1">
                          <div 
                            className="h-full bg-gradient-to-r from-secondary to-amber-500"
                            style={{ width: `${(Number(value) / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-stone-400">{dim}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (onSaveExperiment && buildResult && !isSavingBuild && !buildSaveSuccess) {
                      setIsSavingBuild(true);
                      try {
                        const newCocktail: Cocktail = {
                          id: `lab-${Date.now()}`,
                          name: buildResult.name,
                          creator: 'Lab Creation',
                          description: buildResult.description,
                          ingredients: buildResult.ingredients,
                          instructions: buildResult.instructions,
                          flavorProfile: buildResult.predictedProfile,
                          category: 'Lab Creation',
                          dateAdded: new Date().toISOString()
                        };
                        await onSaveExperiment(newCocktail);
                        setBuildSaveSuccess(true);
                      } catch (err) {
                        console.error('Failed to save cocktail:', err);
                      } finally {
                        setIsSavingBuild(false);
                      }
                    }
                  }}
                  disabled={isSavingBuild || buildSaveSuccess}
                  className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg ${
                    buildSaveSuccess 
                      ? 'bg-accent text-white cursor-default shadow-accent/20' 
                      : isSavingBuild 
                        ? 'bg-stone-600 text-stone-400 cursor-wait' 
                        : 'bg-primary hover:bg-red-700 text-white shadow-primary/20'
                  }`}
                >
                  {isSavingBuild ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : buildSaveSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      Saved to Barmulary!
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save to Barmulary
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {selectedIngredients.length === 0 && (
            <div className="bg-stone-900/50 rounded-2xl border border-stone-800 p-8 text-center">
              <Plus className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Pick some ingredients to get started</p>
              <p className="text-stone-500 text-xs mt-1">Select spirits, liqueurs, or other ingredients and AI will create a cocktail for you</p>
            </div>
          )}
        </>
      ) : labMode === 'deproof' ? (
        <>
          <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
            <button
              onClick={() => setShowDeproofRecipeSelector(!showDeproofRecipeSelector)}
              className="w-full p-4 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GlassWater className="w-5 h-5 text-secondary" />
                <div className="text-left">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Select Cocktail</p>
                  <p className="text-white font-bold">
                    {selectedDeproofRecipe ? selectedDeproofRecipe.name : 'Choose a cocktail to de-proof...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showDeproofRecipeSelector ? (
                  <ChevronUp className="w-5 h-5 text-stone-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-400" />
                )}
              </div>
            </button>
            
            {showDeproofRecipeSelector && (
              <div className="border-t border-stone-700 p-3 max-h-64 overflow-y-auto">
                <input
                  type="text"
                  value={deproofSearchQuery}
                  onChange={(e) => setDeproofSearchQuery(e.target.value)}
                  placeholder="Search recipes..."
                  className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white mb-2 outline-none focus:border-secondary"
                />
                <div className="space-y-1">
                  {filteredDeproofRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelectDeproofRecipe(recipe)}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedDeproofRecipe?.id === recipe.id 
                          ? 'bg-amber-900/30 border border-amber-700/50' 
                          : 'hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">{recipe.name}</p>
                          <p className="text-xs text-stone-500">{recipe.category || 'Classic'}</p>
                        </div>
                      </div>
                      {selectedDeproofRecipe?.id === recipe.id && (
                        <Check className="w-4 h-4 text-secondary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedDeproofRecipe && (
            <>
              <div className="bg-surface rounded-2xl border border-stone-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Proof Level</h3>
                </div>
                
                <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
                  <button
                    onClick={() => setDeproofTarget('zero')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      deproofTarget === 'zero' 
                        ? 'bg-accent text-white shadow-lg border border-green-600' 
                        : 'text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    <span className="text-base">0%</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-70">Zero-Proof</span>
                  </button>
                  <button
                    onClick={() => setDeproofTarget('low')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      deproofTarget === 'low' 
                        ? 'bg-sky-600 text-white shadow-lg border border-sky-500' 
                        : 'text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    <span className="text-base">&lt;5%</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-70">Low-Proof</span>
                  </button>
                  <button
                    onClick={() => setDeproofTarget('low-abv')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      deproofTarget === 'low-abv' 
                        ? 'bg-amber-600 text-white shadow-lg border border-amber-500' 
                        : 'text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    <span className="text-base">5-15%</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-70">Low-ABV</span>
                  </button>
                </div>
                
                <p className="text-xs text-stone-500 mt-3 text-center">
                  {deproofTarget === 'zero' 
                    ? 'Completely alcohol-free using non-alcoholic alternatives'
                    : deproofTarget === 'low'
                    ? 'Very low alcohol (<5%) for sessionable drinking'
                    : 'Moderate reduction (5-15%) using fortified wines & aperitifs'
                  }
                </p>
              </div>

              <div className="bg-stone-800/50 rounded-2xl border border-stone-700 p-4">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wine className="w-3.5 h-3.5 text-secondary" />
                  Original Recipe
                </h4>
                <ul className="space-y-1.5">
                  {selectedDeproofRecipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="text-sm text-stone-300 flex items-start gap-2">
                      <span className="text-secondary mt-0.5">•</span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={analyzeDeproof}
                disabled={isDeproofing}
                className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg ${
                  isDeproofing 
                    ? 'bg-stone-700 text-stone-400 cursor-wait' 
                    : 'bg-gradient-to-r from-accent to-emerald-600 hover:from-emerald-600 hover:to-accent text-white shadow-accent/30'
                }`}
              >
                {isDeproofing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <GlassWater className="w-5 h-5" />
                    Generate {deproofTarget === 'zero' ? 'Zero-Proof' : deproofTarget === 'low' ? 'Low-Proof' : 'Low-ABV'} Version
                  </>
                )}
              </button>
            </>
          )}

          {errorMessage && (
            <div className="bg-red-950/50 border border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {deproofResult && (
            <div className="space-y-4">
              {!deproofResult.isPossible ? (
                <div className="bg-amber-950/50 border border-amber-800/50 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-900/50 mx-auto mb-4 flex items-center justify-center">
                    <X className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-400 mb-2">Cannot De-Proof This Cocktail</h3>
                  <p className="text-sm text-stone-300 leading-relaxed">{deproofResult.impossibilityReason}</p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-accent/20 to-stone-900 rounded-2xl border border-accent/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          deproofResult.proofLevel === 'zero' 
                            ? 'bg-accent/30 text-accent' 
                            : deproofResult.proofLevel === 'low'
                            ? 'bg-sky-600/30 text-sky-400'
                            : 'bg-amber-600/30 text-amber-400'
                        }`}>
                          {deproofResult.proofLevel === 'zero' ? '0% ABV' : `~${deproofResult.estimatedAbv}% ABV`}
                        </div>
                        <span className="text-xs text-stone-500">Estimated</span>
                      </div>
                      <Sparkles className="w-5 h-5 text-accent" />
                    </div>
                    <p className="text-sm text-stone-300 leading-relaxed">{deproofResult.rationale}</p>
                  </div>

                  {deproofResult.substitutions.length > 0 && (
                    <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
                      <div className="p-4 border-b border-stone-700">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-accent" />
                          Ingredient Substitutions
                        </h4>
                        <p className="text-xs text-stone-500 mt-1">Swap alcoholic ingredients for these alternatives</p>
                      </div>
                      <div className="divide-y divide-stone-800">
                        {deproofResult.substitutions.map((sub, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleDeproofSubstitution(idx)}
                            className={`w-full p-4 text-left transition-colors ${
                              appliedDeproofSubs.has(idx) 
                                ? 'bg-accent/10' 
                                : 'hover:bg-stone-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  appliedDeproofSubs.has(idx) 
                                    ? 'bg-accent border-accent' 
                                    : 'border-stone-600'
                                }`}>
                                  {appliedDeproofSubs.has(idx) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-stone-400 line-through">{sub.original}</span>
                                  <ArrowRight className="w-4 h-4 text-accent" />
                                  <span className="text-sm font-medium text-white">{sub.replacement}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-stone-500 pl-8">{sub.rationale}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {deproofResult.additions && deproofResult.additions.length > 0 && (
                    <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
                      <div className="p-4 border-b border-stone-700">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Plus className="w-4 h-4 text-accent" />
                          Additional Ingredients
                        </h4>
                        <p className="text-xs text-stone-500 mt-1">Add these to enhance flavor complexity</p>
                      </div>
                      <div className="divide-y divide-stone-800">
                        {deproofResult.additions.map((add, idx) => (
                          <div key={idx} className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">{add.amount} {add.ingredient}</span>
                            </div>
                            <p className="text-xs text-stone-500">{add.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {deproofResult.removals && deproofResult.removals.length > 0 && (
                    <div className="bg-red-950/30 rounded-2xl border border-red-900/50 p-4">
                      <h4 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3">
                        <Minus className="w-4 h-4" />
                        Ingredients to Remove
                      </h4>
                      <ul className="space-y-1">
                        {deproofResult.removals.map((item, idx) => (
                          <li key={idx} className="text-sm text-stone-400 line-through">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-stone-800/50 rounded-2xl border border-stone-700 p-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <GlassWater className="w-3.5 h-3.5 text-accent" />
                      Final Recipe
                    </h4>
                    <ul className="space-y-1.5">
                      {deproofResult.newIngredients.map((ing, idx) => (
                        <li key={idx} className="text-sm text-stone-200 flex items-start gap-2">
                          <span className="text-accent mt-0.5">•</span>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-accent" />
                      Predicted Flavor Profile
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(deproofResult.predictedProfile).map(([dim, value]) => (
                        <div key={dim} className="text-center">
                          <div className="h-2 bg-stone-700 rounded-full overflow-hidden mb-1">
                            <div 
                              className="h-full bg-gradient-to-r from-accent to-emerald-500"
                              style={{ width: `${(Number(value) / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-stone-400">{dim}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (onSaveExperiment && deproofResult && selectedDeproofRecipe) {
                        const categoryByProof = {
                          'zero': 'Zero-Proof',
                          'low': 'Low-Proof',
                          'low-abv': 'Low-ABV'
                        };
                        const labelByProof = {
                          'zero': 'NA',
                          'low': 'LP',
                          'low-abv': 'Low-ABV'
                        };
                        const descByProof = {
                          'zero': 'Non-alcoholic',
                          'low': 'Low-proof (<5% ABV)',
                          'low-abv': 'Low-ABV (5-15%)'
                        };
                        const newCocktail: Cocktail = {
                          id: `deproof-${Date.now()}`,
                          name: `${selectedDeproofRecipe.name} (${labelByProof[deproofResult.proofLevel]})`,
                          creator: 'De-Proof Lab',
                          description: `${descByProof[deproofResult.proofLevel]} version of ${selectedDeproofRecipe.name}`,
                          ingredients: deproofResult.newIngredients,
                          instructions: selectedDeproofRecipe.instructions || [],
                          flavorProfile: deproofResult.predictedProfile,
                          category: categoryByProof[deproofResult.proofLevel],
                          dateAdded: new Date().toISOString()
                        };
                        await onSaveExperiment(newCocktail);
                      }
                    }}
                    className="w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg bg-primary hover:bg-red-700 text-white shadow-primary/20"
                  >
                    <Save className="w-5 h-5" />
                    Save to Barmulary
                  </button>
                </>
              )}
            </div>
          )}

          {!selectedDeproofRecipe && (
            <div className="bg-stone-900/50 rounded-2xl border border-stone-800 p-8 text-center">
              <GlassWater className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Select a cocktail to de-proof</p>
              <p className="text-stone-500 text-xs mt-1">AI will suggest non-alcoholic or low-proof substitutions</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default CocktailLab;
