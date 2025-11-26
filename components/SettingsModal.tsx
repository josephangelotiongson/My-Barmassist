import React, { useState, useMemo } from 'react';
import { X, Database, Settings as SettingsIcon, Plus, Trash2, Save, AlertTriangle, Hand, AlignLeft, AlignRight, RefreshCcw, Droplets, ChevronDown, ChevronRight, Layers, Edit3, XCircle } from 'lucide-react';
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
  onResetPalate?: () => void;
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
  onResetPalate
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'master'>('general');
  
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
  
  const handleReset = () => {
      if (confirm('Are you sure? This will remove all your ratings and reset your palate profile. Recipes will be kept.')) {
          if (onResetPalate) onResetPalate();
          alert('Palate reset successfully.');
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
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2">Danger Zone</h3>
                        <button 
                            onClick={handleReset}
                            className="w-full bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors group"
                        >
                            <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform" />
                            <span className="font-bold">Reset Palate & Clear Ratings</span>
                        </button>
                        <p className="text-[10px] text-stone-500 mt-2 text-center">
                            This will remove all ratings (stars) from recipes. Your recipes and pantry will be kept safe.
                        </p>
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