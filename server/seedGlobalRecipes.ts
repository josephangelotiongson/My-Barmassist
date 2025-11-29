import { db } from './db';
import { globalRecipes, InsertGlobalRecipe } from '../shared/schema';
import { INITIAL_RECIPES_DATA } from '../initialData';
import { eq } from 'drizzle-orm';
import { Cocktail } from '../types';

interface ExtendedRecipe extends Cocktail {
  glassType?: string;
  garnish?: string;
}

function createSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function seedGlobalRecipes(): Promise<{ inserted: number; skipped: number }> {
  console.log(`Starting to seed ${INITIAL_RECIPES_DATA.length} recipes into global_recipes table...`);
  
  let inserted = 0;
  let skipped = 0;

  for (const baseRecipe of INITIAL_RECIPES_DATA) {
    const recipe = baseRecipe as ExtendedRecipe;
    const slug = createSlug(recipe.name);
    
    const existing = await db.select().from(globalRecipes).where(eq(globalRecipes.slug, slug)).limit(1);
    
    if (existing.length > 0) {
      console.log(`Skipping "${recipe.name}" - already exists`);
      skipped++;
      continue;
    }

    const instructionsArray = Array.isArray(recipe.instructions) 
      ? recipe.instructions 
      : [recipe.instructions];

    const newRecipe: InsertGlobalRecipe = {
      slug,
      name: recipe.name,
      description: recipe.description || null,
      history: recipe.history || null,
      category: recipe.category || null,
      ingredients: recipe.ingredients,
      instructions: instructionsArray,
      glassType: recipe.glassType || null,
      garnish: recipe.garnish || null,
      creator: recipe.creator || null,
      creatorType: recipe.creatorType || null,
      flavorProfile: recipe.flavorProfile || null,
      nutrition: null,
      enrichmentStatus: recipe.flavorProfile ? 'partial' : 'pending',
    };

    await db.insert(globalRecipes).values(newRecipe);
    console.log(`Inserted "${recipe.name}"`);
    inserted++;
  }

  console.log(`Seeding complete: ${inserted} inserted, ${skipped} skipped`);
  return { inserted, skipped };
}

