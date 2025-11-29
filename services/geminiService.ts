
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FlavorProfile, FlavorDimension, Recommendation, Ingredient } from '../types';
import { analyzeSocialMediaLink, generateSearchSystemPrompt, sanitizeSocialMediaUrl, SocialMediaLinkInfo } from './socialMediaUtils';

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Models
const MODEL_FLASH = 'gemini-2.5-flash';
const MODEL_PRO = 'gemini-3-pro-preview'; // Used for complex tasks like Social Media analysis
const MODEL_IMAGE = 'gemini-2.5-flash-image';

// --- STANDARDIZED SCORING RUBRICS ---
const FLAVOR_RUBRIC = `
FLAVOR SCORING RUBRIC (0-10 Scale):
- SWEET: 0 (Bone Dry, e.g., Dry Martini) -> 3 (Old Fashioned) -> 5 (Balanced Sour/Daisy) -> 8 (Tiki) -> 10 (Liqueur/Syrup heavy).
- SOUR: 0 (No Acid, e.g., Manhattan) -> 5 (Standard Sour, e.g., Whiskey Sour) -> 8 (Lime heavy) -> 10 (Vinegar/Shrub based).
- BITTER: 0 (None) -> 2 (Angostura dashes) -> 5 (Negroni/Campari) -> 8 (Amaro/Fernet) -> 10 (Malort/Suze neat).
- BOOZY: 0 (Mocktail) -> 4 (Standard Highball) -> 6 (Sour/Shake) -> 8 (Stirred/Spirit-Forward) -> 10 (Cask Strength/Overproof).
- HERBAL: 0 (None) -> 3 (Gin) -> 6 (Chartreuse/Benedictine) -> 10 (Absinthe/Medicinal).
- FRUITY: 0 (None) -> 3 (Twist/Garnish) -> 6 (Juice Modifier) -> 10 (Fruit Puree/Tiki Bomb).
- SPICY: 0 (None) -> 3 (Rye Whiskey spice) -> 6 (Ginger Beer) -> 10 (Habanero/Ghost Pepper).
- SMOKY: 0 (None) -> 3 (Scotch Float) -> 6 (Mezcal) -> 10 (Heavily Peated Islay).
`;

const MATCH_LOGIC = `
MATCH SCORING RULES (0-100%):
- 90-100%: Perfect Ingredient Match OR Perfect Flavor Profile overlap with User History.
- 75-89%: 1 Minor substitution needed (e.g., Lemon vs Lime) OR Strong Flavor alignment.
- 50-74%: Missing 1 modifier OR Moderate flavor alignment.
- <50%: Missing Base Spirit OR Clash in flavor profile.
`;

// Schema for Flavor Profile
const flavorProfileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    Sweet: { type: Type.NUMBER },
    Sour: { type: Type.NUMBER },
    Bitter: { type: Type.NUMBER },
    Boozy: { type: Type.NUMBER },
    Herbal: { type: Type.NUMBER },
    Fruity: { type: Type.NUMBER },
    Spicy: { type: Type.NUMBER },
    Smoky: { type: Type.NUMBER },
  },
  required: ['Sweet', 'Sour', 'Bitter', 'Boozy', 'Herbal', 'Fruity', 'Spicy', 'Smoky'],
};

// Schema for Nutrition
const nutritionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    calories: { type: Type.NUMBER },
    carbs: { type: Type.NUMBER },
    abv: { type: Type.NUMBER, description: "Estimated Alcohol By Volume percentage (e.g., 22)" }
  },
  required: ['calories', 'carbs']
};

// Schema for Ingredient Recognition with Volume
const ingredientScanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['Spirit', 'Mixer', 'Garnish', 'Other'] },
          estimatedVolume: { type: Type.STRING, description: "Estimate remaining volume description (e.g., 'Full 750ml', 'Half Bottle', 'Near Empty')" }
        },
        required: ['name', 'category', 'estimatedVolume']
      }
    }
  },
  required: ['ingredients']
};

// Schema for Recommendations
const recommendationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          matchScore: { type: Type.NUMBER },
          ingredientsToUse: { 
             type: Type.ARRAY, 
             items: { type: Type.STRING }, 
             description: "List of ingredients WITH VOLUMES (e.g. '2 oz Gin', '0.75 oz Lime Juice')." 
          },
          missingIngredients: { 
             type: Type.ARRAY, 
             items: { type: Type.STRING }, 
             description: "List of missing ingredients WITH VOLUMES." 
          },
          instructions: { 
             type: Type.ARRAY, 
             items: { type: Type.STRING },
             description: "Step-by-step preparation instructions." 
          },
          flavorProfile: flavorProfileSchema,
          nutrition: nutritionSchema
        },
        required: ['name', 'description', 'matchScore', 'ingredientsToUse', 'missingIngredients', 'instructions', 'flavorProfile', 'nutrition']
      }
    }
  },
  required: ['recommendations']
};

// Schema for Bar Assistance
const barAssistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    script: { type: Type.STRING, description: "The exact sentence the user should say to the bartender." },
    suggestion: { type: Type.STRING, description: "A specific cocktail name to suggest if the bartender asks for an example." },
    reasoning: { type: Type.STRING, description: "Why this was chosen based on the mode." }
  },
  required: ['script', 'suggestion', 'reasoning']
};

