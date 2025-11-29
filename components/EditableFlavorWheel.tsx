import React, { useMemo, useState, useCallback } from 'react';
import { FlavorProfile, FlavorDimension } from '../types';
import { FLAVOR_TAXONOMY } from '../shared/flavorTaxonomy';

export interface NoteProfile {
  [noteId: string]: number;
}

interface Props {
  recipeId?: number | string;
  baseProfile?: Record<string, number>;
  currentProfile?: Record<string, number>;
  noteProfile?: NoteProfile;
  onProfileChange: (profile: FlavorProfile, noteProfile?: NoteProfile) => void;
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
  noteProfile: externalNoteProfile,
  onProfileChange,
  size = 320,
  readOnly = false
}) => {
  const center = size / 2;
  const innerRingInner = 55;
  const innerRingOuter = 95;
  const outerRingInner = 100;
  const outerRingOuter = size / 2 - 35;
  const labelRadius = size / 2 - 8;
  
  const categoryCount = FLAVOR_TAXONOMY.length;
  const categoryAngle = 360 / categoryCount;
  const gap = 1.5;

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  const profile = currentProfile || baseProfile || {};
  
  const noteProfile = useMemo(() => {
    if (externalNoteProfile && Object.keys(externalNoteProfile).length > 0) {
      return externalNoteProfile;
    }
    const derived: NoteProfile = {};
    FLAVOR_TAXONOMY.forEach(cat => {
      const catValue = profile[cat.label] || 0;
      cat.notes.forEach((note) => {
        derived[note.id] = catValue;
      });
    });
    return derived;
  }, [externalNoteProfile, profile]);

  const getCategoryValue = useCallback((categoryLabel: string): number => {
    return profile[categoryLabel] || 0;
  }, [profile]);

  const getNoteValue = useCallback((noteId: string): number => {
    return noteProfile[noteId] || 0;
  }, [noteProfile]);

  const getCategoryFromNotes = useCallback((categoryId: string): number => {
    const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
    if (!cat) return 0;
    const noteValues = cat.notes.map(n => noteProfile[n.id] || 0);
    const maxVal = Math.max(...noteValues);
    const avgVal = noteValues.reduce((a, b) => a + b, 0) / noteValues.length;
    return Math.round((maxVal * 0.7 + avgVal * 0.3) * 10) / 10;
  }, [noteProfile]);

  const buildNewProfiles = useCallback((newNoteProfile: NoteProfile): { categoryProfile: FlavorProfile; noteProfile: NoteProfile } => {
    const categoryProfile: FlavorProfile = {
      [FlavorDimension.SWEET]: 0,
      [FlavorDimension.SOUR]: 0,
      [FlavorDimension.BITTER]: 0,
      [FlavorDimension.BOOZY]: 0,
      [FlavorDimension.HERBAL]: 0,
      [FlavorDimension.FRUITY]: 0,
      [FlavorDimension.SPICY]: 0,
      [FlavorDimension.SMOKY]: 0,
    };

    FLAVOR_TAXONOMY.forEach(cat => {
      const noteValues = cat.notes.map(n => newNoteProfile[n.id] || 0);
      const maxVal = Math.max(...noteValues);
      const avgVal = noteValues.reduce((a, b) => a + b, 0) / noteValues.length;
      categoryProfile[cat.label as FlavorDimension] = Math.round((maxVal * 0.7 + avgVal * 0.3) * 10) / 10;
    });

    return { categoryProfile, noteProfile: newNoteProfile };
  }, []);

  const adjustNoteValue = useCallback((noteId: string, delta: number) => {
    if (readOnly) return;
    const currentValue = getNoteValue(noteId);
    const newValue = Math.max(0, Math.min(10, currentValue + delta));
    
    const newNoteProfile = { ...noteProfile, [noteId]: newValue };
    const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
    onProfileChange(categoryProfile, updatedNotes);
  }, [readOnly, getNoteValue, noteProfile, buildNewProfiles, onProfileChange]);

  const adjustCategoryValue = useCallback((categoryId: string, delta: number) => {
    if (readOnly) return;
    const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
    if (!cat) return;

    const newNoteProfile = { ...noteProfile };
    cat.notes.forEach(note => {
      const currentValue = noteProfile[note.id] || 0;
      newNoteProfile[note.id] = Math.max(0, Math.min(10, currentValue + delta));
    });

    const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
    onProfileChange(categoryProfile, updatedNotes);
  }, [readOnly, noteProfile, buildNewProfiles, onProfileChange]);

  const handleCategoryClick = useCallback((categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const currentValue = getCategoryFromNotes(categoryId);
    if (currentValue < 4) {
      adjustCategoryValue(categoryId, 3);
    } else if (currentValue < 7) {
      adjustCategoryValue(categoryId, 2);
    } else {
      const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
      if (cat) {
        const newNoteProfile = { ...noteProfile };
        cat.notes.forEach(note => {
          newNoteProfile[note.id] = 1;
        });
        const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
        onProfileChange(categoryProfile, updatedNotes);
      }
    }
  }, [readOnly, getCategoryFromNotes, adjustCategoryValue, noteProfile, buildNewProfiles, onProfileChange]);

  const handleNoteClick = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const currentValue = getNoteValue(noteId);
    if (currentValue < 4) {
      adjustNoteValue(noteId, 3);
    } else if (currentValue < 7) {
      adjustNoteValue(noteId, 2);
    } else {
      adjustNoteValue(noteId, -currentValue + 1);
    }
  }, [readOnly, getNoteValue, adjustNoteValue]);

  const segments = useMemo(() => {
    return FLAVOR_TAXONOMY.map((cat, catIndex) => {
      const catStartAngle = catIndex * categoryAngle + gap / 2;
      const catEndAngle = (catIndex + 1) * categoryAngle - gap / 2;
      const catMidAngle = catStartAngle + (categoryAngle - gap) / 2;
      
      const categoryValue = getCategoryFromNotes(cat.id);
      const categoryIntensity = getIntensityColor(cat.color, categoryValue);
      
      const innerLabelPos = polarToCartesian(center, center, (innerRingInner + innerRingOuter) / 2, catMidAngle);
      
      const noteSegments = cat.notes.map((note, noteIndex) => {
        const noteAngleSpan = (categoryAngle - gap) / cat.notes.length;
        const noteStartAngle = catStartAngle + noteIndex * noteAngleSpan + gap / 4;
        const noteEndAngle = catStartAngle + (noteIndex + 1) * noteAngleSpan - gap / 4;
        const noteMidAngle = noteStartAngle + noteAngleSpan / 2;
        
        const noteValue = getNoteValue(note.id);
        const noteIntensity = getIntensityColor(cat.color, noteValue);
        
        const outerLabelPos = polarToCartesian(center, center, labelRadius, noteMidAngle);
        
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
          labelPos: outerLabelPos,
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
  }, [noteProfile, center, categoryAngle, getCategoryFromNotes, getNoteValue, labelRadius]);

  const activeCategories = segments
    .filter(s => s.value >= 3)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const activeNotes = useMemo(() => {
    const allNotes = segments.flatMap(s => s.notes);
    return allNotes
      .filter(n => n.value >= 4)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [segments]);

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
          
          <circle cx={center} cy={center} r={outerRingOuter + 2} fill="#1c1917" />
          
          {segments.map((cat) => (
            <g key={cat.id}>
              {cat.notes.map((note) => (
                <g 
                  key={note.id} 
                  className={readOnly ? '' : 'cursor-pointer'}
                  onClick={(e) => handleNoteClick(note.id, e)}
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
                    textAnchor={note.midAngle > 180 ? "end" : note.midAngle < 180 && note.midAngle > 0 ? "start" : "middle"}
                    dominantBaseline="middle"
                    fill={note.value > 5 ? cat.color : '#78716c'}
                    fontSize="8"
                    fontWeight={note.value > 5 ? '700' : '500'}
                    className="pointer-events-none select-none transition-all duration-300"
                    style={{ opacity: Math.max(0.6, note.intensity.opacity) }}
                    transform={`rotate(${note.midAngle > 90 && note.midAngle < 270 ? note.midAngle + 180 : note.midAngle}, ${note.labelPos.x}, ${note.labelPos.y})`}
                  >
                    {note.label}
                  </text>
                  
                  {hoveredNote === note.id && (
                    <text
                      x={note.labelPos.x}
                      y={note.labelPos.y + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fbbf24"
                      fontSize="7"
                      fontWeight="700"
                      className="pointer-events-none select-none"
                      transform={`rotate(${note.midAngle > 90 && note.midAngle < 270 ? note.midAngle + 180 : note.midAngle}, ${note.labelPos.x}, ${note.labelPos.y + 10})`}
                    >
                      {note.value.toFixed(1)}
                    </text>
                  )}
                </g>
              ))}
              
              <g 
                className={readOnly ? '' : 'cursor-pointer'}
                onClick={(e) => handleCategoryClick(cat.id, e)}
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
                    {cat.value.toFixed(1)}
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
            Wheel
          </text>
        </svg>
      </div>
      
      <div className="mt-2 flex flex-wrap justify-center gap-1 max-w-xs">
        {activeNotes.length > 0 ? (
          activeNotes.map((note) => (
            <span 
              key={note.id}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5"
              style={{ 
                backgroundColor: note.intensity.fill, 
                color: note.value > 5 ? '#1c1917' : '#f5f5f4',
                opacity: note.intensity.opacity
              }}
            >
              {note.label}
              <span className="font-bold">{note.value.toFixed(0)}</span>
            </span>
          ))
        ) : activeCategories.length > 0 ? (
          activeCategories.map((cat) => (
            <span 
              key={cat.id}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5"
              style={{ 
                backgroundColor: cat.intensity.fill, 
                color: cat.value > 5 ? '#1c1917' : '#f5f5f4',
                opacity: cat.intensity.opacity
              }}
            >
              {cat.label}
              <span className="font-bold">{cat.value.toFixed(0)}</span>
            </span>
          ))
        ) : (
          <span className="text-xs text-stone-500">
            {readOnly ? 'No strong flavors' : 'Tap to adjust flavors'}
          </span>
        )}
      </div>
      
      {!readOnly && (
        <p className="text-[10px] text-stone-500 mt-1.5 text-center max-w-xs">
          Outer ring: fine flavors | Inner ring: categories | Tap to boost
        </p>
      )}
    </div>
  );
};

export default EditableFlavorWheel;
