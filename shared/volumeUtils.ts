export interface ParsedVolume {
  amount: number;
  unit: 'oz' | 'ml' | 'dash' | 'tsp' | 'tbsp' | 'barspoon' | 'drop' | 'splash' | 'rinse' | 'float' | 'unknown';
  original: string;
}

const UNIT_TO_ML: Record<string, number> = {
  'oz': 29.5735,
  'ml': 1,
  'cl': 10,
  'dash': 0.9,
  'dashes': 0.9,
  'tsp': 5,
  'teaspoon': 5,
  'tbsp': 15,
  'tablespoon': 15,
  'barspoon': 5,
  'bsp': 5,
  'drop': 0.05,
  'drops': 0.05,
  'splash': 7.5,
  'rinse': 2.5,
  'float': 7.5,
  'top': 60,
  'fill': 90,
};

export function parseIngredientVolume(ingredient: string): ParsedVolume | null {
  const volumePattern = /^([\d.\/]+(?:\s*-\s*[\d.\/]+)?)\s*(oz|ml|cl|dash(?:es)?|tsp|teaspoon|tbsp|tablespoon|barspoon|bsp|drop(?:s)?|splash|rinse|float|top|fill)?\s+/i;
  
  const match = ingredient.match(volumePattern);
  
  if (!match) {
    return null;
  }
  
  let amount = match[1];
  const unit = (match[2] || 'oz').toLowerCase();
  
  if (amount.includes('/')) {
    const parts = amount.split('/');
    if (parts.length === 2) {
      amount = String(parseFloat(parts[0]) / parseFloat(parts[1]));
    }
  }
  
  if (amount.includes('-')) {
    const parts = amount.split('-');
    if (parts.length === 2) {
      amount = String((parseFloat(parts[0].trim()) + parseFloat(parts[1].trim())) / 2);
    }
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return null;
  }
  
  let normalizedUnit: ParsedVolume['unit'] = 'unknown';
  if (['oz', 'ml', 'dash', 'tsp', 'tbsp', 'barspoon', 'drop', 'splash', 'rinse', 'float'].includes(unit) ||
      unit === 'dashes' || unit === 'drops' || unit === 'teaspoon' || unit === 'tablespoon' || 
      unit === 'bsp' || unit === 'cl' || unit === 'top' || unit === 'fill') {
    normalizedUnit = unit as ParsedVolume['unit'];
  }
  
  return {
    amount: numAmount,
    unit: normalizedUnit,
    original: ingredient
  };
}

export function calculateTotalVolumeInOz(ingredients: string[]): number {
  let totalMl = 0;
  
  for (const ingredient of ingredients) {
    const parsed = parseIngredientVolume(ingredient);
    if (parsed) {
      const mlConversion = UNIT_TO_ML[parsed.unit] || UNIT_TO_ML[parsed.unit.replace(/s$/, '')] || 0;
      totalMl += parsed.amount * mlConversion;
    }
  }
  
  return Math.round((totalMl / 29.5735) * 10) / 10;
}

export function calculateTotalVolume(ingredients: string[], preferredUnit: 'oz' | 'ml' = 'oz'): string {
  const totalOz = calculateTotalVolumeInOz(ingredients);
  
  if (totalOz === 0) {
    return '';
  }
  
  if (preferredUnit === 'ml') {
    const totalMl = Math.round(totalOz * 29.5735);
    return `${totalMl} ml`;
  }
  
  return `${totalOz} oz`;
}

export function formatVolumeForDisplay(targetVolume: string | undefined, ingredients?: string[]): string {
  if (targetVolume) {
    return targetVolume;
  }
  
  if (ingredients && ingredients.length > 0) {
    const calculated = calculateTotalVolume(ingredients);
    return calculated || 'Variable';
  }
  
  return 'Variable';
}
