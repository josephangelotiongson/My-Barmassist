import { db } from './db';
import { globalRecipes } from '../shared/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';

const RATE_LIMIT_DELAY_MS = 3000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 10000;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface EnrichmentResult {
  flavorProfile: {
    Sweet: number;
    Sour: number;
    Bitter: number;
    Boozy: number;
    Herbal: number;
    Fruity: number;
    Spicy: number;
    Smoky: number;
  };
  nutrition: {
    calories: number;
    sugarGrams: number;
    abvPercent: number;
  };
}

async function enrichRecipe(name: string, ingredients: string[], description: string | null): Promise<EnrichmentResult | null> {
  const prompt = `Analyze this cocktail and provide accurate estimates:

Cocktail: ${name}
Ingredients: ${ingredients.join(', ')}
${description ? `Description: ${description}` : ''}

Provide a JSON response with:
1. flavorProfile: Rate each dimension from 0-10 based on the ingredients
   - Sweet: sweetness level (0=none, 10=very sweet)
   - Sour: acidity/sourness (0=none, 10=very sour)
   - Bitter: bitterness (0=none, 10=very bitter)
   - Boozy: alcohol presence/burn (0=none/mocktail, 10=very strong)
   - Herbal: herbal/botanical notes (0=none, 10=very herbal)
   - Fruity: fruit flavors (0=none, 10=very fruity)
   - Spicy: spice/heat (0=none, 10=very spicy)
   - Smoky: smoke/char notes (0=none, 10=very smoky)

2. nutrition: Estimate based on typical serving size
   - calories: total calories (integer)
   - sugarGrams: grams of sugar (number with 1 decimal)
   - abvPercent: final alcohol by volume percentage (number with 1 decimal)

Respond ONLY with valid JSON in this exact format:
{
  "flavorProfile": {"Sweet": 0, "Sour": 0, "Bitter": 0, "Boozy": 0, "Herbal": 0, "Fruity": 0, "Spicy": 0, "Smoky": 0},
  "nutrition": {"calories": 0, "sugarGrams": 0, "abvPercent": 0}
}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`Failed to parse response for "${name}": No JSON found`);
        return null;
      }

      const result = JSON.parse(jsonMatch[0]) as EnrichmentResult;
      return result;
    } catch (error: any) {
      if (error?.status === 429) {
        console.log(`Rate limited on "${name}", waiting ${RETRY_BACKOFF_MS}ms before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_MS * (attempt + 1)));
        continue;
      }
      console.error(`Error enriching "${name}":`, error?.message || error);
      return null;
    }
  }

  console.error(`Max retries exceeded for "${name}"`);
  return null;
}

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
    
    const result = await enrichRecipe(
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

