
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FlavorProfile, FlavorDimension, Recommendation, Ingredient } from '../types';
import { analyzeSocialMediaLink, generateSearchSystemPrompt, sanitizeSocialMediaUrl, SocialMediaLinkInfo } from './socialMediaUtils';

const apiKey = process.env.API_KEY || '';
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
  } catch (error) {
    console.error("Error generating cocktail image:", error);
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