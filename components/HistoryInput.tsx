import React, { useState } from 'react';
import { PenTool, Link as LinkIcon, Send, Loader2 } from 'lucide-react';
import { analyzeDrinkText } from '../services/geminiService';
import { Cocktail } from '../types';

interface Props {
  onAddCocktail: (cocktail: Cocktail) => void;
}

const HistoryInput: React.FC<Props> = ({ onAddCocktail }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const data = await analyzeDrinkText(input);
      
      const newCocktail: Cocktail = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions || [], // Added instructions to match Cocktail interface
        flavorProfile: data.flavorProfile,
        source: input.includes('http') ? 'Social' : 'Manual',
        dateAdded: new Date().toISOString()
      };

      onAddCocktail(newCocktail);
      setInput('');
    } catch (error) {
      alert("Could not analyze that text. Please try again with more details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-2xl shadow-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <PenTool className="w-6 h-6 text-primary" />
        Log a Drink
      </h2>
      <p className="text-slate-400 text-sm mb-4">
        Paste a social media link, write a review, or note down a recent order. We'll extract the flavor profile.
      </p>
      
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 'Had an amazing Mezcal Negroni at Death & Co' or paste an Instagram caption..."
          className="w-full bg-background text-slate-100 p-4 rounded-xl border border-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px] resize-none"
        />
        <div className="absolute bottom-3 right-3">
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-primary text-white hover:bg-red-600 disabled:opacity-50 p-2 rounded-lg transition-colors"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HistoryInput;