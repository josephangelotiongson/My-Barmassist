import { db } from './db';
import { 
  flavorCategories,
  flavorSubcategories, 
  flavorNotes, 
  ingredientFlavorMappings,
  flavorDataVersion 
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { FLAVOR_TAXONOMY, FlavorCategory, FlavorSubcategory, FlavorNote } from '../shared/flavorTaxonomy';

export interface FlavorCategoryData {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  description?: string | null;
  subcategories?: FlavorSubcategoryData[];
  notes: FlavorNoteData[];
}

export interface FlavorSubcategoryData {
  id: string;
  label: string;
  notes: FlavorNoteData[];
}

export interface FlavorNoteData {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  label: string;
  sortOrder: number;
  description?: string | null;
  keywords?: string[] | null;
}

export interface IngredientFlavorData {
  ingredientKeyword: string;
  noteId: string;
  intensity: number;
  isPrimary: boolean;
}

export interface FlavorTaxonomyResponse {
  version: string;
  categories: FlavorCategoryData[];
  ingredientMappings: Record<string, string[]>;
}

export interface Full3TierTaxonomyResponse {
  version: string;
  categories: Array<{
    id: string;
    label: string;
    color: string;
    subcategories: Array<{
      id: string;
      label: string;
      notes: Array<{
        id: string;
        label: string;
      }>;
    }>;
  }>;
  ingredientMappings: Record<string, string[]>;
}

let cachedTaxonomy: FlavorTaxonomyResponse | null = null;
let cached3TierTaxonomy: Full3TierTaxonomyResponse | null = null;
let cacheVersion2Tier: string | null = null;
let cacheVersion3Tier: string | null = null;

export async function getFlavorTaxonomy(): Promise<FlavorTaxonomyResponse> {
  const currentVersion = await getCurrentVersion();
  
  if (cachedTaxonomy && cacheVersion2Tier === currentVersion) {
    return cachedTaxonomy;
  }
  
  const categories = await db.select().from(flavorCategories).orderBy(flavorCategories.sortOrder);
  const subcategoriesData = await db.select().from(flavorSubcategories).orderBy(flavorSubcategories.sortOrder);
  const notes = await db.select().from(flavorNotes).orderBy(flavorNotes.sortOrder);
  const mappings = await db.select().from(ingredientFlavorMappings);
  
  if (categories.length === 0) {
    console.warn('WARNING: Flavor taxonomy tables are empty! Run POST /api/admin/seed-flavor-data to initialize the 3-tier flavor taxonomy.');
    console.warn('Returning static taxonomy as fallback - ingredient mappings will not be available.');
    const staticCategories: FlavorCategoryData[] = FLAVOR_TAXONOMY.map(cat => ({
      id: cat.id,
      label: cat.label,
      color: cat.color,
      sortOrder: 0,
      description: null,
      subcategories: cat.subcategories.map(sub => ({
        id: sub.id,
        label: sub.label,
        notes: sub.notes.map(n => ({
          id: n.id,
          categoryId: cat.id,
          subcategoryId: sub.id,
          label: n.label,
          sortOrder: 0,
          description: null,
          keywords: null
        }))
      })),
      notes: []
    }));
    cachedTaxonomy = {
      version: currentVersion,
      categories: staticCategories,
      ingredientMappings: {}
    };
    cacheVersion2Tier = currentVersion;
    return cachedTaxonomy;
  }
  
  const subcategoryMap = new Map<string, typeof subcategoriesData[0][]>();
  for (const sub of subcategoriesData) {
    if (!subcategoryMap.has(sub.categoryId)) {
      subcategoryMap.set(sub.categoryId, []);
    }
    subcategoryMap.get(sub.categoryId)!.push(sub);
  }
  
  const notesBySubcategory = new Map<string, typeof notes[0][]>();
  const notesByCategory = new Map<string, typeof notes[0][]>();
  for (const note of notes) {
    const subId = note.subcategoryId || `${note.categoryId}.default`;
    if (!notesBySubcategory.has(subId)) {
      notesBySubcategory.set(subId, []);
    }
    notesBySubcategory.get(subId)!.push(note);
    
    if (!notesByCategory.has(note.categoryId)) {
      notesByCategory.set(note.categoryId, []);
    }
    notesByCategory.get(note.categoryId)!.push(note);
  }
  
  const categoryList: FlavorCategoryData[] = categories.map(cat => ({
    id: cat.id,
    label: cat.label,
    color: cat.color,
    sortOrder: cat.sortOrder,
    description: cat.description,
    subcategories: (subcategoryMap.get(cat.id) || []).map(sub => ({
      id: sub.id,
      label: sub.label,
      notes: (notesBySubcategory.get(sub.id) || []).map(n => ({
        id: n.id,
        categoryId: n.categoryId,
        subcategoryId: n.subcategoryId || undefined,
        label: n.label,
        sortOrder: n.sortOrder,
        description: n.description,
        keywords: n.keywords
      }))
    })),
    notes: (notesByCategory.get(cat.id) || []).map(n => ({
      id: n.id,
      categoryId: n.categoryId,
      subcategoryId: n.subcategoryId || undefined,
      label: n.label,
      sortOrder: n.sortOrder,
      description: n.description,
      keywords: n.keywords
    }))
  }));
  
  const ingredientMappings: Record<string, string[]> = {};
  for (const mapping of mappings) {
    if (!ingredientMappings[mapping.ingredientKeyword]) {
      ingredientMappings[mapping.ingredientKeyword] = [];
    }
    ingredientMappings[mapping.ingredientKeyword].push(mapping.noteId);
  }
  
  cachedTaxonomy = {
    version: currentVersion,
    categories: categoryList,
    ingredientMappings
  };
  cacheVersion2Tier = currentVersion;
  
  return cachedTaxonomy;
}

export async function getFull3TierTaxonomy(): Promise<Full3TierTaxonomyResponse> {
  const currentVersion = await getCurrentVersion();
  
  if (cached3TierTaxonomy && cacheVersion3Tier === currentVersion) {
    return cached3TierTaxonomy;
  }
  
  const categories = await db.select().from(flavorCategories).orderBy(flavorCategories.sortOrder);
  const subcategories = await db.select().from(flavorSubcategories).orderBy(flavorSubcategories.sortOrder);
  const notes = await db.select().from(flavorNotes).orderBy(flavorNotes.sortOrder);
  const mappings = await db.select().from(ingredientFlavorMappings);
  
  if (categories.length === 0) {
    console.warn('WARNING: Flavor taxonomy tables are empty! Run POST /api/admin/seed-flavor-data to initialize the 3-tier flavor taxonomy.');
    console.warn('Returning static taxonomy as fallback - ingredient mappings will not be available.');
    cached3TierTaxonomy = {
      version: currentVersion,
      categories: FLAVOR_TAXONOMY.map(cat => ({
        id: cat.id,
        label: cat.label,
        color: cat.color,
        subcategories: cat.subcategories.map(sub => ({
          id: sub.id,
          label: sub.label,
          notes: sub.notes.map(n => ({
            id: n.id,
            label: n.label
          }))
        }))
      })),
      ingredientMappings: {}
    };
    cacheVersion3Tier = currentVersion;
    return cached3TierTaxonomy;
  }
  
  const subcategoryMap = new Map<string, typeof subcategories[0][]>();
  for (const sub of subcategories) {
    if (!subcategoryMap.has(sub.categoryId)) {
      subcategoryMap.set(sub.categoryId, []);
    }
    subcategoryMap.get(sub.categoryId)!.push(sub);
  }
  
  const notesBySubcategory = new Map<string, typeof notes[0][]>();
  for (const note of notes) {
    const subId = note.subcategoryId || `${note.categoryId}.default`;
    if (!notesBySubcategory.has(subId)) {
      notesBySubcategory.set(subId, []);
    }
    notesBySubcategory.get(subId)!.push(note);
  }
  
  const ingredientMappings: Record<string, string[]> = {};
  for (const mapping of mappings) {
    if (!ingredientMappings[mapping.ingredientKeyword]) {
      ingredientMappings[mapping.ingredientKeyword] = [];
    }
    ingredientMappings[mapping.ingredientKeyword].push(mapping.noteId);
  }
  
  cached3TierTaxonomy = {
    version: currentVersion,
    categories: categories.map(cat => ({
      id: cat.id,
      label: cat.label,
      color: cat.color,
      subcategories: (subcategoryMap.get(cat.id) || []).map(sub => ({
        id: sub.id,
        label: sub.label,
        notes: (notesBySubcategory.get(sub.id) || []).map(n => ({
          id: n.id,
          label: n.label
        }))
      }))
    })),
    ingredientMappings
  };
  cacheVersion3Tier = currentVersion;
  
  return cached3TierTaxonomy;
}

export async function getCurrentVersion(): Promise<string> {
  const result = await db.select().from(flavorDataVersion).orderBy(sql`${flavorDataVersion.updatedAt} DESC`).limit(1);
  return result.length > 0 ? result[0].version : '1.0.0';
}

export interface DerivedFlavorResult {
  matchedNotes: string[];
  categoryIntensities: Record<string, number>;
  derivedCategories: string[];
  unmatchedIngredients: string[];
  noteDetails: Array<{ id: string; label: string; categoryId: string; categoryLabel: string }>;
}

function getCategoryLabel(catId: string): string {
  const category = FLAVOR_TAXONOMY.find(c => c.id === catId);
  return category?.label || catId.charAt(0).toUpperCase() + catId.slice(1);
}

export async function deriveFlavorNotesFromIngredients(ingredients: string[]): Promise<DerivedFlavorResult> {
  const taxonomy = await getFlavorTaxonomy();
  const categoryIntensities: Record<string, number> = {};
  const noteSet = new Set<string>();
  const matchedIngredients = new Set<string>();
  
  for (const ingredient of ingredients) {
    const name = ingredient.toLowerCase().trim();
    let matched = false;
    
    for (const [keyword, noteIds] of Object.entries(taxonomy.ingredientMappings)) {
      if (name.includes(keyword) || keyword.includes(name)) {
        matched = true;
        for (const noteId of noteIds) {
          noteSet.add(noteId);
          const catId = noteId.split('.')[0];
          const catLabel = getCategoryLabel(catId);
          categoryIntensities[catLabel] = (categoryIntensities[catLabel] || 0) + 1;
        }
      }
    }
    
    const words = name.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue;
      for (const [keyword, noteIds] of Object.entries(taxonomy.ingredientMappings)) {
        if (keyword === word) {
          matched = true;
          for (const noteId of noteIds) {
            noteSet.add(noteId);
            const catId = noteId.split('.')[0];
            const catLabel = getCategoryLabel(catId);
            categoryIntensities[catLabel] = (categoryIntensities[catLabel] || 0) + 1;
          }
        }
      }
    }
    
    if (matched) {
      matchedIngredients.add(name);
    }
  }
  
  const noteDetails: Array<{ id: string; label: string; categoryId: string; categoryLabel: string }> = [];
  for (const noteId of noteSet) {
    const [catId] = noteId.split('.');
    const category = taxonomy.categories.find(c => c.id === catId);
    const note = category?.notes.find(n => n.id === noteId);
    if (category && note) {
      noteDetails.push({
        id: noteId,
        label: note.label,
        categoryId: catId,
        categoryLabel: category.label
      });
    }
  }
  
  const unmatchedIngredients = ingredients
    .map(i => i.toLowerCase().trim())
    .filter(i => !matchedIngredients.has(i));
  
  return {
    matchedNotes: Array.from(noteSet),
    categoryIntensities,
    derivedCategories: Object.keys(categoryIntensities),
    unmatchedIngredients,
    noteDetails
  };
}

