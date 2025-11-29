# Bar Assistant - AI-Powered Cocktail Companion

## Overview

This is a sophisticated cocktail/bar assistant application built with React, TypeScript, Express, and PostgreSQL. It leverages Google's Gemini AI to provide intelligent recipe recommendations, ingredient scanning, flavor profiling, and cocktail creation assistance. The application includes Replit Auth for authentication and persistent storage for user preferences, recipes, and ratings.

**Current State**: Full-stack application running in the Replit environment on port 5000 with Replit Auth (supports Google, GitHub, and other social logins).

## Recent Changes (November 29, 2025)

- **Global Recipes Database Migration**: All cocktail recipes now loaded from PostgreSQL database
  - Created `global_recipes` table with comprehensive fields for flavor profiles, nutrition, and enrichment tracking
  - Migrated 73 hardcoded recipes from `initialData.ts` to database
  - AI enrichment pipeline using Gemini to analyze and populate:
    - Flavor profiles (Sweet, Sour, Bitter, Boozy, Herbal, Fruity, Spicy, Smoky - 0-10 scale)
    - Nutrition data (calories, sugar in grams, ABV percentage)
  - Frontend loads from `/api/global-recipes` with fallback to hardcoded data if database is empty
  - Admin endpoints (protected by authentication):
    - `POST /api/admin/seed-recipes` - Seed database from hardcoded data
    - `POST /api/admin/enrich-recipes?batch=N` - Enrich N recipes with AI
  - Enrichment status tracking: pending, partial, complete, failed

- **Automatic Recipe Enrichment**: New recipes are automatically enriched with AI
  - When a user creates a new custom recipe, it is immediately saved to the database
  - Background AI enrichment runs automatically to analyze the recipe and populate:
    - Flavor profile (8 dimensions, 0-10 scale)
    - Nutrition data (calories, sugar, ABV)
  - Shared enrichment service (`server/recipeEnrichment.ts`) used by both:
    - User recipe creation (automatic, background)
    - Global recipe batch enrichment (admin-triggered)
  - User recipes now include `nutrition`, `enrichmentStatus`, and `enrichedAt` fields

- **Shared Image Storage System**: Smart image management using App Storage (Object Storage)
  - Images are stored globally and shared across ALL users (prevents storage flooding)
  - **Classic Recipes**: Shared globally by recipe name (e.g., `margarita.png`)
  - **User Variations/Riffs**: Stored separately with creator ID (e.g., `margarita-by-user123.png`)
  - When any user requests an image:
    - First checks for user-specific variation image
    - Falls back to classic/global image if no variation exists
  - If no image exists at all, a new one is generated and saved
  - Images served via `/cocktail-images/:filename` endpoint
  - API endpoints:
    - `GET /api/recipe-images/:recipeName` - Check for classic image
    - `GET /api/recipe-images/:recipeName?creatorId=xxx` - Check for user variation
    - `POST /api/recipe-images` with `{ recipeName, imageData, creatorId? }` - Save image
- **Migrated to Replit Auth**: Replaced custom email/password authentication with Replit Auth
  - Users can now log in via Google, GitHub, X, Apple, and email/password
  - Login: Navigate to `/api/login`
  - Logout: Navigate to `/api/logout`
- **AI Generated Badge**: Images from App Storage display "AI Generated" badge in UI
  - Badge appears on both recipe detail view and list thumbnails
  - Only shown for images stored in Object Storage (path starts with `/cocktail-images/`)
- **Improved Mobile Navigation**: Increased bottom navigation bar size for better phone usability
  - Larger touch targets (28px icons)
  - Larger text labels (12px)
  - Taller navigation bar (80px height)
- Implemented guest/authenticated user dual-mode system
- Guests can use the app with all preloaded recipes (no login required)
- Authenticated users get their personal data (ratings, custom recipes, images) merged with preloaded recipes
- User data (ratings, recipes, settings, images) is loaded from database when logged in
- User data resets to defaults when logged out
- Fixed race condition in data loading by coordinating recipe and rating fetches with Promise.all
- Added two reset options in Settings:
  - **Full Reset**: Clears all user data (ratings, custom recipes, shopping list) back to defaults
  - **Reset Ratings/Palate Only**: Clears only ratings while preserving custom recipes

