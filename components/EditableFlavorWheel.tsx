import React, { useMemo } from 'react';
import { FlavorProfile, FlavorDimension } from '../types';

interface Props {
  profile: FlavorProfile;
  originalProfile?: FlavorProfile;
  onProfileChange: (profile: FlavorProfile) => void;
  size?: number;
}

const FLAVOR_COLORS: Record<FlavorDimension, string> = {
  [FlavorDimension.SWEET]: '#f59e0b',
  [FlavorDimension.SOUR]: '#84cc16',
  [FlavorDimension.BITTER]: '#14b8a6',
  [FlavorDimension.BOOZY]: '#a78bfa',
  [FlavorDimension.HERBAL]: '#22c55e',
  [FlavorDimension.FRUITY]: '#ec4899',
  [FlavorDimension.SPICY]: '#f97316',
  [FlavorDimension.SMOKY]: '#78716c',
};

const DIMENSION_ORDER = [
  FlavorDimension.SWEET,
  FlavorDimension.SOUR,
  FlavorDimension.BITTER,
  FlavorDimension.BOOZY,
  FlavorDimension.HERBAL,
  FlavorDimension.FRUITY,
  FlavorDimension.SPICY,
  FlavorDimension.SMOKY,
];

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
  originalProfile,
  onProfileChange, 
  size = 280 
}) => {
  const center = size / 2;
  const innerRadius = 50;
  const outerRadius = size / 2 - 10;
  const segmentAngle = 360 / 8;
  const gap = 2;

  const toggleFlavor = (dim: FlavorDimension) => {
    const currentValue = profile[dim] || 0;
    const newValue = currentValue > 0 ? 0 : 7;
    onProfileChange({
      ...profile,
      [dim]: newValue
    });
  };

  const segments = useMemo(() => {
    return DIMENSION_ORDER.map((dim, index) => {
      const startAngle = index * segmentAngle + gap / 2;
      const endAngle = (index + 1) * segmentAngle - gap / 2;
      const midAngle = startAngle + (segmentAngle - gap) / 2;
      
      const value = profile[dim] || 0;
      const isSelected = value > 0;
      
      const labelPos = polarToCartesian(center, center, (innerRadius + outerRadius) / 2, midAngle);

      return {
        dim,
        startAngle,
        endAngle,
        midAngle,
        value,
        isSelected,
        labelPos,
        color: FLAVOR_COLORS[dim],
      };
    });
  }, [profile, center, innerRadius, outerRadius, segmentAngle]);

  const selectedCount = segments.filter(s => s.isSelected).length;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          <circle cx={center} cy={center} r={outerRadius} fill="#1c1917" />
          
          {segments.map((seg) => (
            <g key={seg.dim} className="cursor-pointer" onClick={() => toggleFlavor(seg.dim)}>
              <path
                d={describeArc(center, center, innerRadius, outerRadius, seg.startAngle, seg.endAngle)}
                fill={seg.isSelected ? seg.color : '#292524'}
                stroke="#0c0a09"
                strokeWidth="1.5"
                className="transition-all duration-200 hover:brightness-110"
                style={{ 
                  opacity: seg.isSelected ? 1 : 0.6,
                  filter: seg.isSelected ? 'saturate(1.2)' : 'none'
                }}
              />
              
              <text
                x={seg.labelPos.x}
                y={seg.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={seg.isSelected ? '#1c1917' : '#a8a29e'}
                fontSize="10"
                fontWeight={seg.isSelected ? '700' : '500'}
                className="pointer-events-none select-none transition-all duration-200"
                transform={`rotate(${seg.midAngle > 90 && seg.midAngle < 270 ? seg.midAngle + 180 : seg.midAngle}, ${seg.labelPos.x}, ${seg.labelPos.y})`}
              >
                {seg.dim}
              </text>
            </g>
          ))}
          
          <circle cx={center} cy={center} r={innerRadius - 5} fill="#1c1917" stroke="#292524" strokeWidth="2" />
          
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
            Profile
          </text>
        </svg>
      </div>
      
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {segments.filter(s => s.isSelected).map(seg => (
          <span 
            key={seg.dim}
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: seg.color, color: '#1c1917' }}
          >
            {seg.dim}
          </span>
        ))}
        {selectedCount === 0 && (
          <span className="text-xs text-stone-500">Tap flavors to select</span>
        )}
      </div>
      
      <p className="text-xs text-stone-500 mt-2 text-center">
        Tap segments to select desired flavors
      </p>
    </div>
  );
};

export default EditableFlavorWheel;
