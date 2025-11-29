import {
  users,
  userRecipes,
  userRatings,
  userShoppingList,
  userSettings,
  recipeImages,
  globalRecipes,
  masterIngredients,
  cocktailFamilies,
  cocktailLineage,
  cocktailRelationships,
  labRiffs,
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
  type CocktailFamily,
  type InsertCocktailFamily,
  type CocktailLineage,
  type InsertCocktailLineage,
  type CocktailRelationship,
  type InsertCocktailRelationship,
  type LabRiff,
  type InsertLabRiff,
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
  
  // Lab Riffs operations
  getAllLabRiffs(): Promise<LabRiff[]>;
  getLabRiffBySlug(slug: string): Promise<LabRiff | undefined>;
  getLabRiffBySignature(signatureHash: string): Promise<LabRiff | undefined>;
  getLabRiffsForParent(parentRecipeSlug: string): Promise<LabRiff[]>;
  createLabRiff(riff: InsertLabRiff): Promise<LabRiff>;
  updateLabRiffEnrichment(id: number, enrichment: {
    flavorProfile?: any;
    nutrition?: any;
    category?: string;
    glassType?: string;
    garnish?: string;
    description?: string;
    history?: string;
    enrichmentStatus: string;
    enrichedAt?: Date;
  }): Promise<LabRiff | undefined>;
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

  // Cocktail Family operations
  async getAllCocktailFamilies(): Promise<CocktailFamily[]> {
    return await db.select().from(cocktailFamilies);
  }

  async getCocktailFamilyBySlug(slug: string): Promise<CocktailFamily | undefined> {
    const [family] = await db.select().from(cocktailFamilies).where(eq(cocktailFamilies.slug, slug));
    return family;
  }

  async getCocktailFamilyById(id: number): Promise<CocktailFamily | undefined> {
    const [family] = await db.select().from(cocktailFamilies).where(eq(cocktailFamilies.id, id));
    return family;
  }

  async createCocktailFamily(family: InsertCocktailFamily): Promise<CocktailFamily> {
    const [newFamily] = await db.insert(cocktailFamilies).values(family).returning();
    return newFamily;
  }

  async upsertCocktailFamily(family: InsertCocktailFamily): Promise<CocktailFamily> {
    const [result] = await db
      .insert(cocktailFamilies)
      .values(family)
      .onConflictDoUpdate({
        target: cocktailFamilies.slug,
        set: {
          name: family.name,
          formula: family.formula,
          description: family.description,
          icon: family.icon,
        },
      })
      .returning();
    return result;
  }

  // Cocktail Lineage operations
  async getLineageByRecipeName(recipeName: string): Promise<CocktailLineage | undefined> {
    const [lineage] = await db.select().from(cocktailLineage).where(eq(cocktailLineage.recipeName, recipeName));
    return lineage;
  }

  async getAllLineages(): Promise<CocktailLineage[]> {
    return await db.select().from(cocktailLineage);
  }

  async createLineage(lineage: InsertCocktailLineage): Promise<CocktailLineage> {
    const [newLineage] = await db.insert(cocktailLineage).values(lineage).returning();
    return newLineage;
  }

  async upsertLineage(lineage: InsertCocktailLineage): Promise<CocktailLineage> {
    const [result] = await db
      .insert(cocktailLineage)
      .values(lineage)
      .onConflictDoUpdate({
        target: cocktailLineage.recipeName,
        set: {
          familyId: lineage.familyId,
          relationship: lineage.relationship,
          keyModifications: lineage.keyModifications,
          evolutionNarrative: lineage.evolutionNarrative,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Cocktail Relationships operations
  async getRelationshipsForRecipe(recipeName: string): Promise<CocktailRelationship[]> {
    return await db.select().from(cocktailRelationships)
      .where(or(
        eq(cocktailRelationships.sourceRecipe, recipeName),
        eq(cocktailRelationships.targetRecipe, recipeName)
      ));
  }

  async getRelationshipsByType(recipeName: string, type: string): Promise<CocktailRelationship[]> {
    return await db.select().from(cocktailRelationships)
      .where(and(
        eq(cocktailRelationships.sourceRecipe, recipeName),
        eq(cocktailRelationships.relationshipType, type)
      ));
  }

  async createRelationship(relationship: InsertCocktailRelationship): Promise<CocktailRelationship> {
    const [newRelationship] = await db.insert(cocktailRelationships).values(relationship).returning();
    return newRelationship;
  }

  async upsertRelationship(relationship: InsertCocktailRelationship): Promise<CocktailRelationship> {
    const existing = await db.select().from(cocktailRelationships)
      .where(and(
        eq(cocktailRelationships.sourceRecipe, relationship.sourceRecipe),
        eq(cocktailRelationships.targetRecipe, relationship.targetRecipe),
        eq(cocktailRelationships.relationshipType, relationship.relationshipType)
      ));
    
    if (existing.length > 0) {
      const [result] = await db
        .update(cocktailRelationships)
        .set({
          era: relationship.era,
          description: relationship.description,
        })
        .where(eq(cocktailRelationships.id, existing[0].id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(cocktailRelationships).values(relationship).returning();
      return result;
    }
  }

  async deleteRelationshipsForRecipe(recipeName: string): Promise<boolean> {
    await db.delete(cocktailRelationships)
      .where(or(
        eq(cocktailRelationships.sourceRecipe, recipeName),
        eq(cocktailRelationships.targetRecipe, recipeName)
      ));
    return true;
  }

  // Get siblings by finding other recipes that share the same ancestor (parent)
  async getSiblingsBySharedAncestor(recipeName: string): Promise<CocktailRelationship[]> {
    // First, get all ancestors of this recipe
    const ancestors = await this.getRelationshipsByType(recipeName, 'ancestor');
    if (ancestors.length === 0) return [];

    const siblings: CocktailRelationship[] = [];
    const addedSiblings = new Set<string>();

    // For each ancestor, find all other recipes that have the same ancestor
    for (const ancestor of ancestors) {
      const parentName = ancestor.targetRecipe;
      
      // Find all relationships where this parent is an ancestor to other recipes
      const childrenOfSameParent = await db.select().from(cocktailRelationships)
        .where(and(
          eq(cocktailRelationships.targetRecipe, parentName),
          eq(cocktailRelationships.relationshipType, 'ancestor')
        ));
      
      // Add each child as a sibling (except the current recipe)
      for (const child of childrenOfSameParent) {
        if (child.sourceRecipe !== recipeName && !addedSiblings.has(child.sourceRecipe)) {
          addedSiblings.add(child.sourceRecipe);
          siblings.push({
            id: 0, // Virtual relationship
            sourceRecipe: recipeName,
            targetRecipe: child.sourceRecipe,
            relationshipType: 'sibling',
            era: child.era,
            description: `Shares parent: ${parentName}`,
            createdAt: null,
          });
        }
      }
    }

    return siblings;
  }

  // Get descendants by finding recipes that have this recipe as an ancestor
  async getDescendantsByAncestor(recipeName: string): Promise<CocktailRelationship[]> {
    // Find all relationships where this recipe is listed as an ancestor
    const descendantRelationships = await db.select().from(cocktailRelationships)
      .where(and(
        eq(cocktailRelationships.targetRecipe, recipeName),
        eq(cocktailRelationships.relationshipType, 'ancestor')
      ));

    // Convert to descendant format (swap source/target)
    return descendantRelationships.map(rel => ({
      id: rel.id,
      sourceRecipe: recipeName,
      targetRecipe: rel.sourceRecipe, // The recipe that has this as ancestor is a descendant
      relationshipType: 'descendant' as const,
      era: rel.era,
      description: rel.description,
      createdAt: rel.createdAt,
    }));
  }

  // Get full lineage data with relationships and family info
  async getFullLineageData(recipeName: string): Promise<{
    lineage: CocktailLineage | null;
    family: CocktailFamily | null;
    ancestors: CocktailRelationship[];
    siblings: CocktailRelationship[];
    descendants: CocktailRelationship[];
    flavorBridges: CocktailRelationship[];
  } | null> {
    const lineage = await this.getLineageByRecipeName(recipeName);
    if (!lineage) return null;

    const family = lineage.familyId ? await this.getCocktailFamilyById(lineage.familyId) : null;
    
    // Get directly stored ancestors
    const ancestors = await this.getRelationshipsByType(recipeName, 'ancestor');
    
    // Compute siblings dynamically from shared ancestors (same parent = sibling)
    const computedSiblings = await this.getSiblingsBySharedAncestor(recipeName);
    // Also include any explicitly stored siblings
    const storedSiblings = await this.getRelationshipsByType(recipeName, 'sibling');
    // Merge and deduplicate
    const siblingNames = new Set(computedSiblings.map(s => s.targetRecipe));
    const siblings = [...computedSiblings];
    for (const s of storedSiblings) {
      if (!siblingNames.has(s.targetRecipe)) {
        siblings.push(s);
      }
    }
    
    // Compute descendants bidirectionally (if A has B as ancestor, then B has A as descendant)
    const computedDescendants = await this.getDescendantsByAncestor(recipeName);
    // Also include any explicitly stored descendants
    const storedDescendants = await this.getRelationshipsByType(recipeName, 'descendant');
    // Merge and deduplicate
    const descendantNames = new Set(computedDescendants.map(d => d.targetRecipe));
    const descendants = [...computedDescendants];
    for (const d of storedDescendants) {
      if (!descendantNames.has(d.targetRecipe)) {
        descendants.push(d);
      }
    }
    
    const flavorBridges = await this.getRelationshipsByType(recipeName, 'flavor_bridge');

    return { lineage, family, ancestors, siblings, descendants, flavorBridges };
  }

  // Lab Riffs operations
  async getAllLabRiffs(): Promise<LabRiff[]> {
    return await db.select().from(labRiffs);
  }

  async getLabRiffBySlug(slug: string): Promise<LabRiff | undefined> {
    const [riff] = await db.select().from(labRiffs).where(eq(labRiffs.slug, slug));
    return riff;
  }

  async getLabRiffBySignature(signatureHash: string): Promise<LabRiff | undefined> {
    const [riff] = await db.select().from(labRiffs).where(eq(labRiffs.signatureHash, signatureHash));
    return riff;
  }

  async getLabRiffsForParent(parentRecipeSlug: string): Promise<LabRiff[]> {
    return await db.select().from(labRiffs).where(eq(labRiffs.parentRecipeSlug, parentRecipeSlug));
  }

  async createLabRiff(riff: InsertLabRiff): Promise<LabRiff> {
    const [newRiff] = await db.insert(labRiffs).values(riff).returning();
    return newRiff;
  }

  async updateLabRiffEnrichment(id: number, enrichment: {
    flavorProfile?: any;
    nutrition?: any;
    category?: string;
    glassType?: string;
    garnish?: string;
    description?: string;
    history?: string;
    enrichmentStatus: string;
    enrichedAt?: Date;
  }): Promise<LabRiff | undefined> {
    const [updated] = await db
      .update(labRiffs)
      .set({ 
        ...enrichment, 
        updatedAt: new Date() 
      })
      .where(eq(labRiffs.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
