import { db } from './db';
import { globalRecipes } from '../shared/schema';
import { eq, or } from 'drizzle-orm';
import { enrichRecipeData } from './recipeEnrichment';

const RATE_LIMIT_DELAY_MS = 3000;

export async function enrichPendingRecipes(limit: number = 10): Promise<{ enriched: number; failed: number }> {
  const pending = await db.select()
    .from(globalRecipes)
    .where(
      or(
        eq(globalRecipes.enrichmentStatus, 'pending'),
        eq(globalRecipes.enrichmentStatus, 'partial')
      )
    )
    .limit(limit);

  console.log(`Found ${pending.length} recipes pending enrichment`);

  let enriched = 0;
  let failed = 0;

  for (const recipe of pending) {
    console.log(`Enriching "${recipe.name}"...`);
    
    const result = await enrichRecipeData(
      recipe.name,
      recipe.ingredients as string[],
      recipe.description
    );

    if (result) {
      await db.update(globalRecipes)
        .set({
          flavorProfile: result.flavorProfile,
          nutrition: result.nutrition,
          enrichmentStatus: 'complete',
          enrichedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(globalRecipes.id, recipe.id));
      
      console.log(`Enriched "${recipe.name}" successfully`);
      enriched++;
    } else {
      await db.update(globalRecipes)
        .set({
          enrichmentStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(globalRecipes.id, recipe.id));
      
      console.log(`Failed to enrich "${recipe.name}"`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  console.log(`Enrichment complete: ${enriched} enriched, ${failed} failed`);
  return { enriched, failed };
}

export async function getEnrichmentStats(): Promise<{ pending: number; partial: number; complete: number; failed: number }> {
  const stats = await db.select().from(globalRecipes);
  
  return {
    pending: stats.filter(r => r.enrichmentStatus === 'pending').length,
    partial: stats.filter(r => r.enrichmentStatus === 'partial').length,
    complete: stats.filter(r => r.enrichmentStatus === 'complete').length,
    failed: stats.filter(r => r.enrichmentStatus === 'failed').length,
  };
}

