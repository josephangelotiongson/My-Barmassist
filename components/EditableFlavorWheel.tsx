import React, { useMemo, useState, useEffect } from 'react';
import { FlavorProfile, FlavorDimension } from '../types';
import { FLAVOR_TAXONOMY, FlavorSelection, createEmptySelection, selectionToFlavorProfile, getSelectedLabels } from '../shared/flavorTaxonomy';

function profileToSelection(profile: FlavorProfile): FlavorSelection {
  const sel = createEmptySelection();
  const SIGNIFICANCE_THRESHOLD = 4;
  
  Object.entries(profile).forEach(([key, value]) => {
    if (typeof value === 'number' && value >= SIGNIFICANCE_THRESHOLD) {
      const cat = FLAVOR_TAXONOMY.find(c => c.label === key);
      if (cat) {
        sel.categories.add(cat.id);
      }
    }
  });
  return sel;
}

interface Props {
  profile: FlavorProfile;
  originalProfile?: FlavorProfile;
  onProfileChange: (profile: FlavorProfile) => void;
  size?: number;
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

const EditableFlavorWheel: React.FC<Props> = ({ 
  profile, 
  onProfileChange, 
  size = 320 
}) => {
  const center = size / 2;
  const innerRingInner = 55;
  const innerRingOuter = 95;
  const outerRingInner = 100;
  const outerRingOuter = size / 2 - 10;
  
  const categoryCount = FLAVOR_TAXONOMY.length;
  const categoryAngle = 360 / categoryCount;
  const gap = 1.5;

  const [selection, setSelection] = useState<FlavorSelection>(() => profileToSelection(profile));

  useEffect(() => {
    setSelection(profileToSelection(profile));
  }, [profile]);

  const updateProfile = (newSelection: FlavorSelection) => {
    setSelection(newSelection);
    const newProfile = selectionToFlavorProfile(newSelection);
    onProfileChange(newProfile as unknown as FlavorProfile);
  };

  const toggleCategory = (categoryId: string) => {
    const newSelection: FlavorSelection = {
      categories: new Set<string>(selection.categories),
      notes: new Set<string>(selection.notes),
    };
    
    if (newSelection.categories.has(categoryId)) {
      newSelection.categories.delete(categoryId);
      const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
      if (cat) {
        cat.notes.forEach(n => newSelection.notes.delete(n.id));
      }
    } else {
      newSelection.categories.add(categoryId);
    }
    
    updateProfile(newSelection);
  };

  const toggleNote = (noteId: string, categoryId: string) => {
    const newSelection: FlavorSelection = {
      categories: new Set<string>(selection.categories),
      notes: new Set<string>(selection.notes),
    };
    
    if (newSelection.notes.has(noteId)) {
      newSelection.notes.delete(noteId);
      const cat = FLAVOR_TAXONOMY.find(c => c.id === categoryId);
      if (cat) {
        const hasOtherNotes = cat.notes.some(n => n.id !== noteId && newSelection.notes.has(n.id));
        if (!hasOtherNotes && !newSelection.categories.has(categoryId)) {
        }
      }
    } else {
      newSelection.notes.add(noteId);
      newSelection.categories.add(categoryId);
    }
    
    updateProfile(newSelection);
  };

  const segments = useMemo(() => {
    return FLAVOR_TAXONOMY.map((cat, catIndex) => {
      const catStartAngle = catIndex * categoryAngle + gap / 2;
      const catEndAngle = (catIndex + 1) * categoryAngle - gap / 2;
      const catMidAngle = catStartAngle + (categoryAngle - gap) / 2;
      
      const isCategorySelected = selection.categories.has(cat.id);
      const hasSelectedNotes = cat.notes.some(n => selection.notes.has(n.id));
      
      const innerLabelPos = polarToCartesian(center, center, (innerRingInner + innerRingOuter) / 2, catMidAngle);
      
      const noteSegments = cat.notes.map((note, noteIndex) => {
        const noteAngleSpan = (categoryAngle - gap) / cat.notes.length;
        const noteStartAngle = catStartAngle + noteIndex * noteAngleSpan + gap / 4;
        const noteEndAngle = catStartAngle + (noteIndex + 1) * noteAngleSpan - gap / 4;
        const noteMidAngle = noteStartAngle + noteAngleSpan / 2;
        
        const isNoteSelected = selection.notes.has(note.id);
        const noteLabelPos = polarToCartesian(center, center, (outerRingInner + outerRingOuter) / 2, noteMidAngle);
        
        return {
          ...note,
          categoryId: cat.id,
          startAngle: noteStartAngle,
          endAngle: noteEndAngle,
          midAngle: noteMidAngle,
          isSelected: isNoteSelected,
          labelPos: noteLabelPos,
          color: cat.color,
        };
      });

      return {
        ...cat,
        startAngle: catStartAngle,
        endAngle: catEndAngle,
        midAngle: catMidAngle,
        isSelected: isCategorySelected,
        hasSelectedNotes,
        labelPos: innerLabelPos,
        notes: noteSegments,
      };
    });
  }, [selection, center, categoryAngle]);

  const selectedLabels = getSelectedLabels(selection);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          <circle cx={center} cy={center} r={outerRingOuter} fill="#1c1917" />
          
          {segments.map((cat) => (
            <g key={cat.id}>
              {cat.notes.map((note) => (
                <g key={note.id} className="cursor-pointer" onClick={() => toggleNote(note.id, cat.id)}>
                  <path
                    d={describeArc(center, center, outerRingInner, outerRingOuter, note.startAngle, note.endAngle)}
                    fill={note.isSelected ? note.color : '#292524'}
                    stroke="#0c0a09"
                    strokeWidth="1"
                    className="transition-all duration-200 hover:brightness-125"
                    style={{ 
                      opacity: note.isSelected ? 1 : 0.5,
                    }}
                  />
                  <text
                    x={note.labelPos.x}
                    y={note.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={note.isSelected ? '#1c1917' : '#78716c'}
                    fontSize="7"
                    fontWeight={note.isSelected ? '700' : '500'}
                    className="pointer-events-none select-none"
                    transform={`rotate(${note.midAngle > 90 && note.midAngle < 270 ? note.midAngle + 180 : note.midAngle}, ${note.labelPos.x}, ${note.labelPos.y})`}
                  >
                    {note.label}
                  </text>
                </g>
              ))}
              
              <g className="cursor-pointer" onClick={() => toggleCategory(cat.id)}>
                <path
                  d={describeArc(center, center, innerRingInner, innerRingOuter, cat.startAngle, cat.endAngle)}
                  fill={cat.isSelected ? cat.color : '#3f3f46'}
                  stroke="#0c0a09"
                  strokeWidth="1.5"
                  className="transition-all duration-200 hover:brightness-110"
                  style={{ 
                    opacity: cat.isSelected ? (cat.hasSelectedNotes ? 0.7 : 1) : 0.6,
                  }}
                />
                <text
                  x={cat.labelPos.x}
                  y={cat.labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={cat.isSelected ? '#1c1917' : '#a8a29e'}
                  fontSize="9"
                  fontWeight="700"
                  className="pointer-events-none select-none"
                  transform={`rotate(${cat.midAngle > 90 && cat.midAngle < 270 ? cat.midAngle + 180 : cat.midAngle}, ${cat.labelPos.x}, ${cat.labelPos.y})`}
                >
                  {cat.label}
                </text>
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
            Target
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
            Flavors
          </text>
        </svg>
      </div>
      
      <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-xs">
        {selectedLabels.map((label, i) => {
          const cat = FLAVOR_TAXONOMY.find(c => c.label === label || c.notes.some(n => n.label === label));
          const color = cat?.color || '#78716c';
          return (
            <span 
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: color, color: '#1c1917' }}
            >
              {label}
            </span>
          );
        })}
        {selectedLabels.length === 0 && (
          <span className="text-xs text-stone-500">Tap to select flavors</span>
        )}
      </div>
      
      <p className="text-[10px] text-stone-500 mt-2 text-center max-w-xs">
        Inner ring = broad flavors • Outer ring = specific notes
      </p>
    </div>
  );
};

export default EditableFlavorWheel;
