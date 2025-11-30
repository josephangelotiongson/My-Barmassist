export interface ParsedVolume {
  amount: number;
  unit: 'oz' | 'ml' | 'dash' | 'tsp' | 'tbsp' | 'barspoon' | 'drop' | 'splash' | 'rinse' | 'float' | 'unknown';
  original: string;
}

export type PreparationMethod = 'shaken' | 'stirred' | 'built' | 'blended' | 'thrown' | 'unknown';

export interface DilutionInfo {
  method: PreparationMethod;
  dilutionPercent: number;
  waterAddedOz: number;
  finalVolumeOz: number;
  displayLabel: string;
}

export const DILUTION_STANDARDS = {
  shaken: {
    percent: 0.27,
    range: { min: 0.25, max: 0.30 },
    label: 'Shaken (12-15 sec)',
    description: 'Vigorous shaking adds ~25-30% water from ice melt'
  },
  stirred: {
    percent: 0.22,
    range: { min: 0.20, max: 0.25 },
    label: 'Stirred (30-45 sec)',
    description: 'Gentle stirring adds ~20-25% water from ice melt'
  },
  built: {
    percent: 0.10,
    range: { min: 0.05, max: 0.15 },
    label: 'Built in glass',
    description: 'Minimal dilution from ice over time (~5-15%)'
  },
  blended: {
    percent: 0.35,
    range: { min: 0.30, max: 0.40 },
    label: 'Blended',
    description: 'Blending with ice adds ~30-40% water'
  },
  thrown: {
    percent: 0.18,
    range: { min: 0.15, max: 0.20 },
    label: 'Thrown',
    description: 'Traditional throwing technique adds ~15-20% water'
  },
  unknown: {
    percent: 0.20,
    range: { min: 0.15, max: 0.25 },
    label: 'Standard',
    description: 'Default assumption of ~20% dilution'
  }
} as const;

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
  
  return totalMl / 29.5735;
}

