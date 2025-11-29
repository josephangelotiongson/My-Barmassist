import { GoogleGenAI, Type } from "@google/genai";
import { storage } from "./storage";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
const MODEL_FLASH = 'gemini-2.5-flash';

interface CocktailSummary {
  name: string;
  category: string;
  baseSpirit: string;
  era: string;
  ingredients: string[];
}

interface LineageRelation {
  parent: string;
  child: string;
  relationshipType: 'ancestor' | 'descendant';
  description: string;
  era: string;
}

interface HolisticLineageResult {
  familyAssignments: Record<string, string>;
  parentChildRelations: LineageRelation[];
  siblingGroups: Record<string, string[]>;
  evolutionNarratives: Record<string, string>;
}

const COCKTAIL_FAMILIES = {
  'old-fashioned': { name: 'Old Fashioned', formula: 'Spirit + Sugar + Bitters', icon: '🥃' },
  'martini': { name: 'Martini', formula: 'Spirit + Aromatized Wine', icon: '🍸' },
  'daiquiri': { name: 'Daiquiri', formula: 'Spirit + Citrus + Sugar', icon: '🍹' },
  'sidecar': { name: 'Sidecar', formula: 'Spirit + Citrus + Liqueur', icon: '🍋' },
  'whiskey-highball': { name: 'Whiskey Highball', formula: 'Spirit + Carbonation', icon: '🥂' },
  'flip': { name: 'Flip', formula: 'Spirit + Egg/Cream + Sugar', icon: '🥚' }
};

function extractBaseSpirit(ingredients: string[]): string {
  const spiritKeywords = ['whiskey', 'bourbon', 'rye', 'scotch', 'vodka', 'gin', 'rum', 'tequila', 'mezcal', 'brandy', 'cognac', 'pisco', 'cachaça'];
  for (const ing of ingredients) {
    const lower = ing.toLowerCase();
    for (const spirit of spiritKeywords) {
      if (lower.includes(spirit)) return spirit;
    }
  }
  return 'mixed';
}