export async function getFlavorDataForAI(): Promise<string> {
  let prompt = `## 3-TIER FLAVOR TAXONOMY REFERENCE

This is the authoritative flavor classification system for cocktails. Use this hierarchy when analyzing drinks:

`;

  for (const category of FLAVOR_TAXONOMY) {
    prompt += `### ${category.label.toUpperCase()} (${category.id})\n`;
    for (const subcategory of category.subcategories) {
      const noteLabels = subcategory.notes.map(n => n.label).join(', ');
      prompt += `  - ${subcategory.label}: ${noteLabels}\n`;
    }
    prompt += '\n';
  }
  
  prompt += `## INGREDIENT-TO-FLAVOR MAPPINGS

Use these known flavor associations when interpreting cocktail ingredients:

`;

  const taxonomy = await getFlavorTaxonomy();
  const sortedMappings = Object.entries(taxonomy.ingredientMappings)
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [ingredient, noteIds] of sortedMappings) {
    const noteLabels = noteIds.map(id => {
      const parts = id.split('.');
      if (parts.length >= 3) {
        const cat = FLAVOR_TAXONOMY.find(c => c.id === parts[0]);
        const sub = cat?.subcategories.find(s => s.id === `${parts[0]}.${parts[1]}`);
        const note = sub?.notes.find(n => n.id === id);
        return note?.label || parts[parts.length - 1];
      }
      return id;
    });
    prompt += `- **${ingredient}**: ${noteLabels.join(', ')}\n`;
  }
  
  return prompt;
}

