import React, { useMemo, useState } from 'react';
import { FlavorProfile, FlavorDimension } from '../types';
import { FLAVOR_TAXONOMY } from '../shared/flavorTaxonomy';

interface Props {
  recipeId?: number | string;
  baseProfile?: Record<string, number>;
  currentProfile?: Record<string, number>;
  onProfileChange: (profile: FlavorProfile) => void;
  size?: number;
  readOnly?: boolean;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, outerRadius, endAngle);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", start.x, start.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    "Z"
  ].join(" ");
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function getIntensityColor(baseColor: string, value: number, maxValue: number = 10): { fill: string; opacity: number } {
  const intensity = Math.max(0, Math.min(1, value / maxValue));
  const hsl = hexToHsl(baseColor);
  
  const minLightness = 15;
  const maxLightness = hsl.l;
  const lightness = minLightness + (maxLightness - minLightness) * intensity;
  
  const minSaturation = 20;
  const saturation = minSaturation + (hsl.s - minSaturation) * intensity;
  
  const minOpacity = 0.3;
  const opacity = minOpacity + (1 - minOpacity) * intensity;
  
  return {
    fill: `hsl(${hsl.h}, ${saturation}%, ${lightness}%)`,
    opacity
  };
}

const EditableFlavorWheel: React.FC<Props> = ({ 
  recipeId,
  baseProfile,
  currentProfile,
  onProfileChange,
  size = 320,
  readOnly = false
}) => {
  const center = size / 2;
  const innerRingInner = 55;
  const innerRingOuter = 95;
  const outerRingInner = 100;
  const outerRingOuter = size / 2 - 10;
  
  const categoryCount = FLAVOR_TAXONOMY.length;
  const categoryAngle = 360 / categoryCount;
  const gap = 1.5;

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  const profile = currentProfile || baseProfile || {};

  const getCategoryValue = (categoryLabel: string): number => {
    return profile[categoryLabel] || 0;
  };

  const adjustCategoryValue = (categoryLabel: string, delta: number) => {
    if (readOnly) return;
    const currentValue = getCategoryValue(categoryLabel);
    const newValue = Math.max(0, Math.min(10, currentValue + delta));
    
    const newProfile: FlavorProfile = {
      [FlavorDimension.SWEET]: profile['Sweet'] || 0,
      [FlavorDimension.SOUR]: profile['Sour'] || 0,
      [FlavorDimension.BITTER]: profile['Bitter'] || 0,
      [FlavorDimension.BOOZY]: profile['Boozy'] || 0,
      [FlavorDimension.HERBAL]: profile['Herbal'] || 0,
      [FlavorDimension.FRUITY]: profile['Fruity'] || 0,
      [FlavorDimension.SPICY]: profile['Spicy'] || 0,
      [FlavorDimension.SMOKY]: profile['Smoky'] || 0,
    };
    
    newProfile[categoryLabel as FlavorDimension] = newValue;
    onProfileChange(newProfile);
  };

  const handleCategoryClick = (categoryLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const currentValue = getCategoryValue(categoryLabel);
    if (currentValue < 5) {
      adjustCategoryValue(categoryLabel, 3);
    } else if (currentValue < 8) {
      adjustCategoryValue(categoryLabel, 2);
    } else {
      adjustCategoryValue(categoryLabel, -currentValue + 2);
    }
  };

  const handleNoteClick = (categoryLabel: string, noteIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const increment = 2;
    adjustCategoryValue(categoryLabel, increment);
  };

  const segments = useMemo(() => {
    return FLAVOR_TAXONOMY.map((cat, catIndex) => {
      const catStartAngle = catIndex * categoryAngle + gap / 2;
      const catEndAngle = (catIndex + 1) * categoryAngle - gap / 2;
      const catMidAngle = catStartAngle + (categoryAngle - gap) / 2;
      
      const categoryValue = getCategoryValue(cat.label);
      const categoryIntensity = getIntensityColor(cat.color, categoryValue);
      
      const innerLabelPos = polarToCartesian(center, center, (innerRingInner + innerRingOuter) / 2, catMidAngle);
      
      const noteSegments = cat.notes.map((note, noteIndex) => {
        const noteAngleSpan = (categoryAngle - gap) / cat.notes.length;
        const noteStartAngle = catStartAngle + noteIndex * noteAngleSpan + gap / 4;
        const noteEndAngle = catStartAngle + (noteIndex + 1) * noteAngleSpan - gap / 4;
        const noteMidAngle = noteStartAngle + noteAngleSpan / 2;
        
        const noteValue = categoryValue * (0.6 + noteIndex * 0.1);
        const noteIntensity = getIntensityColor(cat.color, noteValue);
        
        const noteLabelPos = polarToCartesian(center, center, (outerRingInner + outerRingOuter) / 2, noteMidAngle);
        
        return {
          ...note,
          categoryId: cat.id,
          categoryLabel: cat.label,
          noteIndex,
          startAngle: noteStartAngle,
          endAngle: noteEndAngle,
          midAngle: noteMidAngle,
          value: noteValue,
          intensity: noteIntensity,
          labelPos: noteLabelPos,
          baseColor: cat.color,
        };
      });

      return {
        ...cat,
        startAngle: catStartAngle,
        endAngle: catEndAngle,
        midAngle: catMidAngle,
        value: categoryValue,
        intensity: categoryIntensity,
        labelPos: innerLabelPos,
        notes: noteSegments,
      };
    });
  }, [profile, center, categoryAngle]);

  const activeCategories = segments
    .filter(s => s.value >= 4)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          <defs>
            {segments.map((cat) => (
              <filter key={`glow-${cat.id}`} id={`glow-${cat.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={cat.value > 5 ? 2 : 0} result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            ))}
          </defs>
          
          <circle cx={center} cy={center} r={outerRingOuter} fill="#1c1917" />
          
          {segments.map((cat) => (
            <g key={cat.id}>
              {cat.notes.map((note) => (
                <g 
                  key={note.id} 
                  className={readOnly ? '' : 'cursor-pointer'}
                  onClick={(e) => handleNoteClick(cat.label, note.noteIndex, e)}
                  onMouseEnter={() => setHoveredNote(note.id)}
                  onMouseLeave={() => setHoveredNote(null)}
                >
                  <path
                    d={describeArc(center, center, outerRingInner, outerRingOuter, note.startAngle, note.endAngle)}
                    fill={note.intensity.fill}
                    stroke="#0c0a09"
                    strokeWidth="1"
                    className="transition-all duration-300"
                    style={{ 
                      opacity: note.intensity.opacity,
                      filter: hoveredNote === note.id ? 'brightness(1.3)' : undefined
                    }}
                  />
                  <text
                    x={note.labelPos.x}
                    y={note.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={note.value > 5 ? '#1c1917' : '#a8a29e'}
                    fontSize="7"
                    fontWeight={note.value > 5 ? '700' : '500'}
                    className="pointer-events-none select-none transition-all duration-300"
                    style={{ opacity: Math.max(0.5, note.intensity.opacity) }}
                    transform={`rotate(${note.midAngle > 90 && note.midAngle < 270 ? note.midAngle + 180 : note.midAngle}, ${note.labelPos.x}, ${note.labelPos.y})`}
                  >
                    {note.label}
                  </text>
                </g>
              ))}
              
              <g 
                className={readOnly ? '' : 'cursor-pointer'}
                onClick={(e) => handleCategoryClick(cat.label, e)}
                onMouseEnter={() => setHoveredCategory(cat.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <path
                  d={describeArc(center, center, innerRingInner, innerRingOuter, cat.startAngle, cat.endAngle)}
                  fill={cat.intensity.fill}
                  stroke="#0c0a09"
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                  style={{ 
                    opacity: cat.intensity.opacity,
                    filter: cat.value > 5 ? `url(#glow-${cat.id})` : undefined
                  }}
                />
                <text
                  x={cat.labelPos.x}
                  y={cat.labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={cat.value > 5 ? '#1c1917' : '#a8a29e'}
                  fontSize="9"
                  fontWeight="700"
                  className="pointer-events-none select-none transition-all duration-300"
                  style={{ opacity: Math.max(0.6, cat.intensity.opacity) }}
                  transform={`rotate(${cat.midAngle > 90 && cat.midAngle < 270 ? cat.midAngle + 180 : cat.midAngle}, ${cat.labelPos.x}, ${cat.labelPos.y})`}
                >
                  {cat.label}
                </text>
                
                {hoveredCategory === cat.id && (
                  <text
                    x={cat.labelPos.x}
                    y={cat.labelPos.y + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fbbf24"
                    fontSize="8"
                    fontWeight="700"
                    className="pointer-events-none select-none"
                    transform={`rotate(${cat.midAngle > 90 && cat.midAngle < 270 ? cat.midAngle + 180 : cat.midAngle}, ${cat.labelPos.x}, ${cat.labelPos.y + 12})`}
                  >
                    {cat.value.toFixed(0)}
                  </text>
                )}
              </g>
            </g>
          ))}
          
          <circle cx={center} cy={center} r={innerRingInner - 5} fill="#1c1917" stroke="#292524" strokeWidth="2" />
          
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#a8a29e"
            fontSize="9"
            className="pointer-events-none select-none uppercase tracking-wider"
          >
            Flavor
          </text>
          <text
            x={center}
            y={center + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f5f5f4"
            fontSize="11"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            Intensity
          </text>
        </svg>
      </div>
      
      <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-xs">
        {activeCategories.map((cat) => (
          <span 
            key={cat.id}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1"
            style={{ 
              backgroundColor: cat.intensity.fill, 
              color: cat.value > 5 ? '#1c1917' : '#f5f5f4',
              opacity: cat.intensity.opacity
            }}
          >
            {cat.label}
            <span className="font-bold">{cat.value.toFixed(0)}</span>
          </span>
        ))}
        {activeCategories.length === 0 && (
          <span className="text-xs text-stone-500">
            {readOnly ? 'No strong flavors' : 'Tap to adjust flavor intensity'}
          </span>
        )}
      </div>
      
      {!readOnly && (
        <p className="text-[10px] text-stone-500 mt-2 text-center max-w-xs">
          Tap categories to boost • Brightness shows intensity (0-10)
        </p>
      )}
    </div>
  );
};

export default EditableFlavorWheel;
