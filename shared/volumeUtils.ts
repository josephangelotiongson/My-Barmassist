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
  'ounce': 29.5735,
  'ounces': 29.5735,
  'part': 29.5735,
  'parts': 29.5735,
};

const TEXT_TO_NUMBER: Record<string, number> = {
  'half': 0.5,
  'quarter': 0.25,
  'third': 0.333,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
};

function parseSingleValue(str: string): number {
  str = str.trim();
  
  const textMatch = str.match(/^(half|quarter|third|one|two|three|four|five|six)$/i);
  if (textMatch) {
    return TEXT_TO_NUMBER[textMatch[1].toLowerCase()] || 0;
  }
  
  const mixedFractionMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFractionMatch) {
    const whole = parseFloat(mixedFractionMatch[1]);
    const num = parseFloat(mixedFractionMatch[2]);
    const denom = parseFloat(mixedFractionMatch[3]);
    return whole + (num / denom);
  }
  
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const denom = parseFloat(fractionMatch[2]);
    return num / denom;
  }
  
  const decimal = parseFloat(str);
  return isNaN(decimal) ? 0 : decimal;
}

function parseFraction(str: string): number {
  str = str.trim();
  
  const rangeMatch = str.match(/^(.+?)\s*-\s*(.+)$/);
  if (rangeMatch) {
    const low = parseSingleValue(rangeMatch[1]);
    const high = parseSingleValue(rangeMatch[2]);
    if (low > 0 && high > 0) {
      return (low + high) / 2;
    }
  }
  
  return parseSingleValue(str);
}

export function parseIngredientVolume(ingredient: string): ParsedVolume | null {
  const unitPattern = /oz|ml|cl|dash(?:es)?|tsp|teaspoon|tbsp|tablespoon|barspoon|bsp|drop(?:s)?|splash|rinse|float|top|fill|ounce(?:s)?|part(?:s)?/i;
  
  const volumePattern = new RegExp(
    `^((?:\\d+\\s+)?(?:\\d+\\/\\d+|\\d*\\.?\\d+|half|quarter|third|one|two|three|four|five|six)(?:\\s*-\\s*(?:\\d+\\/\\d+|\\d*\\.?\\d+))?)\\s*(${unitPattern.source})?\\s+`,
    'i'
  );
  
  const match = ingredient.match(volumePattern);
  
  if (!match) {
    return null;
  }
  
  const amountStr = match[1];
  const unit = (match[2] || 'oz').toLowerCase();
  
  const numAmount = parseFraction(amountStr);
  
  if (numAmount === 0) {
    return null;
  }
  
  let normalizedUnit: ParsedVolume['unit'] = 'unknown';
  const validUnits = ['oz', 'ml', 'dash', 'dashes', 'tsp', 'teaspoon', 'tbsp', 'tablespoon', 
                      'barspoon', 'bsp', 'drop', 'drops', 'splash', 'rinse', 'float', 'cl', 
                      'top', 'fill', 'ounce', 'ounces', 'part', 'parts'];
  if (validUnits.includes(unit)) {
    if (unit === 'ounce' || unit === 'ounces') normalizedUnit = 'oz';
    else if (unit === 'dashes') normalizedUnit = 'dash';
    else if (unit === 'drops') normalizedUnit = 'drop';
    else if (unit === 'teaspoon') normalizedUnit = 'tsp';
    else if (unit === 'tablespoon') normalizedUnit = 'tbsp';
    else if (unit === 'bsp') normalizedUnit = 'barspoon';
    else if (unit === 'part' || unit === 'parts') normalizedUnit = 'oz';
    else normalizedUnit = unit as ParsedVolume['unit'];
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

export interface VolumeOverageResult {
  originalVolumeOz: number;
  newVolumeOz: number;
  targetVolumeOz: number;
  overageOz: number;
  requiresBalance: boolean;
  tolerance: number;
}

export function calculateVolumeOverage(
  originalIngredients: string[],
  newIngredients: string[],
  targetVolume?: string
): VolumeOverageResult {
  const TOLERANCE = 0.5;
  
  const originalVolumeOz = calculateTotalVolumeInOz(originalIngredients);
  const newVolumeOz = calculateTotalVolumeInOz(newIngredients);
  
  let targetVolumeOz = originalVolumeOz;
  if (targetVolume) {
    const match = targetVolume.match(/([\d.]+)\s*(oz|ml)/i);
    if (match) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      targetVolumeOz = unit === 'ml' ? amount / 29.5735 : amount;
    }
  }
  
  const overageOz = Math.round((newVolumeOz - targetVolumeOz) * 100) / 100;
  const requiresBalance = overageOz >= 0.25;
  
  return {
    originalVolumeOz: Math.round(originalVolumeOz * 100) / 100,
    newVolumeOz: Math.round(newVolumeOz * 100) / 100,
    targetVolumeOz: Math.round(targetVolumeOz * 100) / 100,
    overageOz,
    requiresBalance,
    tolerance: TOLERANCE
  };
}

export interface ReducibleIngredient {
  index: number;
  original: string;
  label: string;
  currentAmountOz: number;
  minAmountOz: number;
  reductionOz: number;
  isReducible: boolean;
  unit: string;
}

const NON_REDUCIBLE_PATTERNS = [
  /garnish/i,
  /twist/i,
  /wheel/i,
  /wedge/i,
  /slice/i,
  /cherry/i,
  /olive/i,
  /onion/i,
  /leaf/i,
  /leaves/i,
  /sprig/i,
  /peel/i,
  /zest/i,
  /rim/i,
  /salt/i,
  /sugar.*rim/i,
  /expressed/i,
];

export function classifyReducibleIngredients(ingredients: string[]): ReducibleIngredient[] {
  const result: ReducibleIngredient[] = [];
  
  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    const parsed = parseIngredientVolume(ingredient);
    
    const isGarnish = NON_REDUCIBLE_PATTERNS.some(pattern => pattern.test(ingredient));
    
    const label = ingredient.replace(/^[\d./\s]+(?:oz|ml|dash(?:es)?|tsp|tbsp|barspoon|drop(?:s)?|splash|rinse|float)?\s*/i, '').trim();
    
    if (!parsed || isGarnish) {
      result.push({
        index: i,
        original: ingredient,
        label,
        currentAmountOz: 0,
        minAmountOz: 0,
        reductionOz: 0,
        isReducible: false,
        unit: 'unknown'
      });
      continue;
    }
    
    let amountInOz = 0;
    const mlConversion = UNIT_TO_ML[parsed.unit] || 0;
    if (mlConversion > 0) {
      amountInOz = (parsed.amount * mlConversion) / 29.5735;
    }
    
    const isSmallMeasure = ['dash', 'drop', 'barspoon', 'rinse', 'splash', 'float'].includes(parsed.unit);
    const isReducible = !isSmallMeasure && amountInOz >= 0.25;
    
    const minAmount = isReducible ? Math.max(0.25, amountInOz * 0.25) : amountInOz;
    
    result.push({
      index: i,
      original: ingredient,
      label,
      currentAmountOz: Math.round(amountInOz * 100) / 100,
      minAmountOz: Math.round(minAmount * 100) / 100,
      reductionOz: 0,
      isReducible,
      unit: parsed.unit
    });
  }
  
  return result;
}