## Recent Changes (November 28, 2025)

- Converted from frontend-only to full-stack architecture
- Set up PostgreSQL database with Drizzle ORM for data persistence
- Created database schema for users, sessions, recipes, ratings, shopping lists, and settings
- Added React Query for API state management
- Updated deployment configuration for full-stack app (autoscale)

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Backend Framework**: Express.js with TypeScript
- **Build Tool**: Vite 6.2.0
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect with Google, GitHub, X, Apple, email)
- **Session Storage**: PostgreSQL-backed sessions (connect-pg-simple)
- **UI Components**: Custom components with Lucide React icons
- **Charts**: Recharts for flavor profile visualization
- **AI Integration**: Google Gemini AI (@google/genai v1.30.0)
- **State Management**: React Query (@tanstack/react-query)

### Project Structure
```
.
├── server/              # Backend server code
│   ├── index.ts         # Express server entry point
│   ├── routes.ts        # API route definitions
│   ├── replitAuth.ts    # Replit Auth (OpenID Connect) configuration
│   ├── storage.ts       # Database storage methods
│   ├── objectStorage.ts # Object Storage service for cocktail images
│   ├── recipeEnrichment.ts  # AI enrichment for recipes (flavor profiles, nutrition)
│   ├── seedIngredients.ts   # Seed master ingredients from INITIAL_MASTER_DATA
│   ├── ingredientEnrichment.ts  # AI enrichment for ingredients (web search + Gemini)
│   ├── enrichGlobalRecipes.ts   # AI enrichment pipeline for global recipes
│   ├── db.ts            # Database connection
│   └── vite.ts          # Vite middleware for development
├── shared/              # Shared code between frontend/backend
│   └── schema.ts        # Drizzle database schema
├── client/              # Frontend client code
│   └── src/
│       ├── hooks/       # React hooks
│       │   └── useAuth.ts  # Authentication hook
│       └── lib/
│           └── queryClient.ts  # React Query client
├── components/          # React components
│   ├── AuthModal.tsx    # Login/Signup modal
│   ├── FlavorWheel.tsx
│   ├── HistoryInput.tsx
│   ├── HowItWorksModal.tsx
│   ├── IngredientScanner.tsx
│   ├── RadarChart.tsx
│   ├── RecipeDetail.tsx
│   ├── RecipeImporter.tsx
│   ├── SettingsModal.tsx
│   └── ShoppingListAddModal.tsx
├── services/            # API services
│   └── geminiService.ts # Gemini AI integration
├── App.tsx              # Main application component
├── index.tsx            # Application entry point
├── types.ts             # TypeScript type definitions
├── initialData.ts       # Initial recipes and master data
├── vite.config.ts       # Vite configuration
└── drizzle.config.ts    # Drizzle ORM configuration
```

### Database Schema
- **users**: User profiles with email/password authentication
- **sessions**: PostgreSQL-backed session storage
- **global_recipes**: Classic cocktail recipes accessible to all users
  - Includes flavor profiles, nutrition data, enrichment status
  - AI enrichment pipeline populates flavor and nutrition data
- **master_ingredients**: Comprehensive ingredient database with AI enrichment
  - Includes nutrition (calories, carbs, sugar, protein per oz)
  - ABV (integer), flavor notes, aroma profiles, production methods
  - Common uses, substitutes, pairings, allergens
  - History and origin information
  - Verification sources and confidence scores
  - AI enrichment from reliable web sources using Gemini AI
  - API endpoints:
    - `GET /api/ingredients` - List all ingredients
    - `GET /api/ingredients/stats` - Get enrichment statistics
    - `GET /api/ingredients/:slug` - Get single ingredient by slug
    - `POST /api/admin/seed-ingredients` - Seed from INITIAL_MASTER_DATA (auth required)
    - `POST /api/admin/enrich-ingredients?batch=N` - Enrich N ingredients with AI (auth required)
