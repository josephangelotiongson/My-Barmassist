import React, { useState, useEffect } from 'react';
import { Wine, ChefHat, List, Clock, ArrowLeft, Plus, Check, Loader2, User, Share2, Copy, ExternalLink, AlertCircle, Activity, Droplets } from 'lucide-react';
import FlavorWheel from './FlavorWheel';

interface SharedRecipe {
  id?: number;
  slug?: string;
  name: string;
  description?: string;
  history?: string;
  category?: string;
  ingredients: string[];
  instructions: string[];
  glassType?: string;
  garnish?: string;
  creator?: string;
  creatorType?: string;
  flavorProfile?: {
    Sweet: number;
    Fruity: number;
    Floral: number;
    Herbal: number;
    Spicy: number;
    Earthy: number;
    Sour: number;
    Boozy: number;
  };
  nutrition?: {
    calories: number;
    sugarGrams?: number;
    carbs?: number;
    abvPercent?: number;
    abv?: number;
  };
  imageUrl?: string;
  parentRecipeName?: string;
  substitutions?: { original: string; replacement: string; rationale: string }[];
}

interface Props {
  recipeType: 'global' | 'user' | 'riff';
  recipeId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  onBack: () => void;
  onAddToCollection?: (recipe: SharedRecipe) => void;
}

const SharedRecipePage: React.FC<Props> = ({ 
  recipeType, 
  recipeId, 
  isLoggedIn,
  currentUserId,
  onBack,
  onAddToCollection 
}) => {
  const [recipe, setRecipe] = useState<SharedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/share/${recipeType}/${encodeURIComponent(recipeId)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Recipe not found');
          }
          throw new Error('Failed to load recipe');
        }
        
        const data = await response.json();
        setRecipe(data.recipe);
        setAlreadyOwned(data.alreadyOwned || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeType, recipeId]);

  const handleAddToCollection = async () => {
    if (!recipe || !isLoggedIn) return;
    
    setIsAdding(true);
    try {
      const response = await fetch('/api/share/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeType,
          recipeId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add recipe');
      }

      setIsAdded(true);
      onAddToCollection?.(recipe);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add recipe');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/${recipeType}/${recipeId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-stone-400">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Recipe Not Found</h2>
          <p className="text-stone-400 mb-6">{error || 'This recipe may have been removed or the link is invalid.'}</p>
          <button
            onClick={onBack}
            className="bg-stone-800 hover:bg-stone-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const nutrition = recipe.nutrition;
  const abv = nutrition?.abvPercent || nutrition?.abv;

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="relative h-72 w-full">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.src = 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=800';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
            <Wine className="w-16 h-16 text-stone-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
        
        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleCopyLink}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-colors flex items-center gap-2"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Shared Recipe</span>
          </div>
          
          {recipe.parentRecipeName && (
            <p className="text-xs text-stone-400 mb-1">
              Riff of <span className="text-amber-300">{recipe.parentRecipeName}</span>
            </p>
          )}
          
          {recipe.creator && (
            <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> {recipe.creator}
            </p>
          )}
          
          <h1 className="text-3xl font-bold text-white">{recipe.name}</h1>
          
          {recipe.category && (
            <span className="inline-block mt-2 px-3 py-1 bg-stone-800/80 backdrop-blur-sm border border-stone-600 rounded-full text-xs font-medium text-stone-300">
              {recipe.category}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6 space-y-6 pb-32">
        {nutrition && (
          <div className="flex items-center justify-center gap-4 bg-stone-900/50 p-3 rounded-xl border border-stone-800">
            <div className="flex items-center gap-1.5 text-sm">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="font-bold text-white">{nutrition.calories}</span>
              <span className="text-stone-500">cal</span>
            </div>
            {abv && (
              <div className="flex items-center gap-1.5 text-sm">
                <Droplets className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">{abv.toFixed(1)}%</span>
                <span className="text-stone-500">ABV</span>
              </div>
            )}
          </div>
        )}

        {recipe.description && (
          <p className="text-stone-300 text-sm leading-relaxed">{recipe.description}</p>
        )}

        {recipe.flavorProfile && (
          <div className="bg-stone-900 rounded-2xl border border-stone-700 p-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-secondary" />
              Flavor Profile
            </h3>
            <div className="flex justify-center">
              <FlavorWheel profile={recipe.flavorProfile} size={180} />
            </div>
          </div>
        )}

        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <List className="w-4 h-4 text-secondary" />
            Ingredients
          </h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-stone-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {recipe.substitutions && recipe.substitutions.length > 0 && (
          <div className="bg-amber-950/20 rounded-2xl border border-amber-800/30 p-4">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-3">Modifications</h3>
            <div className="space-y-2">
              {recipe.substitutions.map((sub, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-red-400 line-through">{sub.original}</span>
                  <span className="text-stone-500">→</span>
                  <span className="text-green-400 font-medium">{sub.replacement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            Instructions
          </h3>
          <ol className="space-y-3">
            {recipe.instructions.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-stone-300">
                <span className="w-6 h-6 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {recipe.history && (
          <div className="bg-stone-900/50 rounded-2xl border border-stone-800 p-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">History</h3>
            <p className="text-sm text-stone-400 leading-relaxed italic">{recipe.history}</p>
          </div>
        )}
      </div>

      {recipeType === 'global' ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-stone-900/95 backdrop-blur-md border-t border-stone-800">
          <div className="max-w-lg mx-auto">
            <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-stone-300">
                <Wine className="w-5 h-5 text-amber-400" />
                <span className="font-medium">This classic recipe is available in the Barmulary</span>
              </div>
              <button
                onClick={onBack}
                className="mt-3 text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Go to Barmulary →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-stone-900/95 backdrop-blur-md border-t border-stone-800">
          <div className="max-w-lg mx-auto">
            {!isLoggedIn ? (
              <div className="text-center">
                <p className="text-stone-400 text-sm mb-3">Log in to add this recipe to your collection</p>
                <button
                  onClick={onBack}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                >
                  Log In
                </button>
              </div>
            ) : alreadyOwned || isAdded ? (
              <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Already in your collection!</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAddToCollection}
                disabled={isAdding}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-stone-700 disabled:to-stone-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/30"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding to Collection...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to My Collection
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedRecipePage;