export function applyReductions(
  ingredients: string[],
  reductions: Map<number, number>
): string[] {
  return ingredients.map((ingredient, index) => {
    const reduction = reductions.get(index);
    if (!reduction || reduction === 0) {
      return ingredient;
    }
    
    const parsed = parseIngredientVolume(ingredient);
    if (!parsed) {
      return ingredient;
    }
    
    let currentOz = 0;
    const mlConversion = UNIT_TO_ML[parsed.unit] || 0;
    if (mlConversion > 0) {
      currentOz = (parsed.amount * mlConversion) / 29.5735;
    }
    
    const newOz = Math.max(0.25, currentOz - reduction);
    const newOzRounded = Math.round(newOz * 4) / 4;
    
    const label = ingredient.replace(/^[\d./\s]+(?:oz|ml|dash(?:es)?|tsp|tbsp|barspoon|drop(?:s)?|splash|rinse|float)?\s*/i, '').trim();
    
    return `${newOzRounded} oz ${label}`;
  });
}

export function formatOzAmount(oz: number): string {
  if (oz === 0.25) return '1/4';
  if (oz === 0.5) return '1/2';
  if (oz === 0.75) return '3/4';
  if (oz === 1.25) return '1 1/4';
  if (oz === 1.5) return '1 1/2';
  if (oz === 1.75) return '1 3/4';
  if (oz === 2.25) return '2 1/4';
  if (oz === 2.5) return '2 1/2';
  if (oz === 2.75) return '2 3/4';
  if (Number.isInteger(oz)) return oz.toString();
  return oz.toFixed(2);
}
