import React, { useState, useMemo, useEffect } from 'react';
import { X, Database, Settings as SettingsIcon, Plus, Trash2, Save, AlertTriangle, Hand, AlignLeft, AlignRight, RefreshCcw, Droplets, ChevronDown, ChevronRight, Layers, Edit3, XCircle, Shield, Wine, Loader2, CheckCircle, Network } from 'lucide-react';
import { MasterIngredient, AppSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masterData: MasterIngredient[];
  onAddMasterItem: (item: MasterIngredient) => void;
  onRemoveMasterItem: (id: string) => void;
  onUpdateMasterItem: (item: MasterIngredient) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onResetRatings?: () => void;
  onResetToDefaults?: () => void;
  onRefreshRecipes?: () => void;
}

const SettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  masterData, 
  onAddMasterItem, 
  onRemoveMasterItem,
  onUpdateMasterItem,
  settings,
  onUpdateSettings,
  onResetRatings,
  onResetToDefaults,
  onRefreshRecipes
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'master' | 'admin'>('general');
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [isAnalyzingLineage, setIsAnalyzingLineage] = useState(false);
  const [lineageResult, setLineageResult] = useState<any>(null);
  
  // New recipe form state
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');
  const [newRecipeCategory, setNewRecipeCategory] = useState('Uncategorized');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState('');
  const [newRecipeInstructions, setNewRecipeInstructions] = useState('');
  const [newRecipeGlass, setNewRecipeGlass] = useState('Coupe');
  const [newRecipeGarnish, setNewRecipeGarnish] = useState('');
  const [newRecipeCreator, setNewRecipeCreator] = useState('');
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  
  // Check admin status on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/check', { credentials: 'include' })
        .then(res => res.ok ? res.json() : { isAdmin: false })
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => setIsAdmin(false));
    }
  }, [isOpen]);
  
  // Load admin stats when admin tab is active
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      fetch('/api/admin/global-recipes/stats', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => setAdminStats(data))
        .catch(() => {});
    }
  }, [activeTab, isAdmin]);
  
  const handleSeedModernRecipes = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/seed-modern-recipes', { 
        method: 'POST',
        credentials: 'include' 
      });
      const data = await res.json();
      setSeedResult(data);
      if (onRefreshRecipes) onRefreshRecipes();
      // Reload stats
      const statsRes = await fetch('/api/admin/global-recipes/stats', { credentials: 'include' });
      if (statsRes.ok) setAdminStats(await statsRes.json());
    } catch (error) {
      setSeedResult({ error: 'Failed to seed recipes' });
    }
    setIsSeeding(false);
  };
  
  const handleEnrichRecipes = async () => {
    setIsEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/admin/enrich-recipes?batch=5', { 
        method: 'POST',
        credentials: 'include' 
      });
      const data = await res.json();
      setEnrichResult(data);
      // Reload stats
      const statsRes = await fetch('/api/admin/global-recipes/stats', { credentials: 'include' });
      if (statsRes.ok) setAdminStats(await statsRes.json());
    } catch (error) {
      setEnrichResult({ error: 'Failed to enrich recipes' });
    }
    setIsEnriching(false);
  };
  
  const handleAnalyzeLineage = async () => {
    setIsAnalyzingLineage(true);
    setLineageResult(null);
    try {
      const res = await fetch('/api/generate-lineage', { 
        method: 'POST',
        credentials: 'include' 
      });
      const data = await res.json();
      setLineageResult(data);
    } catch (error) {
      setLineageResult({ error: 'Failed to analyze lineage' });
    }
    setIsAnalyzingLineage(false);
  };
  
  const handleAddGlobalRecipe = async () => {
    if (!newRecipeName.trim() || !newRecipeIngredients.trim() || !newRecipeInstructions.trim()) {
      alert('Name, ingredients, and instructions are required');
      return;
    }
    
    setIsAddingRecipe(true);
    try {
      const res = await fetch('/api/admin/global-recipes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRecipeName,
          description: newRecipeDesc,
          category: newRecipeCategory,
          ingredients: newRecipeIngredients.split('\n').filter(l => l.trim()),
          instructions: newRecipeInstructions.split('\n').filter(l => l.trim()),
          glassType: newRecipeGlass,
          garnish: newRecipeGarnish,
          creator: newRecipeCreator || 'Admin'
        })
      });
      
      if (res.ok) {
        alert('Recipe added successfully!');
        // Reset form
        setNewRecipeName('');
        setNewRecipeDesc('');
        setNewRecipeIngredients('');
        setNewRecipeInstructions('');
        setNewRecipeGarnish('');
        setNewRecipeCreator('');
        if (onRefreshRecipes) onRefreshRecipes();
        // Reload stats
        const statsRes = await fetch('/api/admin/global-recipes/stats', { credentials: 'include' });
        if (statsRes.ok) setAdminStats(await statsRes.json());
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to add recipe');
      }
    } catch {
      alert('Failed to add recipe');
    }
    setIsAddingRecipe(false);
  };
  
  // Master Data Input State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Spirit' | 'Mixer' | 'Garnish' | 'Other'>('Spirit');
  const [newItemSubCategory, setNewItemSubCategory] = useState('');
  const [newItemABV, setNewItemABV] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemIsGeneric, setNewItemIsGeneric] = useState(false);

  // Settings State
  const [keywordsInput, setKeywordsInput] = useState(settings.lowStockKeywords.join(', '));
  const [newAllergy, setNewAllergy] = useState('');

  // Grouping State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group Master Data
  const groupedData = useMemo(() => {
    const groups: Record<string, MasterIngredient[]> = {};
    masterData.forEach(item => {
        // Use subCategory if available, otherwise fallback to Category
        const key = item.subCategory || item.category;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    return groups;
  }, [masterData]);

  const sortedGroupKeys = useMemo(() => {
      return Object.keys(groupedData).sort();
  }, [groupedData]);

  if (!isOpen) return null;

  const resetForm = () => {
      setEditingId(null);
      setNewItemName('');
      setNewItemCategory('Spirit');
      setNewItemSubCategory('');
      setNewItemABV('');
      setNewItemNotes('');
      setNewItemIsGeneric(false);
  };

  const handleSaveMaster = () => {
    if (!newItemName.trim()) return;
    
    const abv = newItemABV ? parseFloat(newItemABV) : undefined;
    
    const itemPayload: MasterIngredient = {
      id: editingId || `master-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      subCategory: newItemSubCategory.trim() || undefined,
      abv: abv,
      defaultFlavorNotes: newItemNotes.trim() || undefined,
      isGeneric: newItemIsGeneric
    };

    if (editingId) {
        onUpdateMasterItem(itemPayload);
    } else {
        onAddMasterItem(itemPayload);
    }
    
    resetForm();
  };

  const handleEditClick = (item: MasterIngredient) => {
      setEditingId(item.id);
      setNewItemName(item.name);
      setNewItemCategory(item.category);
      setNewItemSubCategory(item.subCategory || '');
      setNewItemABV(item.abv !== undefined ? item.abv.toString() : '');
      setNewItemNotes(item.defaultFlavorNotes || '');
      setNewItemIsGeneric(item.isGeneric || false);
      
      // Ensure the group this item belongs to is expanded so it doesn't disappear if user is looking there
      const groupKey = item.subCategory || item.category;
      setExpandedGroups(prev => new Set(prev).add(groupKey));
      
      // Scroll to top of modal content to show editor
      const container = document.getElementById('settings-content');
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGroup = (group: string) => {
      setExpandedGroups(prev => {
          const next = new Set(prev);
          if (next.has(group)) {
              next.delete(group);
          } else {
              next.add(group);
          }
          return next;
      });
  };

  const handleSaveSettings = () => {
    const keywords = keywordsInput.split(',').map(s => s.trim()).filter(s => s !== '');
    onUpdateSettings({
      ...settings,
      lowStockKeywords: keywords
    });
    alert('Settings Saved');
  };

  const handleAddAllergy = () => {
      if (!newAllergy.trim()) return;
      if (settings.allergies.includes(newAllergy.trim())) return;
      
      onUpdateSettings({
          ...settings,
          allergies: [...settings.allergies, newAllergy.trim()]
      });
      setNewAllergy('');
  };

  const handleRemoveAllergy = (allergy: string) => {
      onUpdateSettings({
          ...settings,
          allergies: settings.allergies.filter(a => a !== allergy)
      });
  };

  const setHandedness = (mode: 'right' | 'left') => {
      onUpdateSettings({
          ...settings,
          handedness: mode
      });
  };
  
  const handleResetRatings = () => {
      if (confirm('Are you sure? This will remove all your ratings and reset your palate profile. Your recipes will be kept.')) {
          if (onResetRatings) onResetRatings();
          alert('Ratings and palate profile reset successfully.');
      }
  };

  const handleResetToDefaults = () => {
      if (confirm('Are you sure? This will reset EVERYTHING to guest defaults - all recipes, ratings, shopping list, and settings will be cleared.')) {
          if (onResetToDefaults) onResetToDefaults();
          alert('All data reset to defaults.');
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 flex flex-col h-[80dvh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-stone-400" />
                Settings & Data
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-700">
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'general' ? 'bg-stone-800 text-white border-b-2 border-primary' : 'text-stone-500 hover:text-stone-300'}`}
            >
                Preferences
            </button>
            <button 
                onClick={() => setActiveTab('master')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'master' ? 'bg-stone-800 text-white border-b-2 border-primary' : 'text-stone-500 hover:text-stone-300'}`}
            >
                Master Data
            </button>
            {isAdmin && (
                <button 
                    onClick={() => setActiveTab('admin')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-1 ${activeTab === 'admin' ? 'bg-amber-900/30 text-amber-400 border-b-2 border-amber-500' : 'text-amber-600 hover:text-amber-400'}`}
                >
                    <Shield className="w-3 h-3" />
                    Admin
                </button>
            )}
        </div>

        {/* Content */}
        <div id="settings-content" className="flex-1 overflow-y-auto p-6 pb-24">
            
            {/* GENERAL SETTINGS */}
            {activeTab === 'general' && (
                <div className="space-y-8">
                    
                    {/* HANDEDNESS */}
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Hand className="w-4 h-4 text-secondary" />
                            One-Handed Mode
                        </h3>
                        <p className="text-xs text-stone-400 mb-3">
                            Adjust button placement for easier thumb reach.
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setHandedness('left')}
                                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    settings.handedness === 'left' 
                                    ? 'bg-secondary/10 border-secondary text-secondary shadow-lg shadow-secondary/10' 
                                    : 'bg-stone-900 border-stone-700 text-stone-500 hover:bg-stone-800'
                                }`}
                            >
                                <AlignLeft className="w-6 h-6" />
                                <span className="text-xs font-bold">Left Handed</span>
                            </button>
                            <button 
                                onClick={() => setHandedness('right')}
                                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    settings.handedness === 'right' 
                                    ? 'bg-secondary/10 border-secondary text-secondary shadow-lg shadow-secondary/10' 
                                    : 'bg-stone-900 border-stone-700 text-stone-500 hover:bg-stone-800'
                                }`}
                            >
                                <AlignRight className="w-6 h-6" />
                                <span className="text-xs font-bold">Right Handed</span>
                            </button>
                        </div>
                    </div>

                    {/* ALLERGIES SECTION */}
                    <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl">
                        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Dietary Restrictions
                        </h3>
                        <p className="text-xs text-stone-400 mb-3">
                            Ingredients to flag or avoid. This will be visible on the global header.
                        </p>
                        
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text"
                                value={newAllergy}
                                onChange={(e) => setNewAllergy(e.target.value)}
                                placeholder="e.g. Peanuts, Dairy, Shellfish"
                                className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy()}
                            />
                            <button 
                                onClick={handleAddAllergy}
                                disabled={!newAllergy.trim()}
                                className="bg-red-800 hover:bg-red-700 text-white p-2 rounded disabled:opacity-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {settings.allergies.length === 0 ? (
                                <span className="text-xs text-stone-600 italic">No allergies listed.</span>
                            ) : (
                                settings.allergies.map(allergy => (
                                    <span key={allergy} className="bg-red-900/50 text-red-200 border border-red-800 px-2 py-1 rounded text-xs flex items-center gap-2">
                                        {allergy}
                                        <button onClick={() => handleRemoveAllergy(allergy)} className="hover:text-white">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    {/* PANTRY THRESHOLDS */}
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Pantry Thresholds</h3>
                        <p className="text-xs text-stone-400 mb-3">
                            Define keywords found in the AI volume estimation that trigger a "Low Stock" alert.
                        </p>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary">Trigger Keywords (comma separated)</label>
                            <textarea 
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-white text-sm focus:border-secondary outline-none h-24"
                                placeholder="empty, low, near empty..."
                            />
                        </div>
                    </div>
                    
                    {/* DANGER ZONE */}
                    <div className="pt-6 border-t border-stone-800">
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4">Danger Zone</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <button 
                                    onClick={handleResetRatings}
                                    className="w-full bg-amber-950/30 border border-amber-900/50 hover:bg-amber-900/50 text-amber-400 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors group"
                                >
                                    <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform" />
                                    <span className="font-bold">Reset Ratings & Palate Profile</span>
                                </button>
                                <p className="text-[10px] text-stone-500 mt-2 text-center">
                                    Clears all ratings (stars) from recipes and resets your palate profile. Your recipes and pantry will be kept.
                                </p>
                            </div>
                            
                            <div>
                                <button 
                                    onClick={handleResetToDefaults}
                                    className="w-full bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors group"
                                >
                                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold">Reset Everything to Defaults</span>
                                </button>
                                <p className="text-[10px] text-stone-500 mt-2 text-center">
                                    Resets ALL data to guest defaults - recipes, ratings, shopping list, and settings will be cleared.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MASTER DATA */}
            {activeTab === 'master' && (
                <div className="space-y-6">
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                {editingId ? 'Edit Ingredient' : 'Add Custom Item'}
                            </h3>
                            {editingId && (
                                <button 
                                    onClick={resetForm} 
                                    className="text-[10px] text-stone-400 hover:text-white flex items-center gap-1 bg-stone-900 px-2 py-1 rounded"
                                >
                                    <XCircle className="w-3 h-3" /> Cancel Edit
                                </button>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="Ingredient Name"
                                    className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-primary"
                                />
                                <select 
                                    value={newItemCategory}
                                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                                    className="bg-stone-950 border border-stone-700 rounded px-2 py-2 text-sm text-white outline-none"
                                >
                                    <option value="Spirit">Spirit</option>
                                    <option value="Mixer">Mixer</option>
                                    <option value="Garnish">Garnish</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <input 
                                    type="text"
                                    value={newItemSubCategory}
                                    onChange={(e) => setNewItemSubCategory(e.target.value)}
                                    placeholder="Sub-Type (e.g. Gin)"
                                    className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-primary"
                                />
                                <div className="relative">
                                     <input 
                                        type="number"
                                        value={newItemABV}
                                        onChange={(e) => setNewItemABV(e.target.value)}
                                        placeholder="ABV %"
                                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-primary"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">%</span>
                                </div>
                            </div>
                            
                            <textarea 
                                value={newItemNotes}
                                onChange={(e) => setNewItemNotes(e.target.value)}
                                placeholder="Flavor notes (e.g. Juniper-forward, citrusy)..."
                                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-primary resize-none h-16"
                            />

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setNewItemIsGeneric(!newItemIsGeneric)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${newItemIsGeneric ? 'bg-stone-700 text-white border-stone-600' : 'bg-stone-950 text-stone-500 border-stone-800'}`}
                                >
                                    {newItemIsGeneric ? 'Type: Generic Category' : 'Type: Specific Brand'}
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveMaster}
                            disabled={!newItemName.trim()}
                            className={`w-full font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50 transition-colors ${editingId ? 'bg-secondary text-stone-900 hover:bg-yellow-500' : 'bg-stone-700 hover:bg-stone-600 text-white'}`}
                        >
                            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                            {editingId ? 'Update Item' : 'Add to Master List'}
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4 text-secondary" />
                            Global Ingredients ({masterData.length})
                        </h3>
                        
                        <div className="space-y-3">
                            {masterData.length === 0 ? (
                                <div className="p-4 text-center text-stone-500 text-xs bg-stone-950 border border-stone-800 rounded-xl">No data.</div>
                            ) : (
                                sortedGroupKeys.map(groupKey => {
                                    const items = groupedData[groupKey];
                                    const isExpanded = expandedGroups.has(groupKey);
                                    
                                    return (
                                        <div key={groupKey} className="border border-stone-800 rounded-xl overflow-hidden bg-stone-900/50">
                                            <button 
                                                onClick={() => toggleGroup(groupKey)}
                                                className="w-full flex items-center justify-between p-3 bg-stone-900 hover:bg-stone-800 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Layers className="w-3 h-3 text-stone-500" />
                                                    <span className="font-bold text-sm text-stone-300">{groupKey}</span>
                                                    <span className="text-[10px] text-stone-600 bg-stone-950 px-1.5 rounded">{items.length}</span>
                                                </div>
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-stone-500" /> : <ChevronRight className="w-4 h-4 text-stone-500" />}
                                            </button>
                                            
                                            {isExpanded && (
                                                <div className="p-2 space-y-1">
                                                    {items.sort((a,b) => a.name.localeCompare(b.name)).map((item) => (
                                                        <div key={item.id} className="bg-stone-950/50 rounded-lg p-2 flex justify-between items-center group hover:bg-stone-950">
                                                            <div className="flex-1 cursor-pointer" onClick={() => handleEditClick(item)}>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <div className="text-sm font-medium text-stone-300 group-hover:text-white transition-colors">{item.name}</div>
                                                                    {item.isGeneric ? (
                                                                        <span className="text-[9px] bg-stone-800 text-stone-500 px-1.5 rounded border border-stone-700">Generic</span>
                                                                    ) : (
                                                                        <span className="text-[9px] bg-secondary/10 text-secondary px-1.5 rounded border border-secondary/20">Brand</span>
                                                                    )}
                                                                    {item.abv !== undefined && (
                                                                        <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 rounded border border-stone-700">{item.abv}%</span>
                                                                    )}
                                                                </div>
                                                                
                                                                {item.defaultFlavorNotes && (
                                                                    <div className="text-[10px] text-stone-500 italic opacity-70">
                                                                        {item.defaultFlavorNotes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => handleEditClick(item)}
                                                                    className="text-stone-600 hover:text-secondary p-2"
                                                                    title="Edit"
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => onRemoveMasterItem(item.id)}
                                                                    className="text-stone-600 hover:text-red-400 p-2"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ADMIN PANEL */}
            {activeTab === 'admin' && isAdmin && (
                <div className="space-y-6">
                    {/* Stats Overview */}
                    <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl">
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Database Overview
                        </h3>
                        {adminStats ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-stone-900 p-3 rounded-lg border border-stone-700">
                                    <div className="text-2xl font-bold text-white">{adminStats.totalRecipes}</div>
                                    <div className="text-xs text-stone-400">Total Recipes</div>
                                </div>
                                <div className="bg-stone-900 p-3 rounded-lg border border-stone-700">
                                    <div className="text-2xl font-bold text-green-400">{adminStats.complete}</div>
                                    <div className="text-xs text-stone-400">Enriched</div>
                                </div>
                                <div className="bg-stone-900 p-3 rounded-lg border border-stone-700">
                                    <div className="text-2xl font-bold text-amber-400">{adminStats.pending}</div>
                                    <div className="text-xs text-stone-400">Pending Enrichment</div>
                                </div>
                                <div className="bg-stone-900 p-3 rounded-lg border border-stone-700">
                                    <div className="text-2xl font-bold text-stone-400">{adminStats.categories?.length || 0}</div>
                                    <div className="text-xs text-stone-400">Categories</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-stone-500 text-sm">Loading stats...</div>
                        )}
                    </div>

                    {/* Seed & Enrich Actions */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Bulk Actions</h3>
                        
                        <button 
                            onClick={handleSeedModernRecipes}
                            disabled={isSeeding}
                            className="w-full bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white p-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isSeeding ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Wine className="w-5 h-5" />
                            )}
                            <span className="font-bold">Seed Modern Recipes</span>
                        </button>
                        
                        {seedResult && (
                            <div className={`p-3 rounded-lg text-sm ${seedResult.error ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                                {seedResult.error ? seedResult.error : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Added {seedResult.added} recipes, skipped {seedResult.skipped}
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={handleEnrichRecipes}
                            disabled={isEnriching}
                            className="w-full bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white p-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isEnriching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCcw className="w-5 h-5" />
                            )}
                            <span className="font-bold">Enrich 5 Pending Recipes</span>
                        </button>
                        
                        {enrichResult && (
                            <div className={`p-3 rounded-lg text-sm ${enrichResult.error ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                                {enrichResult.error ? enrichResult.error : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Enriched {enrichResult.processed} recipes
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={handleAnalyzeLineage}
                            disabled={isAnalyzingLineage}
                            className="w-full bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/50 text-purple-300 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isAnalyzingLineage ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Network className="w-5 h-5" />
                            )}
                            <span className="font-bold">Re-analyze All Lineages</span>
                        </button>
                        <p className="text-[10px] text-stone-500 text-center">
                            Uses AI to holistically analyze all cocktails and rebuild family tree relationships. Takes ~2 minutes.
                        </p>
                        
                        {lineageResult && (
                            <div className={`p-3 rounded-lg text-sm ${lineageResult.error ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                                {lineageResult.error ? lineageResult.error : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        {lineageResult.message || `Created ${lineageResult.lineages} lineages, ${lineageResult.relationships} relationships`}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Add New Global Recipe */}
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Global Recipe
                        </h3>
                        
                        <div className="space-y-3">
                            <input 
                                type="text"
                                value={newRecipeName}
                                onChange={(e) => setNewRecipeName(e.target.value)}
                                placeholder="Recipe Name *"
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            />
                            
                            <input 
                                type="text"
                                value={newRecipeDesc}
                                onChange={(e) => setNewRecipeDesc(e.target.value)}
                                placeholder="Description"
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            />
                            
                            <div className="flex gap-2">
                                <select
                                    value={newRecipeCategory}
                                    onChange={(e) => setNewRecipeCategory(e.target.value)}
                                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                >
                                    <option value="Uncategorized">Category</option>
                                    <option value="Spirit-Forward">Spirit-Forward</option>
                                    <option value="Sour">Sour</option>
                                    <option value="Tiki">Tiki</option>
                                    <option value="Refreshing">Refreshing</option>
                                    <option value="Fizz">Fizz</option>
                                    <option value="Sparkling">Sparkling</option>
                                    <option value="Fruity">Fruity</option>
                                    <option value="Creamy">Creamy</option>
                                </select>
                                
                                <select
                                    value={newRecipeGlass}
                                    onChange={(e) => setNewRecipeGlass(e.target.value)}
                                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                >
                                    <option value="Coupe">Coupe</option>
                                    <option value="Old Fashioned">Old Fashioned</option>
                                    <option value="Highball">Highball</option>
                                    <option value="Collins">Collins</option>
                                    <option value="Martini">Martini</option>
                                    <option value="Tiki Mug">Tiki Mug</option>
                                    <option value="Hurricane">Hurricane</option>
                                    <option value="Wine Glass">Wine Glass</option>
                                    <option value="Copper Mug">Copper Mug</option>
                                    <option value="Julep Cup">Julep Cup</option>
                                </select>
                            </div>
                            
                            <textarea
                                value={newRecipeIngredients}
                                onChange={(e) => setNewRecipeIngredients(e.target.value)}
                                placeholder="Ingredients (one per line) *"
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 h-24"
                            />
                            
                            <textarea
                                value={newRecipeInstructions}
                                onChange={(e) => setNewRecipeInstructions(e.target.value)}
                                placeholder="Instructions (one step per line) *"
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 h-24"
                            />
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newRecipeGarnish}
                                    onChange={(e) => setNewRecipeGarnish(e.target.value)}
                                    placeholder="Garnish"
                                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                />
                                <input 
                                    type="text"
                                    value={newRecipeCreator}
                                    onChange={(e) => setNewRecipeCreator(e.target.value)}
                                    placeholder="Creator"
                                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                />
                            </div>
                            
                            <button
                                onClick={handleAddGlobalRecipe}
                                disabled={isAddingRecipe || !newRecipeName.trim() || !newRecipeIngredients.trim() || !newRecipeInstructions.trim()}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAddingRecipe ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5" />
                                )}
                                Add to Global Database
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-stone-500 text-center">
                        Global recipes are shared with all users. User recipes with the same name take priority for that user.
                    </p>
                </div>
            )}
        </div>
        
        {/* Sticky Footer for Save */}
        {activeTab === 'general' && (
             <div className="p-4 border-t border-stone-700 bg-stone-900/90 backdrop-blur absolute bottom-0 left-0 right-0 rounded-b-2xl">
                <button 
                    onClick={handleSaveSettings}
                    className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                    <Save className="w-5 h-5" /> Save Preferences
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;