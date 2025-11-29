import React, { useState, useEffect, useMemo } from 'react';
import { Scale, Minus, Plus, AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  calculateVolumeOverage, 
  classifyReducibleIngredients, 
  formatOzAmount,
  applyReductions as applyReductionsUtil,
  ReducibleIngredient,
  VolumeOverageResult
} from '../shared/volumeUtils';

interface Props {
  originalIngredients: string[];
  modifiedIngredients: string[];
  targetVolume?: string;
  onReductionsApply: (adjustedIngredients: string[]) => void;
  onCancel: () => void;
}

const VolumeLever: React.FC<Props> = ({
  originalIngredients,
  modifiedIngredients,
  targetVolume,
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
                  
                  return (
                    <div 
                      key={ingredient.index}
                      className="flex items-center justify-between bg-stone-800/50 rounded-lg px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{ingredient.label}</p>
                        <p className="text-xs text-stone-500">
                          {formatOzAmount(ingredient.currentAmountOz)} oz
                          {reduction > 0 && (
                            <span className="text-amber-400 ml-1">
                              → {formatOzAmount(currentAmount)} oz
                            </span>
                          )}
                        </p>
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
