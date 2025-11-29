import { db } from './db';
import { masterIngredients } from '../shared/schema';
import { INITIAL_MASTER_DATA } from '../initialData';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedMasterIngredients(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;

  for (const ingredient of INITIAL_MASTER_DATA) {
    const slug = generateSlug(ingredient.name);
    
    try {
      await db.insert(masterIngredients).values({
        slug,
        name: ingredient.name,
        category: ingredient.category,
        subCategory: ingredient.subCategory || null,
        ingredientType: ingredient.category.toLowerCase(),
        isGeneric: ingredient.isGeneric ?? true,
        abv: ingredient.abv ?? null,
        nutrition: ingredient.nutritionEstimate ? {
          caloriesPerOz: ingredient.nutritionEstimate.caloriesPerOz,
          carbsPerOz: ingredient.nutritionEstimate.carbsPerOz,
          sugarPerOz: ingredient.nutritionEstimate.carbsPerOz * 0.8,
          proteinPerOz: 0,
        } : null,
        flavorNotes: ingredient.defaultFlavorNotes || null,
        enrichmentStatus: 'pending',
      }).onConflictDoNothing();
      
      seeded++;
    } catch (error: any) {
      if (error?.code === '23505') {
        skipped++;
      } else {
        console.error(`Error seeding ingredient "${ingredient.name}":`, error);
        skipped++;
      }
    }
  }

  console.log(`Ingredient seeding complete: ${seeded} seeded, ${skipped} skipped`);
  return { seeded, skipped };
}

export async function getIngredientStats(): Promise<{ total: number; pending: number; complete: number; failed: number }> {
  const all = await db.select().from(masterIngredients);
  
  return {
    total: all.length,
    pending: all.filter(i => i.enrichmentStatus === 'pending').length,
    complete: all.filter(i => i.enrichmentStatus === 'complete').length,
    failed: all.filter(i => i.enrichmentStatus === 'failed').length,
  };
}
