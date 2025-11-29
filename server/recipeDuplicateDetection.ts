/**
 * Recipe Duplicate Detection Utility
 * 
 * Provides functions to detect duplicate recipes based on:
 * 1. Exact name matching (case-insensitive)
 * 2. Normalized name matching (handles variations like "The Manhattan" vs "Manhattan")
 * 3. Ingredient signature matching (detects recipes with same ingredients but different names)
 */

/**
 * Normalize a recipe name for comparison
 * - Lowercase
 * - Remove common prefixes (The, A, An)
 * - Remove special characters
 * - Trim whitespace
 */
export function normalizeRecipeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/[''`]/g, "'") // Normalize apostrophes
    .replace(/[^\w\s']/g, '') // Remove special chars except apostrophe
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Compute an ingredient signature hash for a recipe
 * This creates a normalized representation of the ingredients that can be compared
 * to detect recipes with the same ingredients regardless of:
 * - Quantity differences
 * - Order differences  
 * - Minor wording variations
 */
export function computeRecipeSignature(ingredients: string[]): string {
  if (!ingredients || ingredients.length === 0) {
    return 'empty';
  }

  // Normalize each ingredient
  const normalized = ingredients
    .map(ing => {
      return ing.toLowerCase()
        // Remove quantities and measurements
        .replace(/\d+(\.\d+)?/g, '')
        .replace(/(oz|ml|cl|dash|dashes|splash|drop|drops|tsp|tbsp|bar\s*spoon|cup|slice|slices|wedge|wedges|wheel|wheels|twist|twists|sprig|sprigs|leaf|leaves|piece|pieces|inch|cm|fresh|chilled|cold|hot|warm)/gi, '')
        // Remove special characters
        .replace(/[^\w\s]/g, '')
        .trim()
        // Split into words, filter short ones, and sort
        .split(/\s+/)
        .filter(w => w.length > 2)
        .sort()
        .join(' ');
    })
    .filter(ing => ing.length > 0)
    .sort()
    .join('|');

  // Generate hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `rsig_${Math.abs(hash).toString(16)}`;
}

/**
 * Check if two recipes are likely duplicates based on name similarity
 * Uses Levenshtein distance for fuzzy matching
 */
export function areNamesSimlar(name1: string, name2: string, threshold = 0.85): boolean {
  const normalized1 = normalizeRecipeName(name1);
  const normalized2 = normalizeRecipeName(name2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Calculate similarity ratio
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity >= threshold;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'exact_name' | 'similar_name' | 'same_ingredients' | 'global_recipe';
  existingRecipe?: {
    id?: number;
    name: string;
    source?: 'user' | 'global';
  };
  message?: string;
}

/**
 * Check for duplicate recipes across user recipes and global recipes
 */
export async function checkForDuplicates(
  name: string,
  ingredients: string[],
  userId: string,
  storage: any
): Promise<DuplicateCheckResult> {
  const normalizedName = normalizeRecipeName(name);
  const signature = computeRecipeSignature(ingredients);
  
  // 1. Check exact name match in user recipes
  const hasExactName = await storage.userHasRecipeByName(userId, name);
  if (hasExactName) {
    return {
      isDuplicate: true,
      duplicateType: 'exact_name',
      message: `You already have a recipe called "${name}" in your collection.`
    };
  }
  
  // 2. Check for similar names in user recipes
  const userRecipes = await storage.getUserRecipes(userId);
  for (const recipe of userRecipes) {
    if (areNamesSimlar(name, recipe.name)) {
      return {
        isDuplicate: true,
        duplicateType: 'similar_name',
        existingRecipe: { id: recipe.id, name: recipe.name, source: 'user' },
        message: `Found a similar recipe "${recipe.name}" in your collection.`
      };
    }
  }
  
  // 3. Check for same ingredients in user recipes (signature match)
  for (const recipe of userRecipes) {
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      const existingSignature = computeRecipeSignature(recipe.ingredients);
      if (signature === existingSignature && signature !== 'empty') {
        return {
          isDuplicate: true,
          duplicateType: 'same_ingredients',
          existingRecipe: { id: recipe.id, name: recipe.name, source: 'user' },
          message: `Found a recipe with the same ingredients: "${recipe.name}".`
        };
      }
    }
  }
  
  // 4. Check global recipes for exact/similar name matches
  const globalRecipes = await storage.getAllGlobalRecipes();
  for (const recipe of globalRecipes) {
    if (normalizeRecipeName(recipe.name) === normalizedName) {
      return {
        isDuplicate: true,
        duplicateType: 'global_recipe',
        existingRecipe: { name: recipe.name, source: 'global' },
        message: `"${recipe.name}" is already in the global recipe library.`
      };
    }
  }
  
  return { isDuplicate: false };
}

/**
 * Check for duplicates in global recipes only (for admin operations)
 */
export async function checkGlobalDuplicate(
  name: string,
  ingredients: string[],
  storage: any
): Promise<DuplicateCheckResult> {
  const normalizedName = normalizeRecipeName(name);
  const signature = computeRecipeSignature(ingredients);
  
  const globalRecipes = await storage.getAllGlobalRecipes();
  
  // Check for exact or similar name
  for (const recipe of globalRecipes) {
    if (normalizeRecipeName(recipe.name) === normalizedName) {
      return {
        isDuplicate: true,
        duplicateType: 'exact_name',
        existingRecipe: { name: recipe.name, source: 'global' },
        message: `A global recipe named "${recipe.name}" already exists.`
      };
    }
    
    if (areNamesSimlar(name, recipe.name, 0.9)) {
      return {
        isDuplicate: true,
        duplicateType: 'similar_name',
        existingRecipe: { name: recipe.name, source: 'global' },
        message: `Found a similar global recipe: "${recipe.name}".`
      };
    }
  }
  
  // Check for same ingredients
  for (const recipe of globalRecipes) {
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      const existingSignature = computeRecipeSignature(recipe.ingredients);
      if (signature === existingSignature && signature !== 'empty') {
        return {
          isDuplicate: true,
          duplicateType: 'same_ingredients',
          existingRecipe: { name: recipe.name, source: 'global' },
          message: `Found a global recipe with the same ingredients: "${recipe.name}".`
        };
      }
    }
  }
  
  return { isDuplicate: false };
}
