import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, GitBranch, Sparkles, ChevronRight, Clock, Beaker, ArrowRight, Loader2, Network, Zap, Database, RefreshCw } from 'lucide-react';
import { Cocktail } from '../types';
import { analyzeDrinkFamilyTree, DrinkFamilyTree as FamilyTreeData } from '../services/geminiService';

interface Props {
  cocktail: Cocktail;
  allRecipes: Cocktail[];
  onClose: () => void;
  onSelectDrink: (drinkName: string) => void;
}

const ERA_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Pre-Prohibition': { bg: 'bg-amber-950/40', border: 'border-amber-700/50', text: 'text-amber-400' },
  'Prohibition': { bg: 'bg-stone-800/60', border: 'border-stone-600', text: 'text-stone-400' },
  'Post-Prohibition': { bg: 'bg-emerald-950/40', border: 'border-emerald-700/50', text: 'text-emerald-400' },
  'Tiki Era': { bg: 'bg-orange-950/40', border: 'border-orange-700/50', text: 'text-orange-400' },
  'Dark Ages': { bg: 'bg-gray-900/60', border: 'border-gray-700', text: 'text-gray-400' },
  'Craft Revival': { bg: 'bg-purple-950/40', border: 'border-purple-700/50', text: 'text-purple-400' },
  'Modern': { bg: 'bg-blue-950/40', border: 'border-blue-700/50', text: 'text-blue-400' },
  'Contemporary': { bg: 'bg-purple-950/40', border: 'border-purple-700/50', text: 'text-purple-400' },
  'Classic': { bg: 'bg-stone-800/40', border: 'border-stone-600', text: 'text-stone-400' },
};

const TEMPLATE_ICONS: Record<string, string> = {
  'Old Fashioned': '🥃',
  'Martini': '🍸',
  'Daiquiri': '🍹',
  'Sidecar': '🍋',
  'Whiskey Highball': '🥂',
  'Flip': '🥚',
};

