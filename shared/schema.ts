import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User recipes - custom or imported recipes
export const userRecipes = pgTable("user_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  ingredients: jsonb("ingredients").$type<string[]>().notNull(),
  instructions: text("instructions"),
  flavorProfile: jsonb("flavor_profile").$type<{
    Sweet: number;
    Fruity: number;
    Floral: number;
    Herbal: number;
    Spicy: number;
    Earthy: number;
    Sour: number;
    Boozy: number;
  }>(),
  nutrition: jsonb("nutrition").$type<{
    calories: number;
    sugarGrams: number;
    abvPercent: number;
  }>(),
  targetVolume: varchar("target_volume"),
  category: varchar("category"),
  glassType: varchar("glass_type"),
  garnish: varchar("garnish"),
  imageUrl: text("image_url"),
  isCustom: boolean("is_custom").default(true),
  enrichmentStatus: varchar("enrichment_status").default("pending"),
  enrichedAt: timestamp("enriched_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User ratings and history
export const userRatings = pgTable("user_ratings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeName: varchar("recipe_name").notNull(),
  rating: integer("rating").notNull(),
  notes: text("notes"),
  orderedAt: varchar("ordered_at"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User shopping list
export const userShoppingList = pgTable("user_shopping_list", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredientName: varchar("ingredient_name").notNull(),
  category: varchar("category"),
  isOwned: boolean("is_owned").default(false),
  estimatedVolume: varchar("estimated_volume"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User settings/preferences
export const userSettings = pgTable("user_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  lowStockKeywords: jsonb("low_stock_keywords").$type<string[]>(),
  allergies: jsonb("allergies").$type<string[]>(),
  handedness: varchar("handedness").default("right"),
  flavorProfile: jsonb("flavor_profile").$type<{
    Sweet: number;
    Fruity: number;
    Floral: number;
    Herbal: number;
    Spicy: number;
    Earthy: number;
    Sour: number;
    Boozy: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Master ingredient data (shared across all users)
export const masterIngredients = pgTable("master_ingredients", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug").notNull().unique(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(),
  subCategory: varchar("sub_category"),
  ingredientType: varchar("ingredient_type"),
  isGeneric: boolean("is_generic").default(true),
  vendorBrand: varchar("vendor_brand"),
  originRegion: varchar("origin_region"),
  abv: real("abv"),
  nutrition: jsonb("nutrition").$type<{
    caloriesPerOz: number;
    carbsPerOz: number;
    sugarPerOz: number;
    proteinPerOz: number;
  }>(),
  flavorNotes: text("flavor_notes"),
  derivedFlavorNoteIds: jsonb("derived_flavor_note_ids").$type<string[]>(),
  flavorIntensities: jsonb("flavor_intensities").$type<Record<string, number>>(),
  aromaProfile: jsonb("aroma_profile").$type<string[]>(),
  commonUses: jsonb("common_uses").$type<string[]>(),
  substitutes: jsonb("substitutes").$type<string[]>(),
  pairings: jsonb("pairings").$type<string[]>(),
  productionMethod: text("production_method"),
  history: text("history"),
  allergens: jsonb("allergens").$type<string[]>(),
  verificationSources: jsonb("verification_sources").$type<string[]>(),
  dataConfidenceScore: integer("data_confidence_score"),
  enrichmentStatus: varchar("enrichment_status").default("pending"),
  enrichedAt: timestamp("enriched_at"),
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_master_ingredients_category").on(table.category),
  index("idx_master_ingredients_enrichment").on(table.enrichmentStatus),
]);

// Global recipes - classic/standard cocktail recipes accessible to all users
export const globalRecipes = pgTable("global_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  history: text("history"),
  category: varchar("category"),
  ingredients: jsonb("ingredients").$type<string[]>().notNull(),
  instructions: jsonb("instructions").$type<string[]>().notNull(),
  glassType: varchar("glass_type"),
  garnish: varchar("garnish"),
  creator: varchar("creator"),
  creatorType: varchar("creator_type"),
  flavorProfile: jsonb("flavor_profile").$type<{
    Sweet: number;
    Fruity: number;
    Floral: number;
    Herbal: number;
    Spicy: number;
    Earthy: number;
    Sour: number;
    Boozy: number;
  }>(),
  nutrition: jsonb("nutrition").$type<{
    calories: number;
    sugarGrams: number;
    abvPercent: number;
  }>(),
  targetVolume: varchar("target_volume"),
  enrichmentStatus: varchar("enrichment_status").default("pending"),
  enrichedAt: timestamp("enriched_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_global_recipes_category").on(table.category),
  index("idx_global_recipes_enrichment").on(table.enrichmentStatus),
]);

// Global recipe images (shared across all users - no authentication required)
// Supports both classic recipes (creatorId = null) and user variations (creatorId = user id)
export const recipeImages = pgTable("recipe_images", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  recipeName: varchar("recipe_name").notNull(),
  creatorId: varchar("creator_id"),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recipe_images_lookup").on(table.recipeName, table.creatorId),
]);

// Lab Riffs - User-created cocktail variations from the Flavor Lab
export const labRiffs = pgTable("lab_riffs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug").notNull().unique(),
  name: varchar("name").notNull(),
  parentRecipeSlug: varchar("parent_recipe_slug").notNull(),
  parentRecipeName: varchar("parent_recipe_name").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  ingredients: jsonb("ingredients").$type<string[]>().notNull(),
  instructions: jsonb("instructions").$type<string[]>(),
  substitutions: jsonb("substitutions").$type<{
    original: string;
    replacement: string;
    rationale: string;
  }[]>(),
  flavorProfile: jsonb("flavor_profile").$type<{
    Sweet: number;
    Fruity: number;
    Floral: number;
    Herbal: number;
    Spicy: number;
    Earthy: number;
    Sour: number;
    Boozy: number;
  }>(),
  nutrition: jsonb("nutrition").$type<{
    calories: number;
    sugarGrams: number;
    abvPercent: number;
  }>(),
  targetVolume: varchar("target_volume"),
  category: varchar("category"),
  glassType: varchar("glass_type"),
  garnish: varchar("garnish"),
  description: text("description"),
  history: text("history"),
  signatureHash: varchar("signature_hash").notNull(),
  enrichmentStatus: varchar("enrichment_status").default("pending"),
  enrichedAt: timestamp("enriched_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_lab_riffs_slug").on(table.slug),
  index("idx_lab_riffs_parent").on(table.parentRecipeSlug),
  index("idx_lab_riffs_signature").on(table.signatureHash),
  index("idx_lab_riffs_user").on(table.userId),
]);

// Cocktail Families - The 6 root templates from Cocktail Codex
export const cocktailFamilies = pgTable("cocktail_families", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug").notNull().unique(),
  name: varchar("name").notNull(),
  formula: varchar("formula").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cocktail Lineage - Stores AI-generated family tree data for each drink
export const cocktailLineage = pgTable("cocktail_lineage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  recipeName: varchar("recipe_name").notNull().unique(),
  familyId: integer("family_id").references(() => cocktailFamilies.id),
  relationship: text("relationship"),
  keyModifications: jsonb("key_modifications").$type<string[]>(),
  evolutionNarrative: text("evolution_narrative"),
  generatedAt: timestamp("generated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_lineage_recipe").on(table.recipeName),
  index("idx_lineage_family").on(table.familyId),
]);

// Cocktail Relationships - Stores connections between drinks
export const cocktailRelationships = pgTable("cocktail_relationships", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceRecipe: varchar("source_recipe").notNull(),
  targetRecipe: varchar("target_recipe").notNull(),
  relationshipType: varchar("relationship_type").notNull(), // 'ancestor', 'sibling', 'descendant', 'flavor_bridge'
  era: varchar("era"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_relationships_source").on(table.sourceRecipe),
  index("idx_relationships_target").on(table.targetRecipe),
  index("idx_relationships_type").on(table.relationshipType),
]);

// Flavor Categories - The 8 broad flavor dimensions (Sweet, Sour, Bitter, etc.)
export const flavorCategories = pgTable("flavor_categories", {
  id: varchar("id").primaryKey(), // e.g., 'sweet', 'sour', 'bitter'
  label: varchar("label").notNull(), // Display name: 'Sweet', 'Sour', 'Bitter'
  color: varchar("color").notNull(), // Hex color for UI
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flavor Subcategories - Middle tier of flavor hierarchy (e.g., 'citrus' under 'fruity')
export const flavorSubcategories = pgTable("flavor_subcategories", {
  id: varchar("id").primaryKey(), // e.g., 'fruity.citrus', 'sweet.rich'
  categoryId: varchar("category_id").notNull().references(() => flavorCategories.id, { onDelete: "cascade" }),
  label: varchar("label").notNull(), // Display name: 'Citrus', 'Rich'
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_flavor_subcategories_category").on(table.categoryId),
]);

// Flavor Notes - Specific flavor notes within each subcategory
export const flavorNotes = pgTable("flavor_notes", {
  id: varchar("id").primaryKey(), // e.g., 'sweet.rich.honey', 'fruity.citrus.lemon'
  categoryId: varchar("category_id").notNull().references(() => flavorCategories.id, { onDelete: "cascade" }),
  subcategoryId: varchar("subcategory_id").references(() => flavorSubcategories.id, { onDelete: "cascade" }),
  label: varchar("label").notNull(), // Display name: 'Honey', 'Lemon'
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description"),
  keywords: jsonb("keywords").$type<string[]>(), // Alternative terms for AI matching
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_flavor_notes_category").on(table.categoryId),
  index("idx_flavor_notes_subcategory").on(table.subcategoryId),
]);

// Ingredient Flavor Mappings - Links ingredients to their flavor notes
export const ingredientFlavorMappings = pgTable("ingredient_flavor_mappings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ingredientKeyword: varchar("ingredient_keyword").notNull(), // e.g., 'bourbon', 'angostura bitters'
  noteId: varchar("note_id").notNull().references(() => flavorNotes.id, { onDelete: "cascade" }),
  intensity: integer("intensity").default(5), // 1-10 scale for how strongly this ingredient exhibits this flavor
  isPrimary: boolean("is_primary").default(false), // Is this the dominant flavor?
  source: varchar("source"), // 'system', 'ai', 'user_verified'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ingredient_flavor_keyword").on(table.ingredientKeyword),
  index("idx_ingredient_flavor_note").on(table.noteId),
]);

// Flavor Data Version - For cache invalidation
export const flavorDataVersion = pgTable("flavor_data_version", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  version: varchar("version").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserRecipe = typeof userRecipes.$inferSelect;
export type InsertUserRecipe = typeof userRecipes.$inferInsert;
export type UserRating = typeof userRatings.$inferSelect;
export type InsertUserRating = typeof userRatings.$inferInsert;
export type UserShoppingItem = typeof userShoppingList.$inferSelect;
export type InsertUserShoppingItem = typeof userShoppingList.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type GlobalRecipe = typeof globalRecipes.$inferSelect;
export type InsertGlobalRecipe = typeof globalRecipes.$inferInsert;
export type MasterIngredient = typeof masterIngredients.$inferSelect;
export type InsertMasterIngredient = typeof masterIngredients.$inferInsert;
export type CocktailFamily = typeof cocktailFamilies.$inferSelect;
export type InsertCocktailFamily = typeof cocktailFamilies.$inferInsert;
export type CocktailLineage = typeof cocktailLineage.$inferSelect;
export type InsertCocktailLineage = typeof cocktailLineage.$inferInsert;
export type CocktailRelationship = typeof cocktailRelationships.$inferSelect;
export type InsertCocktailRelationship = typeof cocktailRelationships.$inferInsert;
export type LabRiff = typeof labRiffs.$inferSelect;
export type InsertLabRiff = typeof labRiffs.$inferInsert;
export type FlavorCategory = typeof flavorCategories.$inferSelect;
export type InsertFlavorCategory = typeof flavorCategories.$inferInsert;
export type FlavorSubcategory = typeof flavorSubcategories.$inferSelect;
export type InsertFlavorSubcategory = typeof flavorSubcategories.$inferInsert;
export type FlavorNote = typeof flavorNotes.$inferSelect;
export type InsertFlavorNote = typeof flavorNotes.$inferInsert;
export type IngredientFlavorMapping = typeof ingredientFlavorMappings.$inferSelect;
export type InsertIngredientFlavorMapping = typeof ingredientFlavorMappings.$inferInsert;
export type FlavorDataVersion = typeof flavorDataVersion.$inferSelect;
