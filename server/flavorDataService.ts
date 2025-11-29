import { db } from './db';
import { 
  flavorCategories, 
  flavorNotes, 
  ingredientFlavorMappings,
  flavorDataVersion 
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface FlavorCategoryData {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  description?: string | null;
  notes: FlavorNoteData[];
}

export interface FlavorNoteData {
  id: string;
  categoryId: string;
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

let cachedTaxonomy: FlavorTaxonomyResponse | null = null;
let cacheVersion: string | null = null;

export async function getFlavorTaxonomy(): Promise<FlavorTaxonomyResponse> {
  const currentVersion = await getCurrentVersion();
  
  if (cachedTaxonomy && cacheVersion === currentVersion) {
    return cachedTaxonomy;
  }
  
  const categories = await db.select().from(flavorCategories).orderBy(flavorCategories.sortOrder);
  const notes = await db.select().from(flavorNotes).orderBy(flavorNotes.sortOrder);
  const mappings = await db.select().from(ingredientFlavorMappings);
  
  const categoryMap = new Map<string, FlavorCategoryData>();
  
  for (const cat of categories) {
    categoryMap.set(cat.id, {
      id: cat.id,
      label: cat.label,
      color: cat.color,
      sortOrder: cat.sortOrder,
      description: cat.description,
      notes: []
    });
  }
  
  for (const note of notes) {
    const category = categoryMap.get(note.categoryId);
    if (category) {
      category.notes.push({
        id: note.id,
        categoryId: note.categoryId,
        label: note.label,
        sortOrder: note.sortOrder,
        description: note.description,
        keywords: note.keywords
      });
    }
  }
  
  const ingredientMappings: Record<string, string[]> = {};
  for (const mapping of mappings) {
    if (!ingredientMappings[mapping.ingredientKeyword]) {
      ingredientMappings[mapping.ingredientKeyword] = [];
    }
    ingredientMappings[mapping.ingredientKeyword].push(mapping.noteId);
  }
  
  cachedTaxonomy = {
    version: currentVersion,
    categories: Array.from(categoryMap.values()),
    ingredientMappings
  };
  cacheVersion = currentVersion;
  
  return cachedTaxonomy;
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
          categoryIntensities[catId] = (categoryIntensities[catId] || 0) + 1;
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
            categoryIntensities[catId] = (categoryIntensities[catId] || 0) + 1;
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
  const taxonomy = await getFlavorTaxonomy();
  
  let prompt = `## Flavor Taxonomy Reference\n\n`;
  prompt += `Use this standardized flavor vocabulary when analyzing or describing cocktails:\n\n`;
  
  for (const category of taxonomy.categories) {
    prompt += `### ${category.label}\n`;
    prompt += `Notes: ${category.notes.map(n => n.label).join(', ')}\n\n`;
  }
  
  prompt += `## Ingredient-to-Flavor Mappings\n\n`;
  prompt += `Use these known flavor associations when interpreting ingredients:\n\n`;
  
  const sortedMappings = Object.entries(taxonomy.ingredientMappings)
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [ingredient, noteIds] of sortedMappings) {
    const noteLabels = noteIds.map(id => {
      const [catId, noteKey] = id.split('.');
      const category = taxonomy.categories.find(c => c.id === catId);
      const note = category?.notes.find(n => n.id === id);
      return note?.label || noteKey;
    });
    prompt += `- **${ingredient}**: ${noteLabels.join(', ')}\n`;
  }
  
  return prompt;
}

export async function invalidateCache(): Promise<void> {
  cachedTaxonomy = null;
  cacheVersion = null;
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
