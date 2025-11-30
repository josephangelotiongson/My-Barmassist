import React, { useState, useMemo } from 'react';
import { Scale, Minus, Plus, AlertTriangle, Check, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';
import { 
  calculateVolumeOverage, 
  classifyReducibleIngredients, 
  formatOzAmount,
  applyReductions as applyReductionsUtil,
  ReducibleIngredient,
} from '../shared/volumeUtils';
import { INGREDIENT_FLAVOR_MAP } from '../shared/flavorTaxonomy';
import { FlavorProfile } from '../types';

interface Props {
  originalIngredients: string[];
  modifiedIngredients: string[];
  targetVolume?: string;
  predictedProfile?: FlavorProfile;
  onReductionsApply: (adjustedIngredients: string[]) => void;
  onCancel: () => void;
}

const FLAVOR_COLORS: Record<string, string> = {
  Sweet: '#f59e0b',
  Fruity: '#ec4899',
  Floral: '#a855f7',
  Herbal: '#22c55e',
  Spicy: '#ef4444',
  Earthy: '#78716c',
  Sour: '#06b6d4',
  Boozy: '#8b5cf6'
};

const CATEGORY_ID_TO_LABEL: Record<string, string> = {
  sweet: 'Sweet',
  fruity: 'Fruity',
  floral: 'Floral',
  herbal: 'Herbal',
  spicy: 'Spicy',
  earthy: 'Earthy',
  sour: 'Sour',
  boozy: 'Boozy'
};

function normalizeIngredientName(ingredientLine: string): string {
  let name = ingredientLine.toLowerCase();
  
  name = name.replace(/[\d½¼¾⅓⅔⅛⅜⅝⅞.\/]+\s*(oz|ml|cl|dash|dashes|tsp|tbsp|cup|cups|bar\s*spoon|barspoon|drop|drops|splash|splashes|rinse|part|parts)s?\b/gi, '');
  
  name = name.replace(/^\s*(oz|ml|cl|dash|dashes|tsp|tbsp|cup|cups|bar\s*spoon|barspoon|drop|drops|splash|splashes|rinse|part|parts)s?\s+/gi, '');
  
  name = name.replace(/\b(one|two|three|four|half|quarter)\s+(oz|dash|dashes|tsp|tbsp|drop|drops)\b/gi, '');
  
  name = name.replace(/\s+/g, ' ').trim();
  
  return name;
}

function getFlavorImpactFromIngredient(ingredientLine: string): string[] {
  const name = normalizeIngredientName(ingredientLine);
  const impactedCategories = new Set<string>();
  
  const sortedKeywords = Object.keys(INGREDIENT_FLAVOR_MAP).sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    
    if (regex.test(name)) {
      const noteIds = INGREDIENT_FLAVOR_MAP[keyword];
      for (const noteId of noteIds) {
        const catId = noteId.split('.')[0];
        const catLabel = CATEGORY_ID_TO_LABEL[catId];
        if (catLabel) {
          impactedCategories.add(catLabel);
        }
      }
      break;
    }
  }
  
  return Array.from(impactedCategories);
}

function estimateProfileAfterReductions(
  baseProfile: FlavorProfile,
  reducibleIngredients: ReducibleIngredient[],
  reductions: Map<number, number>
): FlavorProfile {
  const estimated = { ...baseProfile };
  const totalImpact: Record<string, number> = {};
  
  reductions.forEach((reductionOz, index) => {
    const ingredient = reducibleIngredients.find(i => i.index === index);
    if (!ingredient || reductionOz === 0) return;
    
    const impactedCategories = getFlavorImpactFromIngredient(ingredient.label);
    const reductionRatio = reductionOz / ingredient.currentAmountOz;
    
    for (const cat of impactedCategories) {
      totalImpact[cat] = (totalImpact[cat] || 0) + reductionRatio * 0.5;
    }
  });
  
  for (const [cat, impact] of Object.entries(totalImpact)) {
    const currentValue = estimated[cat as keyof FlavorProfile] || 0;
    estimated[cat as keyof FlavorProfile] = Math.max(0, Math.round((currentValue - impact) * 10) / 10);
  }
  
  return estimated;
}

