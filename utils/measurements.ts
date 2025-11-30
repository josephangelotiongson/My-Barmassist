export type MeasurementSystem = 'imperial' | 'metric';

interface ConversionResult {
  amount: number;
  unit: string;
  display: string;
}

const OZ_TO_ML = 30;

const IMPERIAL_STANDARD_MEASURES = [
  { oz: 2, label: '2 oz' },
  { oz: 1.5, label: '1.5 oz' },
  { oz: 1, label: '1 oz' },
  { oz: 0.75, label: '0.75 oz' },
  { oz: 0.5, label: '0.5 oz' },
  { oz: 0.25, label: '0.25 oz' },
];

const METRIC_STANDARD_MEASURES = [
  { ml: 60, label: '60 mL' },
  { ml: 45, label: '45 mL' },
  { ml: 30, label: '30 mL' },
  { ml: 22.5, label: '22.5 mL' },
  { ml: 20, label: '20 mL' },
  { ml: 15, label: '15 mL' },
  { ml: 10, label: '10 mL' },
  { ml: 7.5, label: '7.5 mL' },
];

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

export function parseIngredientAmount(ingredient: string): { amount: number | null; unit: string | null; rest: string } {
  const lower = ingredient.toLowerCase().trim();
  
  const decimalOzMatch = lower.match(/^(\d+(?:\.\d+)?)\s*oz\b(.*)$/i);
  if (decimalOzMatch) {
    return { 
      amount: parseFloat(decimalOzMatch[1]), 
      unit: 'oz', 
      rest: decimalOzMatch[2].trim().replace(/^of\s+/i, '')
    };
  }
  
  const fractionOzMatch = lower.match(/^(\d+)\/(\d+)\s*oz\b(.*)$/i);
  if (fractionOzMatch) {
    return { 
      amount: parseInt(fractionOzMatch[1]) / parseInt(fractionOzMatch[2]), 
      unit: 'oz', 
      rest: fractionOzMatch[3].trim().replace(/^of\s+/i, '')
    };
  }
  
  const mlMatch = lower.match(/^(\d+(?:\.\d+)?)\s*ml\b(.*)$/i);
  if (mlMatch) {
    return { 
      amount: mlToOz(parseFloat(mlMatch[1])), 
      unit: 'ml', 
      rest: mlMatch[2].trim().replace(/^of\s+/i, '')
    };
  }
  
  const dashMatch = lower.match(/^(\d+)\s*dash(?:es)?\b(.*)$/i);
  if (dashMatch) {
    return { 
      amount: parseInt(dashMatch[1]), 
      unit: 'dash', 
      rest: dashMatch[2].trim().replace(/^of\s+/i, '')
    };
  }
  
  const barspoonMatch = lower.match(/^(\d+)\s*(?:bar\s*spoon|bsp)\b(.*)$/i);
  if (barspoonMatch) {
    return { 
      amount: parseInt(barspoonMatch[1]), 
      unit: 'barspoon', 
      rest: barspoonMatch[2].trim().replace(/^of\s+/i, '')
    };
  }
  
  return { amount: null, unit: null, rest: ingredient };
}

export function convertIngredient(ingredient: string, system: MeasurementSystem): string {
  const { amount, unit, rest } = parseIngredientAmount(ingredient);
  
  if (amount === null || unit === null) {
    return ingredient;
  }
  
  if (unit === 'dash' || unit === 'barspoon') {
    return ingredient;
  }
  
  const ozAmount = unit === 'ml' ? amount : amount;
  const formatted = formatMeasurement(ozAmount, system);
  
  const capitalizedRest = rest.charAt(0).toUpperCase() + rest.slice(1);
  return `${formatted} ${capitalizedRest}`.trim();
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
