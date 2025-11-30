import React, { useMemo, useState } from 'react';
import { X, Clock, ExternalLink, Sparkles, User, List, ListOrdered, Check, ArrowRight, Beaker, ShoppingCart, AlertCircle, BookOpen, Star, Trash2, Disc, Hexagon, Link, Plus, Activity, Droplets, Book, ChevronDown, ChevronUp, Network, Share2, Copy, Info } from 'lucide-react';
import { Cocktail, FlavorDimension, Ingredient, ShoppingListItem } from '../types';
import FlavorWheel from './FlavorWheel';
import FlavorRadar from './RadarChart';
import { calculateCompleteDrinkMetrics, DILUTION_STANDARDS, formatOzAmount, PreparationMethod } from '../shared/volumeUtils';

interface Props {
  cocktail: Cocktail | null;
  onClose: () => void;
  pantry?: Ingredient[];
  shoppingList?: ShoppingListItem[];
  onViewRecipe?: (cocktail: Cocktail) => void;
  onSave?: (cocktail: Cocktail) => void;
  onAddToShoppingList?: (ingredients: string[], recipeName?: string) => void;
  onRate?: (rating: number) => void;
  onDelete?: (id: string) => void;
  onAddLink?: (id: string, url: string) => void;
  isToConcoct?: boolean;
  onRemoveFromToConcoct?: (recipeName: string) => void;
  onViewFamilyTree?: (cocktail: Cocktail) => void;
  recipeType?: 'global' | 'user' | 'riff';
  recipeDbId?: number | string;
}

