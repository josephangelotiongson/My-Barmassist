import {
  users,
  userRecipes,
  userRatings,
  userShoppingList,
  userSettings,
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

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recipe operations
  getUserRecipes(userId: string): Promise<UserRecipe[]>;
  createRecipe(recipe: InsertUserRecipe): Promise<UserRecipe>;
  updateRecipe(id: number, userId: string, recipe: Partial<InsertUserRecipe>): Promise<UserRecipe | undefined>;
  deleteRecipe(id: number, userId: string): Promise<boolean>;
  
  // Rating/History operations
  getUserRatings(userId: string): Promise<UserRating[]>;
  createRating(rating: InsertUserRating): Promise<UserRating>;
  deleteRating(id: number, userId: string): Promise<boolean>;
  
  // Shopping list operations
  getUserShoppingList(userId: string): Promise<UserShoppingItem[]>;
  addToShoppingList(item: InsertUserShoppingItem): Promise<UserShoppingItem>;
  updateShoppingItem(id: number, userId: string, item: Partial<InsertUserShoppingItem>): Promise<UserShoppingItem | undefined>;
  removeFromShoppingList(id: number, userId: string): Promise<boolean>;
  
  // Settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
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

  // Rating/History operations
  async getUserRatings(userId: string): Promise<UserRating[]> {
    return await db.select().from(userRatings).where(eq(userRatings.userId, userId));
  }

  async createRating(rating: InsertUserRating): Promise<UserRating> {
    const [newRating] = await db.insert(userRatings).values(rating).returning();
    return newRating;
  }

  async deleteRating(id: number, userId: string): Promise<boolean> {
    await db.delete(userRatings).where(and(eq(userRatings.id, id), eq(userRatings.userId, userId)));
    return true;
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
}

export const storage = new DatabaseStorage();