- **user_recipes**: User-created cocktail recipes
- **user_ratings**: User ratings for cocktails
- **user_shopping_list**: User shopping list items
- **user_settings**: User preferences (API keys, bar location, etc.)
- **recipe_images**: Global image storage for recipe images (shared across users)

### Key Features
- **Guest Mode**: No login required - guests can use the app with all preloaded recipes
- **User Authentication**: Signup/login with any email and password, persistent sessions
- **User Data Merging**: When logged in, user's ratings and custom recipes merge with preloaded recipes
- **AI-Powered Recommendations**: Get cocktail suggestions based on available ingredients and flavor preferences
- **Ingredient Scanner**: Scan your bar inventory using AI image recognition
- **Flavor Profiling**: Visualize flavor dimensions (Sweet, Sour, Bitter, Boozy, Herbal, Fruity, Spicy, Smoky)
- **Recipe Management**: Import, create, and manage cocktail recipes (saved to database)
- **Shopping List**: Track ingredients and manage inventory
- **Nutrition Estimation**: Calculate calories, carbs, and ABV for cocktails
- **Bar Order Suggestions**: Get AI recommendations when ordering at a bar

## Updating Preloaded Recipes

To manually update the preloaded recipes available to all users (guests and logged-in users), edit the `initialData.ts` file:

### Recipe Structure
Each recipe in `INITIAL_RECIPES_DATA` follows this structure:
```typescript
{
  id: 'unique-recipe-id',
  name: 'Recipe Name',
  ingredients: ['Ingredient 1', 'Ingredient 2'],
  instructions: 'Step-by-step preparation instructions.',
  flavorProfile: { sweet: 5, sour: 3, bitter: 2, boozy: 4, herbal: 1, fruity: 2, spicy: 0, smoky: 0 },
  category: 'Category Name',
  glassType: 'Glass Type',
  garnish: 'Garnish Description',
  imageUrl: 'optional-image-url'
}
```

### Adding a New Recipe
1. Open `initialData.ts`
2. Find the `INITIAL_RECIPES_DATA` array
3. Add your new recipe object following the structure above
4. Restart the application to see changes

### Updating Master Ingredients
The `INITIAL_MASTER_DATA` array contains ingredient information used for nutrition calculations. Each ingredient includes:
- Name, category, subcategory
- ABV (alcohol by volume)
- Flavor notes
- Nutrition estimates (calories/oz, carbs/oz)

## Configuration

### Environment Variables
- **GEMINI_API_KEY** (Secret): Required for AI features - set in Replit Secrets
- **DATABASE_URL** (Auto-configured): PostgreSQL connection string
- **SESSION_SECRET** (Auto-generated): Session encryption key
- **REPLIT_DOMAINS** (Auto-configured): Domain for OAuth callbacks
- **PRIVATE_OBJECT_DIR**: Object Storage bucket path for cocktail images (`/replit-objstore-e1b2996f-9595-476e-aea6-3842aa94c3b2`)

### Database Commands
```bash
npm run db:push    # Push schema changes to database
npm run db:studio  # Open Drizzle Studio for database inspection
```

### Deployment
- **Type**: Autoscale deployment
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

**IMPORTANT SECURITY NOTE**: This application embeds the GEMINI_API_KEY directly in the client bundle for simplicity. This is acceptable for personal use or development, but NOT recommended for public production deployment as it exposes your API key to all users.

## Development

### Running Locally
The application is configured to run automatically via the "Start application" workflow:
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## User Preferences

None set yet - will be documented as user expresses preferences during development.

## Notes

- The application uses Tailwind CSS via CDN (development warning is expected)
- All AI features require the GEMINI_API_KEY to be set
- User data is stored in PostgreSQL and persists across sessions
- Authentication is handled by custom email/password auth - users can sign up with any email
- The backend serves the frontend in production and uses Vite middleware in development
