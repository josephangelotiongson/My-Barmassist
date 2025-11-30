import React, { useState, useMemo } from 'react';
import { FlavorProfile } from '../types';

// --- Data Configuration ---
// Colors are now calculated dynamically, so we remove hardcoded hex values here.
const FLAVOR_STRUCTURE = [
  {
    name: "Fruity",
    children: [
      { name: "Citrus", children: ["Lemon", "Lime", "Grapefrt", "Orange"] },
      { name: "Berry", children: ["Raspbry", "Strawbry", "Blackbry"] },
      { name: "Tree", children: ["Apple", "Pear", "Peach", "Cherry"] },
      { name: "Tropic", children: ["Pineapl", "Mango", "Coconut"] }
    ]
  },
  {
    name: "Floral",
    children: [
      { name: "Flower", children: ["Rose", "Lavender", "Elderflr", "Violet"] }
    ]
  },
  {
    name: "Herbal",
    children: [
      { name: "Fresh", children: ["Mint", "Basil", "Thyme", "Sage"] },
      { name: "Veg", children: ["Cucumber", "Celery", "Tomato"] }
    ]
  },
  {
    name: "Spicy",
    children: [
      { name: "Warm", children: ["Cinnamon", "Clove", "Nutmeg"] },
      { name: "Hot", children: ["Ginger", "Chili", "Pepper"] }
    ]
  },
  {
    name: "Earthy",
    children: [
        { name: "Woody", children: ["Oak", "Cedar", "Pine"] },
        { name: "Smoky", children: ["Smoke", "Charcoal", "Peat"] }
    ]
  },
  {
    name: "Sweet",
    children: [
        { name: "Sugar", children: ["Honey", "Caramel", "Maple"] },
        { name: "Rich", children: ["Choco", "Coffee", "Vanilla"] },
        { name: "Nutty", children: ["Almond", "Walnut", "Pecan"] }
    ]
  }
];

// --- Color Helpers ---
// Base Grey: Stone 700 (#44403c) -> RGB: 68, 64, 60
// Target Green: Lime 700 (#4d7c0f) -> RGB: 77, 124, 15
const interpolateColor = (intensity: number) => {
  // Intensity 0 to 10
  const ratio = Math.min(Math.max(intensity / 10, 0), 1);
  
  // Define start and end RGB
  const start = { r: 68, g: 64, b: 60 };
  const end = { r: 77, g: 124, b: 15 };

  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);

  // We also adjust opacity slightly to make "active" colors pop more against the dark bg
  const opacity = 0.6 + (ratio * 0.4); 

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getCategoryScore = (categoryName: string, profile?: FlavorProfile): number => {
    if (!profile) return 0;
    const anyProfile = profile as unknown as Record<string, number>;
    switch (categoryName) {
        case 'Fruity': return profile.Fruity || 0;
        case 'Herbal': {
            const herbalValue = profile.Herbal || 0;
            const legacyBitter = anyProfile.Bitter || 0;
            return herbalValue > 0 ? herbalValue : legacyBitter;
        }
        case 'Earthy': {
            const earthyValue = profile.Earthy || 0;
            const legacySmoky = anyProfile.Smoky || 0;
            return earthyValue > 0 ? earthyValue : legacySmoky;
        }
        case 'Spicy': return profile.Spicy || 0;
        case 'Sweet': return profile.Sweet || 0;
        case 'Floral': return profile.Floral || 0;
        case 'Sour': return profile.Sour || 0;
        case 'Boozy': return profile.Boozy || 0;
        default: return 0;
    }
};

// --- Geometry Helpers ---
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

    const d = [
        "M", start.x, start.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
        "L", endInner.x, endInner.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
        "Z"
    ].join(" ");

    return d;
}

interface Props {
  userProfile?: FlavorProfile;
}