const DrinkFamilyTree: React.FC<Props> = ({ cocktail, allRecipes, onClose, onSelectDrink }) => {
  const [familyTree, setFamilyTree] = useState<FamilyTreeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<'checking' | 'generating' | 'saving'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'ancestors' | 'siblings' | 'descendants'>('ancestors');
  const [isFromDatabase, setIsFromDatabase] = useState(false);

  const recipeNames = useMemo(() => allRecipes.map(r => r.name), [allRecipes]);

  const isInDatabase = useCallback((drinkName: string) => {
    return recipeNames.some(n => n.toLowerCase() === drinkName.toLowerCase());
  }, [recipeNames]);

  const convertDbToFamilyTree = (dbData: any): FamilyTreeData => {
    return {
      rootTemplate: {
        name: dbData.family?.name || 'Classic Template',
        formula: dbData.family?.formula || 'Spirit + Modifier + Accent',
        description: dbData.family?.description || 'A foundational cocktail structure'
      },
      targetDrink: {
        name: dbData.lineage?.recipeName || cocktail.name,
        relationship: dbData.lineage?.relationship || '',
        keyModifications: dbData.lineage?.keyModifications || []
      },
      ancestors: dbData.ancestors?.map((a: any) => ({
        name: a.targetRecipe,
        era: a.era || 'Classic',
        inventionYear: a.inventionYear || 1900,
        relationship: a.description || ''
      })) || [],
      siblings: dbData.siblings?.map((s: any) => ({
        name: s.targetRecipe,
        era: s.era || 'Classic',
        inventionYear: s.inventionYear || 1900,
        sharedTrait: s.description || ''
      })) || [],
      descendants: dbData.descendants?.map((d: any) => ({
        name: d.targetRecipe,
        era: d.era || 'Modern',
        inventionYear: d.inventionYear || 2000,
        innovation: d.description || ''
      })) || [],
      flavorBridge: dbData.flavorBridges?.map((fb: any) => ({
        fromDrink: fb.sourceRecipe,
        toDrink: fb.targetRecipe,
        connection: fb.description || ''
      })) || [],
      evolutionNarrative: dbData.lineage?.evolutionNarrative || ''
    };
  };

  const saveLineageToDatabase = async (data: FamilyTreeData): Promise<FamilyTreeData | null> => {
    try {
      // Safely get family slug with fallback
      const templateName = data.rootTemplate?.name || 'daiquiri';
      const familySlug = templateName.toLowerCase().replace(/\s+/g, '-');
      
      const response = await fetch('/api/lineage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: cocktail.name,
          familySlug,
          relationship: data.targetDrink?.relationship || '',
          keyModifications: data.targetDrink?.keyModifications || [],
          evolutionNarrative: data.evolutionNarrative || '',
          ancestors: data.ancestors || [],
          siblings: data.siblings || [],
          descendants: data.descendants || [],
          flavorBridges: data.flavorBridge || []
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Return validated data from server (only includes DB-verified cocktails)
          return convertDbToFamilyTree(result.data);
        }
      }
      return null;
    } catch (err) {
      console.warn('Failed to save lineage to database:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchFamilyTree = async () => {
      setIsLoading(true);
      setError(null);
      setIsFromDatabase(false);
      setFamilyTree(null); // Clear any previous data before fetching new
      
      try {
        setLoadingStatus('checking');
        const dbResponse = await fetch(`/api/lineage/${encodeURIComponent(cocktail.name)}`);
        const dbData = await dbResponse.json();

        if (dbData.exists && dbData.data) {
          const convertedData = convertDbToFamilyTree(dbData.data);
          setFamilyTree(convertedData);
          setIsFromDatabase(true);
          setIsLoading(false);
          return;
        }

        setLoadingStatus('generating');
        const result = await analyzeDrinkFamilyTree(
          cocktail.name,
          cocktail.category || 'Classic',
          cocktail.ingredients,
          recipeNames
        );

        setLoadingStatus('saving');
        const validatedData = await saveLineageToDatabase(result);
        
        if (validatedData) {
          // Only show validated data from server (filtered to only DB-verified cocktails)
          setFamilyTree(validatedData);
          setIsFromDatabase(true);
        } else {
          // Save failed - show error instead of unvalidated data
          setError('Failed to validate lineage data. Please try again.');
        }
        
      } catch (err) {
        console.error('Family tree analysis failed:', err);
        setError('Failed to analyze cocktail lineage. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFamilyTree();
  }, [cocktail, recipeNames]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    setIsFromDatabase(false);
    setFamilyTree(null); // Clear previous data before refreshing
    setLoadingStatus('generating');
    
    try {
      const result = await analyzeDrinkFamilyTree(
        cocktail.name,
        cocktail.category || 'Classic',
        cocktail.ingredients,
        recipeNames
      );

      setLoadingStatus('saving');
      const validatedData = await saveLineageToDatabase(result);
      
      if (validatedData) {
        // Only show validated data from server (filtered to only DB-verified cocktails)
        setFamilyTree(validatedData);
        setIsFromDatabase(true);
      } else {
        // Save failed - show error instead of unvalidated data
        setError('Failed to validate lineage data. Please try again.');
      }
    } catch (err) {
      console.error('Family tree refresh failed:', err);
      setError('Failed to refresh cocktail lineage. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrinkClick = (drinkName: string) => {
    if (isInDatabase(drinkName)) {
      onSelectDrink(drinkName);
    }
  };

  const getEraStyle = (era: string) => {
    for (const key of Object.keys(ERA_COLORS)) {
      if (era.toLowerCase().includes(key.toLowerCase())) {
        return ERA_COLORS[key];
      }
    }
    return { bg: 'bg-stone-800/60', border: 'border-stone-600', text: 'text-stone-400' };
  };

  const getTemplateIcon = (templateName: string) => {
    for (const key of Object.keys(TEMPLATE_ICONS)) {
      if (templateName.toLowerCase().includes(key.toLowerCase())) {
        return TEMPLATE_ICONS[key];
      }
    }
    return '🍸';
  };

  const getLoadingMessage = () => {
    switch (loadingStatus) {
      case 'checking':
        return { title: 'Checking Database...', subtitle: 'Looking for existing lineage data' };
      case 'generating':
        return { title: 'Analyzing Lineage...', subtitle: 'AI Mixologist is tracing ancestry' };
      case 'saving':
        return { title: 'Saving to Database...', subtitle: 'Preserving lineage for future use' };
      default:
        return { title: 'Loading...', subtitle: '' };
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full h-full max-w-2xl flex flex-col bg-gradient-to-b from-stone-900 to-stone-950 sm:rounded-2xl sm:h-[90vh] sm:border sm:border-stone-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex-none bg-stone-900/80 backdrop-blur-sm border-b border-stone-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-lg shadow-primary/30">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Cocktail Lineage</h1>
                <p className="text-xs text-stone-500 flex items-center gap-1">
                  {isFromDatabase ? (
                    <>
                      <Database className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">From Database</span>
                    </>
                  ) : (
                    'AI Mixologist Family Tree Analysis'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isLoading && familyTree && (
                <button 
                  onClick={handleRefresh}
                  className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-secondary transition-colors"
                  title="Regenerate with AI"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
                  {loadingStatus === 'checking' ? (
                    <Database className="w-8 h-8 text-primary" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-primary" />
                  )}
                </div>
                <Loader2 className="absolute -bottom-1 -right-1 w-6 h-6 text-secondary animate-spin" />
              </div>
              <div>
                <p className="text-white font-bold">{getLoadingMessage().title}</p>
                <p className="text-xs text-stone-500 mt-1">{getLoadingMessage().subtitle}</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400">{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-stone-800 rounded-lg text-white text-sm hover:bg-stone-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : familyTree && (
            <>
              {/* Root Template Card */}
              <div className="bg-gradient-to-br from-amber-950/30 to-stone-900 rounded-2xl p-5 border border-amber-800/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 text-6xl opacity-10 -rotate-12 translate-x-2 -translate-y-2">
                  {getTemplateIcon(familyTree.rootTemplate?.name || 'Daiquiri')}
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-2xl flex-shrink-0">
                    {getTemplateIcon(familyTree.rootTemplate?.name || 'Daiquiri')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">Root Template</p>
                    <h2 className="text-xl font-bold text-white">{familyTree.rootTemplate?.name || 'Classic Template'}</h2>
                    <p className="text-sm text-secondary font-mono mt-1">{familyTree.rootTemplate?.formula || 'Spirit + Modifier + Accent'}</p>
                    <p className="text-xs text-stone-400 mt-2 leading-relaxed">{familyTree.rootTemplate?.description || 'A foundational cocktail structure'}</p>
                  </div>
                </div>
              </div>

              {/* Connection Line */}
              <div className="flex justify-center">
                <div className="w-px h-8 bg-gradient-to-b from-amber-700/50 to-primary/50"></div>
              </div>

              {/* Target Drink Card */}
              <div className="bg-gradient-to-br from-primary/20 to-stone-900 rounded-2xl p-5 border border-primary/40 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] bg-primary/30 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Current Drink</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/30 border border-primary/50 flex items-center justify-center flex-shrink-0">
                    <Beaker className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white">{familyTree.targetDrink?.name || cocktail.name}</h2>
                    <p className="text-sm text-stone-400 mt-1">{familyTree.targetDrink?.relationship || ''}</p>
                    
                    {(familyTree.targetDrink?.keyModifications?.length || 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {familyTree.targetDrink?.keyModifications?.map((mod, idx) => (
                          <span key={idx} className="text-[10px] bg-stone-800 text-stone-300 px-2 py-1 rounded border border-stone-700">
                            {mod}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="flex bg-stone-800/50 p-1 rounded-xl border border-stone-700">
                <button 
                  onClick={() => setActiveSection('ancestors')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeSection === 'ancestors' ? 'bg-stone-700 text-white' : 'text-stone-500'}`}
                >
                  <Clock className="w-3 h-3" />
                  Ancestors ({familyTree.ancestors?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveSection('siblings')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeSection === 'siblings' ? 'bg-stone-700 text-white' : 'text-stone-500'}`}
                >
                  <GitBranch className="w-3 h-3" />
                  Siblings ({familyTree.siblings?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveSection('descendants')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeSection === 'descendants' ? 'bg-stone-700 text-white' : 'text-stone-500'}`}
                >
                  <Zap className="w-3 h-3" />
                  Riffs ({familyTree.descendants?.length || 0})
                </button>
              </div>

              {/* Section Content */}
              <div className="space-y-2">
                {activeSection === 'ancestors' && (familyTree.ancestors || []).map((ancestor, idx) => {
                  const eraStyle = getEraStyle(ancestor.era);
                  const clickable = isInDatabase(ancestor.name);
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleDrinkClick(ancestor.name)}
                      className={`${eraStyle.bg} rounded-xl p-4 border ${eraStyle.border} ${clickable ? 'cursor-pointer hover:border-white/30' : 'opacity-75'} transition-all`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{ancestor.name}</h3>
                            {clickable && (
                              <span className="text-[8px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800">In Library</span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{ancestor.relationship}</p>
                        </div>
                        <span className={`text-[10px] ${eraStyle.text} px-2 py-0.5 rounded-full border ${eraStyle.border} whitespace-nowrap`}>
                          {ancestor.era}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {activeSection === 'siblings' && (familyTree.siblings || []).map((sibling, idx) => {
                  const eraStyle = getEraStyle(sibling.era || 'Classic');
                  const clickable = isInDatabase(sibling.name);
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleDrinkClick(sibling.name)}
                      className={`${eraStyle.bg} rounded-xl p-4 border ${eraStyle.border} ${clickable ? 'cursor-pointer hover:border-secondary/50' : 'opacity-75'} transition-all`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <GitBranch className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{sibling.name}</h3>
                              {clickable && (
                                <span className="text-[8px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800">In Library</span>
                              )}
                            </div>
                            <p className="text-xs text-stone-400 mt-1">{sibling.sharedTrait}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] ${eraStyle.text} px-2 py-0.5 rounded-full border ${eraStyle.border} whitespace-nowrap`}>
                            {sibling.era || 'Classic'}
                          </span>
                          {sibling.inventionYear && sibling.inventionYear > 0 && (
                            <span className="text-[9px] text-stone-500">~{sibling.inventionYear}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeSection === 'descendants' && (familyTree.descendants || []).map((desc, idx) => {
                  const eraStyle = getEraStyle(desc.era || 'Modern');
                  const clickable = isInDatabase(desc.name);
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleDrinkClick(desc.name)}
                      className={`${eraStyle.bg} rounded-xl p-4 border ${eraStyle.border} ${clickable ? 'cursor-pointer hover:border-blue-500/50' : 'opacity-75'} transition-all`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{desc.name}</h3>
                              {clickable && (
                                <span className="text-[8px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800">In Library</span>
                              )}
                            </div>
                            <p className="text-xs text-stone-400 mt-1">{desc.innovation}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] ${eraStyle.text} px-2 py-0.5 rounded-full border ${eraStyle.border} whitespace-nowrap`}>
                            {desc.era || 'Modern'}
                          </span>
                          {desc.inventionYear && desc.inventionYear > 0 && (
                            <span className="text-[9px] text-stone-500">~{desc.inventionYear}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeSection === 'ancestors' && (familyTree.ancestors?.length || 0) === 0 && (
                  <p className="text-center text-stone-500 py-8 text-sm">No ancestors identified for this drink.</p>
                )}
                {activeSection === 'siblings' && (familyTree.siblings?.length || 0) === 0 && (
                  <p className="text-center text-stone-500 py-8 text-sm">No sibling cocktails identified.</p>
                )}
                {activeSection === 'descendants' && (familyTree.descendants?.length || 0) === 0 && (
                  <p className="text-center text-stone-500 py-8 text-sm">No modern riffs identified yet.</p>
                )}
              </div>

              {/* Flavor Bridges */}
              {(familyTree.flavorBridge?.length || 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRight className="w-3 h-3" />
                    Flavor Evolution
                  </h3>
                  <div className="space-y-2">
                    {(familyTree.flavorBridge || []).slice(0, 4).map((bridge, idx) => (
                      <div key={idx} className="bg-stone-900/50 rounded-lg p-3 border border-stone-800 flex items-center gap-2 text-xs">
                        <span 
                          className={`font-bold ${isInDatabase(bridge.fromDrink) ? 'text-secondary cursor-pointer hover:underline' : 'text-stone-300'}`}
                          onClick={() => handleDrinkClick(bridge.fromDrink)}
                        >
                          {bridge.fromDrink}
                        </span>
                        <ArrowRight className="w-3 h-3 text-stone-600 flex-shrink-0" />
                        <span 
                          className={`font-bold ${isInDatabase(bridge.toDrink) ? 'text-secondary cursor-pointer hover:underline' : 'text-stone-300'}`}
                          onClick={() => handleDrinkClick(bridge.toDrink)}
                        >
                          {bridge.toDrink}
                        </span>
                        <span className="text-stone-500 ml-auto text-[10px] hidden sm:inline">{bridge.connection}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evolution Narrative */}
              <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Evolution Story
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed italic">
                  "{familyTree.evolutionNarrative}"
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-stone-800 bg-stone-900/80 backdrop-blur-sm">
          <button 
            onClick={onClose}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl transition-colors border border-stone-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrinkFamilyTree;