const VolumeLever: React.FC<Props> = ({
  originalIngredients,
  modifiedIngredients,
  targetVolume,
  predictedProfile,
  onReductionsApply,
  onCancel
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [reductions, setReductions] = useState<Map<number, number>>(new Map());
  
  const overage = useMemo(() => 
    calculateVolumeOverage(originalIngredients, modifiedIngredients, targetVolume),
    [originalIngredients, modifiedIngredients, targetVolume]
  );
  
  const reducibleIngredients = useMemo(() => 
    classifyReducibleIngredients(modifiedIngredients),
    [modifiedIngredients]
  );
  
  const totalReduction = useMemo(() => {
    let total = 0;
    reductions.forEach(val => total += val);
    return Math.round(total * 100) / 100;
  }, [reductions]);
  
  const remainingOverage = Math.round((overage.overageOz - totalReduction) * 100) / 100;
  const isBalanced = remainingOverage <= 0;
  
  const estimatedProfile = useMemo(() => {
    if (!predictedProfile) return null;
    return estimateProfileAfterReductions(predictedProfile, reducibleIngredients, reductions);
  }, [predictedProfile, reducibleIngredients, reductions]);
  
  const affectedCategories = useMemo(() => {
    if (!predictedProfile || !estimatedProfile) return [];
    const affected: Array<{ category: string; before: number; after: number; delta: number }> = [];
    
    for (const cat of Object.keys(predictedProfile) as (keyof FlavorProfile)[]) {
      const before = predictedProfile[cat] || 0;
      const after = estimatedProfile[cat] || 0;
      const delta = after - before;
      if (Math.abs(delta) >= 0.1) {
        affected.push({ category: cat, before, after, delta });
      }
    }
    
    return affected.sort((a, b) => a.delta - b.delta);
  }, [predictedProfile, estimatedProfile]);
  
  const handleReduce = (index: number, ingredient: ReducibleIngredient) => {
    if (!ingredient.isReducible) return;
    
    const currentReduction = reductions.get(index) || 0;
    const maxReduction = ingredient.currentAmountOz - ingredient.minAmountOz;
    
    if (currentReduction < maxReduction) {
      const newReduction = Math.min(currentReduction + 0.25, maxReduction);
      setReductions(new Map(reductions.set(index, Math.round(newReduction * 100) / 100)));
    }
  };
  
  const handleIncrease = (index: number) => {
    const currentReduction = reductions.get(index) || 0;
    if (currentReduction > 0) {
      const newReduction = Math.max(0, currentReduction - 0.25);
      const newMap = new Map(reductions);
      if (newReduction === 0) {
        newMap.delete(index);
      } else {
        newMap.set(index, Math.round(newReduction * 100) / 100);
      }
      setReductions(newMap);
    }
  };
  
  const handleApplyReductions = () => {
    const adjustedIngredients = applyReductionsUtil(modifiedIngredients, reductions);
    onReductionsApply(adjustedIngredients);
  };
  
  if (!overage.requiresBalance) {
    return null;
  }
  
  const reducibleCount = reducibleIngredients.filter(i => i.isReducible).length;
  
  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">Volume Balancing Required</span>
          {!isBalanced && (
            <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full">
              +{formatOzAmount(overage.overageOz)} oz over
            </span>
          )}
          {isBalanced && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              Balanced
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-amber-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t border-amber-800/30 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-stone-800/50 rounded-lg p-2">
              <p className="text-[10px] text-stone-500 uppercase">Target</p>
              <p className="text-lg font-bold text-white">{formatOzAmount(overage.targetVolumeOz)} oz</p>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-2">
              <p className="text-[10px] text-stone-500 uppercase">Current</p>
              <p className={`text-lg font-bold ${isBalanced ? 'text-green-400' : 'text-amber-400'}`}>
                {formatOzAmount(overage.newVolumeOz - totalReduction)} oz
              </p>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-2">
              <p className="text-[10px] text-stone-500 uppercase">
                {isBalanced ? 'Within Tolerance' : 'Need to Reduce'}
              </p>
              <p className={`text-lg font-bold ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                {isBalanced ? (
                  <Check className="w-5 h-5 mx-auto" />
                ) : (
                  `${formatOzAmount(remainingOverage)} oz`
                )}
              </p>
            </div>
          </div>
          
          {predictedProfile && totalReduction > 0 && affectedCategories.length > 0 && (
            <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs font-medium text-stone-300 uppercase tracking-wider">Estimated Flavor Impact</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {affectedCategories.map(({ category, before, after, delta }) => (
                  <div key={category} className="text-center">
                    <div className="text-[10px] text-stone-500 mb-1 truncate">{category}</div>
                    <div className="flex items-center justify-center gap-1">
                      <span 
                        className="text-xs font-medium"
                        style={{ color: FLAVOR_COLORS[category] }}
                      >
                        {before.toFixed(1)}
                      </span>
                      <span className="text-stone-600">→</span>
                      <span 
                        className="text-xs font-bold"
                        style={{ color: delta < 0 ? '#f87171' : FLAVOR_COLORS[category] }}
                      >
                        {after.toFixed(1)}
                      </span>
                    </div>
                    <div className={`text-[10px] ${delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {delta < 0 ? '' : '+'}{delta.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {predictedProfile && totalReduction > 0 && affectedCategories.length === 0 && (
            <div className="bg-stone-900/50 rounded-lg p-2 border border-stone-700 text-center">
              <span className="text-xs text-stone-400">Minimal flavor impact from these reductions</span>
            </div>
          )}
          
          <div className="space-y-2">
            <p className="text-xs text-stone-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Reduce ingredients to balance volume (0.25 oz increments)
            </p>
            
            {reducibleCount === 0 ? (
              <p className="text-xs text-stone-500 italic text-center py-2">
                No reducible ingredients found. Consider using smaller additions.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reducibleIngredients.filter(i => i.isReducible).map((ingredient) => {
                  const reduction = reductions.get(ingredient.index) || 0;
                  const currentAmount = ingredient.currentAmountOz - reduction;
                  const canReduce = currentAmount > ingredient.minAmountOz;
                  const canIncrease = reduction > 0;
                  
                  const flavorImpact = getFlavorImpactFromIngredient(ingredient.label);
                  
                  return (
                    <div 
                      key={ingredient.index}
                      className="flex items-center justify-between bg-stone-800/50 rounded-lg px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{ingredient.label}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-stone-500">
                            {formatOzAmount(ingredient.currentAmountOz)} oz
                            {reduction > 0 && (
                              <span className="text-amber-400 ml-1">
                                → {formatOzAmount(currentAmount)} oz
                              </span>
                            )}
                          </p>
                          {flavorImpact.length > 0 && (
                            <div className="flex gap-0.5">
                              {flavorImpact.slice(0, 3).map(cat => (
                                <span 
                                  key={cat}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: FLAVOR_COLORS[cat] }}
                                  title={cat}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleIncrease(ingredient.index)}
                          disabled={!canIncrease}
                          className="w-8 h-8 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                        
                        <span className="w-14 text-center text-sm font-mono text-white">
                          {reduction > 0 ? `-${formatOzAmount(reduction)}` : '—'}
                        </span>
                        
                        <button
                          onClick={() => handleReduce(ingredient.index, ingredient)}
                          disabled={!canReduce}
                          className="w-8 h-8 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyReductions}
              disabled={!isBalanced}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Balanced Recipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeLever;
