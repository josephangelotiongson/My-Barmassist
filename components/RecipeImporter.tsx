
import React, { useState, useRef, useEffect } from 'react';
import { Link as LinkIcon, Send, Loader2, Check, X, Plus, Save, User, Star, Globe, Image as ImageIcon, Sparkles, Calendar, Beer, ScanLine, Link, Mic, MicOff, Disc, Trash2, Tag, Activity, Droplets, Camera } from 'lucide-react';
import { analyzeDrinkText, generateCocktailImage, transcribeAudio } from '../services/geminiService';
import { Cocktail, FlavorProfile, Nutrition } from '../types';
import FlavorWheel from './FlavorWheel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddCocktail: (cocktail: Cocktail) => void;
  onScanMenu: (file: File) => void;
  isScanningMenu: boolean;
  recentMenuDrafts?: Cocktail[];
  initialDraft?: Cocktail | null;
}

const RecipeImporter: React.FC<Props> = ({ isOpen, onClose, onAddCocktail, onScanMenu, isScanningMenu, recentMenuDrafts, initialDraft }) => {
  const [mode, setMode] = useState<'input' | 'review'>('input');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for file inputs
  const menuInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Screenshot state for AI interpretation
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [screenshotMimeType, setScreenshotMimeType] = useState<string>('image/jpeg');

  // Editing State
  const [entryType, setEntryType] = useState<'Recipe' | 'Order'>('Recipe');
  const [draftId, setDraftId] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  
  // Multiple Links State
  const [draftLinks, setDraftLinks] = useState<string[]>([]);
  const [newLinkInput, setNewLinkInput] = useState('');

  const [draftCreator, setDraftCreator] = useState('');
  const [draftIngredients, setDraftIngredients] = useState<string[]>([]);
  const [draftInstructions, setDraftInstructions] = useState<string>('');
  const [draftProfile, setDraftProfile] = useState<FlavorProfile | null>(null);
  const [draftNutrition, setDraftNutrition] = useState<Nutrition>({ calories: 0, carbs: 0, abv: 0 });
  const [draftRating, setDraftRating] = useState<number>(0);
  const [draftImageUrl, setDraftImageUrl] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState('');

  useEffect(() => {
    if (isOpen && initialDraft) {
        populateDraft({
            name: initialDraft.name,
            description: initialDraft.description,
            category: initialDraft.category,
            ingredients: initialDraft.ingredients,
            instructions: initialDraft.instructions,
            flavorProfile: initialDraft.flavorProfile,
            imageUrl: initialDraft.imageUrl,
            creator: initialDraft.creator,
            links: initialDraft.externalLinks,
            nutrition: initialDraft.nutrition
        });
    }
  }, [isOpen, initialDraft]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsLoading(true);
        setLoadingStep('Transcribing Voice...');
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            try {
                 const transcript = await transcribeAudio(base64String, recorder.mimeType || 'audio/webm');
                 setInput(prev => (prev ? prev + " " + transcript : transcript));
            } catch (e) {
                alert("Voice transcription failed.");
            } finally {
                setIsLoading(false);
                setLoadingStep('');
                stream.getTracks().forEach(track => track.stop()); // cleanup
            }
        };
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Could not access microphone.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedTypes.includes(file.type)) {
      alert('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setScreenshotPreview(result);
      setScreenshotBase64(result.split(',')[1]);
      setScreenshotMimeType(file.type);
    };
    reader.onerror = () => {
      alert('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
    
    if (e.target) e.target.value = '';
  };

  const clearScreenshot = () => {
    setScreenshotBase64('');
    setScreenshotPreview('');
    setScreenshotMimeType('image/jpeg');
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
  };

  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !screenshotBase64) return;

    setIsLoading(true);
    const hasLink = input.includes('http') || input.includes('tiktok.com');
    const hasImage = !!screenshotBase64;
    setLoadingStep(hasImage ? 'Reading screenshot...' : (hasLink ? 'Agent watching video...' : 'Mixologist Agent Analyzing...'));
    
    try {
      // 1. Scrape / Analyze Text (and optionally image)
      const imageData = hasImage ? { base64: screenshotBase64, mimeType: screenshotMimeType } : undefined;
      const data = await analyzeDrinkText(input, imageData);
      
      // Extract URL if present in input for the 'source' field
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const foundUrls = input.match(urlRegex) || [];

      // 2. Automatically Visualize (Force Generation)
      setLoadingStep('Synthesizing Visuals...');
      let finalImageUrl = '';
      
      const generatedImage = await generateCocktailImage(
          data.name || 'Cocktail', 
          data.description || 'A delicious drink', 
          data.ingredients || []
      );
      
      if (generatedImage) {
          finalImageUrl = generatedImage;
      }

      populateDraft({
        name: data.name,
        description: data.description,
        category: data.category,
        ingredients: data.ingredients,
        instructions: data.instructions,
        flavorProfile: data.flavorProfile,
        nutrition: data.nutrition,
        imageUrl: finalImageUrl,
        links: foundUrls,
        creator: data.creator
      });
      
      clearScreenshot();
      
    } catch (error) {
      console.error(error);
      alert("Could not analyze that. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const populateDraft = (data: any) => {
      setEntryType('Recipe'); 
      setDraftId(Math.random().toString(36).substr(2, 9));
      setDraftName(data.name || 'Unknown Elixir');
      setDraftDesc(data.description || '');
      setDraftCategory(data.category || 'Uncategorized');
      setDraftLinks(data.links || []);
      setDraftCreator(data.creator || '');
      setDraftIngredients(data.ingredients || []);
      
      const instructionsText = Array.isArray(data.instructions) 
        ? data.instructions.join('\n') 
        : (data.instructions || '');
      setDraftInstructions(instructionsText);

      setDraftProfile(data.flavorProfile || null);
      setDraftNutrition(data.nutrition || { calories: 0, carbs: 0, abv: 0 });
      setDraftImageUrl(data.imageUrl || '');
      setDraftRating(0);
      
      setMode('review');
  };

  const handleRecentMenuSelection = (menuItem: Cocktail) => {
      // Only overwrite fields that are specific to the recipe, ignore image if we already have one
      setDraftName(menuItem.name);
      setDraftDesc(menuItem.description);
      setDraftIngredients(menuItem.ingredients);
      setDraftInstructions(menuItem.instructions.join('\n'));
      setDraftCreator(menuItem.creator || '');
      // If menu scan didn't have category, we can leave it blank or default
      if (menuItem.flavorProfile) setDraftProfile(menuItem.flavorProfile);
      if (menuItem.nutrition) setDraftNutrition(menuItem.nutrition);
      
      // Keep existing image if we took a photo, otherwise use placeholder/generated
      if (!draftImageUrl && menuItem.imageUrl) {
          setDraftImageUrl(menuItem.imageUrl);
      }
  };

  const handleSave = () => {
    // Convert instructions string back to array
    const instructionsArray = draftInstructions.split('\n').filter(line => line.trim() !== '');

    // Determine Creator Type
    let creatorType: 'Person' | 'Establishment' | 'Online' = 'Person';
    if (entryType === 'Order') {
        creatorType = 'Establishment';
    } else if (draftLinks.length > 0) {
        creatorType = 'Online';
    }

    const newCocktail: Cocktail = {
      id: draftId,
      name: draftName,
      description: draftDesc,
      category: draftCategory,
      ingredients: draftIngredients,
      instructions: instructionsArray,
      flavorProfile: draftProfile || { Sweet: 0, Fruity: 0, Floral: 0, Herbal: 0, Spicy: 0, Earthy: 0, Sour: 0, Boozy: 0 },
      nutrition: draftNutrition,
      source: entryType === 'Order' ? 'Order' : (draftLinks.length > 0 ? 'Social' : 'Manual'),
      externalLinks: draftLinks,
      creator: draftCreator,
      creatorType: creatorType,
      dateAdded: new Date().toISOString(),
      rating: draftRating > 0 ? draftRating : undefined,
      imageUrl: draftImageUrl || undefined
    };

    onAddCocktail(newCocktail);
    handleClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setMode('input');
    setEntryType('Recipe');
    setInput('');
    setDraftName('');
    setDraftCategory('');
    setDraftIngredients([]);
    setDraftInstructions('');
    setDraftLinks([]);
    setDraftCreator('');
    setDraftRating(0);
    setDraftImageUrl('');
    setDraftNutrition({ calories: 0, carbs: 0, abv: 0 });
    clearScreenshot();
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setDraftIngredients([...draftIngredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (idx: number) => {
    setDraftIngredients(draftIngredients.filter((_, i) => i !== idx));
  };
  
  const addLink = () => {
      if (newLinkInput.trim()) {
          setDraftLinks([...draftLinks, newLinkInput.trim()]);
          setNewLinkInput('');
      }
  };
  
  const removeLink = (idx: number) => {
      setDraftLinks(draftLinks.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Content */}
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {mode === 'input' ? (
                    <>
                        <Plus className="w-5 h-5 text-primary" />
                        New Entry
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5 text-accent" />
                        Review Entry
                    </>
                )}
            </h2>
            <button onClick={handleClose} className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
            {mode === 'input' ? (
                <div className="space-y-8">
                    {/* ... (Input mode content same as before) ... */}
                    {/* 1. Quick Actions */}
                    <div>
                        <button 
                           onClick={() => menuInputRef.current?.click()}
                           disabled={isScanningMenu}
                           className="w-full bg-stone-800 hover:bg-stone-700 p-4 rounded-xl border border-stone-600 flex flex-col items-center gap-2 transition-colors group"
                        >
                            {isScanningMenu ? <Loader2 className="w-8 h-8 text-secondary animate-spin" /> : <ScanLine className="w-8 h-8 text-secondary group-hover:scale-110 transition-transform" />}
                            <span className="text-sm font-bold text-white">Scan or Upload Menu</span>
                            <input 
                                type="file" 
                                accept="image/*"
                                ref={menuInputRef}
                                className="hidden"
                                onChange={(e) => e.target.files && onScanMenu(e.target.files[0])}
                            />
                        </button>
                    </div>

                    {/* 2. Recent Menu Items */}
                    {recentMenuDrafts && recentMenuDrafts.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">From Recent Scan</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {recentMenuDrafts.map((draft) => (
                                    <button 
                                        key={draft.id}
                                        onClick={() => populateDraft({ ...draft, imageUrl: '' })} 
                                        className="flex-none w-32 bg-stone-900 border border-stone-800 p-3 rounded-xl hover:border-secondary transition-colors text-left flex flex-col gap-1 group"
                                    >
                                        <div className="text-xs font-bold text-white truncate w-full group-hover:text-secondary">{draft.name}</div>
                                        <div className="text-[10px] text-stone-500 truncate w-full">{draft.ingredients.slice(0, 2).join(', ')}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Text Input */}
                    <div className="relative">
                         <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-stone-800"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-surface px-2 text-xs text-stone-500 uppercase font-bold tracking-widest">Describe, Link, Screenshot, or Dictate</span>
                        </div>
                    </div>

                    <form onSubmit={handleAnalyzeText} className="relative space-y-3">
                        {/* Screenshot Preview */}
                        {screenshotPreview && (
                            <div className="relative bg-stone-900 rounded-xl border border-primary/50 overflow-hidden">
                                <img 
                                    src={screenshotPreview} 
                                    alt="Screenshot preview" 
                                    className="w-full max-h-40 object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={clearScreenshot}
                                    className="absolute top-2 right-2 p-1.5 bg-stone-900/80 hover:bg-red-600 rounded-full text-stone-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1 text-[10px] font-bold uppercase">
                                    <Camera className="w-3 h-3" /> Screenshot attached
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={screenshotPreview 
                                    ? "Add optional context about the screenshot..." 
                                    : "e.g. 'I had a fantastic Mezcal cocktail with agave and lime...' or paste a TikTok/Instagram link..."}
                                className="w-full bg-background text-stone-200 p-4 rounded-xl border border-stone-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[120px] resize-none font-mono text-sm"
                            />
                            
                            {/* Input Action Buttons */}
                            <div className="absolute bottom-3 left-3 flex gap-2">
                                {/* Mic Button */}
                                <button
                                    type="button"
                                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                                    className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'}`}
                                >
                                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </button>
                                
                                {/* Screenshot Button */}
                                <button
                                    type="button"
                                    onClick={() => screenshotInputRef.current?.click()}
                                    className={`p-2 rounded-full transition-all ${screenshotPreview ? 'bg-primary/20 text-primary' : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'}`}
                                    title="Upload screenshot"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    ref={screenshotInputRef}
                                    className="hidden"
                                    onChange={handleScreenshotUpload}
                                />
                            </div>

                            {isLoading && (
                                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-xl backdrop-blur-[1px] z-10">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                                    <span className="text-xs font-bold text-primary animate-pulse uppercase">{loadingStep}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end">
                            <button 
                                onClick={handleAnalyzeText}
                                disabled={isLoading || (!input.trim() && !screenshotBase64)}
                                className="bg-stone-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-xs"
                            >
                                {screenshotBase64 ? 'Analyze Screenshot' : 'Analyze Input'} <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* ... (Review Mode) ... */}
                    {recentMenuDrafts && recentMenuDrafts.length > 0 && (
                         <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 mb-4">
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">
                                <Link className="w-3 h-3" />
                                Link to Scanned Menu Item?
                            </label>
                            <select 
                                className="w-full bg-stone-900 text-white text-xs p-2 rounded border border-stone-700 outline-none"
                                onChange={(e) => {
                                    const selected = recentMenuDrafts.find(d => d.id === e.target.value);
                                    if (selected) handleRecentMenuSelection(selected);
                                }}
                            >
                                <option value="">-- Select a drink from menu --</option>
                                {recentMenuDrafts.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                         </div>
                    )}

                    <div className="bg-stone-950 p-1 rounded-lg border border-stone-700 flex">
                        <button
                            onClick={() => setEntryType('Recipe')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${entryType === 'Recipe' ? 'bg-stone-800 text-white shadow' : 'text-stone-500'}`}
                        >
                            Save Recipe
                        </button>
                        <button
                            onClick={() => setEntryType('Order')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${entryType === 'Order' ? 'bg-stone-800 text-secondary shadow' : 'text-stone-500'}`}
                        >
                            Log Order
                        </button>
                    </div>

                    {/* Image Preview */}
                    <div className="w-full h-48 bg-stone-900 rounded-xl border border-stone-700 overflow-hidden relative group">
                         {draftImageUrl ? (
                             <img src={draftImageUrl} alt="Cocktail Preview" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center flex-col text-stone-500 gap-2">
                                 <ImageIcon className="w-8 h-8" />
                                 <span className="text-xs">No image available</span>
                             </div>
                         )}
                         <div className="absolute bottom-2 right-2 bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded backdrop-blur-md flex items-center gap-1 text-[10px] font-bold uppercase">
                             <Sparkles className="w-3 h-3" /> Visual
                         </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-primary uppercase mb-1">Name</label>
                            <input 
                                type="text" 
                                value={draftName} 
                                onChange={(e) => setDraftName(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-white focus:border-secondary outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-primary uppercase mb-1 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Family / Category
                            </label>
                            <select 
                                value={draftCategory}
                                onChange={(e) => setDraftCategory(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-white text-xs focus:border-secondary outline-none appearance-none"
                            >
                                <option value="Uncategorized">Uncategorized</option>
                                <option value="Ancestrals">Ancestrals (Old Fashioned style)</option>
                                <option value="Spirit-Forward">Spirit-Forward (Martini/Negroni)</option>
                                <option value="Sours & Daisies">Sours & Daisies</option>
                                <option value="Highballs & Fizzes">Highballs & Fizzes</option>
                                <option value="Tiki & Tropical">Tiki & Tropical</option>
                                <option value="Dessert & Digestif">Dessert & Digestif</option>
                                <option value="Modern Classics">Modern Classics</option>
                                <option value="Punches & Juleps">Punches & Juleps</option>
                            </select>
                        </div>
                    </div>

                    {/* NUTRITION & FLAVOR */}
                    <div className="grid grid-cols-2 gap-3">
                        {draftProfile && (
                            <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-3 flex flex-col items-center gap-2">
                                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                                    <Disc className="w-3 h-3" /> Flavor Profile
                                </h4>
                                <div className="w-32 h-32">
                                    <FlavorWheel userProfile={draftProfile} />
                                </div>
                            </div>
                        )}
                        
                        <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-3 flex flex-col justify-center gap-3">
                            <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Nutrition Est.
                            </h4>
                            <div>
                                <label className="block text-[9px] text-stone-400 font-bold mb-1">Calories</label>
                                <input 
                                    type="number" 
                                    value={draftNutrition.calories} 
                                    onChange={(e) => setDraftNutrition({...draftNutrition, calories: parseInt(e.target.value) || 0})}
                                    className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] text-stone-400 font-bold mb-1">Carbs (g)</label>
                                    <input 
                                        type="number" 
                                        value={draftNutrition.carbs} 
                                        onChange={(e) => setDraftNutrition({...draftNutrition, carbs: parseInt(e.target.value) || 0})}
                                        className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] text-stone-400 font-bold mb-1">ABV (%)</label>
                                    <input 
                                        type="number" 
                                        value={draftNutrition.abv || 0} 
                                        onChange={(e) => setDraftNutrition({...draftNutrition, abv: parseInt(e.target.value) || 0})}
                                        className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-white"
                                    />
                                </div>
                            </div>
                            <p className="text-[8px] text-stone-600 italic leading-tight">
                                *AI estimates. Actual nutrition may vary.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-primary uppercase mb-1">
                                {entryType === 'Order' ? 'Bar / Establishment' : 'Creator / Source'}
                            </label>
                            <input 
                                type="text" 
                                value={draftCreator} 
                                onChange={(e) => setDraftCreator(e.target.value)}
                                placeholder={entryType === 'Order' ? "e.g. Death & Co" : "e.g. @imbibe"}
                                className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-white text-sm focus:border-secondary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-primary uppercase mb-1">Rating</label>
                            <div className="bg-stone-950 border border-stone-700 rounded-lg p-2.5 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setDraftRating(star)}
                                    >
                                        <Star className={`w-5 h-5 ${draftRating >= star ? 'fill-secondary text-secondary' : 'text-stone-600'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-primary uppercase mb-1">Ingredients</label>
                        <div className="bg-stone-950 border border-stone-700 rounded-lg p-3">
                            <ul className="space-y-2 mb-3">
                                {draftIngredients.map((ing, idx) => (
                                    <li key={idx} className="flex justify-between items-center text-xs text-stone-300 bg-stone-900 px-3 py-2 rounded border border-stone-800">
                                        {ing}
                                        <button onClick={() => removeIngredient(idx)} className="text-stone-500 hover:text-red-400">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newIngredient}
                                    onChange={(e) => setNewIngredient(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                                    placeholder="Add ingredient..."
                                    className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-xs text-white outline-none"
                                />
                                <button onClick={addIngredient} type="button" className="bg-stone-700 hover:bg-stone-600 text-white p-2 rounded">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-bold text-primary uppercase mb-1">
                            {entryType === 'Order' ? 'Flavor Summary / Description' : 'Instructions'}
                        </label>
                        <textarea
                            value={draftInstructions}
                            onChange={(e) => setDraftInstructions(e.target.value)}
                            placeholder={entryType === 'Order' ? "Describe the taste..." : "Step 1..."}
                            className="w-full bg-stone-950 border border-stone-700 rounded-lg p-3 text-white text-xs focus:border-secondary outline-none min-h-[100px] resize-none leading-relaxed"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-primary uppercase mb-1">Reference Links</label>
                        <div className="bg-stone-950 border border-stone-700 rounded-lg p-3">
                            {draftLinks.length > 0 && (
                                <ul className="space-y-2 mb-3">
                                    {draftLinks.map((link, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-xs text-stone-300 bg-stone-900 px-3 py-2 rounded border border-stone-800">
                                            <span className="truncate flex-1 mr-2">{link}</span>
                                            <button onClick={() => removeLink(idx)} className="text-stone-500 hover:text-red-400">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newLinkInput}
                                    onChange={(e) => setNewLinkInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addLink()}
                                    placeholder="Paste URL..."
                                    className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-xs text-white outline-none"
                                />
                                <button onClick={addLink} type="button" className="bg-stone-700 hover:bg-stone-600 text-white p-2 rounded">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        {mode === 'review' && (
            <div className="p-4 border-t border-stone-700 bg-stone-900/50">
                 <button 
                    onClick={handleSave}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    {entryType === 'Order' ? 'Log Order' : 'Save Recipe'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default RecipeImporter;