export function get3TierTaxonomy(): typeof FLAVOR_TAXONOMY {
  return FLAVOR_TAXONOMY;
}

export function deriveFlavorProfileFromNotes(noteIds: string[]): Record<string, number> {
  const profile: Record<string, number> = {
    Sweet: 0, Fruity: 0, Floral: 0, Herbal: 0,
    Spicy: 0, Earthy: 0, Sour: 0, Boozy: 0
  };
  
  const catCounts: Record<string, number[]> = {};
  
  for (const noteId of noteIds) {
    const parts = noteId.split('.');
    if (parts.length < 2) continue;
    
    const catId = parts[0];
    const cat = FLAVOR_TAXONOMY.find(c => c.id === catId);
    if (!cat) continue;
    
    if (!catCounts[cat.label]) {
      catCounts[cat.label] = [];
    }
    catCounts[cat.label].push(5);
  }
  
  for (const [label, intensities] of Object.entries(catCounts)) {
    if (intensities.length === 0) continue;
    const maxIntensity = Math.max(...intensities);
    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    profile[label] = Math.min(10, Math.round(0.7 * maxIntensity + 0.3 * avgIntensity + intensities.length * 0.5));
  }
  
  return profile;
}

export async function invalidateCache(): Promise<void> {
  cachedTaxonomy = null;
  cached3TierTaxonomy = null;
  cacheVersion2Tier = null;
  cacheVersion3Tier = null;
}

