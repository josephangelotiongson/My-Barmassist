import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FlavorProfile, FlavorDimension, Recommendation, Ingredient } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Models
const MODEL_FLASH = 'gemini-2.5-flash';
const MODEL_IMAGE = 'gemini-2.5-flash-image';

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
          ingredientsToUse: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.STRING },
          flavorProfile: flavorProfileSchema
        },
        required: ['name', 'description', 'matchScore', 'ingredientsToUse', 'missingIngredients', 'instructions', 'flavorProfile']
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
  let clean = text;
  // Remove markdown code blocks (```json ... ``` or just ``` ... ```)
  clean = clean.replace(/```json/gi, '').replace(/```/g, '');
  return clean.trim();
};

export const analyzeDrinkText = async (text: string): Promise<any> => {
  try {
    const isUrl = /(https?:\/\/[^\s]+)/g.test(text);
    
    let tools = undefined;
    // Use Google Search grounding if a URL is detected to read the recipe
    if (isUrl) {
      tools = [{ googleSearch: {} }];
    }

    const prompt = `
      You are an Expert Mixologist and Digital Archivist. 
      Analyze this cocktail input (text or URL).
      
      Input: "${text}"

      Your Goal: Extract the full recipe data.

      STRATEGY:
      1. CAPTION CHECK: First, look for a written recipe in the caption, description, or page text.
      2. VIDEO CONTENT EXTRACTION (CRITICAL): If the recipe is NOT in the text/caption, assume it is contained within the video content.
         - Use the search tool to access the page content, looking specifically for transcripts, video metadata, or descriptive text of the actions.
         - "Watch" the video by inferring steps from the audio transcript or visual descriptions (e.g., "pouring dark liquid from square bottle" -> likely Bourbon or Rye).
      3. MIXOLOGY FRAMEWORK FALLBACK: If ingredients are identified but specific quantities are missing (e.g., video just shows pouring without measurements):
         - Apply standard Mixology Frameworks to balance the drink.
         - For Sours: Use the Golden Ratio (2:1:1 -> 2 parts Spirit, 1 part Sweet, 1 part Sour).
         - For Stirred/Boozy: Use 2:1 (2 parts Base, 1 part Modifier).
         - If you estimate the specs, explicitly mention "Estimated via Mixology Framework based on video actions" in the description.

      RETURN JSON ONLY. No markdown blocks.
      JSON Structure:
      {
        "name": "string",
        "creator": "string (optional)",
        "description": "string",
        "ingredients": ["string", "string"],
        "instructions": ["string", "string"],
        "flavorProfile": {
          "Sweet": number,
          "Sour": number,
          "Bitter": number,
          "Boozy": number,
          "Herbal": number,
          "Fruity": number,
          "Spicy": number,
          "Smoky": number
        }
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_FLASH,
        contents: prompt,
        config: {
          // responseSchema is not compatible with googleSearch tool, so we parse manually
          tools: tools,
          temperature: 0.3,
        }
      });
      
      const jsonText = cleanJsonString(response.text || '{}');
      return JSON.parse(jsonText);

    } catch (error: any) {
      const errorMessage = error.message || JSON.stringify(error);
      // Handle XHR/RPC errors (common with Search Tool in some environments)
      if (tools && (errorMessage.includes('xhr') || errorMessage.includes('Rpc') || errorMessage.includes('fetch') || errorMessage.includes('error code: 6') || errorMessage.includes('500'))) {
        console.warn("Search tool failed (likely network/blocker). Retrying with pure text analysis.", error);
        
        // Fallback: Try without tools (Pure inference)
        const fallbackResponse = await ai.models.generateContent({
          model: MODEL_FLASH,
          contents: prompt + "\n(Note: External search failed. Infer recipe details from the URL text or known cocktail knowledge.)",
          config: {
            temperature: 0.4, // Slightly higher temp for better inference/hallucination of standard recipes
          }
        });
        
        const jsonText = cleanJsonString(fallbackResponse.text || '{}');
        return JSON.parse(jsonText);
      }
      
      // If it's not a tool error, rethrow
      throw error;
    }

  } catch (error) {
    console.error("Error analyzing drink text:", error);
    throw error;
  }
};

export const generateCocktailImage = async (name: string, description: string, ingredients: string[]): Promise<string | undefined> => {
  try {
    // STRICT TEMPLATE FOR CONSISTENCY
    const prompt = `
      Create a hyper-realistic, cinematic professional food photography shot of a cocktail named "${name}".

      VISUAL TEMPLATE (STRICT - FOLLOW EXACTLY):
      - SETTING: Placed on a dark, textured charcoal slate bar counter.
      - BACKGROUND: A dark, out-of-focus (bokeh) vintage bar shelf with amber glass bottles. The background must be dark and moody, deep stone grey and warm amber tones.
      - LIGHTING: Dramatic chiaroscuro single-source side lighting (Rembrandt style) coming from the left. High contrast. Golden rim light highlighting the glass edges and condensation.
      - CAMERA: 85mm macro lens, f/1.8 aperture. Sharp focus on the garnish and condensation droplets on the glass.
      - COMPOSITION: Eye-level, centered subject.

      COCKTAIL SPECIFICS:
      - Description/Context: ${description}
      - Key Ingredients (for color/texture implication): ${ingredients.join(', ')}
      - Garnish: Perfectly placed, fresh, high-detail.

      QUALITY:
      - 8k resolution, Unreal Engine 5 render style, highly detailed, appetizing.
      - NO TEXT, NO LOGOS, NO PEOPLE, NO HANDS in the frame.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: { parts: [{ text: prompt }] },
    });

    // Extract image from response parts
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
    // Return undefined to handle gracefully in UI
    return undefined;
  }
};

