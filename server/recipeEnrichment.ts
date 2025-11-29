import { GoogleGenAI } from '@google/genai';
import { FLAVOR_TAXONOMY } from '../shared/flavorTaxonomy';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 5000;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface EnrichmentResult {
  flavorProfile: {
    Sweet: number;
    Fruity: number;
    Floral: number;
    Herbal: number;
    Spicy: number;
    Earthy: number;
    Sour: number;
    Boozy: number;
  };
  nutrition: {
    calories: number;
    sugarGrams: number;
    abvPercent: number;
  };
  detailedNotes?: string[];
}

function generateFlavorTaxonomyPrompt(): string {
  let prompt = `## 3-TIER FLAVOR TAXONOMY FRAMEWORK

This is the authoritative flavor classification system. Analyze the cocktail through this hierarchical lens:

`;
  
  for (const category of FLAVOR_TAXONOMY) {
    prompt += `### ${category.label.toUpperCase()} (Category)\n`;
    for (const subcategory of category.subcategories) {
      const noteLabels = subcategory.notes.map(n => n.label).join(', ');
      prompt += `  - ${subcategory.label}: ${noteLabels}\n`;
    }
    prompt += '\n';
  }
  
  return prompt;
}

const FLAVOR_TAXONOMY_PROMPT = generateFlavorTaxonomyPrompt();

const ENRICHMENT_RUBRIC = `
## SCORING RUBRIC (0-10 Scale)

Rate each of the 8 PRIMARY CATEGORIES based on ingredient composition:

- SWEET: 0 (Bone Dry, Dry Martini) → 3 (Old Fashioned) → 5 (Balanced Sour) → 8 (Tiki) → 10 (Liqueur dominant)
- FRUITY: 0 (No fruit) → 3 (Citrus twist) → 6 (Juice modifier) → 10 (Fruit puree/Tiki)
- FLORAL: 0 (None) → 3 (St-Germain touch) → 6 (Lavender/Rose forward) → 10 (Violet liqueur dominant)
- HERBAL: 0 (None) → 3 (Gin botanicals) → 6 (Chartreuse/Benedictine) → 10 (Absinthe/Bitter Amaro forward)
- SPICY: 0 (None) → 3 (Rye whiskey spice) → 6 (Ginger beer) → 10 (Habanero/Hot pepper)
- EARTHY: 0 (None) → 3 (Aged spirits oak) → 6 (Mezcal smoke/Peated scotch) → 10 (Heavily Peated Islay)
- SOUR: 0 (No acid, Manhattan) → 5 (Standard Sour) → 8 (Lime heavy) → 10 (Vinegar/Shrub based)
- BOOZY: 0 (Mocktail) → 4 (Highball) → 6 (Sour/Shake) → 8 (Stirred/Spirit-Forward) → 10 (Cask Strength)

## MAPPING GUIDE

When analyzing ingredients, consider these flavor mappings:
- Whiskey/Bourbon/Rye → Boozy (Aged), Sweet (Caramel, Vanilla), Earthy (Charcoal)
- Mezcal → Earthy (Smoky), Boozy (Clear)
- Campari/Aperol → Herbal (Bitter subcategory), Fruity (Citrus)
- Fresh mint/basil → Floral (Fresh subcategory)
- Roses/Lavender/Elderflower → Floral (Flower subcategory)
- Citrus juices → Fruity (Citrus), Sour (Acidic)
- Bitters → Herbal (Bitter subcategory), Spicy (Warm)
- Vermouth → Floral (Fresh), Herbal (Bitter)
`;

export async function enrichRecipeData(
  name: string, 
  ingredients: string[], 
  description?: string | null
): Promise<EnrichmentResult | null> {
  const prompt = `You are an expert mixologist analyzing cocktails using a standardized 3-tier flavor taxonomy.

${FLAVOR_TAXONOMY_PROMPT}

${ENRICHMENT_RUBRIC}

## COCKTAIL TO ANALYZE

Name: ${name}
Ingredients: ${ingredients.join(', ')}
${description ? `Description: ${description}` : ''}

## TASK

1. Analyze each ingredient through the 3-tier taxonomy (Category → Subcategory → Specific Notes)
2. Rate the 8 PRIMARY CATEGORIES (Sweet, Fruity, Floral, Herbal, Spicy, Earthy, Sour, Boozy) from 0-10
3. Estimate nutrition based on typical serving size

Respond ONLY with valid JSON in this exact format:
{
  "flavorProfile": {
    "Sweet": 0, "Fruity": 0, "Floral": 0, "Herbal": 0, 
    "Spicy": 0, "Earthy": 0, "Sour": 0, "Boozy": 0
  },
  "nutrition": {"calories": 0, "sugarGrams": 0, "abvPercent": 0},
  "detailedNotes": ["specific.note.id", "another.note.id"]
}

The detailedNotes array should list specific flavor notes detected (e.g., "sweet.rich.caramel", "earthy.smoky.peat").`;

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

      const rawResult = JSON.parse(jsonMatch[0]);
      
      const result: EnrichmentResult = {
        flavorProfile: {
          Sweet: rawResult.flavorProfile?.Sweet ?? 0,
          Fruity: rawResult.flavorProfile?.Fruity ?? 0,
          Floral: rawResult.flavorProfile?.Floral ?? 0,
          Herbal: rawResult.flavorProfile?.Herbal ?? 0,
          Spicy: rawResult.flavorProfile?.Spicy ?? 0,
          Earthy: rawResult.flavorProfile?.Earthy ?? 0,
          Sour: rawResult.flavorProfile?.Sour ?? 0,
          Boozy: rawResult.flavorProfile?.Boozy ?? 0,
        },
        nutrition: rawResult.nutrition || { calories: 0, sugarGrams: 0, abvPercent: 0 },
        detailedNotes: rawResult.detailedNotes || []
      };
      
      if (!result.flavorProfile || !result.nutrition) {
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

export function migrateLegacyFlavorProfile(legacy: Record<string, number>): {
  Sweet: number;
  Fruity: number;
  Floral: number;
  Herbal: number;
  Spicy: number;
  Earthy: number;
  Sour: number;
  Boozy: number;
} {
  return {
    Sweet: legacy.Sweet ?? 0,
    Fruity: legacy.Fruity ?? 0,
    Floral: legacy.Floral ?? 0,
    Herbal: Math.max(legacy.Herbal ?? 0, legacy.Bitter ?? 0),
    Spicy: legacy.Spicy ?? 0,
    Earthy: Math.max(legacy.Earthy ?? 0, legacy.Smoky ?? 0),
    Sour: legacy.Sour ?? 0,
    Boozy: legacy.Boozy ?? 0,
  };
}

export function isLegacyProfile(profile: Record<string, number>): boolean {
  return 'Bitter' in profile || 'Smoky' in profile;
}