// --- Component ---
const FlavorWheel: React.FC<Props> = ({ userProfile }) => {
  const [selected, setSelected] = useState<string | null>(null);

  // Configuration
  const size = 320;
  const center = size / 2;
  const r1 = 55; // Inner ring radius
  const r2 = 105; // Middle ring radius
  const r3 = 155; // Outer ring radius

  // Pre-calculation for geometry
  const { anglePerLeaf, categoryAngles } = useMemo(() => {
      let totalLeaves = 0;
      FLAVOR_STRUCTURE.forEach(cat => {
        cat.children.forEach(sub => {
            totalLeaves += sub.children.length;
        });
      });

      const anglePerLeaf = 360 / totalLeaves;
      
      // Map category start angles
      let currentAngle = 0;
      const catAngles: Record<string, { start: number, middle: number, span: number }> = {};
      
      FLAVOR_STRUCTURE.forEach(cat => {
          let leaves = 0;
          cat.children.forEach(sub => leaves += sub.children.length);
          const span = leaves * anglePerLeaf;
          catAngles[cat.name] = {
              start: currentAngle,
              middle: currentAngle + (span / 2),
              span: span
          };
          currentAngle += span;
      });

      return { anglePerLeaf, categoryAngles: catAngles };
  }, []);
  
  // Render Logic for Wheel
  const renderWheel = () => {
    let currentAngle = 0;
    const paths: React.ReactElement[] = [];
    const labels: React.ReactElement[] = [];

    FLAVOR_STRUCTURE.forEach((category) => {
        const { span } = categoryAngles[category.name];
        const startAngle = currentAngle;
        const endAngle = startAngle + span;
        
        // Dynamic Color Calculation
        const score = getCategoryScore(category.name, userProfile);
        const fillColor = interpolateColor(score);

        // Draw Category Arc (Inner Ring)
        const isCatSelected = selected === category.name;
        paths.push(
            <path
                key={`cat-${category.name}`}
                d={describeArc(center, center, 20, r1, startAngle, endAngle)}
                fill={fillColor}
                stroke="#1c1917"
                strokeWidth="1"
                className="transition-all duration-700 cursor-pointer hover:brightness-110"
                onClick={() => setSelected(category.name)}
                style={{ opacity: selected && !isCatSelected ? 0.3 : 1 }}
            />
        );

        // Category Label
        const catMidAngle = startAngle + (span / 2);
        const catLabelPos = polarToCartesian(center, center, (20 + r1) / 2, catMidAngle);
        labels.push(
            <text
                key={`lbl-${category.name}`}
                x={catLabelPos.x}
                y={catLabelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="9"
                fontWeight="bold"
                transform={`rotate(${catMidAngle > 180 ? catMidAngle + 90 : catMidAngle - 90}, ${catLabelPos.x}, ${catLabelPos.y})`}
                className="pointer-events-none select-none"
                style={{ opacity: selected && !isCatSelected ? 0.3 : 1 }}
            >
                {category.name}
            </text>
        );

        // Render Subcategories
        let subStartAngle = startAngle;
        category.children.forEach((sub) => {
            const subLeafCount = sub.children.length;
            const subSpan = subLeafCount * anglePerLeaf;
            const subEndAngle = subStartAngle + subSpan;

            // Draw Subcategory Arc (Middle Ring)
            const isSubSelected = selected === sub.name;
            paths.push(
                <path
                    key={`sub-${sub.name}`}
                    d={describeArc(center, center, r1, r2, subStartAngle, subEndAngle)}
                    fill={fillColor}
                    fillOpacity={0.85} // Slightly more transparent than core
                    stroke="#1c1917"
                    strokeWidth="1"
                    className="transition-all duration-700 cursor-pointer hover:brightness-110"
                    onClick={() => setSelected(sub.name)}
                    style={{ opacity: selected && !isSubSelected && !isCatSelected ? 0.3 : 1 }}
                />
            );

            // Sub Label
            if (subSpan > 10) { // Only draw label if enough space
                const subMidAngle = subStartAngle + (subSpan / 2);
                const subLabelPos = polarToCartesian(center, center, (r1 + r2) / 2, subMidAngle);
                labels.push(
                    <text
                        key={`lbl-${sub.name}`}
                        x={subLabelPos.x}
                        y={subLabelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#fff"
                        fontSize="8"
                        fontWeight="500"
                        transform={`rotate(${subMidAngle > 180 ? subMidAngle + 90 : subMidAngle - 90}, ${subLabelPos.x}, ${subLabelPos.y})`}
                        className="pointer-events-none select-none"
                        style={{ opacity: selected && !isSubSelected && !isCatSelected ? 0.3 : 1 }}
                    >
                        {sub.name}
                    </text>
                );
            }

            // Render Leaves (Outer Ring)
            let leafStartAngle = subStartAngle;
            sub.children.forEach((leaf) => {
                const leafSpan = anglePerLeaf;
                const leafEndAngle = leafStartAngle + leafSpan;
                const isLeafSelected = selected === leaf;

                paths.push(
                    <path
                        key={`leaf-${leaf}`}
                        d={describeArc(center, center, r2, r3, leafStartAngle, leafEndAngle)}
                        fill={fillColor}
                        fillOpacity={0.7} // Most transparent
                        stroke="#1c1917"
                        strokeWidth="0.5"
                        className="transition-all duration-700 cursor-pointer hover:brightness-110"
                        onClick={() => setSelected(leaf)}
                         style={{ opacity: selected && !isLeafSelected && !isSubSelected && !isCatSelected ? 0.3 : 1 }}
                    />
                );

                 // Leaf Label
                 const leafMidAngle = leafStartAngle + (leafSpan / 2);
                 const leafLabelPos = polarToCartesian(center, center, (r2 + r3) / 2, leafMidAngle);
                 labels.push(
                    <text
                        key={`lbl-${leaf}`}
                        x={leafLabelPos.x}
                        y={leafLabelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#e5e5e5"
                        fontSize="6.5"
                        transform={`rotate(${leafMidAngle > 180 ? leafMidAngle + 90 : leafMidAngle - 90}, ${leafLabelPos.x}, ${leafLabelPos.y})`}
                        className="pointer-events-none select-none"
                        style={{ opacity: selected && !isLeafSelected && !isSubSelected && !isCatSelected ? 0.3 : 1 }}
                    >
                        {leaf}
                    </text>
                 );

                leafStartAngle += leafSpan;
            });

            subStartAngle += subSpan;
        });

        currentAngle += span;
    });

    return { paths, labels };
  };

  const { paths, labels } = renderWheel();

  return (
    <div className="flex flex-col items-center justify-center w-full">
        <div className="relative w-full max-w-[360px] aspect-square">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full drop-shadow-xl">
                <circle cx={center} cy={center} r={r3} fill="#1c1917" />
                {paths}
                {labels}
                
                {/* Center Reset Button */}
                <circle 
                    cx={center} 
                    cy={center} 
                    r={18} 
                    fill="#292524" 
                    stroke="#44403c" 
                    className="cursor-pointer hover:fill-stone-700"
                    onClick={() => setSelected(null)}
                />
            </svg>
        </div>
    </div>
  );
};

export default FlavorWheel;