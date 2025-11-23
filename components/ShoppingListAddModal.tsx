
import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, AlertTriangle, Plus, Search, Check } from 'lucide-react';
import { MasterIngredient, Ingredient, AppSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pantry: Ingredient[];
  masterData: MasterIngredient[];
  settings: AppSettings;
  onAddToShoppingList: (items: string[]) => void;
}

const ShoppingListAddModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pantry,
  masterData,
  settings,
  onAddToShoppingList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLowStock, setSelectedLowStock] = useState<string[]>([]);

  // Filter Master Data based on search
  const filteredMasterData = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return masterData.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [masterData, searchQuery]);

  // Identify Low Stock Items from Pantry
  const lowStockItems = useMemo(() => {
    return pantry.filter(item => {
      if (!item.volume) return false;
      const vol = item.volume.toLowerCase();
      // Check against user settings keywords
      return settings.lowStockKeywords.some(keyword => vol.includes(keyword.toLowerCase()));
    });
  }, [pantry, settings]);

  if (!isOpen) return null;

  const handleAddCustom = () => {
    if (searchQuery.trim()) {
      onAddToShoppingList([searchQuery.trim()]);
      setSearchQuery('');
      onClose();
    }
  };

  const handleAddMasterItem = (name: string) => {
    onAddToShoppingList([name]);
    setSearchQuery('');
    onClose();
  };

  const toggleLowStockSelection = (name: string) => {
    setSelectedLowStock(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name) 
        : [...prev, name]
    );
  };

  const handleRefillSelected = () => {
    onAddToShoppingList(selectedLowStock);
    setSelectedLowStock([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 flex flex-col h-[70dvh] animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-secondary" />
                Add to List
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Search / Add Custom */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase">Search Master Data</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type ingredient name..."
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none"
                        autoFocus
                    />
                </div>
                
                {/* Autocomplete / Results */}
                {searchQuery && (
                    <div className="bg-stone-900 border border-stone-700 rounded-xl overflow-hidden mt-2">
                        {filteredMasterData.length > 0 ? (
                            filteredMasterData.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleAddMasterItem(item.name)}
                                    className="w-full text-left px-4 py-3 hover:bg-stone-800 text-stone-300 border-b border-stone-800 last:border-0 flex justify-between items-center"
                                >
                                    <span>{item.name}</span>
                                    <span className="text-[10px] text-stone-500 uppercase border border-stone-700 px-1 rounded">{item.category}</span>
                                </button>
                            ))
                        ) : (
                            <button
                                onClick={handleAddCustom}
                                className="w-full text-left px-4 py-3 hover:bg-stone-800 text-primary font-bold flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add "{searchQuery}" as new item
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-sm font-bold text-orange-200">Refill Needed?</h3>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                        The following items in your pantry appear low based on your threshold settings.
                    </p>
                    
                    <div className="space-y-2">
                        {lowStockItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => toggleLowStockSelection(item.name)}
                                className={`w-full flex justify-between items-center p-3 rounded-lg border transition-all ${
                                    selectedLowStock.includes(item.name) 
                                    ? 'bg-orange-500/20 border-orange-500/50 text-white' 
                                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-orange-500/30'
                                }`}
                            >
                                <div className="text-left">
                                    <div className="font-bold text-sm">{item.name}</div>
                                    <div className="text-[10px] opacity-70">Vol: {item.volume}</div>
                                </div>
                                {selectedLowStock.includes(item.name) && <Check className="w-4 h-4 text-orange-400" />}
                            </button>
                        ))}
                    </div>

                    {selectedLowStock.length > 0 && (
                        <button
                            onClick={handleRefillSelected}
                            className="w-full mt-4 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg text-xs"
                        >
                            Add {selectedLowStock.length} to List
                        </button>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ShoppingListAddModal;
