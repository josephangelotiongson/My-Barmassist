import React from 'react';
import { X, Info, Zap, BarChart3, ScanLine, Brain, Star } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HowItWorksModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 flex flex-col max-h-[90dvh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-secondary" />
                How Barmassist Works
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Intro */}
            <div className="space-y-2">
                <p className="text-stone-300 text-sm leading-relaxed">
                    My Barmassist is an AI-powered mixology companion that evolves with your taste. It doesn't just list recipes; it understands flavor at a molecular level to provide personalized <strong>recommendations</strong>.
                </p>
            </div>

            {/* 1. Flavor Profiling */}
            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    The Flavor Scale (0-10)
                </h3>
                <p className="text-xs text-stone-400 mb-4">
                    Every drink is analyzed by our Mixologist Agent and scored on 8 dimensions.
                </p>
                <ul className="space-y-3">
                    <li className="text-xs text-stone-300">
                        <span className="font-bold text-secondary">Sweet:</span> 0 (Bone Dry Martini) to 10 (Liqueur Heavy).
                    </li>
                    <li className="text-xs text-stone-300">
                        <span className="font-bold text-secondary">Sour:</span> 0 (Manhattan) to 10 (Vinegar/Shrub).
                    </li>
                    <li className="text-xs text-stone-300">
                        <span className="font-bold text-secondary">Bitter:</span> 0 (None) to 5 (Negroni) to 10 (Malort).
                    </li>
                    <li className="text-xs text-stone-300">
                        <span className="font-bold text-secondary">Boozy:</span> 0 (Mocktail) to 10 (Cask Strength).
                    </li>
                </ul>
            </div>

            {/* 2. Palate Learning */}
            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-accent" />
                    How It Learns
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed mb-2">
                    Your <strong>Palate Profile</strong> (the red shape on the chart) is a weighted average of your history.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-400">
                    <div className="bg-stone-800 p-2 rounded border border-stone-700">
                        <Star className="w-3 h-3 text-secondary mb-1 fill-secondary" />
                        <span className="font-bold text-white">5 Stars</span> = Strong Influence (3x)
                    </div>
                    <div className="bg-stone-800 p-2 rounded border border-stone-700">
                        <Star className="w-3 h-3 text-stone-500 mb-1" />
                        <span className="font-bold text-white">1-2 Stars</span> = Ignored
                    </div>
                </div>
            </div>

            {/* 3. Match Scoring */}
            <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Match Score Logic
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                    When recommending drinks or scanning a menu, the <span className="font-bold text-green-400">Match %</span> is calculated based on:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-stone-400">
                    <li>Overlap with your Flavor Profile.</li>
                    <li>Availability of ingredients in your Pantry.</li>
                    <li>Historical preferences (e.g. liking Agave spirits).</li>
                </ul>
            </div>

             {/* 4. Vision */}
             <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-blue-400" />
                    AI Vision
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                    The app uses computer vision to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-stone-400">
                    <li>Digitize physical menus and cross-reference them with your palate.</li>
                    <li>Recognize bottles in your cabinet to auto-fill your pantry.</li>
                    <li>Generate visualizations for recipes that lack photos.</li>
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