export function calculateTotalVolumeInOzRounded(ingredients: string[]): number {
  return Math.round(calculateTotalVolumeInOz(ingredients) * 10) / 10;
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

export function detectPreparationMethod(instructions: string | string[]): PreparationMethod {
  const instructionText = Array.isArray(instructions) 
    ? instructions.join(' ').toLowerCase() 
    : (instructions || '').toLowerCase();
  
  const shakenPatterns = [
    /\bshake\b/,
    /\bshaken\b/,
    /\bshaking\b/,
    /shake\s+(?:hard|vigorously|well|with\s+ice)/,
    /dry\s+shake/,
    /reverse\s+dry\s+shake/,
    /whip\s+shake/
  ];
  
  const stirredPatterns = [
    /\bstir\b/,
    /\bstirred\b/,
    /\bstirring\b/,
    /stir\s+(?:gently|well|until\s+chilled)/
  ];
  
  const builtPatterns = [
    /\bbuild\b/,
    /\bbuilt\b/,
    /build\s+(?:in|over\s+ice)/,
    /pour\s+(?:directly|over\s+ice)/,
    /add\s+(?:to|directly\s+to)\s+(?:the\s+)?glass/
  ];
  
  const blendedPatterns = [
    /\bblend\b/,
    /\bblended\b/,
    /\bblender\b/,
    /blend\s+(?:until\s+smooth|with\s+ice)/
  ];
  
  const thrownPatterns = [
    /\bthrow\b/,
    /\bthrown\b/,
    /throw\s+(?:between|back\s+and\s+forth)/
  ];
  
  if (blendedPatterns.some(p => p.test(instructionText))) return 'blended';
  if (shakenPatterns.some(p => p.test(instructionText))) return 'shaken';
  if (stirredPatterns.some(p => p.test(instructionText))) return 'stirred';
  if (thrownPatterns.some(p => p.test(instructionText))) return 'thrown';
  if (builtPatterns.some(p => p.test(instructionText))) return 'built';
  
  return 'unknown';
}

export interface DilutionInfoInternal {
  method: PreparationMethod;
  dilutionPercent: number;
  baseVolumeOz: number;
  waterAddedOz: number;
  finalVolumeOz: number;
  displayLabel: string;
}

export function calculateDilutionInfoInternal(
  ingredients: string[],
  instructions: string | string[] | null | undefined,
  customMethod?: PreparationMethod
): DilutionInfoInternal {
  const baseVolumeOz = calculateTotalVolumeInOz(ingredients);
  const normalizedInstructions = Array.isArray(instructions) 
    ? instructions.filter(Boolean).join(' ')
    : (instructions || '');
  const method = customMethod || detectPreparationMethod(normalizedInstructions);
  const dilutionData = DILUTION_STANDARDS[method];
  
  const dilutionPercent = dilutionData.percent;
  const waterAddedOz = baseVolumeOz * dilutionPercent;
  const finalVolumeOz = baseVolumeOz + waterAddedOz;
  
  return {
    method,
    dilutionPercent,
    baseVolumeOz,
    waterAddedOz,
    finalVolumeOz,
    displayLabel: dilutionData.label
  };
}

export function calculateDilutionInfo(
  ingredients: string[],
  instructions: string | string[] | null | undefined,
  customMethod?: PreparationMethod
): DilutionInfo {
  const internal = calculateDilutionInfoInternal(ingredients, instructions, customMethod);
  
  return {
    method: internal.method,
    dilutionPercent: internal.dilutionPercent,
    waterAddedOz: Math.round(internal.waterAddedOz * 100) / 100,
    finalVolumeOz: Math.round(internal.finalVolumeOz * 100) / 100,
    displayLabel: internal.displayLabel
  };
}

export function calculateFinalVolumeWithDilution(
  ingredients: string[],
  instructions: string | string[] | null | undefined,
  preferredUnit: 'oz' | 'ml' = 'oz'
): string {
  const dilutionInfo = calculateDilutionInfo(ingredients, instructions);
  
  if (dilutionInfo.finalVolumeOz === 0) {
    return '';
  }
  
  if (preferredUnit === 'ml') {
    const totalMl = Math.round(dilutionInfo.finalVolumeOz * 29.5735);
    return `${totalMl} ml`;
  }
  
  return `${dilutionInfo.finalVolumeOz} oz`;
}

export interface AbvCalculationResult {
  baseAbv: number;
  finalAbv: number;
  dilutionFactor: number;
  method: PreparationMethod;
}

function normalizeForAbvLookup(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\d½¼¾⅓⅔⅛⅜⅝⅞.\/]+\s*(oz|ml|cl|dash|dashes|tsp|tbsp|cup|cups|bar\s*spoon|barspoon|drop|drops|splash|splashes|rinse|part|parts)s?\b/gi, '')
    .replace(/^\s*(oz|ml|cl|dash|dashes|tsp|tbsp|cup|cups|bar\s*spoon|barspoon|drop|drops|splash|splashes|rinse|part|parts)s?\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateIngredientAbvContribution(
  ingredientLine: string,
  ingredientAbvMap: Record<string, number>
): { volumeOz: number; alcoholOz: number } {
  const parsed = parseIngredientVolume(ingredientLine);
  if (!parsed) {
    return { volumeOz: 0, alcoholOz: 0 };
  }
  
  let volumeOz = 0;
  const mlConversion = UNIT_TO_ML[parsed.unit] || 0;
  if (mlConversion > 0) {
    volumeOz = (parsed.amount * mlConversion) / 29.5735;
  }
  
  const ingredientName = normalizeForAbvLookup(ingredientLine);
  
  let abv = 0;
  for (const [key, value] of Object.entries(ingredientAbvMap)) {
    if (ingredientName.includes(key.toLowerCase())) {
      abv = value;
      break;
    }
  }
  
  const alcoholOz = volumeOz * (abv / 100);
  
  return { volumeOz, alcoholOz };
}

export const COMMON_INGREDIENT_ABV: Record<string, number> = {
  'vodka': 40,
  'gin': 40,
  'rum': 40,
  'white rum': 40,
  'light rum': 40,
  'dark rum': 40,
  'aged rum': 40,
  'overproof rum': 63,
  'navy strength': 57,
  'tequila': 40,
  'blanco tequila': 40,
  'reposado tequila': 40,
  'anejo tequila': 40,
  'mezcal': 45,
  'whiskey': 40,
  'bourbon': 45,
  'rye': 45,
  'scotch': 43,
  'irish whiskey': 40,
  'brandy': 40,
  'cognac': 40,
  'pisco': 42,
  'absinthe': 65,
  'chartreuse': 55,
  'green chartreuse': 55,
  'yellow chartreuse': 40,
  'benedictine': 40,
  'cointreau': 40,
  'triple sec': 30,
  'grand marnier': 40,
  'curacao': 25,
  'blue curacao': 25,
  'maraschino': 32,
  'luxardo': 32,
  'amaretto': 28,
  'kahlua': 20,
  'coffee liqueur': 20,
  'baileys': 17,
  'cream liqueur': 17,
  'campari': 25,
  'aperol': 11,
  'fernet': 45,
  'fernet branca': 39,
  'cynar': 16.5,
  'amaro': 25,
  'vermouth': 18,
  'sweet vermouth': 16,
  'dry vermouth': 18,
  'blanc vermouth': 16,
  'lillet': 17,
  'lillet blanc': 17,
  'cocchi': 16,
  'sherry': 17,
  'fino sherry': 15,
  'oloroso sherry': 18,
  'port': 20,
  'madeira': 19,
  'marsala': 18,
  'champagne': 12,
  'prosecco': 11,
  'sparkling wine': 12,
  'wine': 12,
  'white wine': 12,
  'red wine': 13,
  'beer': 5,
  'lager': 5,
  'ale': 5,
  'stout': 5,
  'cider': 5,
  'sake': 15,
  'pernod': 40,
  'pastis': 45,
  'ouzo': 40,
  'aquavit': 42,
  'sloe gin': 26,
  'st germain': 20,
  'elderflower liqueur': 20,
  'creme de cassis': 20,
  'creme de violette': 20,
  'creme de cacao': 25,
  'white creme de cacao': 25,
  'dark creme de cacao': 25,
  'creme de menthe': 24,
  'green creme de menthe': 24,
  'white creme de menthe': 24,
  'creme de mure': 16,
  'blackberry liqueur': 16,
  'creme de banane': 17,
  'banana liqueur': 17,
  'creme de fraise': 15,
  'strawberry liqueur': 15,
  'creme de framboise': 16,
  'raspberry liqueur': 16,
  'creme de noyaux': 25,
  'creme de peche': 15,
  'peach liqueur': 15,
  'cherry heering': 24,
  'cherry liqueur': 24,
  'irish cream': 17,
  'frangelico': 20,
  'drambuie': 40,
  'galliano': 42.3,
  'midori': 20,
  'chambord': 16.5,
  'peach schnapps': 20,
  'limoncello': 28,
  'sambuca': 42,
  'grappa': 40,
  'genever': 35,
  'batavia arrack': 50,
  'falernum': 11,
  'allspice dram': 22,
  'pimento dram': 22,
  'velvet falernum': 11,
  'orgeat': 0,
  'simple syrup': 0,
  'honey syrup': 0,
  'grenadine': 0,
  'lime juice': 0,
  'lemon juice': 0,
  'orange juice': 0,
  'cranberry juice': 0,
  'pineapple juice': 0,
  'grapefruit juice': 0,
  'soda': 0,
  'club soda': 0,
  'tonic': 0,
  'ginger beer': 0,
  'ginger ale': 0,
  'cola': 0,
  'cream': 0,
  'heavy cream': 0,
  'light cream': 0,
  'half and half': 0,
  'milk': 0,
  'coconut cream': 0,
  'coconut milk': 0,
  'egg': 0,
  'egg white': 0,
  'egg yolk': 0,
  'aquafaba': 0,
  'water': 0,
  'ice': 0,
  'espresso': 0,
  'cold brew': 0,
  'coffee': 0,
  'tea': 0,
  'tomato juice': 0,
  'clamato': 0,
  'apple juice': 0,
  'passion fruit': 0,
  'mango': 0,
  'banana': 0,
  'strawberry': 0,
  'raspberry': 0,
  'mint': 0,
  'basil': 0,
  'cucumber': 0,
  'jalapeño': 0,
  'bitters': 44,
  'angostura': 44,
  'peychauds': 35,
  'orange bitters': 45,
};

export function calculateFinalAbvAfterDilution(
  ingredients: string[],
  instructions: string | string[] | null | undefined,
  ingredientAbvOverrides?: Record<string, number>
): AbvCalculationResult {
  const abvMap = { ...COMMON_INGREDIENT_ABV, ...ingredientAbvOverrides };
  const dilutionInternal = calculateDilutionInfoInternal(ingredients, instructions);
  const method = dilutionInternal.method;
  
  let totalAlcoholOz = 0;
  
  for (const ingredient of ingredients) {
    const { alcoholOz } = calculateIngredientAbvContribution(ingredient, abvMap);
    totalAlcoholOz += alcoholOz;
  }
  
  if (dilutionInternal.baseVolumeOz === 0) {
    return {
      baseAbv: 0,
      finalAbv: 0,
      dilutionFactor: 1,
      method
    };
  }
  
  const baseAbv = (totalAlcoholOz / dilutionInternal.baseVolumeOz) * 100;
  const finalAbv = (totalAlcoholOz / dilutionInternal.finalVolumeOz) * 100;
  const dilutionFactor = dilutionInternal.baseVolumeOz / dilutionInternal.finalVolumeOz;
  
  return {
    baseAbv: Math.round(baseAbv * 10) / 10,
    finalAbv: Math.round(finalAbv * 10) / 10,
    dilutionFactor: Math.round(dilutionFactor * 100) / 100,
    method
  };
}

export interface CompleteDrinkMetrics {
  baseVolumeOz: number;
  finalVolumeOz: number;
  waterAddedOz: number;
  baseAbv: number;
  finalAbv: number;
  method: PreparationMethod;
  methodLabel: string;
  dilutionPercent: number;
}

export function calculateCompleteDrinkMetrics(
  ingredients: string[],
  instructions: string | string[] | null | undefined,
  ingredientAbvOverrides?: Record<string, number>
): CompleteDrinkMetrics {
  const dilutionInternal = calculateDilutionInfoInternal(ingredients, instructions);
  const abvResult = calculateFinalAbvAfterDilution(ingredients, instructions, ingredientAbvOverrides);
  
  return {
    baseVolumeOz: Math.round(dilutionInternal.baseVolumeOz * 100) / 100,
    finalVolumeOz: Math.round(dilutionInternal.finalVolumeOz * 100) / 100,
    waterAddedOz: Math.round(dilutionInternal.waterAddedOz * 100) / 100,
    baseAbv: abvResult.baseAbv,
    finalAbv: abvResult.finalAbv,
    method: dilutionInternal.method,
    methodLabel: dilutionInternal.displayLabel,
    dilutionPercent: Math.round(dilutionInternal.dilutionPercent * 100)
  };
}
