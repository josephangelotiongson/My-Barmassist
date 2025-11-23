
import React, { useMemo } from 'react';
import { X, Clock, ExternalLink, Sparkles, User, List, ListOrdered, Check, ArrowRight, Beaker, ShoppingCart, AlertCircle } from 'lucide-react';
import { Cocktail, FlavorDimension, Ingredient, ShoppingListItem } from '../types';

interface Props {
  cocktail: Cocktail | null;
  onClose: () => void;
  pantry?: Ingredient[];
  shoppingList?: ShoppingListItem[];
  onViewRecipe?: (cocktail: Cocktail) => void;
  onSave?: (cocktail: Cocktail) => void;
  onAddToShoppingList?: (ingredients: string[]) => void;
}

const RecipeDetail: React.FC<Props> = ({ cocktail, onClose, pantry = [], shoppingList = [], onViewRecipe, onSave, onAddToShoppingList }) => {
  
  // Calculate missing ingredients
  // Hooks must be called unconditionally, so we handle null cocktail inside the hook
  const missingIngredients = useMemo(() => {
      if (!cocktail || !cocktail.ingredients) return [];
      return cocktail.ingredients.filter(ing => {
          // Check if ingredient is available in pantry
          if (pantry.length === 0) return true; // Missing if pantry empty
          const inPantry = pantry.some(item => ing.toLowerCase().includes(item.name.toLowerCase()));
          return !inPantry;
      });
  }, [cocktail, pantry]);

  // Calculate actual items needed to buy (items not in pantry AND not in shopping list)
  const itemsToBuy = useMemo(() => {
      return missingIngredients.filter(ing => 
          !shoppingList.some(item => item.name.toLowerCase() === ing.toLowerCase())
      );
  }, [missingIngredients, shoppingList]);

  if (!cocktail) return null;

  const isTemporary = cocktail.id.startsWith('temp-');

  // Helper to check availability for render
  const isAvailable = (ingredientLine: string) => {
     if (pantry.length === 0) return false;
     // Simple check: does any pantry item name appear in the ingredient line?
     return pantry.some(item => ingredientLine.toLowerCase().includes(item.name.toLowerCase()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 w-full max-w-lg sm:rounded-2xl shadow-2xl border-t sm:border border-stone-700 flex flex-col max-h-[95dvh] h-[90dvh] sm:h-auto overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* Image Header */}
        <div className="relative h-64 w-full flex-none">
          {cocktail.imageUrl ? (
            <img 
              src={cocktail.imageUrl} 
              alt={cocktail.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400') {
                    target.src = 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=400';
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-stone-800 flex items-center justify-center flex-col text-stone-500">
               <Sparkles className="w-8 h-8 mb-2 opacity-50" />
               <span className="text-xs">No Visualization</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/50 to-transparent"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex justify-between items-end">
                <div>
                    {cocktail.creator && (
                        <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                             <User className="w-3 h-3" /> {cocktail.creator}
                        </p>
                    )}
                    <h2 className="text-3xl font-bold text-white leading-tight mb-1">{cocktail.name}</h2>
                    <p className="text-stone-300 text-sm italic line-clamp-2">{cocktail.description}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Temporary Draft Warning */}
        {isTemporary && (
            <div className="bg-blue-900/30 border-b border-blue-500/30 px-6 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">Temporary AI Draft</span>
            </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
            
            {/* Flavor Tags */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(cocktail.flavorProfile)
                    .filter(([_, score]) => score > 5)
                    .map(([flavor]) => (
                        <span key={flavor} className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-[10px] uppercase font-bold text-stone-400">
                            {flavor}
                        </span>
                    ))
                }
                {(cocktail.imageUrl && cocktail.imageUrl.startsWith('data:')) || cocktail.creator === 'AI Bartender' ? (
                    <span className="px-2 py-1 bg-primary/10 border border-primary/30 rounded text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Generated
                    </span>
                ) : null}
            </div>
            
            {/* Order Log Info - Specific to Orders */}
            {cocktail.source === 'Order' && (
                <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-stone-700">
                        <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Order Log</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase">{new Date(cocktail.dateAdded).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                         <div className="text-sm font-bold text-white">{cocktail.creator || 'Unknown Bar'}</div>
                         {onViewRecipe && (
                             <button 
                                onClick={() => onViewRecipe(cocktail)}
                                className="bg-secondary text-stone-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-500/20"
                             >
                                <Beaker className="w-3 h-3" />
                                Make at Home
                             </button>
                         )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* Ingredients */}
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                        <List className="w-4 h-4 text-secondary" />
                        Compounds
                    </h3>
                    <ul className="space-y-2">
                        {cocktail.ingredients.map((ing, idx) => {
                            const available = isAvailable(ing);
                            return (
                                <li key={idx} className={`text-sm px-3 py-2 rounded border flex items-center gap-2 ${available ? 'bg-green-950/20 border-green-900/30 text-green-200' : 'bg-surface border-stone-800 text-stone-300'}`}>
                                    {available ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></span>}
                                    {ing}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Instructions */}
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-secondary" />
                        Procedure
                    </h3>
                    
                    {/* Warning if assumed instructions */}
                    {cocktail.instructions && cocktail.instructions.length > 0 && cocktail.instructions[0].includes('Ordered at bar') && (
                         <div className="mb-3 text-xs text-stone-500 italic bg-stone-800/50 p-2 rounded">
                            Standard recipe not captured. Click "Make at Home" to have the AI Bartender deduce it.
                         </div>
                    )}
                    
                    <div className="space-y-4 relative">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-stone-800"></div>
                        {(cocktail.instructions && cocktail.instructions.length > 0) ? (
                             cocktail.instructions.map((step, idx) => (
                                <div key={idx} className="relative pl-8">
                                    <span className="absolute left-0 top-0 w-6 h-6 rounded-full bg-stone-800 border border-stone-700 text-stone-400 text-xs font-bold flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                    <p className="text-sm text-stone-300 leading-relaxed">{step}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-stone-500 italic text-sm pl-8">No specific instructions recorded.</p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Footer Link */}
            {cocktail.originalLink && (
                <div className="pt-4 border-t border-stone-800">
                    <a 
                        href={cocktail.originalLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                        View Original Source
                    </a>
                </div>
            )}
        </div>

        {/* Sticky Actions Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900 absolute bottom-0 left-0 right-0">
            {isTemporary ? (
                <button 
                    onClick={() => onSave && onSave(cocktail)}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Check className="w-5 h-5" />
                    Save to Barmulary
                </button>
            ) : (
                <>
                    {missingIngredients.length > 0 ? (
                        itemsToBuy.length > 0 ? (
                            <button 
                                onClick={() => onAddToShoppingList && onAddToShoppingList(itemsToBuy)}
                                className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 border border-stone-600 hover:border-white/20"
                            >
                                <ShoppingCart className="w-5 h-5 text-secondary" />
                                Add {itemsToBuy.length} Missing to List
                            </button>
                        ) : (
                            <div className="w-full bg-stone-800 text-stone-400 font-bold py-3 rounded-xl border border-stone-700 flex items-center justify-center gap-2 cursor-default">
                                <ShoppingCart className="w-5 h-5 text-stone-500" />
                                Missing Items in Cart
                            </div>
                        )
                    ) : (
                        <div className="w-full bg-green-950/30 text-green-400 font-bold py-3 rounded-xl border border-green-900/50 flex items-center justify-center gap-2 cursor-default">
                             <Check className="w-5 h-5" />
                             In Stock / Ready to Make
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
