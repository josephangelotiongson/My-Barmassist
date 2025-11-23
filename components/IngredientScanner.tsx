
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Loader2, Plus, X, ScanLine, Wine } from 'lucide-react';
import { identifyIngredientsFromImage } from '../services/geminiService';
import { Ingredient } from '../types';

interface Props {
  onIngredientsFound: (ingredients: Ingredient[]) => void;
  isOpenExternal?: boolean; // New prop to control from parent
  onCloseExternal?: () => void;
}

const IngredientScanner: React.FC<Props> = ({ onIngredientsFound, isOpenExternal, onCloseExternal }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with external control if provided
  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setInternalIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const handleClose = () => {
    setInternalIsOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1]; // Remove data url prefix
      try {
        const detectedIngredients = await identifyIngredientsFromImage(base64String);
        
        // Map to internal type with IDs
        const newIngredients: Ingredient[] = detectedIngredients.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item.name,
            category: item.category as any,
            volume: item.estimatedVolume || 'Unknown Vol' // Map the AI estimated volume
        }));

        onIngredientsFound(newIngredients);
        handleClose(); // Close modal on success
      } catch (error) {
        console.error(error);
        alert("Failed to identify ingredients. Please try again.");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* FAB Removed - Controlled by App.tsx now for better Handedness support */}

      {/* Modal Overlay */}
      {internalIsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Wine className="w-5 h-5 text-secondary" />
                    Stock Pantry
                </h2>
                <button 
                  onClick={handleClose} 
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
                <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-center">
                    <p className="text-stone-300 text-sm">
                        Take a photo of your liquor cabinet or specific bottles. 
                        <br/>
                        <span className="text-secondary font-bold">Barmassist Vision</span> will identify spirits and estimate volumes.
                    </p>
                </div>

                <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                />
                
                <button 
                    onClick={triggerFileInput}
                    disabled={isAnalyzing}
                    className="w-full bg-stone-800 hover:bg-stone-700 p-8 rounded-xl border-2 border-stone-600 hover:border-secondary transition-all group flex flex-col items-center justify-center gap-3"
                >
                    {isAnalyzing ? (
                        <>
                             <Loader2 className="w-10 h-10 text-secondary animate-spin" />
                             <span className="text-stone-400 font-medium animate-pulse">Analyzing Bottles...</span>
                        </>
                    ) : (
                        <>
                            <Camera className="w-12 h-12 text-secondary group-hover:scale-110 transition-transform" />
                            <span className="text-white font-bold text-lg">Snap Photo</span>
                            <span className="text-xs text-stone-500 uppercase tracking-wider font-bold">Or Upload Image</span>
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IngredientScanner;
