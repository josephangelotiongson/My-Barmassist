import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { seedGlobalRecipes } from "./seedGlobalRecipes";
import { enrichPendingRecipes } from "./enrichGlobalRecipes";
import { enrichRecipeData } from "./recipeEnrichment";
import { seedMasterIngredients } from "./seedIngredients";
import { enrichPendingIngredients } from "./ingredientEnrichment";
import { seedModernRecipes } from "./seedModernRecipes";
import { assignCocktailFamily, simulateFlavorSubstitutions } from "../services/geminiService";
import { orchestrateFullLineage } from "./lineageOrchestrator";

const objectStorageService = new ObjectStorageService();
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '';

// Admin-only middleware - only allows the configured admin user
function isAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const userId = req.user.claims?.sub;
  if (!userId || userId !== ADMIN_USER_ID) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

async function resolveShortUrl(shortUrl: string): Promise<{ finalUrl: string; success: boolean }> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return { finalUrl: response.url, success: true };
  } catch (error) {
    try {
      const response = await fetch(shortUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      return { finalUrl: response.url, success: true };
    } catch (e) {
      console.error("Failed to resolve short URL:", e);
      return { finalUrl: shortUrl, success: false };
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Serve cocktail images from Object Storage
  app.get('/cocktail-images/:filename', async (req, res) => {
    try {
      const imagePath = `/cocktail-images/${req.params.filename}`;
      const file = await objectStorageService.getCocktailImage(imagePath);
      if (!file) {
        return res.status(404).json({ error: "Image not found" });
      }
      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving cocktail image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Image not found" });
      }
      return res.status(500).json({ error: "Failed to serve image" });
    }
  });

  // Auth routes - Replit Auth integration
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      // Hide email from response for privacy
      const { email, ...userWithoutEmail } = user || {};
      res.json(userWithoutEmail);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Global recipes routes (public read access - no auth required)
  app.get('/api/global-recipes', async (req, res) => {
    try {
      const recipes = await storage.getAllGlobalRecipes();
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching global recipes:", error);
      res.status(500).json({ message: "Failed to fetch global recipes" });
    }
  });

  app.get('/api/global-recipes/stats', async (req, res) => {
    try {
      const stats = await storage.getEnrichmentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching enrichment stats:", error);
      res.status(500).json({ message: "Failed to fetch enrichment stats" });
    }
  });

  app.get('/api/global-recipes/:slug', async (req, res) => {
    try {
      const recipe = await storage.getGlobalRecipeBySlug(req.params.slug);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching global recipe:", error);
      res.status(500).json({ message: "Failed to fetch global recipe" });
    }
  });

  // Admin endpoints for seeding and enrichment (requires admin access)
  // Check if user is admin
  app.get('/api/admin/check', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims?.sub;
    const isAdminUser = userId === ADMIN_USER_ID;
    res.json({ isAdmin: isAdminUser, userId });
  });

  app.post('/api/admin/seed-recipes', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = await seedGlobalRecipes();
      res.json(result);
    } catch (error) {
      console.error("Error seeding recipes:", error);
      res.status(500).json({ message: "Failed to seed recipes" });
    }
  });

  app.post('/api/admin/seed-modern-recipes', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = await seedModernRecipes();
      res.json(result);
    } catch (error) {
      console.error("Error seeding modern recipes:", error);
      res.status(500).json({ message: "Failed to seed modern recipes" });
    }
  });

  app.post('/api/admin/enrich-recipes', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const batchSize = parseInt(req.query.batch as string) || 5;
      const result = await enrichPendingRecipes(batchSize);
      res.json(result);
    } catch (error) {
      console.error("Error enriching recipes:", error);
      res.status(500).json({ message: "Failed to enrich recipes" });
    }
  });

  // Add a new global recipe (admin only)
  app.post('/api/admin/global-recipes', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { name, description, category, ingredients, instructions, glassType, garnish, creator, creatorType, history } = req.body;
      
      if (!name || !ingredients || !instructions) {
        return res.status(400).json({ message: "Name, ingredients, and instructions are required" });
      }
      
      // Generate slug from name
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const newRecipe = await storage.createGlobalRecipe({
        slug,
        name,
        description: description || '',
        category: category || 'Uncategorized',
        ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
        instructions: Array.isArray(instructions) ? instructions : [instructions],
        glassType: glassType || 'Coupe',
        garnish: garnish || '',
        creator: creator || 'Admin',
        creatorType: creatorType || 'Manual',
        history: history || null,
        flavorProfile: null,
        nutrition: null,
        enrichmentStatus: 'pending'
      });
      
      res.json({ success: true, recipe: newRecipe });
    } catch (error: any) {
      console.error("Error adding global recipe:", error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Recipe with this name already exists" });
      }
      res.status(500).json({ message: "Failed to add global recipe" });
    }
  });

  // Get global recipe count and stats (admin only)
  app.get('/api/admin/global-recipes/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getEnrichmentStats();
      const allRecipes = await storage.getAllGlobalRecipes();
      res.json({
        ...stats,
        totalRecipes: allRecipes.length,
        categories: [...new Set(allRecipes.map(r => r.category))],
        creators: [...new Set(allRecipes.map(r => r.creator).filter(Boolean))]
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Master ingredients routes (public read access)
  app.get('/api/ingredients', async (req, res) => {
    try {
      const ingredients = await storage.getAllMasterIngredients();
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ message: "Failed to fetch ingredients" });
    }
  });

  app.get('/api/ingredients/stats', async (req, res) => {
    try {
      const stats = await storage.getIngredientEnrichmentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching ingredient stats:", error);
      res.status(500).json({ message: "Failed to fetch ingredient stats" });
    }
  });

  app.get('/api/ingredients/:slug', async (req, res) => {
    try {
      const ingredient = await storage.getMasterIngredientBySlug(req.params.slug);
      if (!ingredient) {
        return res.status(404).json({ message: "Ingredient not found" });
      }
      res.json(ingredient);
    } catch (error) {
      console.error("Error fetching ingredient:", error);
      res.status(500).json({ message: "Failed to fetch ingredient" });
    }
  });

  // Admin endpoints for ingredient seeding and enrichment (requires authentication)
  app.post('/api/admin/seed-ingredients', isAuthenticated, async (req: any, res) => {
    try {
      const result = await seedMasterIngredients();
      res.json(result);
    } catch (error) {
      console.error("Error seeding ingredients:", error);
      res.status(500).json({ message: "Failed to seed ingredients" });
    }
  });

  app.post('/api/admin/enrich-ingredients', isAuthenticated, async (req: any, res) => {
    try {
      const batchSize = parseInt(req.query.batch as string) || 5;
      const result = await enrichPendingIngredients(batchSize);
      res.json(result);
    } catch (error) {
      console.error("Error enriching ingredients:", error);
      res.status(500).json({ message: "Failed to enrich ingredients" });
    }
  });

  app.post('/api/resolve-url', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      const isTikTokShortLink = /^https?:\/\/(vm|vt|m)\.tiktok\.com/i.test(url);
      
      if (!isTikTokShortLink) {
        return res.json({ originalUrl: url, resolvedUrl: url, wasExpanded: false });
      }
      
      console.log(`[URL Resolver] Expanding TikTok short link: ${url}`);
      const result = await resolveShortUrl(url);
      
      console.log(`[URL Resolver] Resolved to: ${result.finalUrl}`);
      
      return res.json({
        originalUrl: url,
        resolvedUrl: result.finalUrl,
        wasExpanded: result.success && result.finalUrl !== url,
      });
    } catch (error) {
      console.error("Error resolving URL:", error);
      res.status(500).json({ error: "Failed to resolve URL" });
    }
  });

  // User recipes routes
  app.get('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipes = await storage.getUserRecipes(userId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.post('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipeData = { ...req.body, userId };
      
      const recipe = await storage.createRecipe(recipeData);
      
      res.json(recipe);
      
      // Background enrichment for flavor profile and nutrition
      if (recipe.enrichmentStatus === 'pending' && recipe.ingredients?.length > 0) {
        console.log(`Starting background enrichment for user recipe "${recipe.name}"...`);
        enrichRecipeData(recipe.name, recipe.ingredients, recipe.instructions)
          .then(async (enrichment) => {
            if (enrichment) {
              await storage.updateRecipeEnrichment(recipe.id, userId, {
                flavorProfile: enrichment.flavorProfile,
                nutrition: enrichment.nutrition,
                enrichmentStatus: 'complete',
                enrichedAt: new Date(),
              });
              console.log(`Successfully enriched user recipe "${recipe.name}"`);
            } else {
              await storage.updateRecipeEnrichment(recipe.id, userId, {
                enrichmentStatus: 'failed',
              });
              console.log(`Failed to enrich user recipe "${recipe.name}"`);
            }
          })
          .catch((error) => {
            console.error(`Error enriching recipe "${recipe.name}":`, error);
          });
      }

      // Background family assignment for cocktail lineage
      // Database stores ingredients as string[] like ["2 oz Rye Whiskey", "0.25 oz Simple Syrup", ...]
      if (Array.isArray(recipe.ingredients) && recipe.ingredients.length >= 2) {
        // Verify all ingredients are valid strings
        const validIngredients = recipe.ingredients.filter(
          (ing: any) => typeof ing === 'string' && ing.trim().length > 2
        );
        
        if (validIngredients.length >= 2) {
          console.log(`[Family Assignment] "${recipe.name}" with ingredients:`, validIngredients.slice(0, 3));
          assignCocktailFamily(recipe.name, validIngredients)
            .then(async (assignment) => {
              try {
                if (assignment && assignment.familySlug) {
                  const family = await storage.getCocktailFamilyBySlug(assignment.familySlug);
                  if (family) {
                    await storage.upsertLineage({
                      recipeName: recipe.name,
                      familyId: family.id,
                      relationship: assignment.reasoning,
                      keyModifications: [],
                      evolutionNarrative: `${recipe.name} belongs to the ${family.name} family.`
                    });
                    console.log(`[Family Assignment] "${recipe.name}" -> ${family.name} (${(assignment.confidence * 100).toFixed(0)}%)`);
                  } else {
                    console.warn(`[Family Assignment] Family "${assignment.familySlug}" not found for "${recipe.name}"`);
                  }
                } else {
                  console.warn(`[Family Assignment] No family assigned for "${recipe.name}"`);
                }
              } catch (innerError) {
                console.error(`[Family Assignment] Error saving for "${recipe.name}":`, innerError);
              }
            })
            .catch((error) => {
              console.error(`[Family Assignment] AI error for "${recipe.name}":`, error);
            });
        } else {
          console.warn(`[Family Assignment] Skipped "${recipe.name}" - insufficient valid string ingredients`);
        }
      }
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const recipe = await storage.updateRecipe(id, userId, req.body);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deleteRecipe(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  app.delete('/api/recipes/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetAllRecipes(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting recipes:", error);
      res.status(500).json({ message: "Failed to reset recipes" });
    }
  });

  // User ratings/history routes
  app.get('/api/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ratings = await storage.getUserRatings(userId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  app.post('/api/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rating = await storage.createRating({ ...req.body, userId });
      res.json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      res.status(500).json({ message: "Failed to create rating" });
    }
  });

  app.post('/api/ratings/upsert', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeName, rating } = req.body;
      const result = await storage.upsertRating(userId, recipeName, rating);
      res.json(result);
    } catch (error) {
      console.error("Error upserting rating:", error);
      res.status(500).json({ message: "Failed to save rating" });
    }
  });

  app.delete('/api/ratings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deleteRating(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rating:", error);
      res.status(500).json({ message: "Failed to delete rating" });
    }
  });

  app.delete('/api/ratings/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetAllRatings(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting ratings:", error);
      res.status(500).json({ message: "Failed to reset ratings" });
    }
  });

  // Update rating image URL
  app.put('/api/ratings/image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeName, imageUrl } = req.body;
      const result = await storage.updateRatingImage(userId, recipeName, imageUrl);
      res.json(result || { success: true });
    } catch (error) {
      console.error("Error updating rating image:", error);
      res.status(500).json({ message: "Failed to update rating image" });
    }
  });

  // Shopping list routes
  app.get('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getUserShoppingList(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ message: "Failed to fetch shopping list" });
    }
  });

  app.post('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.addToShoppingList({ ...req.body, userId });
      res.json(item);
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      res.status(500).json({ message: "Failed to add to shopping list" });
    }
  });

  app.put('/api/shopping-list/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const item = await storage.updateShoppingItem(id, userId, req.body);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating shopping item:", error);
      res.status(500).json({ message: "Failed to update shopping item" });
    }
  });

  app.delete('/api/shopping-list/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.removeFromShoppingList(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from shopping list:", error);
      res.status(500).json({ message: "Failed to remove from shopping list" });
    }
  });

  app.delete('/api/shopping-list/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetShoppingList(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting shopping list:", error);
      res.status(500).json({ message: "Failed to reset shopping list" });
    }
  });

  // User settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.upsertUserSettings({ ...req.body, userId });
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Global recipe images (no authentication required - shared across all users)
  app.get('/api/recipe-images', async (req, res) => {
    try {
      const images = await storage.getAllRecipeImages();
      res.json(images);
    } catch (error) {
      console.error("Error fetching recipe images:", error);
      res.status(500).json({ message: "Failed to fetch recipe images" });
    }
  });

  // Check if an image exists for a specific recipe (by name and optional creatorId)
  // Query params: ?creatorId=xxx for user variations
  app.get('/api/recipe-images/:recipeName', async (req, res) => {
    try {
      const recipeName = decodeURIComponent(req.params.recipeName);
      const creatorId = req.query.creatorId as string | undefined;
      
      // First check for user-specific image, then fall back to classic
      const image = await storage.getRecipeImage(recipeName, creatorId);
      if (image) {
        res.json({ exists: true, imageUrl: image.imageUrl, creatorId: image.creatorId });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking recipe image:", error);
      res.status(500).json({ message: "Failed to check recipe image" });
    }
  });

  // Save a recipe image (supports both classic recipes and user variations)
  app.post('/api/recipe-images', async (req, res) => {
    try {
      const { recipeName, imageData, creatorId } = req.body;
      if (!recipeName || !imageData) {
        return res.status(400).json({ message: "Recipe name and image data are required" });
      }
      
      // Upload image to Object Storage with optional creatorId in filename
      const imagePath = await objectStorageService.uploadCocktailImage(recipeName, imageData, creatorId);
      
      // Store the path in the database with creatorId
      const result = await storage.upsertRecipeImage(recipeName, imagePath, creatorId);
      res.json(result);
    } catch (error) {
      console.error("Error saving recipe image:", error);
      res.status(500).json({ message: "Failed to save recipe image" });
    }
  });

  // ============ RECIPE SHARING ROUTES ============

  // Get a shared recipe by type and id/slug (public - no auth required)
  app.get('/api/share/:type/:id', async (req: any, res) => {
    try {
      const { type, id } = req.params;
      const userId = req.user?.claims?.sub;
      
      let recipe: any = null;
      let alreadyOwned = false;
      
      if (type === 'global') {
        // Get global recipe by slug
        recipe = await storage.getGlobalRecipeBySlug(id);
        if (recipe) {
          // Transform to match expected format
          recipe = {
            ...recipe,
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [recipe.instructions],
          };
        }
      } else if (type === 'user') {
        // Get user recipe by ID
        const recipeId = parseInt(id, 10);
        if (isNaN(recipeId)) {
          return res.status(400).json({ message: "Invalid recipe ID" });
        }
        recipe = await storage.getUserRecipeById(recipeId);
        if (recipe) {
          // Check if current user already has this recipe
          if (userId) {
            alreadyOwned = await storage.userHasRecipeByName(userId, recipe.name);
          }
          // Transform to match expected format
          recipe = {
            ...recipe,
            instructions: recipe.instructions ? 
              (typeof recipe.instructions === 'string' ? recipe.instructions.split('\n') : [recipe.instructions]) : 
              [],
          };
        }
      } else if (type === 'riff') {
        // Get lab riff by slug
        recipe = await storage.getLabRiffBySlug(id);
        if (recipe) {
          // Check if current user already has this riff
          if (userId && recipe.userId === userId) {
            alreadyOwned = true;
          }
          // Transform to match expected format
          recipe = {
            ...recipe,
            instructions: recipe.instructions || [`Prepare as a variation of ${recipe.parentRecipeName}`],
          };
        }
      } else {
        return res.status(400).json({ message: "Invalid recipe type" });
      }
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Get image if available
      const image = await storage.getRecipeImage(recipe.name);
      if (image) {
        recipe.imageUrl = image.imageUrl;
      }
      
      res.json({ recipe, alreadyOwned });
    } catch (error) {
      console.error("Error fetching shared recipe:", error);
      res.status(500).json({ message: "Failed to fetch shared recipe" });
    }
  });

  // Add a shared recipe to user's collection
  app.post('/api/share/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeType, recipeId } = req.body;
      
      if (!recipeType || !recipeId) {
        return res.status(400).json({ message: "Recipe type and ID are required" });
      }
      
      let sourceRecipe: any = null;
      
      if (recipeType === 'user') {
        const id = parseInt(recipeId, 10);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid recipe ID" });
        }
        sourceRecipe = await storage.getUserRecipeById(id);
      } else if (recipeType === 'riff') {
        sourceRecipe = await storage.getLabRiffBySlug(recipeId);
      } else {
        return res.status(400).json({ message: "Only user recipes and riffs can be added to collection" });
      }
      
      if (!sourceRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Check if user already has this recipe
      const alreadyOwned = await storage.userHasRecipeByName(userId, sourceRecipe.name);
      if (alreadyOwned) {
        return res.status(409).json({ message: "Recipe already in your collection" });
      }
      
      // Create new recipe for the user
      const newRecipe = await storage.createRecipe({
        userId,
        name: sourceRecipe.name,
        ingredients: sourceRecipe.ingredients,
        instructions: Array.isArray(sourceRecipe.instructions) 
          ? sourceRecipe.instructions.join('\n') 
          : sourceRecipe.instructions || '',
        flavorProfile: sourceRecipe.flavorProfile,
        nutrition: sourceRecipe.nutrition,
        category: sourceRecipe.category,
        glassType: sourceRecipe.glassType,
        garnish: sourceRecipe.garnish,
        imageUrl: sourceRecipe.imageUrl,
        isCustom: false, // Imported from share
        enrichmentStatus: sourceRecipe.enrichmentStatus || 'pending',
      });
      
      res.json({ success: true, recipe: newRecipe });
    } catch (error) {
      console.error("Error adding shared recipe:", error);
      res.status(500).json({ message: "Failed to add recipe to collection" });
    }
  });

  // ============ COCKTAIL LINEAGE ROUTES ============

  // Get all cocktail families (the 6 root templates)
  app.get('/api/cocktail-families', async (req, res) => {
    try {
      const families = await storage.getAllCocktailFamilies();
      res.json(families);
    } catch (error) {
      console.error("Error fetching cocktail families:", error);
      res.status(500).json({ message: "Failed to fetch cocktail families" });
    }
  });

  // Initialize/seed cocktail families (admin only)
  app.post('/api/cocktail-families/seed', isAdmin, async (req, res) => {
    try {
      const families = [
        {
          slug: 'old-fashioned',
          name: 'Old Fashioned',
          formula: 'Spirit + Sugar + Bitters',
          description: 'The ancestral template. Spirit-forward with sweetness and aromatic bitters. The foundation of cocktail making.',
          icon: '🥃'
        },
        {
          slug: 'martini',
          name: 'Martini',
          formula: 'Spirit + Aromatized Wine/Vermouth',
          description: 'Spirit paired with vermouth or other aromatized wines. Creates elegant, complex, spirit-forward drinks.',
          icon: '🍸'
        },
        {
          slug: 'daiquiri',
          name: 'Daiquiri',
          formula: 'Spirit + Citrus + Sugar',
          description: 'The sour template. Balances spirit with citrus acidity and sweetness. Foundation of all sour cocktails.',
          icon: '🍹'
        },
        {
          slug: 'sidecar',
          name: 'Sidecar',
          formula: 'Spirit + Citrus + Liqueur',
          description: 'A Daiquiri sibling using liqueur instead of simple syrup. Creates more complex, layered sours.',
          icon: '🍋'
        },
        {
          slug: 'whiskey-highball',
          name: 'Whiskey Highball',
          formula: 'Spirit + Carbonation',
          description: 'Simple refreshment. Spirit lengthened with carbonated mixer. Includes Collins, Mules, and G&Ts.',
          icon: '🥂'
        },
        {
          slug: 'flip',
          name: 'Flip',
          formula: 'Spirit + Whole Egg + Sugar',
          description: 'Rich and creamy. Uses egg for texture and body. Includes nogs, cream cocktails, and dessert drinks.',
          icon: '🥚'
        }
      ];

      const results = [];
      for (const family of families) {
        const result = await storage.upsertCocktailFamily(family);
        results.push(result);
      }

      res.json({ message: 'Families seeded successfully', count: results.length, families: results });
    } catch (error) {
      console.error("Error seeding cocktail families:", error);
      res.status(500).json({ message: "Failed to seed cocktail families" });
    }
  });

  // Get lineage for a specific recipe (returns from database if exists)
  app.get('/api/lineage/:recipeName', async (req, res) => {
    try {
      const recipeName = decodeURIComponent(req.params.recipeName);
      const lineageData = await storage.getFullLineageData(recipeName);
      
      if (!lineageData) {
        return res.json({ exists: false });
      }

      res.json({ 
        exists: true, 
        data: lineageData 
      });
    } catch (error) {
      console.error("Error fetching lineage:", error);
      res.status(500).json({ message: "Failed to fetch lineage" });
    }
  });

  // Save lineage data (stores AI-generated lineage to database)
  app.post('/api/lineage', async (req, res) => {
    try {
      const { recipeName, familySlug, relationship, keyModifications, evolutionNarrative, ancestors, siblings, descendants, flavorBridges } = req.body;

      if (!recipeName) {
        return res.status(400).json({ message: "Recipe name is required" });
      }

      // Get all existing cocktail names from database
      const globalRecipes = await storage.getAllGlobalRecipes();
      const existingCocktailNames = new Set(
        globalRecipes.map(r => r.name.toLowerCase())
      );
      
      // Helper to check if a cocktail exists in the database (case-insensitive)
      const cocktailExists = (name: string) => {
        return existingCocktailNames.has(name.toLowerCase());
      };

      // Helper to create a new cocktail from lineage recipe data
      const createCocktailFromLineage = async (item: any) => {
        if (!item.recipe) {
          console.log(`[Lineage] Cannot create "${item.name}" - no recipe provided`);
          return false;
        }

        try {
          const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          // Check if slug already exists
          const existingBySlug = await storage.getGlobalRecipeBySlug(slug);
          if (existingBySlug) {
            console.log(`[Lineage] Cocktail with slug "${slug}" already exists, skipping creation`);
            existingCocktailNames.add(item.name.toLowerCase());
            return true;
          }

          // Ensure we have minimum valid data
          const ingredients = item.recipe.ingredients && item.recipe.ingredients.length > 0 
            ? item.recipe.ingredients 
            : ['2 oz Spirit', '0.75 oz Modifier'];
          const instructions = item.recipe.instructions 
            ? [item.recipe.instructions] 
            : ['Combine ingredients, stir or shake as appropriate, and strain into glass.'];

          const newRecipe = await storage.createGlobalRecipe({
            slug,
            name: item.name,
            description: `${item.name} - a ${item.era || 'classic'} cocktail.`,
            history: null,
            category: item.recipe.category || item.era || 'Classic',
            ingredients,
            instructions,
            glassType: item.recipe.glass || 'Rocks',
            garnish: '',
            creator: 'AI Lineage',
            creatorType: 'Gemini',
            flavorProfile: null,
            nutrition: null,
            enrichmentStatus: 'pending'
          });

          console.log(`[Lineage] Created new cocktail: "${item.name}" (id: ${newRecipe.id})`);
          existingCocktailNames.add(item.name.toLowerCase());
          return true;
        } catch (error) {
          console.error(`[Lineage] Failed to create cocktail "${item.name}":`, error);
          return false;
        }
      };

      // Process ancestors - create any that don't exist and have recipes
      const processedAncestors = [];
      for (const ancestor of (ancestors || [])) {
        if (cocktailExists(ancestor.name)) {
          processedAncestors.push(ancestor);
        } else if (ancestor.inDatabase === false && ancestor.recipe) {
          const created = await createCocktailFromLineage(ancestor);
          if (created) {
            processedAncestors.push(ancestor);
          }
        } else {
          console.log(`[Lineage] Skipping ancestor "${ancestor.name}" - not in database and no recipe`);
        }
      }

      // Process siblings - create any that don't exist and have recipes
      const processedSiblings = [];
      for (const sibling of (siblings || [])) {
        if (cocktailExists(sibling.name)) {
          processedSiblings.push(sibling);
        } else if (sibling.inDatabase === false && sibling.recipe) {
          const created = await createCocktailFromLineage(sibling);
          if (created) {
            processedSiblings.push(sibling);
          }
        } else {
          console.log(`[Lineage] Skipping sibling "${sibling.name}" - not in database and no recipe`);
        }
      }

      // Process descendants - create any that don't exist and have recipes
      const processedDescendants = [];
      for (const desc of (descendants || [])) {
        if (cocktailExists(desc.name)) {
          processedDescendants.push(desc);
        } else if (desc.inDatabase === false && desc.recipe) {
          const created = await createCocktailFromLineage(desc);
          if (created) {
            processedDescendants.push(desc);
          }
        } else {
          console.log(`[Lineage] Skipping descendant "${desc.name}" - not in database and no recipe`);
        }
      }

      // Validate flavor bridges against final cocktail set
      const validFlavorBridges = (flavorBridges || []).filter((b: any) => {
        const fromValid = cocktailExists(b.fromDrink);
        const toValid = cocktailExists(b.toDrink);
        if (!fromValid || !toValid) {
          console.log(`[Lineage] Filtering out invalid flavor bridge: "${b.fromDrink}" -> "${b.toDrink}"`);
        }
        return fromValid && toValid;
      });

      // Find or create family
      let familyId: number | undefined;
      if (familySlug) {
        let family = await storage.getCocktailFamilyBySlug(familySlug);
        if (family) {
          familyId = family.id;
        }
      }

      // Upsert lineage
      const lineage = await storage.upsertLineage({
        recipeName,
        familyId,
        relationship,
        keyModifications,
        evolutionNarrative
      });

      // Clear existing relationships and add new ones
      await storage.deleteRelationshipsForRecipe(recipeName);

      // Add processed ancestors (includes newly created cocktails)
      for (const ancestor of processedAncestors) {
        await storage.upsertRelationship({
          sourceRecipe: recipeName,
          targetRecipe: ancestor.name,
          relationshipType: 'ancestor',
          era: ancestor.era,
          description: ancestor.relationship
        });
      }

      // Add processed siblings (includes newly created cocktails)
      for (const sibling of processedSiblings) {
        await storage.upsertRelationship({
          sourceRecipe: recipeName,
          targetRecipe: sibling.name,
          relationshipType: 'sibling',
          era: sibling.era,
          description: sibling.sharedTrait
        });
      }

      // Add processed descendants (includes newly created cocktails)
      for (const desc of processedDescendants) {
        await storage.upsertRelationship({
          sourceRecipe: recipeName,
          targetRecipe: desc.name,
          relationshipType: 'descendant',
          era: desc.era,
          description: desc.innovation
        });
      }

      // Add validated flavor bridges
      for (const bridge of validFlavorBridges) {
        await storage.upsertRelationship({
          sourceRecipe: bridge.fromDrink,
          targetRecipe: bridge.toDrink,
          relationshipType: 'flavor_bridge',
          description: bridge.connection
        });
      }

      // Return full lineage data
      const fullData = await storage.getFullLineageData(recipeName);
      res.json({ success: true, data: fullData });
    } catch (error) {
      console.error("Error saving lineage:", error);
      res.status(500).json({ message: "Failed to save lineage" });
    }
  });

  // Get all lineages (for stats/admin)
  app.get('/api/lineages', async (req, res) => {
    try {
      const lineages = await storage.getAllLineages();
      res.json(lineages);
    } catch (error) {
      console.error("Error fetching all lineages:", error);
      res.status(500).json({ message: "Failed to fetch lineages" });
    }
  });

  // Admin endpoint to generate holistic lineage for all cocktails
  app.post('/api/admin/generate-lineage', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log('[Admin] Starting holistic lineage generation...');
      const result = await orchestrateFullLineage();
      res.json(result);
    } catch (error: any) {
      console.error("Error generating lineage:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate lineage",
        error: error.message 
      });
    }
  });

  // Public endpoint to trigger lineage generation (for testing without admin)
  app.post('/api/generate-lineage', async (req, res) => {
    try {
      console.log('[Public] Starting holistic lineage generation...');
      const result = await orchestrateFullLineage();
      res.json(result);
    } catch (error: any) {
      console.error("Error generating lineage:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate lineage",
        error: error.message 
      });
    }
  });

  // Cocktail Laboratory - AI-powered flavor substitution simulation
  app.post('/api/lab/simulate', async (req, res) => {
    try {
      const { baseRecipe, targetProfile, targetNotes } = req.body;
      
      if (!baseRecipe || !targetProfile) {
        return res.status(400).json({ 
          message: "Missing required fields: baseRecipe and targetProfile" 
        });
      }
      
      if (!baseRecipe.name || !baseRecipe.ingredients || !baseRecipe.flavorProfile) {
        return res.status(400).json({ 
          message: "baseRecipe must include name, ingredients, and flavorProfile" 
        });
      }
      
      console.log(`[Lab] Simulating modifications for "${baseRecipe.name}"${targetNotes?.length ? ` with notes: ${targetNotes.join(', ')}` : ''}`);
      
      const result = await simulateFlavorSubstitutions(baseRecipe, targetProfile, targetNotes);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error simulating flavor substitutions:", error);
      res.status(500).json({ 
        message: "Failed to simulate flavor substitutions",
        error: error.message 
      });
    }
  });

  app.post('/api/lab/build', async (req, res) => {
    try {
      const { ingredients, targetProfile } = req.body;
      
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ 
          message: "At least one ingredient is required" 
        });
      }
      
      if (!targetProfile) {
        return res.status(400).json({ 
          message: "Target flavor profile is required" 
        });
      }
      
      console.log(`[Lab] Building cocktail from ${ingredients.length} ingredients`);
      
      const { buildCocktailFromIngredients } = await import('../services/geminiService');
      const result = await buildCocktailFromIngredients(ingredients, targetProfile);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error building cocktail from ingredients:", error);
      res.status(500).json({ 
        message: "Failed to build cocktail",
        error: error.message 
      });
    }
  });

  // Helper: Compute ingredient signature hash for deduplication
  function computeIngredientSignature(ingredients: string[], parentSlug: string): string {
    // Normalize ingredients: lowercase, remove measurements, sort alphabetically
    const normalized = ingredients
      .map(ing => {
        // Remove common measurements and quantities
        return ing.toLowerCase()
          .replace(/\d+(\.\d+)?/g, '') // Remove numbers
          .replace(/(oz|ml|cl|dash|dashes|splash|drop|drops|tsp|tbsp|bar\s*spoon|cup|slice|slices|wedge|wedges|wheel|wheels|twist|twists|sprig|sprigs|leaf|leaves|piece|pieces|inch|cm)/gi, '')
          .replace(/[^\w\s]/g, '') // Remove special characters
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 2) // Remove short words
          .sort()
          .join(' ');
      })
      .filter(ing => ing.length > 0)
      .sort()
      .join('|');
    
    // Create a simple hash from the normalized string + parent
    const combined = `${parentSlug}:${normalized}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `sig_${Math.abs(hash).toString(16)}`;
  }

  // Helper: Generate a URL-friendly slug
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  // Lab Riffs - Detect if similar riff exists
  app.post('/api/lab/riffs/detect', async (req, res) => {
    try {
      const { parentRecipeSlug, ingredients, proposedName } = req.body;
      
      if (!parentRecipeSlug || !ingredients) {
        return res.status(400).json({ 
          message: "Missing required fields: parentRecipeSlug and ingredients" 
        });
      }
      
      const signatureHash = computeIngredientSignature(ingredients, parentRecipeSlug);
      console.log(`[Lab] Detecting riff for parent "${parentRecipeSlug}" with signature: ${signatureHash}`);
      
      // Check for exact signature match first
      const existingBySignature = await storage.getLabRiffBySignature(signatureHash);
      if (existingBySignature) {
        console.log(`[Lab] Found existing riff by signature: ${existingBySignature.name}`);
        return res.json({ 
          exists: true, 
          matchType: 'signature',
          riff: existingBySignature 
        });
      }
      
      // Check for name match if proposed name is provided
      if (proposedName) {
        const proposedSlug = generateSlug(proposedName);
        const existingByName = await storage.getLabRiffBySlug(proposedSlug);
        if (existingByName) {
          console.log(`[Lab] Found existing riff by name: ${existingByName.name}`);
          return res.json({ 
            exists: true, 
            matchType: 'name',
            riff: existingByName 
          });
        }
      }
      
      // No match found
      res.json({ 
        exists: false, 
        signatureHash,
        suggestedSlug: proposedName ? generateSlug(proposedName) : null
      });
    } catch (error: any) {
      console.error("Error detecting lab riff:", error);
      res.status(500).json({ 
        message: "Failed to detect existing riff",
        error: error.message 
      });
    }
  });

  // Lab Riffs - Create new riff with enrichment
  app.post('/api/lab/riffs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        name, 
        parentRecipeSlug, 
        parentRecipeName,
        ingredients, 
        instructions,
        substitutions,
        flavorProfile 
      } = req.body;
      
      if (!name || !parentRecipeSlug || !parentRecipeName || !ingredients) {
        return res.status(400).json({ 
          message: "Missing required fields: name, parentRecipeSlug, parentRecipeName, ingredients" 
        });
      }
      
      const slug = generateSlug(name);
      const signatureHash = computeIngredientSignature(ingredients, parentRecipeSlug);
      
      // Check for duplicates before creating
      const existingBySignature = await storage.getLabRiffBySignature(signatureHash);
      if (existingBySignature) {
        return res.status(409).json({ 
          message: "A similar riff already exists",
          existingRiff: existingBySignature 
        });
      }
      
      const existingBySlug = await storage.getLabRiffBySlug(slug);
      if (existingBySlug) {
        return res.status(409).json({ 
          message: "A riff with this name already exists",
          existingRiff: existingBySlug 
        });
      }
      
      console.log(`[Lab] Creating new riff "${name}" based on "${parentRecipeName}"`);
      
      // Create the riff with initial data
      const newRiff = await storage.createLabRiff({
        slug,
        name,
        parentRecipeSlug,
        parentRecipeName,
        userId,
        ingredients,
        instructions: instructions || [],
        substitutions: substitutions || [],
        flavorProfile: flavorProfile || null,
        signatureHash,
        enrichmentStatus: 'pending'
      });
      
      // Trigger enrichment in background (don't await)
      enrichLabRiff(newRiff.id, name, ingredients, parentRecipeName, substitutions).catch(err => {
        console.error(`[Lab] Background enrichment failed for riff ${newRiff.id}:`, err);
      });
      
      // Create lineage relationship
      createRiffLineage(name, parentRecipeName, substitutions).catch(err => {
        console.error(`[Lab] Failed to create lineage for riff ${name}:`, err);
      });
      
      res.status(201).json(newRiff);
    } catch (error: any) {
      console.error("Error creating lab riff:", error);
      res.status(500).json({ 
        message: "Failed to create riff",
        error: error.message 
      });
    }
  });

  // Lab Riffs - Get all riffs (optionally filtered by parent)
  app.get('/api/lab/riffs', async (req, res) => {
    try {
      const { parent } = req.query;
      
      if (parent && typeof parent === 'string') {
        const riffs = await storage.getLabRiffsForParent(parent);
        return res.json(riffs);
      }
      
      const riffs = await storage.getAllLabRiffs();
      res.json(riffs);
    } catch (error: any) {
      console.error("Error fetching lab riffs:", error);
      res.status(500).json({ 
        message: "Failed to fetch riffs",
        error: error.message 
      });
    }
  });

  // Lab Riffs - Get riff by slug
  app.get('/api/lab/riffs/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const riff = await storage.getLabRiffBySlug(slug);
      
      if (!riff) {
        return res.status(404).json({ message: "Riff not found" });
      }
      
      res.json(riff);
    } catch (error: any) {
      console.error("Error fetching lab riff:", error);
      res.status(500).json({ 
        message: "Failed to fetch riff",
        error: error.message 
      });
    }
  });

  // Helper: Enrich lab riff with AI data
  async function enrichLabRiff(
    riffId: number, 
    name: string, 
    ingredients: string[], 
    parentName: string,
    substitutions: { original: string; replacement: string; rationale: string; }[]
  ) {
    try {
      console.log(`[Lab] Starting enrichment for riff ${riffId}: "${name}"`);
      
      // Use existing enrichRecipeData function or create specific riff enrichment
      const enrichmentPrompt = `
        Analyze this cocktail riff:
        
        NAME: "${name}"
        PARENT COCKTAIL: "${parentName}"
        INGREDIENTS: ${JSON.stringify(ingredients)}
        SUBSTITUTIONS MADE: ${JSON.stringify(substitutions)}
        
        Provide:
        1. A brief description (2-3 sentences) explaining what makes this riff unique
        2. The cocktail category (e.g., "Sours", "Old Fashioned Riffs", "Tiki", "Contemporary")
        3. Recommended glass type
        4. Garnish suggestion
        5. A brief history/story of how this riff relates to its parent
        6. Estimated nutrition (calories, sugar grams, ABV percent)
        
        Return as JSON with keys: description, category, glassType, garnish, history, nutrition (object with calories, sugarGrams, abvPercent)
      `;
      
      // For now, use simpler enrichment - update with AI later
      await storage.updateLabRiffEnrichment(riffId, {
        category: 'Lab Riff',
        description: `A creative variation of ${parentName} featuring ${substitutions.map(s => s.replacement).join(', ')}.`,
        enrichmentStatus: 'complete',
        enrichedAt: new Date()
      });
      
      console.log(`[Lab] Enrichment complete for riff ${riffId}`);
    } catch (error) {
      console.error(`[Lab] Enrichment failed for riff ${riffId}:`, error);
      await storage.updateLabRiffEnrichment(riffId, {
        enrichmentStatus: 'failed'
      });
    }
  }

  // Helper: Create lineage relationship for new riff
  async function createRiffLineage(
    riffName: string, 
    parentName: string,
    substitutions: { original: string; replacement: string; rationale: string; }[]
  ) {
    try {
      console.log(`[Lab] Creating lineage for riff "${riffName}" -> parent "${parentName}"`);
      
      // Get parent's lineage to inherit family
      const parentLineage = await storage.getLineageByRecipeName(parentName);
      
      // Create lineage entry for the riff
      await storage.upsertLineage({
        recipeName: riffName,
        familyId: parentLineage?.familyId || null,
        relationship: `Lab riff of ${parentName}`,
        keyModifications: substitutions.map(s => `${s.original} → ${s.replacement}`),
        evolutionNarrative: `A creative variation born in the Flavor Lab, this riff transforms ${parentName} by ${substitutions.map(s => s.rationale).join('; ')}.`
      });
      
      // Create descendant relationship from parent to riff
      await storage.upsertRelationship({
        sourceRecipe: parentName,
        targetRecipe: riffName,
        relationshipType: 'descendant',
        era: 'Contemporary',
        description: `Lab-created riff featuring: ${substitutions.map(s => `${s.original} → ${s.replacement}`).join(', ')}`
      });
      
      // Create ancestor relationship from riff to parent
      await storage.upsertRelationship({
        sourceRecipe: riffName,
        targetRecipe: parentName,
        relationshipType: 'ancestor',
        era: 'Contemporary',
        description: `Original cocktail that inspired this Lab riff`
      });
      
      console.log(`[Lab] Lineage created for riff "${riffName}"`);
    } catch (error) {
      console.error(`[Lab] Failed to create lineage for riff "${riffName}":`, error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
