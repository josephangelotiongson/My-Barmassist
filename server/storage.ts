import {
  users,
  userRecipes,
  userRatings,
  userShoppingList,
  userSettings,
  recipeImages,
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
} from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Type for global recipe images
export type RecipeImage = {
  id: number;
  recipeName: string;
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
  getAllRecipeImages(): Promise<RecipeImage[]>;
  upsertRecipeImage(recipeName: string, imageUrl: string): Promise<RecipeImage>;
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
  async getAllRecipeImages(): Promise<RecipeImage[]> {
    return await db.select().from(recipeImages);
  }

  async upsertRecipeImage(recipeName: string, imageUrl: string): Promise<RecipeImage> {
    const [result] = await db
      .insert(recipeImages)
      .values({ recipeName, imageUrl })
      .onConflictDoUpdate({
        target: recipeImages.recipeName,
        set: { imageUrl },
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
