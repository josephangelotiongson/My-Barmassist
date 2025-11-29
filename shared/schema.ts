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
    Sour: number;
    Bitter: number;
    Boozy: number;
    Herbal: number;
    Fruity: number;
    Spicy: number;
    Smoky: number;
  }>(),
  category: varchar("category"),
  glassType: varchar("glass_type"),
  garnish: varchar("garnish"),
  imageUrl: text("image_url"),
  isCustom: boolean("is_custom").default(true),
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
    Sour: number;
    Bitter: number;
    Boozy: number;
    Herbal: number;
    Fruity: number;
    Spicy: number;
    Smoky: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Master ingredient data (shared across all users)
export const masterIngredients = pgTable("master_ingredients", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull().unique(),
  category: varchar("category").notNull(),
  abv: integer("abv"),
  nutritionEstimate: jsonb("nutrition_estimate").$type<{
    caloriesPerOz: number;
    carbsPerOz: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
