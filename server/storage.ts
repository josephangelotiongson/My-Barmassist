import {
  users,
  userRecipes,
  userRatings,
  userShoppingList,
  userSettings,
  recipeImages,
  globalRecipes,
  masterIngredients,
  type User,
  type UpsertUser,
  type UserRecipe,
  type InsertUserRecipe,
  type UserRating,
  type InsertUserRating,
  type UserShoppingItem,
  type InsertUserShoppingItem,
  type UserSettings,
  type InsertUserSettings,
  type GlobalRecipe,
  type InsertGlobalRecipe,
  type MasterIngredient,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, isNull, or } from "drizzle-orm";

// Type for global recipe images
export type RecipeImage = {
  id: number;
  recipeName: string;
  creatorId: string | null;
  imageUrl: string;
  createdAt: Date | null;
};

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recipe operations
  getUserRecipes(userId: string): Promise<UserRecipe[]>;
  createRecipe(recipe: InsertUserRecipe): Promise<UserRecipe>;
  updateRecipe(id: number, userId: string, recipe: Partial<InsertUserRecipe>): Promise<UserRecipe | undefined>;
  updateRecipeEnrichment(id: number, userId: string, enrichment: {
    flavorProfile?: any;
    nutrition?: any;
    enrichmentStatus: string;
    enrichedAt?: Date;
  }): Promise<UserRecipe | undefined>;
  deleteRecipe(id: number, userId: string): Promise<boolean>;
  resetAllRecipes(userId: string): Promise<boolean>;
  
  // Rating/History operations
  getUserRatings(userId: string): Promise<UserRating[]>;
  createRating(rating: InsertUserRating): Promise<UserRating>;
  upsertRating(userId: string, recipeName: string, rating: number): Promise<UserRating>;
  updateRatingImage(userId: string, recipeName: string, imageUrl: string): Promise<UserRating>;
  deleteRating(id: number, userId: string): Promise<boolean>;
  resetAllRatings(userId: string): Promise<boolean>;
  
  // Shopping list operations
  getUserShoppingList(userId: string): Promise<UserShoppingItem[]>;
  addToShoppingList(item: InsertUserShoppingItem): Promise<UserShoppingItem>;
  updateShoppingItem(id: number, userId: string, item: Partial<InsertUserShoppingItem>): Promise<UserShoppingItem | undefined>;
  removeFromShoppingList(id: number, userId: string): Promise<boolean>;
  resetShoppingList(userId: string): Promise<boolean>;
  
  // Settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  
  // Global recipe images (no auth required)
  // Supports both classic recipes (creatorId = null) and user variations (creatorId = user id)
  getAllRecipeImages(): Promise<RecipeImage[]>;
  getRecipeImage(recipeName: string, creatorId?: string | null): Promise<RecipeImage | undefined>;
  upsertRecipeImage(recipeName: string, imageUrl: string, creatorId?: string | null): Promise<RecipeImage>;
  
  // Global recipes (public read access - no auth required)
  getAllGlobalRecipes(): Promise<GlobalRecipe[]>;
  getGlobalRecipeBySlug(slug: string): Promise<GlobalRecipe | undefined>;
  getEnrichmentStats(): Promise<{ pending: number; partial: number; complete: number; failed: number }>;
  createGlobalRecipe(recipe: InsertGlobalRecipe): Promise<GlobalRecipe>;
  
  // Master ingredients (public read access - no auth required)
  getAllMasterIngredients(): Promise<MasterIngredient[]>;
  getMasterIngredientBySlug(slug: string): Promise<MasterIngredient | undefined>;
  getIngredientEnrichmentStats(): Promise<{ total: number; pending: number; complete: number; failed: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Recipe operations
  async getUserRecipes(userId: string): Promise<UserRecipe[]> {
    return await db.select().from(userRecipes).where(eq(userRecipes.userId, userId));
  }

  async createRecipe(recipe: InsertUserRecipe): Promise<UserRecipe> {
    const [newRecipe] = await db.insert(userRecipes).values(recipe).returning();
    return newRecipe;
  }

  async updateRecipe(id: number, userId: string, recipe: Partial<InsertUserRecipe>): Promise<UserRecipe | undefined> {
    const [updated] = await db
      .update(userRecipes)
      .set({ ...recipe, updatedAt: new Date() })
      .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)))
      .returning();
    return updated;
  }

  async updateRecipeEnrichment(id: number, userId: string, enrichment: {
    flavorProfile?: any;
    nutrition?: any;
    enrichmentStatus: string;
    enrichedAt?: Date;
  }): Promise<UserRecipe | undefined> {
    const [updated] = await db
      .update(userRecipes)
      .set({ 
        ...enrichment, 
        updatedAt: new Date() 
      })
      .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)))
      .returning();
    return updated;
  }

  async deleteRecipe(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userRecipes)
      .where(and(eq(userRecipes.id, id), eq(userRecipes.userId, userId)));
    return true;
  }

  async resetAllRecipes(userId: string): Promise<boolean> {
    await db.delete(userRecipes).where(eq(userRecipes.userId, userId));
    return true;
  }

  // Rating/History operations
  async getUserRatings(userId: string): Promise<UserRating[]> {
    return await db.select().from(userRatings).where(eq(userRatings.userId, userId));
  }

  async createRating(rating: InsertUserRating): Promise<UserRating> {
    const [newRating] = await db.insert(userRatings).values(rating).returning();
    return newRating;
  }

  async upsertRating(userId: string, recipeName: string, rating: number): Promise<UserRating> {
    const existing = await db.select().from(userRatings).where(
      and(eq(userRatings.userId, userId), eq(userRatings.recipeName, recipeName))
    );
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(userRatings)
        .set({ rating })
        .where(and(eq(userRatings.userId, userId), eq(userRatings.recipeName, recipeName)))
        .returning();
      return updated;
    } else {
      const [newRating] = await db
        .insert(userRatings)
        .values({ userId, recipeName, rating })
        .returning();
      return newRating;
    }
  }

  async deleteRating(id: number, userId: string): Promise<boolean> {
    await db.delete(userRatings).where(and(eq(userRatings.id, id), eq(userRatings.userId, userId)));
    return true;
  }

  async resetAllRatings(userId: string): Promise<boolean> {
    await db.delete(userRatings).where(eq(userRatings.userId, userId));
    return true;
  }

  async updateRatingImage(userId: string, recipeName: string, imageUrl: string): Promise<UserRating> {
    // Check if a rating exists for this recipe
    const existing = await db.select().from(userRatings).where(
      and(eq(userRatings.userId, userId), eq(userRatings.recipeName, recipeName))
    );
    
    if (existing.length > 0) {
      // Update existing rating with image
      const [updated] = await db
        .update(userRatings)
        .set({ imageUrl })
        .where(and(eq(userRatings.userId, userId), eq(userRatings.recipeName, recipeName)))
        .returning();
      return updated;
    } else {
      // Create a new rating record with default rating of 0 to store the image
      const [newRating] = await db
        .insert(userRatings)
        .values({ userId, recipeName, rating: 0, imageUrl })
        .returning();
      return newRating;
    }
  }

  // Shopping list operations
  async getUserShoppingList(userId: string): Promise<UserShoppingItem[]> {
    return await db.select().from(userShoppingList).where(eq(userShoppingList.userId, userId));
  }

  async addToShoppingList(item: InsertUserShoppingItem): Promise<UserShoppingItem> {
    const [newItem] = await db.insert(userShoppingList).values(item).returning();
    return newItem;
  }

  async updateShoppingItem(id: number, userId: string, item: Partial<InsertUserShoppingItem>): Promise<UserShoppingItem | undefined> {
    const [updated] = await db
      .update(userShoppingList)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(userShoppingList.id, id), eq(userShoppingList.userId, userId)))
      .returning();
    return updated;
  }

  async removeFromShoppingList(id: number, userId: string): Promise<boolean> {
    await db.delete(userShoppingList).where(and(eq(userShoppingList.id, id), eq(userShoppingList.userId, userId)));
    return true;
  }

  async resetShoppingList(userId: string): Promise<boolean> {
    await db.delete(userShoppingList).where(eq(userShoppingList.userId, userId));
    return true;
  }

  // Settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [result] = await db
      .insert(userSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Global recipe images (no auth required)
  // Supports both classic recipes (creatorId = null) and user variations (creatorId = user id)
  async getAllRecipeImages(): Promise<RecipeImage[]> {
    return await db.select().from(recipeImages);
  }

  async getRecipeImage(recipeName: string, creatorId?: string | null): Promise<RecipeImage | undefined> {
    // First try to find user-specific image if creatorId is provided
    if (creatorId) {
      const [userImage] = await db.select().from(recipeImages)
        .where(and(eq(recipeImages.recipeName, recipeName), eq(recipeImages.creatorId, creatorId)));
      if (userImage) return userImage;
    }
    
    // Fall back to classic/global image (creatorId is null)
    const [result] = await db.select().from(recipeImages)
      .where(and(eq(recipeImages.recipeName, recipeName), isNull(recipeImages.creatorId)));
    return result;
  }

  async upsertRecipeImage(recipeName: string, imageUrl: string, creatorId?: string | null): Promise<RecipeImage> {
    // Check if image already exists for this recipe + creator combination
    const existing = await this.getRecipeImageExact(recipeName, creatorId || null);
    
    if (existing) {
      // Update existing
      const [result] = await db
        .update(recipeImages)
        .set({ imageUrl })
        .where(eq(recipeImages.id, existing.id))
        .returning();
      return result;
    } else {
      // Insert new
      const [result] = await db
        .insert(recipeImages)
        .values({ recipeName, imageUrl, creatorId: creatorId || null })
        .returning();
      return result;
    }
  }

  // Helper to find exact match (for upsert logic)
  private async getRecipeImageExact(recipeName: string, creatorId: string | null): Promise<RecipeImage | undefined> {
    if (creatorId) {
      const [result] = await db.select().from(recipeImages)
        .where(and(eq(recipeImages.recipeName, recipeName), eq(recipeImages.creatorId, creatorId)));
      return result;
    } else {
      const [result] = await db.select().from(recipeImages)
        .where(and(eq(recipeImages.recipeName, recipeName), isNull(recipeImages.creatorId)));
      return result;
    }
  }

  // Global recipes operations (public read access)
  async getAllGlobalRecipes(): Promise<GlobalRecipe[]> {
    return await db.select().from(globalRecipes);
  }

  async getGlobalRecipeBySlug(slug: string): Promise<GlobalRecipe | undefined> {
    const [recipe] = await db.select().from(globalRecipes).where(eq(globalRecipes.slug, slug));
    return recipe;
  }

  async getEnrichmentStats(): Promise<{ pending: number; partial: number; complete: number; failed: number }> {
    const recipes = await db.select().from(globalRecipes);
    return {
      pending: recipes.filter(r => r.enrichmentStatus === 'pending').length,
      partial: recipes.filter(r => r.enrichmentStatus === 'partial').length,
      complete: recipes.filter(r => r.enrichmentStatus === 'complete').length,
      failed: recipes.filter(r => r.enrichmentStatus === 'failed').length,
    };
  }

  async createGlobalRecipe(recipe: InsertGlobalRecipe): Promise<GlobalRecipe> {
    const [newRecipe] = await db.insert(globalRecipes).values(recipe).returning();
    return newRecipe;
  }

  // Master ingredients operations (public read access)
  async getAllMasterIngredients(): Promise<MasterIngredient[]> {
    return await db.select().from(masterIngredients);
  }

  async getMasterIngredientBySlug(slug: string): Promise<MasterIngredient | undefined> {
    const [ingredient] = await db.select().from(masterIngredients).where(eq(masterIngredients.slug, slug));
    return ingredient;
  }

  async getIngredientEnrichmentStats(): Promise<{ total: number; pending: number; complete: number; failed: number }> {
    const ingredients = await db.select().from(masterIngredients);
    return {
      total: ingredients.length,
      pending: ingredients.filter(i => i.enrichmentStatus === 'pending').length,
      complete: ingredients.filter(i => i.enrichmentStatus === 'complete').length,
      failed: ingredients.filter(i => i.enrichmentStatus === 'failed').length,
    };
  }
}

export const storage = new DatabaseStorage();