// Helper to clean JSON string from markdown code blocks
const cleanJsonString = (text: string): string => {
  // Try to find JSON object structure first
  const firstOpen = text.indexOf('{');
  const lastClose = text.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    return text.substring(firstOpen, lastClose + 1);
  }
  
  // Fallback cleanup
  let clean = text;
  clean = clean.replace(/```json/gi, '').replace(/```/g, '');
  return clean.trim();
};

async function resolveShortUrlIfNeeded(url: string): Promise<{ resolvedUrl: string; wasExpanded: boolean }> {
  const isTikTokShortLink = /^https?:\/\/(vm|vt|m)\.tiktok\.com/i.test(url);
  
  if (!isTikTokShortLink) {
    return { resolvedUrl: url, wasExpanded: false };
  }
  
  try {
    const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${apiBase}/api/resolve-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[URL Resolver] Successfully resolved: ${url} -> ${data.resolvedUrl}`);
      return { resolvedUrl: data.resolvedUrl, wasExpanded: data.wasExpanded };
    } else {
      console.warn(`[URL Resolver] API returned status ${response.status}`);
    }
  } catch (error) {
    console.warn('[URL Resolver] Failed to resolve short URL:', error);
  }
  
  return { resolvedUrl: url, wasExpanded: false };
}

export const analyzeDrinkText = async (text: string): Promise<any> => {
  try {
    const isUrl = /(https?:\/\/[^\s]+)/g.test(text);
    let tools = undefined;
    let enrichedContext = text;
    let linkInfo: SocialMediaLinkInfo | null = null;
    
    // Social Media / URL Logic with enhanced URL cleaning
    if (isUrl) {
      tools = [{ googleSearch: {} }];
      
      const foundUrlMatch = text.match(/(https?:\/\/[^\s]+)/);
      let rawUrl = foundUrlMatch ? foundUrlMatch[0] : '';
      
      // First, try to resolve short URLs (vm.tiktok.com, vt.tiktok.com, etc.)
      const { resolvedUrl, wasExpanded } = await resolveShortUrlIfNeeded(rawUrl);
      if (wasExpanded) {
        console.log(`[Social Media Analysis] Expanded short link: ${rawUrl} -> ${resolvedUrl}`);
        rawUrl = resolvedUrl;
      }
      
      // Use the new social media analyzer for comprehensive URL handling
      linkInfo = analyzeSocialMediaLink(rawUrl);
      linkInfo.wasExpanded = wasExpanded;
      
      // Generate platform-specific search prompts
      const searchSystemPrompt = generateSearchSystemPrompt(linkInfo);
      
      // Replace tracking-laden URL with clean URL in the context
      enrichedContext = text.replace(foundUrlMatch ? foundUrlMatch[0] : '', linkInfo.cleanUrl);
      enrichedContext += '\n' + searchSystemPrompt;
      
      console.log(`[Social Media Analysis] Platform: ${linkInfo.platform}, Clean URL: ${linkInfo.cleanUrl}`);
      if (linkInfo.username) console.log(`[Social Media Analysis] Creator: @${linkInfo.username}`);
      if (linkInfo.videoId) console.log(`[Social Media Analysis] Video ID: ${linkInfo.videoId}`);
      if (wasExpanded) console.log(`[Social Media Analysis] Short link was expanded`);
    }

    // Using gemini-3-pro-preview for advanced reasoning on search results (TikTok/IG)
    const prompt = `
      You are an Expert Mixologist Agent and Nutritionist AI.
      
      Input Context: "${enrichedContext}"

      ${FLAVOR_RUBRIC}

      TASK: 
      1. Extract recipe data (ingredients with volumes, instructions).
      2. Classify the Family.
      3. Generate a Flavor Profile.
      4. ESTIMATE NUTRITION: Calculate total calories and grams of carbohydrates. 
         - Assume standard values (e.g. 1.5oz Spirit ~96cal, 1oz Simple Syrup ~50cal/14g carb, 1oz Citrus ~8cal/2g carb). 
         - Be reasonably accurate but explicit that this is an estimate.
      5. ESTIMATE ABV: Calculate the final Alcohol By Volume (%) based on the ingredients.
      6. GENERATE LORE: Write a brief but engaging 'history' section explaining the origin, creator, or interesting trivia about this cocktail (or ingredient combo if it's a riff).

      ### VIDEO "WATCHING" & LINK ANALYSIS STRATEGY
      - The user has likely provided a link to a cocktail video (TikTok/Instagram/YouTube).
      - **"WATCH" VIA SEARCH**: You cannot directly view pixels, but you MUST use the 'googleSearch' tool to find the textual content (captions, transcripts, comments) of this video.
      - **SEARCH TACTICS**: 
        1. Search for the specific URL to find the page title/snippet.
        2. Search for the Video ID or Username + "recipe" to find cross-posts or aggregators.
        3. Look for "ingredients" or measurements in the search snippets.

      ### RECIPE DEDUCTION RULES
      1. **Explicit**: If search results list ingredients (e.g. "2oz Gin"), use them exactly.
      2. **Implicit**: If the search confirms the drink name (e.g. "Making a Paper Plane") but lacks full specs, USE YOUR KNOWLEDGE of the standard recipe for that drink to fill in the missing parts.
      3. **Riff/Twist**: If it's a variation, prioritize the ingredients mentioned in the search, but fall back to standard ratios for the rest.

      ### CLASSIFICATION STRATEGY
      Classify the drink into one of these strict families based on structure:
      - Ancestrals (Spirit + Sugar + Bitters) e.g. Old Fashioned, Sazerac
      - Spirit-Forward (Spirit + Vermouth/Amaro) e.g. Martini, Negroni, Manhattan
      - Sours (Spirit + Citrus + Sugar) e.g. Daiquiri, Margarita, Whiskey Sour
      - Highballs (Spirit + Carbonation/Mixer) e.g. G&T, Mule
      - Tiki (Complex Rum/Fruit/Spice) e.g. Mai Tai, Zombie
      - Flips & Nogs (Egg/Dairy/Cream) e.g. White Russian, Egg Nog
      - Champagne (Sparkling Wine base) e.g. French 75
      - Punches (Fruit heavy/Batched style) e.g. Sangria
      - Juleps (Spirit + Herb + Sugar) e.g. Mint Julep
      - Modern Classics (Specific complex modern era drinks) e.g. Paper Plane, Penicillin

      ### DESCRIPTION GENERATION
      - Write a "Flavor Summary" as the description. 
      - Format: "A [Texture] and [Dominant Flavor] drink with notes of [Secondary Flavor] and a [Finish] finish."

      RETURN JSON ONLY.
      JSON Structure:
      {
        "name": "string",
        "category": "string (One of the families listed above)",
        "creator": "string (optional)",
        "description": "string (The Flavor Summary)",
        "history": "string (Historical background, origin story, or fun fact)",
        "ingredients": ["string", "string"],
        "instructions": ["string", "string"],
        "flavorProfile": {
          "Sweet": number, "Sour": number, "Bitter": number, "Boozy": number,
          "Herbal": number, "Fruity": number, "Spicy": number, "Smoky": number
        },
        "nutrition": {
          "calories": number,
          "carbs": number,
          "abv": number
        }
      }
    `;

    try {
      // Switch to MODEL_PRO for better search synthesis
      const response = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: prompt,
        config: {
          // responseSchema is not compatible with googleSearch tool, so we parse manually
          tools: tools,
          temperature: 0.1, // Low temp for factual extraction
        }
      });
      
      const jsonText = cleanJsonString(response.text || '{}');
      return JSON.parse(jsonText);

    } catch (error: any) {
      const errorMessage = error.message || JSON.stringify(error);
      // Fallback to Flash if Pro/Search fails
      if (tools && (errorMessage.includes('xhr') || errorMessage.includes('Rpc') || errorMessage.includes('fetch') || errorMessage.includes('error code: 6') || errorMessage.includes('500'))) {
        console.warn("Search tool failed. Retrying with pure inference.", error);
        
        const fallbackResponse = await ai.models.generateContent({
          model: MODEL_FLASH, 
          contents: prompt + "\n(Note: External search failed. Infer details from text/URL context and mixology knowledge.)",
          config: { temperature: 0.4 }
        });
        
        const jsonText = cleanJsonString(fallbackResponse.text || '{}');
        return JSON.parse(jsonText);
      }
      throw error;
    }

  } catch (error) {
    console.error("Error analyzing drink text:", error);
    throw error;
  }
};

export const generateCocktailImage = async (name: string, description: string, ingredients: string[]): Promise<string | undefined> => {
  try {
    const prompt = `
      Generate an image.
      
      Subject: A hyper-realistic, cinematic professional food photography shot of a cocktail named "${name}".

      VISUAL TEMPLATE:
      - SETTING: Dark, textured charcoal slate bar counter.
      - BACKGROUND: Dark, bokeh vintage bar shelf with amber bottles. Moody, deep stone grey and warm amber tones.
      - LIGHTING: Dramatic chiaroscuro single-source side lighting (Rembrandt style). Golden rim light.
      - CAMERA: 85mm macro lens, f/1.8 aperture. Sharp focus on garnish/glass.
      - COMPOSITION: Eye-level, centered.

      COCKTAIL SPECIFICS:
      - Context: ${description}
      - Ingredients: ${ingredients.join(', ')}
      - Garnish: Perfectly placed, high-detail.

      QUALITY: 8k resolution, Unreal Engine 5 render style, detailed. NO TEXT.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error: any) {
    console.error("Error generating cocktail image:", error);
    // Re-throw rate limit errors so they can be handled by the caller
    if (error?.status === 429 || error?.message?.includes('429')) {
      throw error;
    }
    return undefined;
  }
};

export const identifyIngredientsFromImage = async (base64Image: string): Promise<any[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Identify all visible cocktail ingredients (bottles, fruits, mixers). Estimate remaining volume." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ingredientScanSchema,
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data.ingredients || [];
  } catch (error) {
    console.error("Error identifying ingredients:", error);
    throw error;
  }
};