function estimateEra(category: string, name: string): string {
  const nameLower = name.toLowerCase();
  if (['sazerac', 'old fashioned', 'manhattan', 'martini', 'daiquiri', 'whiskey sour'].some(c => nameLower.includes(c))) {
    return 'Pre-Prohibition';
  }
  if (['last word', 'sidecar', 'negroni', 'bees knees'].some(c => nameLower.includes(c))) {
    return 'Prohibition';
  }
  if (['mai tai', 'zombie', 'singapore sling'].some(c => nameLower.includes(c))) {
    return 'Tiki Era';
  }
  if (['cosmopolitan', 'lemon drop', 'sex on the beach'].some(c => nameLower.includes(c))) {
    return 'Dark Ages';
  }
  if (['penicillin', 'paper plane', 'naked and famous', 'tommy'].some(c => nameLower.includes(c))) {
    return 'Modern';
  }
  return 'Classic';
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateHolisticLineage(cocktails: CocktailSummary[]): Promise<HolisticLineageResult> {
  const catalogManifest = cocktails.map((c, i) => 
    `${i + 1}. ${c.name} (${c.category}, ${c.baseSpirit}, ${c.era})`
  ).join('\n');

  const prompt = `
You are a COCKTAIL HISTORIAN and MIXOLOGIST expert. Your task is to analyze ALL ${cocktails.length} cocktails below and create a COMPREHENSIVE FAMILY TREE showing parent → child relationships.

═══════════════════════════════════════════════════════════════
COCKTAIL CATALOG (${cocktails.length} drinks):
═══════════════════════════════════════════════════════════════

${catalogManifest}

═══════════════════════════════════════════════════════════════
ROOT TEMPLATES (Cocktail Codex):
═══════════════════════════════════════════════════════════════

1. OLD FASHIONED (old-fashioned): Spirit + Sugar + Bitters
   Examples: Old Fashioned, Sazerac, Improved Whiskey Cocktail
   
2. MARTINI (martini): Spirit + Aromatized Wine/Vermouth
   Examples: Martini, Manhattan, Negroni, Boulevardier
   
3. DAIQUIRI (daiquiri): Spirit + Citrus + Sugar
   Examples: Daiquiri, Margarita, Whiskey Sour, Mojito, Gimlet
   
4. SIDECAR (sidecar): Spirit + Citrus + Liqueur
   Examples: Sidecar, Cosmopolitan, Last Word, Paper Plane
   
5. WHISKEY HIGHBALL (whiskey-highball): Spirit + Carbonation
   Examples: Gin & Tonic, Moscow Mule, Dark 'n' Stormy, Collins
   
6. FLIP (flip): Spirit + Egg/Cream + Sugar
   Examples: Eggnog, White Russian, Ramos Gin Fizz, Brandy Alexander

═══════════════════════════════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════════════════════════════

1. ASSIGN each cocktail to ONE of the 6 families above

2. IDENTIFY PARENT → CHILD relationships:
   - A PARENT is an older cocktail that directly inspired a newer one
   - A CHILD is a newer cocktail that evolved from or riffs on an older one
   - Example: Daiquiri (1898) → Hemingway Daiquiri (1920s) → Nuclear Daiquiri (2005)
   - Example: Whiskey Sour (1870s) → Penicillin (2005)
   - Example: Old Fashioned → Sazerac (sibling from same era, but OF is template)

3. GROUP SIBLINGS (same era, same structure)

4. Write brief evolution narratives for key cocktails

CRITICAL RULES:
- Use EXACT cocktail names from the catalog above
- A cocktail cannot be its own parent or child
- Parents must be older than their children (historically)
- Each cocktail should have at most 1-2 direct parents
- Root templates (Old Fashioned, Martini, Daiquiri, etc.) can be parents to many

OUTPUT FORMAT (JSON):
{
  "familyAssignments": [
    { "cocktail": "Cocktail Name", "family": "family-slug" },
    ...
  ],
  "parentChildRelations": [
    {
      "parent": "Older Cocktail Name",
      "child": "Newer Cocktail Name", 
      "description": "Brief explanation of how parent influenced child",
      "era": "Era of the child drink"
    },
    ...
  ],
  "siblingGroups": [
    { "groupName": "Pre-Prohibition Sours", "members": ["Cocktail A", "Cocktail B"] },
    ...
  ],
  "evolutionNarratives": [
    { "cocktail": "Cocktail Name", "narrative": "Brief story of this drink's place in history" },
    ...
  ]
}

Provide comprehensive parent→child mappings for ALL cocktails in the catalog.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      familyAssignments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            cocktail: { type: Type.STRING },
            family: { type: Type.STRING }
          },
          required: ['cocktail', 'family']
        }
      },
      parentChildRelations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            parent: { type: Type.STRING },
            child: { type: Type.STRING },
            description: { type: Type.STRING },
            era: { type: Type.STRING }
          },
          required: ['parent', 'child', 'description', 'era']
        }
      },
      siblingGroups: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            groupName: { type: Type.STRING },
            members: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['groupName', 'members']
        }
      },
      evolutionNarratives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            cocktail: { type: Type.STRING },
            narrative: { type: Type.STRING }
          },
          required: ['cocktail', 'narrative']
        }
      }
    },
    required: ['familyAssignments', 'parentChildRelations', 'siblingGroups', 'evolutionNarratives']
  };

  const response = await ai.models.generateContent({
    model: MODEL_FLASH,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.2
    }
  });

  const responseText = response.text || '{}';
  
  // Try to extract JSON if there's extra text
  let jsonText = responseText;
  const jsonStart = responseText.indexOf('{');
  const jsonEnd = responseText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonText = responseText.substring(jsonStart, jsonEnd + 1);
  }
  
  const rawData = JSON.parse(jsonText);
  
  // Convert array format back to object format for easier processing
  const familyAssignments: Record<string, string> = {};
  for (const item of rawData.familyAssignments || []) {
    familyAssignments[item.cocktail] = item.family;
  }
  
  const evolutionNarratives: Record<string, string> = {};
  for (const item of rawData.evolutionNarratives || []) {
    evolutionNarratives[item.cocktail] = item.narrative;
  }
  
  const siblingGroups: Record<string, string[]> = {};
  for (const group of rawData.siblingGroups || []) {
    siblingGroups[group.groupName] = group.members;
  }
  
  return {
    familyAssignments,
    parentChildRelations: (rawData.parentChildRelations || []).map((r: any) => ({
      ...r,
      relationshipType: 'ancestor' as const
    })),
    siblingGroups,
    evolutionNarratives
  };
}

export async function orchestrateFullLineage(): Promise<{
  success: boolean;
  processed: number;
  relationships: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let relationshipsCreated = 0;

  try {
    console.log('[Lineage Orchestrator] Starting holistic lineage generation...');

    const globalRecipes = await storage.getAllGlobalRecipes();
    console.log(`[Lineage Orchestrator] Found ${globalRecipes.length} recipes to analyze`);

    const cocktailSummaries: CocktailSummary[] = globalRecipes.map(r => ({
      name: r.name,
      category: r.category || 'Classic',
      baseSpirit: extractBaseSpirit(r.ingredients as string[]),
      era: estimateEra(r.category || '', r.name),
      ingredients: (r.ingredients as string[]).slice(0, 5)
    }));

    const cocktailNames = new Set(globalRecipes.map(r => r.name.toLowerCase()));

    console.log('[Lineage Orchestrator] Calling AI for holistic analysis...');
    
    let retries = 0;
    let holisticResult: HolisticLineageResult | null = null;
    
    while (retries < 3 && !holisticResult) {
      try {
        holisticResult = await generateHolisticLineage(cocktailSummaries);
      } catch (err: any) {
        if (err?.status === 429) {
          const waitTime = Math.pow(3, retries + 1) * 1000;
          console.log(`[Lineage Orchestrator] Rate limited, waiting ${waitTime/1000}s...`);
          await sleep(waitTime);
          retries++;
        } else {
          throw err;
        }
      }
    }

    if (!holisticResult) {
      throw new Error('Failed to generate lineage after retries');
    }

    console.log(`[Lineage Orchestrator] AI returned ${Object.keys(holisticResult.familyAssignments).length} family assignments`);
    console.log(`[Lineage Orchestrator] AI returned ${holisticResult.parentChildRelations.length} parent-child relations`);

    for (const [cocktailName, familySlug] of Object.entries(holisticResult.familyAssignments)) {
      if (!cocktailNames.has(cocktailName.toLowerCase())) continue;
      
      const family = await storage.getCocktailFamilyBySlug(familySlug);
      if (!family) continue;

      const narrative = holisticResult.evolutionNarratives[cocktailName] || '';
      
      await storage.upsertLineage({
        recipeName: cocktailName,
        familyId: family.id,
        relationship: `Member of the ${family.name} family`,
        keyModifications: [],
        evolutionNarrative: narrative
      });
    }

    for (const relation of holisticResult.parentChildRelations) {
      const parentExists = cocktailNames.has(relation.parent.toLowerCase());
      const childExists = cocktailNames.has(relation.child.toLowerCase());
      
      if (!parentExists || !childExists) {
        continue;
      }

      await storage.upsertRelationship({
        sourceRecipe: relation.parent,
        targetRecipe: relation.child,
        relationshipType: 'descendant',
        era: relation.era,
        description: relation.description
      });

      await storage.upsertRelationship({
        sourceRecipe: relation.child,
        targetRecipe: relation.parent,
        relationshipType: 'ancestor',
        era: relation.era,
        description: relation.description
      });

      relationshipsCreated += 2;
    }

    for (const [groupName, siblings] of Object.entries(holisticResult.siblingGroups)) {
      const validSiblings = siblings.filter(s => cocktailNames.has(s.toLowerCase()));
      
      for (let i = 0; i < validSiblings.length; i++) {
        for (let j = i + 1; j < validSiblings.length; j++) {
          await storage.upsertRelationship({
            sourceRecipe: validSiblings[i],
            targetRecipe: validSiblings[j],
            relationshipType: 'sibling',
            era: 'Classic',
            description: `Part of ${groupName} sibling group`
          });
          
          await storage.upsertRelationship({
            sourceRecipe: validSiblings[j],
            targetRecipe: validSiblings[i],
            relationshipType: 'sibling',
            era: 'Classic',
            description: `Part of ${groupName} sibling group`
          });
          
          relationshipsCreated += 2;
        }
      }
    }

    console.log(`[Lineage Orchestrator] Created ${relationshipsCreated} relationships`);

    return {
      success: true,
      processed: globalRecipes.length,
      relationships: relationshipsCreated,
      errors
    };

  } catch (error: any) {
    console.error('[Lineage Orchestrator] Error:', error);
    errors.push(error.message || 'Unknown error');
    return {
      success: false,
      processed: 0,
      relationships: relationshipsCreated,
      errors
    };
  }
}
