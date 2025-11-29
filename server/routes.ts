import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // User recipes routes
  app.get('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recipes = await storage.getUserRecipes(userId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.post('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recipe = await storage.createRecipe({ ...req.body, userId });
      res.json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const ratings = await storage.getUserRatings(userId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  app.post('/api/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const rating = await storage.createRating({ ...req.body, userId });
      res.json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      res.status(500).json({ message: "Failed to create rating" });
    }
  });

  app.post('/api/ratings/upsert', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      await storage.resetAllRatings(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting ratings:", error);
      res.status(500).json({ message: "Failed to reset ratings" });
    }
  });

  // Shopping list routes
  app.get('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const items = await storage.getUserShoppingList(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      res.status(500).json({ message: "Failed to fetch shopping list" });
    }
  });

  app.post('/api/shopping-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const item = await storage.addToShoppingList({ ...req.body, userId });
      res.json(item);
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      res.status(500).json({ message: "Failed to add to shopping list" });
    }
  });

  app.put('/api/shopping-list/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const settings = await storage.getUserSettings(userId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settings = await storage.upsertUserSettings({ ...req.body, userId });
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
