
import React, { useState } from 'react';
import { X, Database, Settings as SettingsIcon, Plus, Trash2, Save, AlertTriangle, Hand, AlignLeft, AlignRight } from 'lucide-react';
import { MasterIngredient, AppSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masterData: MasterIngredient[];
  onAddMasterItem: (item: MasterIngredient) => void;
  onRemoveMasterItem: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  masterData, 
  onAddMasterItem, 
  onRemoveMasterItem,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'master'>('general');
  
  // Master Data Input State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Spirit' | 'Mixer' | 'Garnish' | 'Other'>('Spirit');

  // Settings State
  const [keywordsInput, setKeywordsInput] = useState(settings.lowStockKeywords.join(', '));
  const [newAllergy, setNewAllergy] = useState('');

  if (!isOpen) return null;

  const handleAddMaster = () => {
    if (!newItemName.trim()) return;
    const newItem: MasterIngredient = {
      id: `master-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory
    };
    onAddMasterItem(newItem);
    setNewItemName('');
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
        <div className="flex-1 overflow-y-auto p-6 pb-24">
            
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
                </div>
            )}

            {/* MASTER DATA */}
            {activeTab === 'master' && (
                <div className="space-y-6">
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Add New Ingredient</h3>
                        <div className="flex gap-2 mb-2">
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
                        <button 
                            onClick={handleAddMaster}
                            disabled={!newItemName.trim()}
                            className="w-full bg-stone-700 hover:bg-stone-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> Add to Master List
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4 text-secondary" />
                            Global Ingredients ({masterData.length})
                        </h3>
                        <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
                            {masterData.length === 0 ? (
                                <div className="p-4 text-center text-stone-500 text-xs">No data.</div>
                            ) : (
                                <ul className="divide-y divide-stone-800">
                                    {masterData.map((item) => (
                                        <li key={item.id} className="flex justify-between items-center p-3 hover:bg-stone-900 transition-colors group">
                                            <div>
                                                <div className="text-sm font-medium text-stone-200">{item.name}</div>
                                                <div className="text-[10px] text-stone-500 uppercase">{item.category}</div>
                                            </div>
                                            <button 
                                                onClick={() => onRemoveMasterItem(item.id)}
                                                className="text-stone-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
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
