import { db } from './db';
import { masterIngredients } from '../shared/schema';
import { eq, or, isNull } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { deriveFlavorForIngredient } from './flavorDataService';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 5000;
const RATE_LIMIT_DELAY_MS = 3000;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface IngredientEnrichmentResult {
  nutrition: {
    caloriesPerOz: number;
    carbsPerOz: number;
    sugarPerOz: number;
    proteinPerOz: number;
  };
  abv: number;
  flavorNotes: string;
  aromaProfile: string[];
  commonUses: string[];
  substitutes: string[];
  pairings: string[];
  productionMethod: string;
  history: string;
  allergens: string[];
  originRegion: string | null;
  verificationSources: string[];
  dataConfidenceScore: number;
}

async function enrichIngredientWithAI(
  name: string,
  category: string,
  subCategory: string | null,
  currentAbv: number | null,
  currentFlavorNotes: string | null
): Promise<IngredientEnrichmentResult | null> {
  const prompt = `You are an expert bartender and spirits educator. Research and provide accurate, verified information about this bar ingredient.

Ingredient: ${name}
Category: ${category}
${subCategory ? `Sub-category: ${subCategory}` : ''}
${currentAbv !== null ? `Known ABV: ${currentAbv}%` : ''}
${currentFlavorNotes ? `Known flavor notes: ${currentFlavorNotes}` : ''}

Provide comprehensive, factual information based on established sources (bartending guides, distillery information, nutrition databases). Be accurate - if unsure about a value, use reasonable estimates based on similar products.

Respond with ONLY valid JSON in this exact format:
{
  "nutrition": {
    "caloriesPerOz": 0,
    "carbsPerOz": 0,
    "sugarPerOz": 0,
    "proteinPerOz": 0
  },
  "abv": 0,
  "flavorNotes": "Detailed flavor description",
  "aromaProfile": ["aroma1", "aroma2", "aroma3"],
  "commonUses": ["Classic cocktail 1", "Classic cocktail 2", "Mixing style"],
  "substitutes": ["Alternative 1", "Alternative 2"],
  "pairings": ["Pairs well with 1", "Pairs well with 2"],
  "productionMethod": "Brief description of how it's made",
  "history": "Brief historical background (2-3 sentences)",
  "allergens": ["allergen1"] or [],
  "originRegion": "Country or region of origin" or null,
  "verificationSources": ["Bartender's guide", "Distillery info", "Nutrition database"],
  "dataConfidenceScore": 85
}

Guidelines:
- For spirits: ABV typically 35-50%, calories ~65-75 per oz, 0 carbs/sugar
- For liqueurs: ABV typically 15-35%, calories ~80-110 per oz, higher sugar
- For mixers: ABV 0%, vary on calories/sugar
- For bitters: ABV 35-45%, used in dashes so low practical impact
- dataConfidenceScore: 90+ for well-documented products, 70-89 for estimates, below 70 for uncertain`;

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

      const result = JSON.parse(jsonMatch[0]) as IngredientEnrichmentResult;
      
      if (!result.nutrition || result.abv === undefined) {
        console.error(`Invalid enrichment result for "${name}": Missing required fields`);
        return null;
      }
      
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

export async function enrichPendingIngredients(limit: number = 5): Promise<{ enriched: number; failed: number }> {
  const pending = await db.select()
    .from(masterIngredients)
    .where(
      or(
        eq(masterIngredients.enrichmentStatus, 'pending'),
        eq(masterIngredients.enrichmentStatus, 'partial')
      )
    )
    .limit(limit);

  console.log(`Found ${pending.length} ingredients pending enrichment`);

  let enriched = 0;
  let failed = 0;

  for (const ingredient of pending) {
    console.log(`Enriching ingredient "${ingredient.name}"...`);
    
    const result = await enrichIngredientWithAI(
      ingredient.name,
      ingredient.category,
      ingredient.subCategory,
      ingredient.abv as number | null,
      ingredient.flavorNotes
    );

    if (result) {
      const flavorDerivation = await deriveFlavorForIngredient(ingredient.name);
      
      await db.update(masterIngredients)
        .set({
          nutrition: result.nutrition,
          abv: Math.round(result.abv),
          flavorNotes: result.flavorNotes,
          derivedFlavorNoteIds: flavorDerivation.noteIds.length > 0 ? flavorDerivation.noteIds : null,
          flavorIntensities: Object.keys(flavorDerivation.intensities).length > 0 ? flavorDerivation.intensities : null,
          aromaProfile: result.aromaProfile,
          commonUses: result.commonUses,
          substitutes: result.substitutes,
          pairings: result.pairings,
          productionMethod: result.productionMethod,
          history: result.history,
          allergens: result.allergens,
          originRegion: result.originRegion,
          verificationSources: result.verificationSources,
          dataConfidenceScore: result.dataConfidenceScore,
          enrichmentStatus: 'complete',
          enrichedAt: new Date(),
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(masterIngredients.id, ingredient.id));
      
      const flavorInfo = flavorDerivation.noteIds.length > 0 
        ? `, flavor notes: ${flavorDerivation.noteLabels.join(', ')}`
        : '';
      console.log(`Enriched "${ingredient.name}" successfully (confidence: ${result.dataConfidenceScore}%${flavorInfo})`);
      enriched++;
    } else {
      await db.update(masterIngredients)
        .set({
          enrichmentStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(masterIngredients.id, ingredient.id));
      
      console.log(`Failed to enrich "${ingredient.name}"`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  console.log(`Ingredient enrichment complete: ${enriched} enriched, ${failed} failed`);
  return { enriched, failed };
}

export async function updateIngredientFlavorMappings(): Promise<{ updated: number; skipped: number }> {
  const allIngredients = await db.select({
    id: masterIngredients.id,
    name: masterIngredients.name,
    derivedFlavorNoteIds: masterIngredients.derivedFlavorNoteIds,
  }).from(masterIngredients);

  console.log(`Updating flavor mappings for ${allIngredients.length} ingredients`);

  let updated = 0;
  let skipped = 0;

  for (const ingredient of allIngredients) {
    const flavorDerivation = await deriveFlavorForIngredient(ingredient.name);
    
    if (flavorDerivation.noteIds.length > 0) {
      await db.update(masterIngredients)
        .set({
          derivedFlavorNoteIds: flavorDerivation.noteIds,
          flavorIntensities: flavorDerivation.intensities,
          updatedAt: new Date(),
        })
        .where(eq(masterIngredients.id, ingredient.id));
      
      console.log(`Updated "${ingredient.name}": ${flavorDerivation.noteLabels.join(', ')}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Flavor mapping update complete: ${updated} updated, ${skipped} skipped (no matches)`);
  return { updated, skipped };
}
