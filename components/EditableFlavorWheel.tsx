import React, { useMemo } from 'react';
import { FlavorProfile, FlavorDimension } from '../types';
import { Plus, Minus } from 'lucide-react';

interface Props {
  profile: FlavorProfile;
  originalProfile?: FlavorProfile;
  onProfileChange: (profile: FlavorProfile) => void;
  size?: number;
}

const FLAVOR_COLORS: Record<FlavorDimension, { base: string; active: string }> = {
  [FlavorDimension.SWEET]: { base: '#78350f', active: '#f59e0b' },
  [FlavorDimension.SOUR]: { base: '#365314', active: '#84cc16' },
  [FlavorDimension.BITTER]: { base: '#1e3a5f', active: '#3b82f6' },
  [FlavorDimension.BOOZY]: { base: '#581c87', active: '#a855f7' },
  [FlavorDimension.HERBAL]: { base: '#064e3b', active: '#10b981' },
  [FlavorDimension.FRUITY]: { base: '#9d174d', active: '#ec4899' },
  [FlavorDimension.SPICY]: { base: '#7c2d12', active: '#f97316' },
  [FlavorDimension.SMOKY]: { base: '#1c1917', active: '#78716c' },
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
  const innerRadius = 45;
  const outerRadius = size / 2 - 10;
  const segmentAngle = 360 / 8;
  const gap = 2;

  const interpolateColor = (dim: FlavorDimension, value: number) => {
    const colors = FLAVOR_COLORS[dim];
    const ratio = Math.min(Math.max(value / 10, 0), 1);
    return ratio > 0.3 ? colors.active : colors.base;
  };

  const adjustValue = (dim: FlavorDimension, delta: number) => {
    const newValue = Math.max(0, Math.min(10, profile[dim] + delta));
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
      const originalValue = originalProfile?.[dim] || 0;
      const diff = value - originalValue;
      
      const valueRadius = innerRadius + ((outerRadius - innerRadius) * (value / 10));
      const labelPos = polarToCartesian(center, center, (innerRadius + outerRadius) / 2, midAngle);
      const valuePos = polarToCartesian(center, center, outerRadius + 15, midAngle);
      
      const buttonRadius = 12;
      const plusPos = polarToCartesian(center, center, outerRadius - 20, midAngle);
      const minusPos = polarToCartesian(center, center, innerRadius + 20, midAngle);

      return {
        dim,
        startAngle,
        endAngle,
        midAngle,
        value,
        originalValue,
        diff,
        valueRadius,
        labelPos,
        valuePos,
        plusPos,
        minusPos,
        buttonRadius,
        fillColor: interpolateColor(dim, value),
        baseColor: FLAVOR_COLORS[dim].base,
      };
    });
  }, [profile, originalProfile, center, innerRadius, outerRadius, segmentAngle]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          <circle cx={center} cy={center} r={outerRadius} fill="#1c1917" />
          
          {segments.map((seg) => (
            <g key={seg.dim}>
              <path
                d={describeArc(center, center, innerRadius, outerRadius, seg.startAngle, seg.endAngle)}
                fill={seg.baseColor}
                stroke="#0c0a09"
                strokeWidth="1"
                className="transition-all duration-300"
              />
              
              <path
                d={describeArc(center, center, innerRadius, seg.valueRadius, seg.startAngle, seg.endAngle)}
                fill={seg.fillColor}
                stroke="none"
                className="transition-all duration-300"
                style={{ filter: 'brightness(1.1)' }}
              />
              
              <text
                x={seg.labelPos.x}
                y={seg.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#e5e5e5"
                fontSize="9"
                fontWeight="600"
                className="pointer-events-none select-none"
                transform={`rotate(${seg.midAngle > 90 && seg.midAngle < 270 ? seg.midAngle + 180 : seg.midAngle}, ${seg.labelPos.x}, ${seg.labelPos.y})`}
              >
                {seg.dim}
              </text>
              
              <circle
                cx={seg.plusPos.x}
                cy={seg.plusPos.y}
                r={seg.buttonRadius}
                fill="#292524"
                stroke="#44403c"
                strokeWidth="1"
                className="cursor-pointer hover:fill-stone-700 transition-colors"
                onClick={() => adjustValue(seg.dim, 1)}
              />
              <text
                x={seg.plusPos.x}
                y={seg.plusPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#a8a29e"
                fontSize="14"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                +
              </text>
              
              <circle
                cx={seg.minusPos.x}
                cy={seg.minusPos.y}
                r={seg.buttonRadius}
                fill="#292524"
                stroke="#44403c"
                strokeWidth="1"
                className="cursor-pointer hover:fill-stone-700 transition-colors"
                onClick={() => adjustValue(seg.dim, -1)}
              />
              <text
                x={seg.minusPos.x}
                y={seg.minusPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#a8a29e"
                fontSize="14"
                fontWeight="bold"
                className="pointer-events-none select-none"
              >
                -
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
        
        {segments.map((seg) => (
          <div
            key={`val-${seg.dim}`}
            className="absolute flex items-center justify-center"
            style={{
              left: seg.valuePos.x - 12,
              top: seg.valuePos.y - 10,
              width: 24,
              height: 20,
            }}
          >
            <span className="text-[10px] font-bold text-white bg-stone-800/80 px-1.5 py-0.5 rounded border border-stone-700">
              {seg.value}
              {seg.diff !== 0 && (
                <span className={`ml-0.5 ${seg.diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {seg.diff > 0 ? '+' : ''}{seg.diff}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-stone-500 mt-2 text-center">
        Use +/- buttons to adjust each flavor dimension
      </p>
    </div>
  );
};

export default EditableFlavorWheel;
