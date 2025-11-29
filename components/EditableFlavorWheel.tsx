import React, { useMemo, useState, useCallback } from 'react';
import { FlavorProfile, FlavorDimension } from '../types';
import { FLAVOR_TAXONOMY, FlavorCategory, FlavorSubcategory, FlavorNote } from '../shared/flavorTaxonomy';

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
  const safeValue = isNaN(value) ? 0 : value;
  const intensity = Math.max(0, Math.min(1, safeValue / maxValue));
  const hsl = hexToHsl(baseColor);
  
  const minLightness = 12;
  const maxLightness = hsl.l;
  const lightness = minLightness + (maxLightness - minLightness) * intensity;
  
  const minSaturation = 15;
  const saturation = minSaturation + (hsl.s - minSaturation) * intensity;
  
  const minOpacity = 0.25;
  const opacity = minOpacity + (1 - minOpacity) * intensity;
  
  return {
    fill: `hsl(${hsl.h}, ${saturation}%, ${lightness}%)`,
    opacity: isNaN(opacity) ? 0.25 : opacity
  };
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  'sweet': 'Sweet',
  'fruity': 'Fruity',
  'floral': 'Floral',
  'herbal': 'Herbal',
  'spicy': 'Spicy',
  'earthy': 'Earthy',
  'sour': 'Sour',
  'boozy': 'Boozy',
};

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
  const innerRingInner = 40;
  const innerRingOuter = 65;
  const middleRingInner = 68;
  const middleRingOuter = 95;
  const outerRingInner = 98;
  const outerRingOuter = size / 2 - 55;
  const labelRadius = size / 2 - 45;
  
  const categoryCount = FLAVOR_TAXONOMY.length;
  const categoryAngle = 360 / categoryCount;
  const gap = 1.2;

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);

  const profile = currentProfile || baseProfile || {};
  
  const noteProfile = useMemo(() => {
    if (externalNoteProfile && Object.keys(externalNoteProfile).length > 0) {
      return externalNoteProfile;
    }
    const derived: NoteProfile = {};
    FLAVOR_TAXONOMY.forEach(cat => {
      const catValue = profile[CATEGORY_LABEL_MAP[cat.id] || cat.label] || 0;
      cat.subcategories.forEach(sub => {
        sub.notes.forEach((note) => {
          derived[note.id] = catValue;
        });
      });
    });
    return derived;
  }, [externalNoteProfile, profile]);

  const getNoteValue = useCallback((noteId: string): number => {
    return noteProfile[noteId] || 0;
  }, [noteProfile]);

  const getSubcategoryValue = useCallback((subcategoryId: string): number => {
    const cat = FLAVOR_TAXONOMY.find(c => 
      c.subcategories.some(s => s.id === subcategoryId)
    );
    if (!cat) return 0;
    const sub = cat.subcategories.find(s => s.id === subcategoryId);
    if (!sub) return 0;
    
    const noteValues = sub.notes.map(n => noteProfile[n.id] || 0);
    if (noteValues.length === 0) return 0;
    const maxVal = Math.max(...noteValues);
    const avgVal = noteValues.reduce((a, b) => a + b, 0) / noteValues.length;
    return Math.round((maxVal * 0.7 + avgVal * 0.3) * 10) / 10;
  }, [noteProfile]);

  const getCategoryValue = useCallback((categoryId: string): number => {
    const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
    if (!cat) return 0;
    
    const subValues = cat.subcategories.map(s => getSubcategoryValue(s.id));
    if (subValues.length === 0) return 0;
    const maxVal = Math.max(...subValues);
    const avgVal = subValues.reduce((a, b) => a + b, 0) / subValues.length;
    return Math.round((maxVal * 0.7 + avgVal * 0.3) * 10) / 10;
  }, [getSubcategoryValue]);

  const buildNewProfiles = useCallback((newNoteProfile: NoteProfile): { categoryProfile: FlavorProfile; noteProfile: NoteProfile } => {
    const categoryProfile: FlavorProfile = {
      [FlavorDimension.SWEET]: 0,
      [FlavorDimension.FRUITY]: 0,
      [FlavorDimension.FLORAL]: 0,
      [FlavorDimension.HERBAL]: 0,
      [FlavorDimension.SPICY]: 0,
      [FlavorDimension.EARTHY]: 0,
      [FlavorDimension.SOUR]: 0,
      [FlavorDimension.BOOZY]: 0,
    };

    FLAVOR_TAXONOMY.forEach(cat => {
      let totalNotes = 0;
      let noteSum = 0;
      let maxVal = 0;
      
      cat.subcategories.forEach(sub => {
        sub.notes.forEach(note => {
          const val = newNoteProfile[note.id] || 0;
          noteSum += val;
          totalNotes++;
          if (val > maxVal) maxVal = val;
        });
      });
      
      const avgVal = totalNotes > 0 ? noteSum / totalNotes : 0;
      const catValue = Math.round((maxVal * 0.7 + avgVal * 0.3) * 10) / 10;
      
      const labelKey = CATEGORY_LABEL_MAP[cat.id];
      if (labelKey && labelKey in categoryProfile) {
        categoryProfile[labelKey as FlavorDimension] = catValue;
      }
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

  const adjustSubcategoryValue = useCallback((subcategoryId: string, delta: number) => {
    if (readOnly) return;
    const cat = FLAVOR_TAXONOMY.find(c => c.subcategories.some(s => s.id === subcategoryId));
    if (!cat) return;
    const sub = cat.subcategories.find(s => s.id === subcategoryId);
    if (!sub) return;

    const newNoteProfile = { ...noteProfile };
    sub.notes.forEach(note => {
      const currentValue = noteProfile[note.id] || 0;
      newNoteProfile[note.id] = Math.max(0, Math.min(10, currentValue + delta));
    });

    const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
    onProfileChange(categoryProfile, updatedNotes);
  }, [readOnly, noteProfile, buildNewProfiles, onProfileChange]);

  const adjustCategoryValue = useCallback((categoryId: string, delta: number) => {
    if (readOnly) return;
    const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
    if (!cat) return;

    const newNoteProfile = { ...noteProfile };
    cat.subcategories.forEach(sub => {
      sub.notes.forEach(note => {
        const currentValue = noteProfile[note.id] || 0;
        newNoteProfile[note.id] = Math.max(0, Math.min(10, currentValue + delta));
      });
    });

    const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
    onProfileChange(categoryProfile, updatedNotes);
  }, [readOnly, noteProfile, buildNewProfiles, onProfileChange]);

  const handleCategoryClick = useCallback((categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const currentValue = getCategoryValue(categoryId);
    if (currentValue < 4) {
      adjustCategoryValue(categoryId, 3);
    } else if (currentValue < 7) {
      adjustCategoryValue(categoryId, 2);
    } else {
      const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
      if (cat) {
        const newNoteProfile = { ...noteProfile };
        cat.subcategories.forEach(sub => {
          sub.notes.forEach(note => {
            newNoteProfile[note.id] = 1;
          });
        });
        const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
        onProfileChange(categoryProfile, updatedNotes);
      }
    }
  }, [readOnly, getCategoryValue, adjustCategoryValue, noteProfile, buildNewProfiles, onProfileChange]);

  const handleSubcategoryClick = useCallback((subcategoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const currentValue = getSubcategoryValue(subcategoryId);
    if (currentValue < 4) {
      adjustSubcategoryValue(subcategoryId, 3);
    } else if (currentValue < 7) {
      adjustSubcategoryValue(subcategoryId, 2);
    } else {
      const cat = FLAVOR_TAXONOMY.find(c => c.subcategories.some(s => s.id === subcategoryId));
      if (cat) {
        const sub = cat.subcategories.find(s => s.id === subcategoryId);
        if (sub) {
          const newNoteProfile = { ...noteProfile };
          sub.notes.forEach(note => {
            newNoteProfile[note.id] = 1;
          });
          const { categoryProfile, noteProfile: updatedNotes } = buildNewProfiles(newNoteProfile);
          onProfileChange(categoryProfile, updatedNotes);
        }
      }
    }
  }, [readOnly, getSubcategoryValue, adjustSubcategoryValue, noteProfile, buildNewProfiles, onProfileChange]);

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
      
      const categoryValue = getCategoryValue(cat.id);
      const categoryIntensity = getIntensityColor(cat.color, categoryValue);
      
      const innerLabelPos = polarToCartesian(center, center, (innerRingInner + innerRingOuter) / 2, catMidAngle);
      
      const subcategoryCount = cat.subcategories.length;
      const subcategoryAngleSpan = (categoryAngle - gap) / subcategoryCount;
      
      const subcategorySegments = cat.subcategories.map((sub, subIndex) => {
        const subStartAngle = catStartAngle + subIndex * subcategoryAngleSpan + gap / 4;
        const subEndAngle = catStartAngle + (subIndex + 1) * subcategoryAngleSpan - gap / 4;
        const subMidAngle = subStartAngle + subcategoryAngleSpan / 2;
        
        const subValue = getSubcategoryValue(sub.id);
        const subIntensity = getIntensityColor(cat.color, subValue);
        
        const subLabelPos = polarToCartesian(center, center, (middleRingInner + middleRingOuter) / 2, subMidAngle);
        
        const noteCount = sub.notes.length;
        const noteAngleSpan = (subEndAngle - subStartAngle - gap / 4) / noteCount;
        
        const noteSegments = sub.notes.map((note, noteIndex) => {
          const noteStartAngle = subStartAngle + noteIndex * noteAngleSpan + gap / 6;
          const noteEndAngle = subStartAngle + (noteIndex + 1) * noteAngleSpan - gap / 6;
          const noteMidAngle = noteStartAngle + noteAngleSpan / 2;
          
          const noteValue = getNoteValue(note.id);
          const noteIntensity = getIntensityColor(cat.color, noteValue);
          
          const noteLabelPos = polarToCartesian(center, center, labelRadius, noteMidAngle);
          
          return {
            ...note,
            categoryId: cat.id,
            subcategoryId: sub.id,
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
          ...sub,
          categoryId: cat.id,
          subIndex,
          startAngle: subStartAngle,
          endAngle: subEndAngle,
          midAngle: subMidAngle,
          value: subValue,
          intensity: subIntensity,
          labelPos: subLabelPos,
          notes: noteSegments,
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
        subcategories: subcategorySegments,
      };
    });
  }, [noteProfile, center, categoryAngle, getCategoryValue, getSubcategoryValue, getNoteValue, labelRadius]);

  const activeCategories = segments
    .filter(s => s.value >= 3)
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
          
          <circle cx={center} cy={center} r={outerRingOuter + 2} fill="#1c1917" />
          
          {segments.map((cat) => (
            <g key={cat.id}>
              {cat.subcategories.map((sub) => (
                <g key={sub.id}>
                  {sub.notes.map((note) => (
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
                        strokeWidth="0.5"
                        className="transition-all duration-300"
                        style={{ 
                          opacity: note.intensity.opacity,
                          filter: hoveredNote === note.id ? 'brightness(1.4)' : undefined
                        }}
                      />
                      
                      {(() => {
                        const isRightSide = note.midAngle < 90 || note.midAngle > 270;
                        const rotationAngle = note.midAngle - 90;
                        const adjustedRotation = isRightSide ? rotationAngle : rotationAngle + 180;
                        
                        return (
                          <>
                            <text
                              x={note.labelPos.x}
                              y={note.labelPos.y}
                              textAnchor={isRightSide ? "start" : "end"}
                              dominantBaseline="middle"
                              fill={note.value > 5 ? cat.color : '#78716c'}
                              fontSize="6.5"
                              fontWeight={note.value > 5 ? '600' : '400'}
                              className="pointer-events-none select-none transition-all duration-300"
                              style={{ opacity: Math.max(0.5, note.intensity.opacity) }}
                              transform={`rotate(${adjustedRotation}, ${note.labelPos.x}, ${note.labelPos.y})`}
                            >
                              {note.label}
                            </text>
                            
                            {hoveredNote === note.id && (
                              <text
                                x={note.labelPos.x}
                                y={note.labelPos.y}
                                textAnchor={isRightSide ? "start" : "end"}
                                dominantBaseline="middle"
                                fill="#fbbf24"
                                fontSize="6"
                                fontWeight="700"
                                className="pointer-events-none select-none"
                                dx={isRightSide ? "40" : "-40"}
                                transform={`rotate(${adjustedRotation}, ${note.labelPos.x}, ${note.labelPos.y})`}
                              >
                                {note.value.toFixed(1)}
                              </text>
                            )}
                          </>
                        );
                      })()}
                    </g>
                  ))}
                  
                  <g 
                    className={readOnly ? '' : 'cursor-pointer'}
                    onClick={(e) => handleSubcategoryClick(sub.id, e)}
                    onMouseEnter={() => setHoveredSubcategory(sub.id)}
                    onMouseLeave={() => setHoveredSubcategory(null)}
                  >
                    <path
                      d={describeArc(center, center, middleRingInner, middleRingOuter, sub.startAngle, sub.endAngle)}
                      fill={sub.intensity.fill}
                      stroke="#0c0a09"
                      strokeWidth="0.75"
                      className="transition-all duration-300"
                      style={{ 
                        opacity: sub.intensity.opacity,
                        filter: hoveredSubcategory === sub.id ? 'brightness(1.3)' : undefined
                      }}
                    />
                    <text
                      x={sub.labelPos.x}
                      y={sub.labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={sub.value > 5 ? '#1c1917' : '#a8a29e'}
                      fontSize="7"
                      fontWeight="600"
                      className="pointer-events-none select-none transition-all duration-300"
                      style={{ opacity: Math.max(0.5, sub.intensity.opacity) }}
                      transform={`rotate(${sub.midAngle > 90 && sub.midAngle < 270 ? sub.midAngle + 180 : sub.midAngle}, ${sub.labelPos.x}, ${sub.labelPos.y})`}
                    >
                      {sub.label}
                    </text>
                    
                    {hoveredSubcategory === sub.id && (
                      <text
                        x={sub.labelPos.x}
                        y={sub.labelPos.y + 9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#fbbf24"
                        fontSize="6"
                        fontWeight="700"
                        className="pointer-events-none select-none"
                        transform={`rotate(${sub.midAngle > 90 && sub.midAngle < 270 ? sub.midAngle + 180 : sub.midAngle}, ${sub.labelPos.x}, ${sub.labelPos.y + 9})`}
                      >
                        {sub.value.toFixed(1)}
                      </text>
                    )}
                  </g>
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
                  strokeWidth="1"
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
                  fontSize="8"
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
                    y={cat.labelPos.y + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fbbf24"
                    fontSize="7"
                    fontWeight="700"
                    className="pointer-events-none select-none"
                    transform={`rotate(${cat.midAngle > 90 && cat.midAngle < 270 ? cat.midAngle + 180 : cat.midAngle}, ${cat.labelPos.x}, ${cat.labelPos.y + 10})`}
                  >
                    {cat.value.toFixed(1)}
                  </text>
                )}
              </g>
            </g>
          ))}
          
          <circle cx={center} cy={center} r={innerRingInner - 3} fill="#1c1917" stroke="#292524" strokeWidth="1.5" />
          
          <text
            x={center}
            y={center - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#78716c"
            fontSize="7"
            className="pointer-events-none select-none uppercase tracking-wider"
          >
            Flavor
          </text>
          <text
            x={center}
            y={center + 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#d6d3d1"
            fontSize="8"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            Wheel
          </text>
        </svg>
      </div>
      
      <div className="mt-2 flex flex-wrap justify-center gap-1 max-w-xs">
        {activeCategories.length > 0 ? (
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
        <p className="text-[9px] text-stone-500 mt-1.5 text-center max-w-xs">
          3 rings: Categories | Subcategories | Notes
        </p>
      )}
    </div>
  );
};

export default EditableFlavorWheel;