export const identifyIngredientsFromImage = async (base64Image: string): Promise<any[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FLASH, // 2.5 Flash is multimodal
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Identify all visible cocktail ingredients (bottles, fruits, mixers) in this image. IMPORTANT: Also estimate the remaining volume/liquid level in the bottles (e.g., 'Full 750ml', 'Half Bottle', '~2oz remaining')."
          }
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

// New function to enrich ingredient details using Search
export const enrichIngredientDetails = async (ingredientName: string): Promise<string> => {
  try {
    const prompt = `
      Search for the flavor profile and tasting notes of the alcohol or ingredient: "${ingredientName}".
      Return a concise, 1-sentence description of its flavor profile (e.g. "Juniper-forward with citrus and floral notes" for Gin).
      If it is a common brand, be specific about that brand's profile.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
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
      User Palate Profile (0-10): ${JSON.stringify(userPalate)}
      Available Ingredients: ${JSON.stringify(pantryIngredients)}
      
      Suggest 3 cocktail recipes. 
      1. One that uses ONLY available ingredients (if possible).
      2. One that is a perfect match for their palate (might require buying 1-2 things).
      3. An adventurous choice slightly outside their comfort zone but still appealing.
      
      Provide a match score (0-100) based on how well it fits their palate.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
        temperature: 0.7, // A bit of creativity
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
      You are a Sommelier/Mixologist.
      I will provide a photo of a Cocktail Menu and a User's Flavor Palate.
      
      User Palate: ${JSON.stringify(userPalate)}
      
      TASK:
      1. Read the menu items (Cocktail names, ingredients, descriptions).
      2. Compare each valid option against the User's Palate.
      3. Select the TOP 3 recommendations from the menu.
      
      OUTPUT JSON with fields:
      - name: Drink Name
      - description: A reasoning string explaining WHY this fits their palate, combined with the menu description.
      - matchScore: 0-100 compatibility.
      - ingredientsToUse: The ingredients listed on the menu.
      - missingIngredients: LEAVE EMPTY [].
      - instructions: DEDUCE the likely preparation instructions (e.g., "Shake with ice and strain") based on the ingredients. DO NOT output "Order at the bar".
      - flavorProfile: Estimate the profile of the drink.
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

// New function for "Help Me" Bar Mode
export const getBarOrderSuggestion = async (
  userPalate: FlavorProfile,
  mode: 'typical' | 'adventurous'
): Promise<{ script: string, suggestion: string, reasoning: string }> => {
  try {
    const prompt = `
      You are a Wingman / Mixology Guide for someone at a bar.
      User Palate (0-10): ${JSON.stringify(userPalate)}
      Mode: ${mode.toUpperCase()}

      Task: Create a short, natural script the user can READ ALOUD to a bartender to get a drink they will like.

      Rules:
      - IF Mode is 'typical': Look at their highest flavor scores. Write a request that asks for those specific flavors (e.g., "I usually love bitter and herbal drinks, what do you have like that?").
      - IF Mode is 'adventurous': Look at their lower scores or opposites. Write a request that pushes their boundaries but is still balanced (e.g., "I usually drink bourbon, but I want to try something refreshing and floral today.").
      - The 'suggestion' field should be a specific classic cocktail name they can keep in their back pocket if the bartender asks for an example.
      - Keep the script colloquial, polite, and short.

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
    console.error("Error getting bar suggestion:", error);
    return {
      script: "I'm not sure what I want, what is your signature drink?",
      suggestion: "Old Fashioned",
      reasoning: "Fallback due to error."
    };
  }
};

// --- Bartender Agent to Deduce Recipes ---
export const deduceRecipe = async (name: string, knownIngredients: string[]): Promise<any> => {
  try {
    const prompt = `
      You are an Expert Bartender Agent.
      TASK: Convert a drink order into a functional recipe for home use.

      Drink Name: "${name}"
      Known Ingredients (may be incomplete or just a list): ${JSON.stringify(knownIngredients)}

      Goal: Deduce a balanced recipe (measurements and instructions) using standard mixology frameworks (Golden Ratio, Classic Specs).
      
      Examples:
      - If it looks like a Sour: Use 2oz Spirit, 1oz Sweet, 1oz Sour.
      - If it looks like a Stirred/Spirit-Forward: Use 2oz Spirit, 1oz Modifier, Bitters.
      - If it's a Highball: Use 2oz Spirit, 4oz Mixer.
      
      OUTPUT JSON:
      {
        "ingredients": ["2 oz Bourbon", "0.75 oz Lemon Juice"],
        "instructions": ["Shake with ice", "Strain"],
        "description": "A deduction of the recipe based on standard mixology balance.",
        "flavorProfile": { ... }
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: prompt,
      config: {
        temperature: 0.4
      }
    });

    const text = cleanJsonString(response.text || '{}');
    return JSON.parse(text);
  } catch (error) {
    console.error("Error deducing recipe:", error);
    // Fallback safe return
    return {
      ingredients: knownIngredients.length > 0 ? knownIngredients : ["Spirit", "Modifier"],
      instructions: ["Mix ingredients with ice.", "Serve."],
      description: "Could not deduce specific recipe.",
      flavorProfile: { Sweet: 5, Sour: 5, Bitter: 0, Boozy: 5, Herbal: 0, Fruity: 0, Spicy: 0, Smoky: 0 }
    };
  }
};