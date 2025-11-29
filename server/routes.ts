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

  const httpServer = createServer(app);
  return httpServer;
}
