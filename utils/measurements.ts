export type MeasurementSystem = 'imperial' | 'metric';

const OZ_TO_ML = 30;

export function ozToMl(oz: number): number {
  return oz * OZ_TO_ML;
}

export function mlToOz(ml: number): number {
  return ml / OZ_TO_ML;
}

export function formatMeasurement(oz: number, system: MeasurementSystem): string {
  if (system === 'imperial') {
    if (oz >= 1) {
      return oz % 1 === 0 ? `${oz} oz` : `${oz.toFixed(2).replace(/\.?0+$/, '')} oz`;
    }
    const fractionMap: Record<number, string> = {
      0.25: '1/4 oz',
      0.33: '1/3 oz',
      0.5: '1/2 oz',
      0.66: '2/3 oz',
      0.75: '3/4 oz',
    };
    for (const [val, label] of Object.entries(fractionMap)) {
      if (Math.abs(oz - parseFloat(val)) < 0.02) return label;
    }
    return `${oz.toFixed(2).replace(/\.?0+$/, '')} oz`;
  } else {
    const ml = ozToMl(oz);
    if (ml >= 10) {
      return ml % 1 === 0 ? `${ml} mL` : `${ml.toFixed(1).replace(/\.0$/, '')} mL`;
    }
    return `${ml.toFixed(1).replace(/\.0$/, '')} mL`;
  }
}

interface ParseResult {
  amount: number | null;
  unit: string | null;
  rest: string;
  matchLength: number;
}

export function parseIngredientAmount(ingredient: string): ParseResult {
  const trimmed = ingredient.trim();
  
  const decimalOzMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*oz\b\s*/i);
  if (decimalOzMatch) {
    const matchLen = decimalOzMatch[0].length;
    let rest = trimmed.slice(matchLen);
    rest = rest.replace(/^of\s+/i, '');
    return { 
      amount: parseFloat(decimalOzMatch[1]), 
      unit: 'oz', 
      rest: rest,
      matchLength: matchLen
    };
  }
  
  const fractionOzMatch = trimmed.match(/^(\d+)\/(\d+)\s*oz\b\s*/i);
  if (fractionOzMatch) {
    const matchLen = fractionOzMatch[0].length;
    let rest = trimmed.slice(matchLen);
    rest = rest.replace(/^of\s+/i, '');
    return { 
      amount: parseInt(fractionOzMatch[1]) / parseInt(fractionOzMatch[2]), 
      unit: 'oz', 
      rest: rest,
      matchLength: matchLen
    };
  }
  
  const mlMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*ml\b\s*/i);
  if (mlMatch) {
    const matchLen = mlMatch[0].length;
    let rest = trimmed.slice(matchLen);
    rest = rest.replace(/^of\s+/i, '');
    return { 
      amount: mlToOz(parseFloat(mlMatch[1])), 
      unit: 'ml', 
      rest: rest,
      matchLength: matchLen
    };
  }
  
  const clMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*cl\b\s*/i);
  if (clMatch) {
    const matchLen = clMatch[0].length;
    let rest = trimmed.slice(matchLen);
    rest = rest.replace(/^of\s+/i, '');
    return { 
      amount: mlToOz(parseFloat(clMatch[1]) * 10), 
      unit: 'cl', 
      rest: rest,
      matchLength: matchLen
    };
  }
  
  const dashMatch = trimmed.match(/^(\d+)\s*dash(?:es)?\b\s*/i);
  if (dashMatch) {
    const matchLen = dashMatch[0].length;
    let rest = trimmed.slice(matchLen);
    rest = rest.replace(/^of\s+/i, '');
    return { 
      amount: parseInt(dashMatch[1]), 
      unit: 'dash', 
      rest: rest,
      matchLength: matchLen
    };
  }
  
  const barspoonMatch = trimmed.match(/^(\d+)\s*(?:bar\s*spoon|bsp)\b\s*/i);
  if (barspoonMatch) {
    const matchLen = barspoonMatch[0].length;
    let rest = trimmed.slice(matchLen);
    rest = rest.replace(/^of\s+/i, '');
    return { 
      amount: parseInt(barspoonMatch[1]), 
      unit: 'barspoon', 
      rest: rest,
      matchLength: matchLen
    };
  }
  
  return { amount: null, unit: null, rest: ingredient, matchLength: 0 };
}

export function convertIngredient(ingredient: string, system: MeasurementSystem): string {
  const { amount, unit, rest } = parseIngredientAmount(ingredient);
  
  if (amount === null || unit === null) {
    return ingredient;
  }
  
  if (unit === 'dash' || unit === 'barspoon') {
    return ingredient;
  }
  
  const formatted = formatMeasurement(amount, system);
  
  return `${formatted} ${rest}`.trim();
}

export function convertIngredientsList(ingredients: string[], system: MeasurementSystem): string[] {
  return ingredients.map(ing => convertIngredient(ing, system));
}

export function convertTargetVolume(volume: string | undefined, system: MeasurementSystem): string | undefined {
  if (!volume) return volume;
  
  const ozMatch = volume.match(/(\d+(?:\.\d+)?)\s*oz/i);
  if (ozMatch) {
    const oz = parseFloat(ozMatch[1]);
    if (system === 'metric') {
      const ml = ozToMl(oz);
      return `${ml.toFixed(0)} mL`;
    }
    return volume;
  }
  
  const mlMatch = volume.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    if (system === 'imperial') {
      const oz = mlToOz(ml);
      return `${oz.toFixed(1).replace(/\.0$/, '')} oz`;
    }
    return volume;
  }
  
  return volume;
}

export function getVolumeUnit(system: MeasurementSystem): string {
  return system === 'imperial' ? 'oz' : 'mL';
}

export function convertVolumeValue(value: number, fromSystem: MeasurementSystem, toSystem: MeasurementSystem): number {
  if (fromSystem === toSystem) return value;
  if (fromSystem === 'imperial' && toSystem === 'metric') {
    return ozToMl(value);
  }
  return mlToOz(value);
}
