import React from 'react';
import { X, Info, Zap, BarChart3, ScanLine, Brain, Star, ShieldCheck, FlaskConical, Disc, GitBranch, Camera, Beaker, ShoppingBag, Target, Volume2, Layers, Sparkles, Megaphone, ChevronRight, Heart, Atom } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const HowItWorksModal: React.FC<Props> = ({ isOpen, onClose, onOpenSettings }) => {
  if (!isOpen) return null;

  const handleOpenWhatsNew = () => {
    onClose();
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 flex flex-col max-h-[90dvh] animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-secondary" />
                How Barmassist Works
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* WHAT'S NEW LINK */}
            <button
                onClick={handleOpenWhatsNew}
                className="w-full bg-secondary/10 hover:bg-secondary/20 rounded-xl p-4 border border-secondary/30 flex items-center justify-between group transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-white">What's New</h3>
                        <p className="text-xs text-stone-400">See the latest features and updates</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary group-hover:translate-x-1 transition-transform" />
            </button>

            {/* PALATE LEARNING - CORE FEATURE */}
            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-accent" />
                    Palate Learning
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-3">
                    Your <strong className="text-primary">Palate Profile</strong> (the red shape on radar charts) is your unique flavor fingerprint. It evolves with every rating you give.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-400 mb-3">
                    <div className="bg-stone-800 p-2 rounded border border-stone-700">
                        <Star className="w-3 h-3 text-secondary mb-1 fill-secondary" />
                        <span className="font-bold text-white">5 Stars</span> = Strong preference (3x weight)
                    </div>
                    <div className="bg-stone-800 p-2 rounded border border-stone-700">
                        <Star className="w-3 h-3 text-stone-500 mb-1" />
                        <span className="font-bold text-white">1-2 Stars</span> = Ignored (no impact)
                    </div>
                </div>
                <p className="text-[10px] text-stone-500 italic">
                    The more you rate, the smarter your recommendations become.
                </p>
            </div>

            {/* MATCH SCORING */}
            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Match Scoring
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    The <span className="font-bold text-green-400">Match %</span> is calculated by comparing your Palate Profile to each cocktail's flavor DNA:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-400">
                    <li><strong className="text-white">Flavor Overlap:</strong> How closely the drink matches your preferred taste profile</li>
                    <li><strong className="text-white">Pantry Availability:</strong> Bonus for drinks you can make right now</li>
                    <li><strong className="text-white">Historical Patterns:</strong> Spirit types and styles you've loved before</li>
                </ul>
            </div>

            {/* THE FLAVOR SCALE */}
            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-secondary" />
                    The 8 Flavor Dimensions
                </h3>
                <p className="text-xs text-stone-400 mb-3">
                    Every cocktail is AI-analyzed and scored 0-10 on each dimension:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="text-stone-300"><span className="font-bold text-secondary">Sweet:</span> 0 (Dry) → 10 (Liqueur)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Fruity:</span> 0 (None) → 10 (Tiki)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Floral:</span> 0 (None) → 10 (Violet)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Herbal:</span> 0 (None) → 10 (Amaro)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Spicy:</span> 0 (None) → 10 (Habanero)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Earthy:</span> 0 (None) → 10 (Mezcal)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Sour:</span> 0 (Manhattan) → 10 (Shrub)</div>
                    <div className="text-stone-300"><span className="font-bold text-secondary">Boozy:</span> 0 (Mocktail) → 10 (Cask)</div>
                </div>
            </div>

            <div className="bg-amber-950/30 rounded-xl p-4 border border-amber-800/50">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-400" />
                    Cocktail Laboratory
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-3">
                    The <strong className="text-amber-400">Rx tab</strong> is your experimentation playground. Select any cocktail and modify its flavor profile to discover new variations.
                </p>
                <ul className="space-y-2 text-xs text-stone-400">
                    <li className="flex items-start gap-2">
                        <Disc className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">3-Tier Flavor Wheel:</strong> Click the outer ring for specific notes (Basil, Vanilla), middle ring for subcategories, or inner ring for broad categories.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">Precise Note Matching:</strong> Request "Basil" and AI suggests basil-specific ingredients, not just any floral.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Volume2 className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">Volume Lever:</strong> When modifications exceed target volume, use the interactive balancer to reduce ingredients in 0.25 oz increments.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-white">Save Riffs:</strong> Save your modified recipes with automatic lineage tracking and duplicate detection.</span>
                    </li>
                </ul>
            </div>

            <div className="bg-purple-950/30 rounded-xl p-4 border border-purple-800/50">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    Cocktail Lineage
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    Discover any cocktail's family tree based on the <strong className="text-purple-400">Cocktail Codex</strong> philosophy.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-400">
                    <li>Six root templates: Old Fashioned, Martini, Daiquiri, Sidecar, Highball, Flip</li>
                    <li>See ancestors, siblings, and descendants of any drink</li>
                    <li>Flavor bridges showing taste evolution through the family</li>
                    <li>Clickable drinks navigate to recipes in your library</li>
                </ul>
            </div>

            <div className="bg-cyan-950/30 rounded-xl p-4 border border-cyan-800/50">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-cyan-400" />
                    DIY Ingredients
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    Make your own syrups, shrubs, and infusions with built-in recipes.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-400">
                    <li>15+ DIY recipes with scalable ingredient calculators</li>
                    <li>"I Made This!" button tracks batches with expiration dates</li>
                    <li>Freshness indicators show what's in stock vs. needs making</li>
                    <li>Warnings for items expiring within 7 days</li>
                </ul>
            </div>

            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    AI Vision & Import
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    Multiple ways to add recipes and track your bar experience:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-400">
                    <li><strong>Screenshot Import:</strong> Upload photos of recipes, AI extracts ingredients and instructions</li>
                    <li><strong>URL Import:</strong> Paste links from recipe websites or social media</li>
                    <li><strong>Menu Scanner:</strong> Photograph bar menus for personalized recommendations</li>
                    <li><strong>Order History:</strong> Track drinks at bars with photos and notes</li>
                    <li><strong>Bottle Recognition:</strong> Scan your cabinet to auto-fill inventory</li>
                </ul>
            </div>

            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-400" />
                    Smart Features
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-400">
                    <li><strong>Duplicate Detection:</strong> Fuzzy matching prevents redundant recipes</li>
                    <li><strong>Auto-Enrichment:</strong> New recipes get AI flavor profiles and nutrition</li>
                    <li><strong>Shopping Lists:</strong> Track missing ingredients and inventory</li>
                    <li><strong>Nutrition Estimates:</strong> Calories, carbs, and ABV for every drink</li>
                </ul>
            </div>

            <div className="bg-green-950/30 rounded-xl p-4 border border-green-800/50">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    Your Privacy
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    <strong className="text-green-400">We do not store your email.</strong> Only user ID and display name are saved.
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-stone-400">
                    <li>Your data (recipes, ratings, preferences) is yours alone</li>
                    <li>We never sell, share, or use your data without consent</li>
                    <li>Delete your account and all data at any time</li>
                </ul>
            </div>

        </div>
        
        <div className="p-4 border-t border-stone-700 bg-stone-900/50">
            <button 
                onClick={onClose}
                className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
                Got it
            </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