export const enrichIngredientDetails = async (ingredientName: string): Promise<string> => {
  try {
    const prompt = `
      Search for the flavor profile of: "${ingredientName}".
      Return a 1-sentence description (e.g. "Juniper-forward with citrus notes").
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    return response.text?.trim() || "Flavor profile unavailable.";
  } catch (error) {
    console.error("Error enriching ingredient:", error);
    return "Standard flavor profile.";
  }
};

export const getRecommendations = async (
  userPalate: FlavorProfile,
  pantryIngredients: string[]
): Promise<Recommendation[]> => {
  try {
    const prompt = `
      You are a Master Mixologist Algorithm.
      
      User Palate (0-10): ${JSON.stringify(userPalate)}
      Available Ingredients: ${JSON.stringify(pantryIngredients)}

      ${FLAVOR_RUBRIC}
      ${MATCH_LOGIC}
      
      Suggest 3 cocktail recipes based on available ingredients.
      
      CRITICAL FORMATTING:
      1. Ingredients MUST include standard volumes/measurements (e.g. "2 oz Gin", "0.75 oz Lime Juice"). Do not just list the name.
      2. Instructions MUST be a detailed step-by-step array.
      3. Include NUTRITION estimates (calories, carbs, and ABV) in the output.
      
      Calculate Match Score (0-100) based on Ingredient Availability AND Palate Fit.
      Ensure description highlights flavor profile match.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
        temperature: 0.7,
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data.recommendations || [];
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
};

export const recommendFromMenu = async (
  base64Image: string,
  userPalate: FlavorProfile
): Promise<Recommendation[]> => {
  try {
    const prompt = `
      You are a Master Mixologist Agent.
      I will provide a photo of a Cocktail Menu and a User's Flavor Palate.
      
      User Palate: ${JSON.stringify(userPalate)}
      
      ${FLAVOR_RUBRIC}
      ${MATCH_LOGIC}

      TASK:
      1. Identify ALL valid cocktail options listed on the menu image.
      2. INGREDIENT ANALYSIS: For each drink, analyze the listed ingredients to DEDUCE the flavor profile (0-10) using the RUBRIC above.
      3. DESCRIPTION: Generate a "Flavor Summary" description. e.g. "A refreshing and herbal gin cocktail with strong notes of cucumber and a tart lime finish."
      4. INSTRUCTIONS: Since these are menu items, set instructions to ["Order at bar"].
      5. ESTIMATE NUTRITION: Provide an educated guess for calories, carbs, and final ABV based on likely ingredients.
      6. Compare against User Palate for Match Score.
      
      OUTPUT JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
        temperature: 0.5,
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data.recommendations || [];
  } catch (error) {
    console.error("Error analyzing menu:", error);
    throw error;
  }
};

export const getBarOrderSuggestion = async (
  userPalate: FlavorProfile,
  mode: 'typical' | 'adventurous'
): Promise<{ script: string, suggestion: string, reasoning: string }> => {
  try {
    const prompt = `
      You are a Wingman / Mixology Guide.
      User Palate: ${JSON.stringify(userPalate)}
      Mode: ${mode.toUpperCase()}
      Create a short, natural script the user can READ ALOUD to a bartender.
      Output JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: barAssistSchema,
        temperature: 0.7
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data;
  } catch (error) {
    return {
      script: "I'm not sure what I want, what is your signature drink?",
      suggestion: "Old Fashioned",
      reasoning: "Fallback due to error."
    };
  }
};

export const deduceRecipe = async (name: string, knownIngredients: string[]): Promise<any> => {
  try {
    const prompt = `
      You are an Expert Bartender Agent.
      TASK: Deduce a recipe for: "${name}".
      Known Ingredients: ${JSON.stringify(knownIngredients)}

      ${FLAVOR_RUBRIC}

      Goal: 
      1. Create balanced measurements (Mixology Frameworks).
      2. Generate a 1-sentence FLAVOR SUMMARY as the description.
      3. Estimate the Flavor Profile (0-10) using the Rubric.
      4. Determine the Cocktail Category (e.g. Sours, Spirit-Forward, Tiki).
      5. Estimate Nutrition (Calories/Carbs/ABV).
      6. Write a brief History/Lore paragraph.
      
      OUTPUT JSON: { ingredients, instructions, description, flavorProfile, category, nutrition, history }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: { temperature: 0.4 }
    });

    const text = cleanJsonString(response.text || '{}');
    return JSON.parse(text);
  } catch (error) {
    console.error("Error deducing recipe:", error);
    return {
      ingredients: knownIngredients.length > 0 ? knownIngredients : ["Spirit", "Modifier"],
      instructions: ["Mix ingredients with ice.", "Serve."],
      description: "Could not deduce specific recipe.",
      flavorProfile: { Sweet: 5, Sour: 5, Bitter: 0, Boozy: 5, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0 },
      category: "Uncategorized",
      nutrition: { calories: 150, carbs: 5, abv: 15 },
      history: "History unavailable for this deducted recipe."
    };
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Audio } },
          { text: "Transcribe this audio exactly as spoken." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Audio transcription failed:", error);
    throw error;
  }
};

// --- DRINK FAMILY TREE ANALYSIS ---
// Schema for Family Tree Analysis (Cocktail Codex inspired)
const familyTreeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    rootTemplate: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The fundamental template (e.g., Old Fashioned, Martini, Daiquiri, Sidecar, Whiskey Highball, Flip)" },
        formula: { type: Type.STRING, description: "Core formula like 'Spirit + Sugar + Bitters'" },
        description: { type: Type.STRING, description: "Brief explanation of what defines this template" }
      },
      required: ['name', 'formula', 'description']
    },
    targetDrink: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        relationship: { type: Type.STRING, description: "How this drink relates to the root template" },
        keyModifications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What makes this drink unique from the template" }
      },
      required: ['name', 'relationship', 'keyModifications']
    },
    ancestors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          era: { type: Type.STRING, description: "e.g., Pre-Prohibition, Prohibition, Tiki Era, Modern" },
          inventionYear: { type: Type.NUMBER, description: "Approximate year of invention (must be BEFORE the target drink)" },
          relationship: { type: Type.STRING, description: "How it directly influenced the target drink" },
          inDatabase: { type: Type.BOOLEAN, description: "true if this cocktail exists in the database list, false if it needs to be created" },
          recipe: {
            type: Type.OBJECT,
            properties: {
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients with measurements" },
              instructions: { type: Type.STRING, description: "Brief preparation instructions" },
              category: { type: Type.STRING, description: "Category like Classic, Tiki, Modern, etc." },
              glass: { type: Type.STRING, description: "Glass type" }
            },
            description: "Recipe details - ONLY include if inDatabase is false"
          }
        },
        required: ['name', 'era', 'inventionYear', 'relationship', 'inDatabase']
      },
      description: "Drinks that PRECEDED and directly influenced the target drink. Must have been invented BEFORE the target."
    },
    siblings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          era: { type: Type.STRING, description: "Era of invention" },
          inventionYear: { type: Type.NUMBER, description: "Year of invention (should be similar timeframe as target)" },
          sharedTrait: { type: Type.STRING, description: "What structural trait they share with the target" },
          inDatabase: { type: Type.BOOLEAN, description: "true if this cocktail exists in the database list, false if it needs to be created" },
          recipe: {
            type: Type.OBJECT,
            properties: {
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients with measurements" },
              instructions: { type: Type.STRING, description: "Brief preparation instructions" },
              category: { type: Type.STRING, description: "Category like Classic, Tiki, Modern, etc." },
              glass: { type: Type.STRING, description: "Glass type" }
            },
            description: "Recipe details - ONLY include if inDatabase is false"
          }
        },
        required: ['name', 'era', 'inventionYear', 'sharedTrait', 'inDatabase']
      },
      description: "Drinks from the SAME ERA with similar structure - parallel innovations, NOT evolved from the target"
    },
    descendants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          era: { type: Type.STRING, description: "Era of invention" },
          inventionYear: { type: Type.NUMBER, description: "Year of invention (MUST be AFTER the target drink)" },
          innovation: { type: Type.STRING, description: "What specific change/twist makes this a riff on the target" },
          inDatabase: { type: Type.BOOLEAN, description: "true if this cocktail exists in the database list, false if it needs to be created" },
          recipe: {
            type: Type.OBJECT,
            properties: {
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients with measurements" },
              instructions: { type: Type.STRING, description: "Brief preparation instructions" },
              category: { type: Type.STRING, description: "Category like Classic, Tiki, Modern, etc." },
              glass: { type: Type.STRING, description: "Glass type" }
            },
            description: "Recipe details - ONLY include if inDatabase is false"
          }
        },
        required: ['name', 'era', 'inventionYear', 'innovation', 'inDatabase']
      },
      description: "Drinks that evolved DIRECTLY from the target - riffs, twists, and variations invented AFTER the target"
    },
    flavorBridge: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fromDrink: { type: Type.STRING },
          toDrink: { type: Type.STRING },
          connection: { type: Type.STRING, description: "Flavor or technique connection" }
        },
        required: ['fromDrink', 'toDrink', 'connection']
      },
      description: "Connections showing how flavors evolved through the family"
    },
    evolutionNarrative: { type: Type.STRING, description: "A brief story explaining the drink's place in cocktail history" }
  },
  required: ['rootTemplate', 'targetDrink', 'ancestors', 'siblings', 'descendants', 'flavorBridge', 'evolutionNarrative']
};

interface LineageRecipe {
  ingredients: string[];
  instructions: string;
  category: string;
  glass: string;
}

export interface DrinkFamilyTree {
  rootTemplate: {
    name: string;
    formula: string;
    description: string;
  };
  targetDrink: {
    name: string;
    relationship: string;
    keyModifications: string[];
  };
  ancestors: Array<{
    name: string;
    era: string;
    inventionYear: number;
    relationship: string;
    inDatabase?: boolean;
    recipe?: LineageRecipe;
  }>;
  siblings: Array<{
    name: string;
    era: string;
    inventionYear: number;
    sharedTrait: string;
    inDatabase?: boolean;
    recipe?: LineageRecipe;
  }>;
  descendants: Array<{
    name: string;
    era: string;
    inventionYear: number;
    innovation: string;
    inDatabase?: boolean;
    recipe?: LineageRecipe;
  }>;
  flavorBridge: Array<{
    fromDrink: string;
    toDrink: string;
    connection: string;
  }>;
  evolutionNarrative: string;
}

export const analyzeDrinkFamilyTree = async (
  cocktailName: string,
  cocktailCategory: string,
  cocktailIngredients: string[],
  availableRecipes: string[]
): Promise<DrinkFamilyTree> => {
  try {
    const ingredientList = cocktailIngredients
      .map(ing => ing.replace(/^["']|["']$/g, '').trim())
      .filter(ing => ing.length > 0)
      .join('\n      - ');
    
    // Format the database cocktails as a numbered list for better AI parsing
    const databaseCocktails = availableRecipes
      .map((name, i) => `${i + 1}. ${name}`)
      .join('\n');
    
    const prompt = `
      You are a COCKTAIL HISTORIAN mapping the family tree of "${cocktailName}".
      
      ═══════════════════════════════════════════════════════════════
      *** DATABASE COCKTAILS - PRIORITIZE BUT CAN ADD NEW ***
      ═══════════════════════════════════════════════════════════════
      
      EXISTING DATABASE COCKTAILS (check this list first):
${databaseCocktails}
      
      RULES:
      1. PRIORITIZE cocktails from the DATABASE list above
      2. For each cocktail you include, set "inDatabase": true if it's in the list above, or false if not
      3. If a historically important cocktail is NOT in the database, you MAY include it with "inDatabase": false
      4. When "inDatabase": false, you MUST provide full recipe details in the "recipe" field
      5. DO NOT use generic terms like "The Original Cocktail" or "Proto-Cocktail"
      6. Only add new cocktails if they are REAL, historically documented drinks
      
      FOR NEW COCKTAILS (inDatabase: false), include recipe with:
      - ingredients: Array of ingredients with measurements (e.g., "2 oz Bourbon", "0.75 oz Simple Syrup")
      - instructions: Brief preparation method
      - category: Category like "Classic", "Tiki", "Modern Craft", etc.
      - glass: Glass type (e.g., "Rocks", "Coupe", "Collins")
      
      ═══════════════════════════════════════════════════════════════
      DRINK TO ANALYZE:
      ═══════════════════════════════════════════════════════════════
      
      Name: ${cocktailName}
      Category: ${cocktailCategory}
      Ingredients:
      - ${ingredientList}
      
      ═══════════════════════════════════════════════════════════════
      RELATIONSHIP DEFINITIONS:
      ═══════════════════════════════════════════════════════════════
      
      ANCESTORS = Drinks from the DATABASE that existed BEFORE "${cocktailName}" and influenced it.
      - Must be invented BEFORE ${cocktailName}
      - Must share structural or flavor DNA
      - Example: If analyzing Margarita, ancestors could be: Daiquiri, Sidecar
      
      SIBLINGS = Drinks from the DATABASE with similar structure, from the same era.
      - Invented around the same time (within ~20 years)
      - Share a common ancestor or template
      - Example: Manhattan and Martini are siblings (1870s-1880s, spirit + vermouth structure)
      
      DESCENDANTS = Drinks from the DATABASE that were inspired BY "${cocktailName}".
      - Must be invented AFTER ${cocktailName}
      - Direct variations or riffs on the target drink
      - Example: Penicillin is a descendant of Whiskey Sour
      
      ═══════════════════════════════════════════════════════════════
      HISTORICAL ERAS (for era field):
      ═══════════════════════════════════════════════════════════════
      
      - Pre-Prohibition: Before 1920
      - Prohibition: 1920-1933
      - Post-Prohibition: 1933-1960
      - Tiki Era: 1934-1970s
      - Dark Ages: 1970s-1990s
      - Craft Revival: 2000-present
      
      REFERENCE DATES:
      - Old Fashioned: ~1880
      - Sazerac: ~1850s
      - Manhattan: ~1874
      - Martini: ~1880s
      - Daiquiri: ~1898
      - Sidecar: ~1920s
      - Margarita: ~1940s
      - Moscow Mule: 1941
      - Mai Tai: 1944
      - Zombie: 1934
      - Negroni: 1919
      - Last Word: ~1920s
      - Cosmopolitan: ~1980s
      - Penicillin: 2005
      - Paper Plane: 2007
      
      ═══════════════════════════════════════════════════════════════
      ROOT TEMPLATES (Cocktail Codex):
      ═══════════════════════════════════════════════════════════════
      
      1. OLD FASHIONED: Spirit + Sugar + Bitters
      2. MARTINI: Spirit + Vermouth/Aromatized Wine
      3. DAIQUIRI: Spirit + Citrus + Sugar
      4. SIDECAR: Spirit + Citrus + Liqueur
      5. WHISKEY HIGHBALL: Spirit + Carbonation
      6. FLIP: Spirit + Egg/Cream + Sugar
      
      ═══════════════════════════════════════════════════════════════
      YOUR OUTPUT:
      ═══════════════════════════════════════════════════════════════
      
      1. Determine ${cocktailName}'s root template from the 6 above
      2. Find 2-4 ANCESTORS from the DATABASE (older drinks that influenced it)
      3. Find 2-4 SIBLINGS from the DATABASE (similar structure, same era)
      4. Find 2-6 DESCENDANTS from the DATABASE (later drinks inspired by it)
      5. Create flavor bridges between related drinks
      6. Write a brief evolution narrative
      
      REMEMBER: ONLY use cocktail names that EXACTLY match the DATABASE list above!
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseSchema: familyTreeSchema,
        temperature: 0.3
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data as DrinkFamilyTree;
  } catch (error) {
    console.error("Error analyzing drink family tree:", error);
    // Return empty arrays - better to show "no data" than fake data
    return {
      rootTemplate: {
        name: "Daiquiri",
        formula: "Spirit + Citrus + Sugar",
        description: "The foundational sour cocktail template"
      },
      targetDrink: {
        name: cocktailName,
        relationship: "A unique cocktail awaiting analysis",
        keyModifications: cocktailIngredients.slice(0, 3)
      },
      ancestors: [],
      siblings: [],
      descendants: [],
      flavorBridge: [],
      evolutionNarrative: "Unable to analyze lineage at this time. Please try again."
    };
  }
};

// Lightweight family assignment - determines which of the 6 root templates a cocktail belongs to
const familyAssignmentSchema = {
  type: Type.OBJECT,
  properties: {
    familySlug: { type: Type.STRING, description: "The slug of the family: old-fashioned, martini, daiquiri, sidecar, whiskey-highball, or flip" },
    confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" },
    reasoning: { type: Type.STRING, description: "Brief explanation of why this family was chosen" }
  },
  required: ['familySlug', 'confidence', 'reasoning']
};

export interface FamilyAssignment {
  familySlug: string;
  confidence: number;
  reasoning: string;
}

export const assignCocktailFamily = async (
  cocktailName: string,
  ingredients: string[]
): Promise<FamilyAssignment | null> => {
  try {
    // Clean ingredients: trim whitespace and remove any surrounding quotes
    const cleanIngredients = ingredients
      .map(ing => ing.replace(/^["']|["']$/g, '').trim())
      .filter(ing => ing.length > 0);
    
    // Format ingredients as a readable list instead of JSON
    const ingredientList = cleanIngredients.join('\n- ');
    
    const prompt = `
      TASK: Quickly classify this cocktail into one of the 6 Cocktail Codex families.
      
      Cocktail: ${cocktailName}
      Ingredients:
      - ${ingredientList}
      
      FAMILIES (choose ONE slug):
      - "old-fashioned": Spirit + Sugar + Bitters (e.g., Old Fashioned, Sazerac, Improved Cocktail)
      - "martini": Spirit + Aromatized Wine/Vermouth (e.g., Martini, Manhattan, Negroni)
      - "daiquiri": Spirit + Citrus + Sugar (e.g., Daiquiri, Margarita, Whiskey Sour, Mojito)
      - "sidecar": Spirit + Citrus + Liqueur (e.g., Sidecar, Cosmopolitan, Last Word)
      - "whiskey-highball": Spirit + Carbonation (e.g., Gin & Tonic, Moscow Mule, Collins)
      - "flip": Spirit + Egg + Sugar (e.g., Eggnog, White Russian, Ramos Gin Fizz)
      
      CLASSIFICATION RULES:
      - If it has citrus AND sugar/simple syrup → likely "daiquiri"
      - If it has citrus AND liqueur → likely "sidecar"
      - If it has bitters AND sugar but NO citrus → likely "old-fashioned"
      - If it has vermouth/aromatized wine → likely "martini"
      - If it has carbonation/soda → likely "whiskey-highball"
      - If it has egg/cream → likely "flip"
      
      Return the single best-matching family slug.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseSchema: familyAssignmentSchema,
        temperature: 0.1
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Validate the response has required fields
    if (!data.familySlug || typeof data.familySlug !== 'string') {
      console.warn(`[Family Assignment] Invalid AI response for "${cocktailName}":`, data);
      return null;
    }
    
    return data as FamilyAssignment;
  } catch (error) {
    console.error("Error assigning cocktail family:", error);
    return null;
  }
};

export interface LabSubstitution {
  original: string;
  replacement: string;
  rationale: string;
}

export interface LabAddition {
  ingredient: string;
  amount: string;
  rationale: string;
}

export interface LabSimulationResult {
  substitutions: LabSubstitution[];
  additions: LabAddition[];
  predictedProfile: FlavorProfile;
  rationale: string;
  newIngredients: string[];
}

const labSimulationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    substitutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: "The original ingredient to replace (just the ingredient name, not the full measurement)" },
          replacement: { type: Type.STRING, description: "The recommended replacement ingredient" },
          rationale: { type: Type.STRING, description: "Brief explanation of why this substitution helps achieve the target flavor" }
        },
        required: ['original', 'replacement', 'rationale']
      }
    },
    additions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ingredient: { type: Type.STRING, description: "The new ingredient to add to the recipe" },
          amount: { type: Type.STRING, description: "The recommended amount (e.g., '0.25 oz', '2 dashes', '1 barspoon')" },
          rationale: { type: Type.STRING, description: "Brief explanation of why this addition helps achieve the target flavor" }
        },
        required: ['ingredient', 'amount', 'rationale']
      }
    },
    predictedProfile: flavorProfileSchema,
    rationale: { type: Type.STRING, description: "Overall explanation of how these changes will affect the drink's flavor" },
    newIngredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The complete modified ingredients list with measurements (including both substitutions and additions)"
    }
  },
  required: ['substitutions', 'additions', 'predictedProfile', 'rationale', 'newIngredients']
};

export const simulateFlavorSubstitutions = async (
  baseRecipe: { name: string; ingredients: string[]; flavorProfile: FlavorProfile },
  targetProfile: FlavorProfile,
  targetNotes?: string[]
): Promise<LabSimulationResult> => {
  try {
    const profileDiff = Object.values(FlavorDimension).map(dim => {
      const diff = targetProfile[dim] - baseRecipe.flavorProfile[dim];
      if (diff === 0) return null;
      return `${dim}: ${diff > 0 ? '+' : ''}${diff} (from ${baseRecipe.flavorProfile[dim]} to ${targetProfile[dim]})`;
    }).filter(Boolean).join(', ');

    const notesSection = targetNotes && targetNotes.length > 0 
      ? `\nSPECIFIC FLAVOR NOTES REQUESTED: ${targetNotes.join(', ')}\nThese specific flavor notes are HIGH PRIORITY. Choose ingredients that specifically deliver these flavor characteristics.`
      : '';

    const prompt = `
      You are a Master Mixologist and Flavor Expert.
      
      BASE RECIPE: "${baseRecipe.name}"
      INGREDIENTS: ${JSON.stringify(baseRecipe.ingredients)}
      CURRENT FLAVOR PROFILE: ${JSON.stringify(baseRecipe.flavorProfile)}
      
      TARGET FLAVOR PROFILE: ${JSON.stringify(targetProfile)}
      FLAVOR ADJUSTMENTS NEEDED: ${profileDiff || 'None - profiles are identical'}
      ${notesSection}
      
      ${FLAVOR_RUBRIC}
      
      TASK:
      Recommend modifications to transform the base recipe's flavor profile to match the target.
      You may suggest BOTH substitutions (replacing existing ingredients) AND additions (new ingredients to add).
      
      MODIFICATION TYPES:
      1. SUBSTITUTIONS: Replace one ingredient with another (e.g., swap bourbon for rye)
      2. ADDITIONS: Add new ingredients to enhance or introduce flavors (e.g., add 2 dashes of bitters, add 0.25 oz of a liqueur)
      
      RULES:
      1. Prioritize achieving the requested specific flavor notes if provided.
      2. Keep the spirit/core of the original cocktail recognizable.
      3. Each modification should explain HOW it affects the flavor.
      4. Additions should use reasonable bar measurements (dashes, barspoons, rinses, small amounts).
      5. Include BOTH substitutions array AND additions array in your response.
      6. The newIngredients list should include all original ingredients with substitutions applied PLUS any additions.
      
      SPECIFIC FLAVOR NOTE INGREDIENTS:
      - Honey notes: Honey syrup, mead, aged rum
      - Caramel notes: Demerara syrup, aged spirits, butterscotch liqueur
      - Vanilla notes: Vanilla extract, Licor 43, aged bourbon
      - Citrus notes: Fresh citrus juice, citrus bitters, limoncello
      - Berry notes: Crème de cassis, raspberry liqueur, fresh berries
      - Tropical notes: Pineapple, coconut, passion fruit, falernum
      - Mint notes: Fresh mint, crème de menthe, Fernet Branca
      - Ginger notes: Fresh ginger, ginger syrup, ginger beer
      - Coffee notes: Coffee liqueur, cold brew, espresso
      - Chocolate notes: Crème de cacao, chocolate bitters
      - Peat/Smoke notes: Islay scotch, mezcal, smoked salt
      - Cinnamon notes: Cinnamon syrup, allspice dram
      
      Return your analysis as JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: labSimulationSchema,
        temperature: 0.6,
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    return {
      substitutions: data.substitutions || [],
      additions: data.additions || [],
      predictedProfile: data.predictedProfile || targetProfile,
      rationale: data.rationale || 'No changes recommended.',
      newIngredients: data.newIngredients || baseRecipe.ingredients
    };
  } catch (error) {
    console.error("Error simulating flavor substitutions:", error);
    throw error;
  }
};

export interface BuildCocktailResult {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  predictedProfile: FlavorProfile;
  rationale: string;
}

const buildCocktailSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A creative name for the cocktail" },
    description: { type: Type.STRING, description: "A short, enticing description of the cocktail" },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Complete list of ingredients with exact measurements (e.g., '2 oz Bourbon', '0.75 oz Fresh Lemon Juice')"
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step instructions for making the cocktail"
    },
    predictedProfile: flavorProfileSchema,
    rationale: { type: Type.STRING, description: "Explanation of how this cocktail achieves the target flavor profile and uses the selected ingredients" }
  },
  required: ['name', 'description', 'ingredients', 'instructions', 'predictedProfile', 'rationale']
};

export const buildCocktailFromIngredients = async (
  selectedIngredients: { name: string; category: string; abv?: number; flavorNotes?: string }[],
  targetProfile: FlavorProfile
): Promise<BuildCocktailResult> => {
  try {
    const ingredientSummary = selectedIngredients.map(i => 
      `- ${i.name} (${i.category}${i.abv ? `, ${i.abv}% ABV` : ''}${i.flavorNotes ? `, notes: ${i.flavorNotes}` : ''})`
    ).join('\n');

    const prompt = `
      You are a Master Mixologist and Cocktail Creator.
      
      SELECTED INGREDIENTS (these MUST be the foundation of the cocktail):
      ${ingredientSummary}
      
      TARGET FLAVOR PROFILE:
      ${JSON.stringify(targetProfile)}
      
      ${FLAVOR_RUBRIC}
      
      TASK:
      Create a complete, balanced cocktail recipe using the selected ingredients as the foundation.
      You may add complementary ingredients (citrus, sweeteners, bitters, garnishes) to create a well-balanced drink,
      but the selected ingredients must be the stars of the show.
      
      RULES:
      1. ALL selected ingredients MUST appear in the final recipe.
      2. Add only necessary complementary ingredients for balance.
      3. The flavor profile should match the target as closely as possible.
      4. Provide exact measurements for all ingredients.
      5. Include clear, professional instructions.
      6. Create a creative but appropriate name that reflects the ingredients.
      7. The description should be enticing and hint at the flavors.
      
      COCKTAIL BALANCE GUIDELINES:
      - Spirit-forward drinks: 2-2.5 oz base spirit, minimal mixers
      - Sours: 2 oz spirit, 0.75 oz citrus, 0.5-0.75 oz sweetener
      - Highballs: 1.5-2 oz spirit, 4-5 oz mixer
      - Stirred cocktails: 2 oz base, 1 oz modifier, dashes of bitters/liqueur
      
      Return your creation as JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: buildCocktailSchema,
        temperature: 0.8,
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    return {
      name: data.name || 'Custom Cocktail',
      description: data.description || 'A custom creation',
      ingredients: data.ingredients || selectedIngredients.map(i => i.name),
      instructions: data.instructions || ['Combine ingredients and stir.'],
      predictedProfile: data.predictedProfile || targetProfile,
      rationale: data.rationale || 'A balanced cocktail using your selected ingredients.'
    };
  } catch (error) {
    console.error("Error building cocktail from ingredients:", error);
    throw error;
  }
};