const RecipeDetail: React.FC<Props> = ({ cocktail, onClose, pantry = [], shoppingList = [], onViewRecipe, onSave, onAddToShoppingList, onRate, onDelete, onAddLink, isToConcoct, onRemoveFromToConcoct, onViewFamilyTree, recipeType, recipeDbId }) => {
  const [newLink, setNewLink] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [sharecopied, setShareCopied] = useState(false);
  const [showDilutionDetails, setShowDilutionDetails] = useState(false);

  const drinkMetrics = useMemo(() => {
    if (!cocktail) return null;
    return calculateCompleteDrinkMetrics(cocktail.ingredients, cocktail.instructions);
  }, [cocktail]);

  const getShareUrl = () => {
    if (!cocktail) return '';
    const type = recipeType || 'global';
    const id = recipeDbId || cocktail.id;
    return `${window.location.origin}/share/${type}/${encodeURIComponent(id)}`;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: cocktail?.name || 'Cocktail Recipe',
          text: `Check out this cocktail recipe: ${cocktail?.name}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fall back to clipboard if share was cancelled or failed
      }
    }
    
    // Fallback to copying to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Calculate missing ingredients
  const missingIngredients = useMemo(() => {
      if (!cocktail || !cocktail.ingredients) return [];
      return cocktail.ingredients.filter(ing => {
          if (pantry.length === 0) return true;
          const inPantry = pantry.some(item => ing.toLowerCase().includes(item.name.toLowerCase()));
          return !inPantry;
      });
  }, [cocktail, pantry]);

  const itemsToBuy = useMemo(() => {
      return missingIngredients.filter(ing => 
          !shoppingList.some(item => item.name.toLowerCase() === ing.toLowerCase())
      );
  }, [missingIngredients, shoppingList]);

  if (!cocktail) return null;

  const isTemporary = cocktail.id.startsWith('temp-');

  const isAvailable = (ingredientLine: string) => {
     if (pantry.length === 0) return false;
     return pantry.some(item => ingredientLine.toLowerCase().includes(item.name.toLowerCase()));
  };

  const handleDelete = () => {
      if (confirm("Are you sure you want to remove this recipe?")) {
          onDelete && onDelete(cocktail.id);
          onClose();
      }
  };

  const handleAddLink = () => {
      if (newLink.trim() && onAddLink) {
          onAddLink(cocktail.id, newLink);
          setNewLink('');
      }
  };

  const allLinks = [
      ...(cocktail.originalLink ? [cocktail.originalLink] : []),
      ...(cocktail.externalLinks || [])
  ];

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
          {cocktail.imageUrl?.startsWith('/cocktail-images/') && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">AI Generated</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/50 to-transparent pointer-events-none"></div>
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-1"
              title="Share recipe"
            >
              {sharecopied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>
            <button 
              onClick={onClose}
              className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex justify-between items-end">
                <div>
                    {cocktail.creator && (
                        <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                             <User className="w-3 h-3" /> {cocktail.creator}
                        </p>
                    )}
                    <h2 className="text-3xl font-bold text-white leading-tight mb-1">{cocktail.name}</h2>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                        {(Object.entries(cocktail.flavorProfile) as [string, number][])
                            .filter(([_, score]) => score > 5)
                            .map(([flavor]) => (
                                <span key={flavor} className="px-2 py-0.5 bg-stone-800/80 backdrop-blur-sm border border-stone-600 rounded text-[10px] uppercase font-bold text-stone-300">
                                    {flavor}
                                </span>
                            ))
                        }
                    </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
            
            {/* Quick Stats Row: Rating + Nutrition */}
            <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-2 border border-stone-700">
                     {[1, 2, 3, 4, 5].map((star) => (
                         <button
                             key={star}
                             onClick={() => onRate && onRate(star)}
                             className="focus:outline-none p-1 transition-transform active:scale-90"
                         >
                             <Star 
                                 className={`w-6 h-6 ${
                                     (cocktail.rating || 0) >= star 
                                     ? 'fill-secondary text-secondary' 
                                     : 'text-stone-600' 
                                 }`} 
                             />
                         </button>
                     ))}
                 </div>
                 
                 {/* Nutrition Badge */}
                 {cocktail.nutrition && (
                     <div className="flex items-center gap-2 bg-stone-900/50 p-2 rounded-lg border border-stone-800" title="Nutritionist AI Estimate">
                         <div className="flex items-center gap-1 border-r border-stone-800 pr-2">
                            <Activity className="w-4 h-4 text-green-400" />
                            <div className="flex flex-col items-end leading-none">
                                <span className="text-sm font-bold text-white">{cocktail.nutrition.calories} cal</span>
                                <span className="text-[9px] text-stone-500">{cocktail.nutrition.carbs}g carb*</span>
                            </div>
                         </div>
                         <div className="flex flex-col items-center leading-none pl-1">
                             <div className="flex items-center gap-1 text-white font-bold text-sm">
                                <Droplets className="w-3 h-3 text-blue-400" />
                                {cocktail.nutrition.abv}%
                             </div>
                             <span className="text-[9px] text-stone-500">ABV</span>
                         </div>
                     </div>
                 )}
            </div>

            {/* Dilution & Volume Info */}
            {drinkMetrics && (
                <div className="bg-cyan-950/20 border border-cyan-800/30 rounded-xl p-4">
                    <button 
                        onClick={() => setShowDilutionDetails(!showDilutionDetails)}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-cyan-900/40 flex items-center justify-center">
                                <Droplets className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    {drinkMetrics.methodLabel}
                                    <span className="text-[10px] bg-cyan-900/50 text-cyan-400 px-1.5 py-0.5 rounded font-normal">
                                        +{drinkMetrics.dilutionPercent}% dilution
                                    </span>
                                </h4>
                                <p className="text-xs text-stone-400">
                                    Final: {formatOzAmount(drinkMetrics.finalVolumeOz)} oz • {drinkMetrics.finalAbv}% ABV
                                </p>
                            </div>
                        </div>
                        <Info className="w-4 h-4 text-cyan-500" />
                    </button>
                    
                    {showDilutionDetails && (
                        <div className="mt-4 pt-4 border-t border-cyan-800/30 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-stone-900/50 rounded-lg p-3">
                                    <span className="text-[10px] text-stone-500 uppercase block mb-1">Base Volume</span>
                                    <span className="text-lg font-bold text-white">{formatOzAmount(drinkMetrics.baseVolumeOz)} oz</span>
                                </div>
                                <div className="bg-stone-900/50 rounded-lg p-3">
                                    <span className="text-[10px] text-stone-500 uppercase block mb-1">Water Added</span>
                                    <span className="text-lg font-bold text-cyan-400">+{formatOzAmount(drinkMetrics.waterAddedOz)} oz</span>
                                </div>
                                <div className="bg-stone-900/50 rounded-lg p-3">
                                    <span className="text-[10px] text-stone-500 uppercase block mb-1">Final Volume</span>
                                    <span className="text-lg font-bold text-white">{formatOzAmount(drinkMetrics.finalVolumeOz)} oz</span>
                                </div>
                                <div className="bg-stone-900/50 rounded-lg p-3">
                                    <span className="text-[10px] text-stone-500 uppercase block mb-1">Final ABV</span>
                                    <span className="text-lg font-bold text-purple-400">{drinkMetrics.finalAbv}%</span>
                                    <span className="text-[10px] text-stone-600 ml-1">(was {drinkMetrics.baseAbv}%)</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-stone-500 italic text-center">
                                {DILUTION_STANDARDS[drinkMetrics.method as PreparationMethod]?.description || 'Standard dilution applied'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* FLAVOR ANALYSIS SECTION (Wheel + Text) */}
            <div className="bg-stone-800/50 rounded-2xl p-6 border border-stone-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Disc className="w-24 h-24 text-white" />
                </div>
                
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Disc className="w-4 h-4 text-secondary" />
                    Flavor Analysis
                </h3>

                <div className="flex flex-col items-center gap-4">
                    {/* Wheel Visualization */}
                    <div className="w-full max-w-[200px] aspect-square">
                        <FlavorWheel userProfile={cocktail.flavorProfile} />
                    </div>
                    
                    {/* Agent Summary Text */}
                    <div className="bg-stone-900/80 p-4 rounded-xl border border-stone-700 w-full text-center">
                         <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3" /> Mixologist Agent Notes
                         </div>
                         <p className="text-sm text-stone-300 italic leading-relaxed">
                            "{cocktail.description}"
                         </p>
                    </div>
                </div>
            </div>

            {/* FLAVOR BALANCE (Radar) */}
            <div className="bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Hexagon className="w-4 h-4 text-primary" />
                    Flavor Balance
                </h3>
                <FlavorRadar data={cocktail.flavorProfile} height={300} />
            </div>

            {/* FAMILY TREE BUTTON - Only for preloaded (non-temporary, non-user) recipes */}
            {!isTemporary && onViewFamilyTree && (
                <button 
                    onClick={() => onViewFamilyTree(cocktail)}
                    className="w-full bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 rounded-xl p-4 border border-stone-700 hover:border-primary/30 transition-all group flex items-center gap-4"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/30 group-hover:border-primary/50 transition-colors">
                        <Network className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                        <h4 className="text-sm font-bold text-white group-hover:text-secondary transition-colors">View Cocktail Lineage</h4>
                        <p className="text-xs text-stone-500 mt-0.5">Explore the family tree and related drinks</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-stone-600 group-hover:text-secondary transition-colors" />
                </button>
            )}

            {/* HISTORY / LORE SECTION (EXPANDABLE) */}
            {cocktail.history && (
                <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                    <button 
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-800 transition-colors"
                    >
                        <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                            <Book className="w-4 h-4 text-secondary" />
                            History & Lore
                        </h3>
                        {isHistoryExpanded ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                    </button>
                    
                    {isHistoryExpanded && (
                        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2">
                            <div className="pt-2 border-t border-stone-800/50">
                                <p className="text-sm text-stone-400 leading-relaxed italic">
                                    {cocktail.history}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
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
                                <BookOpen className="w-3 h-3" />
                                Add to Barmulary
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
                            Standard recipe not captured. Click "Add to Barmulary" to have the AI Bartender deduce it.
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
            
            {/* References Section */}
            <div className="pt-4 border-t border-stone-800 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Link className="w-4 h-4 text-secondary" />
                    References & Media
                </h3>
                
                {allLinks.length > 0 && (
                    <div className="space-y-2">
                        {allLinks.map((link, idx) => (
                             <a 
                                key={idx}
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 w-full p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors border border-stone-700 group"
                            >
                                <ExternalLink className="w-3 h-3 text-stone-500 group-hover:text-secondary" />
                                <span className="truncate flex-1">{link}</span>
                            </a>
                        ))}
                    </div>
                )}
                
                {onAddLink && (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            placeholder="Paste video/web link..."
                            className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 text-xs text-white focus:border-secondary outline-none"
                        />
                        <button 
                            onClick={handleAddLink}
                            disabled={!newLink.trim()}
                            className="bg-stone-800 hover:bg-stone-700 text-white p-2 rounded-lg border border-stone-700 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
             {/* Nutrition Disclaimer */}
            {cocktail.nutrition && (
                <div className="text-[10px] text-stone-600 italic text-center">
                    * Nutrition & ABV estimates based on standard ingredient values.
                </div>
            )}

            {/* Delete Actions */}
            {onDelete && (
                <div className="pt-4 border-t border-stone-800">
                    <button 
                        onClick={handleDelete}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl hover:bg-red-950/30 text-stone-500 hover:text-red-400 text-xs font-bold transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete Recipe
                    </button>
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
                                onClick={() => onAddToShoppingList && onAddToShoppingList(itemsToBuy, cocktail.name)}
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
                    ) : isToConcoct ? (
                        <button 
                            onClick={() => onRemoveFromToConcoct && onRemoveFromToConcoct(cocktail.name)}
                            className="w-full bg-amber-950/30 text-amber-400 font-bold py-3 rounded-xl border border-amber-900/50 flex items-center justify-center gap-2 hover:bg-amber-900/40 transition-colors"
                        >
                             <Check className="w-5 h-5" />
                             In Stock - Remove from To Concoct
                        </button>
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