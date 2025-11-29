import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, Sparkles, ChevronDown, ChevronUp, ArrowRight, 
  Loader2, RefreshCw, Beaker, Target, Lightbulb, Check, X,
  Plus, Minus, Shuffle
} from 'lucide-react';
import { Cocktail, FlavorProfile, FlavorDimension } from '../types';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface Props {
  allRecipes: Cocktail[];
  onSaveExperiment?: (recipe: Cocktail) => void;
}

interface Substitution {
  original: string;
  replacement: string;
  rationale: string;
}

interface LabResult {
  substitutions: Substitution[];
  predictedProfile: FlavorProfile;
  rationale: string;
  newIngredients: string[];
}

const DEFAULT_PROFILE: FlavorProfile = {
  [FlavorDimension.SWEET]: 5,
  [FlavorDimension.SOUR]: 5,
  [FlavorDimension.BITTER]: 3,
  [FlavorDimension.BOOZY]: 5,
  [FlavorDimension.HERBAL]: 3,
  [FlavorDimension.FRUITY]: 4,
  [FlavorDimension.SPICY]: 2,
  [FlavorDimension.SMOKY]: 1,
};

const CocktailLab: React.FC<Props> = ({ allRecipes, onSaveExperiment }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<Cocktail | null>(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [targetProfile, setTargetProfile] = useState<FlavorProfile>(DEFAULT_PROFILE);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSubs, setAppliedSubs] = useState<Set<number>>(new Set());

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
    setSelectedRecipe(recipe);
    setTargetProfile({ ...getRecipeProfile(recipe) });
    setShowRecipeSelector(false);
    setLabResult(null);
    setErrorMessage(null);
    setAppliedSubs(new Set());
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
    
    try {
      const response = await fetch('/api/lab/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          baseRecipe: {
            name: selectedRecipe.name,
            ingredients: selectedRecipe.ingredients,
            flavorProfile: getRecipeProfile(selectedRecipe)
          },
          targetProfile
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLabResult(data);
        setAppliedSubs(new Set());
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || 'Failed to analyze substitutions. Please try again.');
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

  const getModifiedIngredients = (): string[] => {
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
    
    return ingredients;
  };

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
      <div className="bg-gradient-to-br from-purple-950/40 to-stone-900 rounded-2xl p-4 border border-purple-800/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Flavor Laboratory</h2>
            <p className="text-xs text-stone-400">Experiment with recipes and discover new flavors</p>
          </div>
        </div>
        
        <p className="text-sm text-stone-300 leading-relaxed">
          Select a cocktail as your starting point, adjust the target flavor profile, and let AI suggest ingredient substitutions to achieve your desired taste.
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-stone-700 overflow-hidden">
        <button
          onClick={() => setShowRecipeSelector(!showRecipeSelector)}
          className="w-full p-4 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Beaker className="w-5 h-5 text-purple-400" />
            <div className="text-left">
              <p className="text-xs text-stone-500 uppercase tracking-wider">Base Recipe</p>
              <p className="text-white font-bold">
                {selectedRecipe ? selectedRecipe.name : 'Select a cocktail...'}
              </p>
            </div>
          </div>
          {showRecipeSelector ? (
            <ChevronUp className="w-5 h-5 text-stone-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-stone-400" />
          )}
        </button>
        
        {showRecipeSelector && (
          <div className="border-t border-stone-700 p-3 max-h-64 overflow-y-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white mb-2 outline-none focus:border-purple-500"
            />
            <div className="space-y-1">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                    selectedRecipe?.id === recipe.id 
                      ? 'bg-purple-900/30 border border-purple-700/50' 
                      : 'hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{recipe.name}</p>
                      <p className="text-xs text-stone-500">{recipe.category || 'Classic'}</p>
                    </div>
                    {!hasValidProfile(recipe) && (
                      <span className="text-[9px] bg-yellow-950/50 text-yellow-500 px-1.5 py-0.5 rounded-full border border-yellow-800/30">
                        No profile
                      </span>
                    )}
                  </div>
                  {selectedRecipe?.id === recipe.id && (
                    <Check className="w-4 h-4 text-purple-400" />
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
              <button
                onClick={() => setTargetProfile({ ...originalProfile })}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {!hasValidProfile(selectedRecipe) && (
              <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-2.5 mb-3">
                <p className="text-xs text-yellow-400">
                  This recipe doesn't have flavor data yet. Using default profile as starting point.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
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
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-200"
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
              <Sparkles className="w-4 h-4 text-purple-400" />
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
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="#a855f7"
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
                <span className="w-3 h-0.5 bg-purple-500"></span>
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
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-stone-700 disabled:to-stone-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI Analyzing Substitutions...
              </>
            ) : (
              <>
                <Shuffle className="w-5 h-5" />
                {hasChanges ? 'Get AI Substitution Recommendations' : 'Adjust Target Profile First'}
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
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Recommendations</h3>
                </div>
                
                <p className="text-sm text-stone-300 mb-4 leading-relaxed bg-stone-800/50 p-3 rounded-lg border-l-2 border-purple-500">
                  {labResult.rationale}
                </p>
                
                {labResult.substitutions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Suggested Substitutions</p>
                    {labResult.substitutions.map((sub, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleSubstitution(idx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          appliedSubs.has(idx)
                            ? 'bg-green-950/30 border-green-700/50'
                            : 'bg-stone-800/50 border-stone-700 hover:border-purple-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-400 line-through">{sub.original}</span>
                            <ArrowRight className="w-3 h-3 text-stone-500" />
                            <span className="text-sm text-green-400 font-medium">{sub.replacement}</span>
                          </div>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            appliedSubs.has(idx)
                              ? 'bg-green-600 border-green-500'
                              : 'border-stone-600'
                          }`}>
                            {appliedSubs.has(idx) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-stone-400">{sub.rationale}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-stone-500 text-sm">
                    The original recipe already achieves the target profile well!
                  </div>
                )}
              </div>

              {appliedSubs.size > 0 && (
                <div className="bg-surface rounded-2xl border border-stone-700 p-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-green-400" />
                    Modified Recipe
                  </h3>
                  <div className="space-y-1.5">
                    {getModifiedIngredients().map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-stone-300">{ing}</span>
                      </div>
                    ))}
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
    </div>
  );
};

export default CocktailLab;