export async function updateVersion(newVersion: string, description?: string): Promise<void> {
  await db.insert(flavorDataVersion).values({
    version: newVersion,
    description: description || `Updated to version ${newVersion}`
  });
  await invalidateCache();
}

export interface IngredientFlavorDerivation {
  noteIds: string[];
  intensities: Record<string, number>;
  noteLabels: string[];
}

export async function deriveFlavorForIngredient(ingredientName: string): Promise<IngredientFlavorDerivation> {
  const taxonomy = await getFlavorTaxonomy();
  const name = ingredientName.toLowerCase().trim();
  const noteIds: string[] = [];
  const intensities: Record<string, number> = {};
  
  for (const [keyword, mappedNoteIds] of Object.entries(taxonomy.ingredientMappings)) {
    const keywordLower = keyword.toLowerCase();
    if (name === keywordLower || name.includes(keywordLower) || keywordLower.includes(name)) {
      for (const noteId of mappedNoteIds) {
        if (!noteIds.includes(noteId)) {
          noteIds.push(noteId);
        }
        const catId = noteId.split('.')[0];
        intensities[catId] = (intensities[catId] || 0) + 1;
      }
    }
  }
  
  const words = name.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const [keyword, mappedNoteIds] of Object.entries(taxonomy.ingredientMappings)) {
      if (keyword.toLowerCase() === word) {
        for (const noteId of mappedNoteIds) {
          if (!noteIds.includes(noteId)) {
            noteIds.push(noteId);
          }
          const catId = noteId.split('.')[0];
          intensities[catId] = (intensities[catId] || 0) + 1;
        }
      }
    }
  }
  
  const noteLabels: string[] = [];
  for (const noteId of noteIds) {
    const [catId] = noteId.split('.');
    const category = taxonomy.categories.find(c => c.id === catId);
    const note = category?.notes.find(n => n.id === noteId);
    if (note) {
      noteLabels.push(note.label);
    }
  }
  
  return { noteIds, intensities, noteLabels };
}

export async function getIngredientFlavorContext(ingredientNames: string[]): Promise<string> {
  const taxonomy = await getFlavorTaxonomy();
  const results: Array<{ name: string; derivation: IngredientFlavorDerivation }> = [];
  
  for (const name of ingredientNames) {
    const derivation = await deriveFlavorForIngredient(name);
    if (derivation.noteIds.length > 0) {
      results.push({ name, derivation });
    }
  }
  
  if (results.length === 0) {
    return '';
  }
  
  let context = `## Ingredient Flavor Analysis\n\n`;
  context += `The following ingredients have been matched to our flavor taxonomy:\n\n`;
  
  for (const { name, derivation } of results) {
    const intensityStr = Object.entries(derivation.intensities)
      .map(([cat, intensity]) => {
        const category = taxonomy.categories.find(c => c.id === cat);
        return `${category?.label || cat}: ${intensity}`;
      })
      .join(', ');
    
    context += `- **${name}**: ${derivation.noteLabels.join(', ')} (${intensityStr})\n`;
  }
  
  return context;
}
