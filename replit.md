# Bar Assistant - AI-Powered Cocktail Companion

## Overview
The Bar Assistant is a full-stack, AI-powered cocktail application designed to be a comprehensive companion for cocktail enthusiasts and bartenders. It leverages Google's Gemini AI for intelligent recipe recommendations, ingredient analysis, flavor profiling, and cocktail creation assistance. The application provides persistent storage for user data, including preferences, custom recipes, and ratings, and supports Replit Auth for user authentication.

The project aims to offer a sophisticated, user-friendly experience for exploring, creating, and managing cocktail recipes, complete with advanced features like AI-driven enrichment of flavor profiles and nutritional data.

## User Preferences
None set yet - will be documented as user expresses preferences during development.

## System Architecture

### Tech Stack
- **Frontend**: React 19.2.0 (TypeScript), Vite 6.2.0, Lucide React (icons), Recharts (charts), React Query (state management)
- **Backend**: Express.js (TypeScript), PostgreSQL, Drizzle ORM, connect-pg-simple (session storage)
- **AI**: Google Gemini AI (@google/genai v1.30.0)
- **Authentication**: Replit Auth (OpenID Connect for Google, GitHub, X, Apple, email)
- **Storage**: Replit App Storage (Object Storage) for images

### Key Features
- **Guest Mode**: Full functionality with preloaded recipes without login.
- **User Authentication**: Secure login via Replit Auth, persistent sessions.
- **Personalized Experience**: Merges user-specific data (ratings, custom recipes) with global recipes upon login.
- **AI-Powered Recommendations**: Suggestions based on ingredients and flavor preferences.
- **Ingredient Scanning**: AI-driven inventory management (future: image recognition).
- **Flavor Profiling**: Visual representation of 8 flavor dimensions (Sweet, Fruity, Floral, Herbal, Spicy, Earthy, Sour, Boozy).
- **Recipe Management**: Create, import (including from social media URLs and screenshots), and manage custom recipes.
- **Screenshot AI Analysis**: Upload screenshots of cocktail recipes for AI interpretation:
  - Camera button next to mic in new entry modal
  - Supports JPEG, PNG, WebP, and GIF images
  - AI extracts recipe name, ingredients, instructions, and flavor profile from images
  - Works with text input for additional context or standalone
- **Shopping List**: Track ingredients and manage inventory.
- **Nutrition Estimation**: Calculates calories, carbs, and ABV for cocktails.
- **Automatic Recipe Enrichment**: New and global recipes are automatically analyzed by AI for flavor profiles and nutritional data.
- **Shared Image Storage**: Efficient image management using Replit Object Storage, with shared global images and user-specific variations.
- **Mobile Optimization**: Enhanced bottom navigation for improved mobile usability.
- **Data Reset Options**: Users can reset all data or just ratings/palate.
- **Order History Photos**: Take and store photos for drinks ordered at bars/restaurants:
  - Camera button on order history cards (tap image area to add/update photo)
  - Photos stored in Replit Object Storage per user
  - Optimistic UI updates with proper error rollback
  - Works with mobile camera via `capture="environment"`
- **DIY Ingredient System**: Make your own syrups, cordials, and shrubs with:
  - 15 DIY recipes with scalable ingredient calculators
  - "I Made This!" button to track homemade ingredients with expiration dates
  - Status indicators showing what needs to be made vs. what's in stock
  - Expiration tracking with warnings for items expiring within 7 days
  - Freshness notifications for recently made batches (within 3 days)
  - Memoized status map for consistent status display across views
- **Cocktail Lineage / Family Tree**: AI-powered drink genealogy feature inspired by Cocktail Codex with database persistence:
  - Analyzes any recipe and maps its evolutionary relationships
  - Database-first approach: checks for existing lineage data before generating with AI
  - Six root templates based on Cocktail Codex: Old Fashioned, Martini, Daiquiri, Sidecar, Whiskey Highball, Flip
  - Shows Ancestors (historical drinks that influenced the cocktail)
  - Shows Siblings (drinks at the same evolutionary level)
  - Shows Descendants/Riffs (modern variations inspired by the cocktail)
  - Flavor Bridges showing how tastes evolved through the family
  - Evolution Narrative telling the drink's story in cocktail history
  - Clickable drinks navigate to recipes in your library with "In Library" badges
  - "From Database" indicator when displaying cached lineage data
  - Refresh button to regenerate with AI and update the database
  - Auto-assigns new recipes to cocktail families when created/imported
- **Cocktail Laboratory (Flavor Lab)**: AI-powered ingredient experimentation feature in the Rx tab:
  - Select any cocktail as a starting point for experimentation
  - **Target Volume Tracking**: Displays and uses total cocktail volume to guide riff modifications:
    - Automatically calculates volume from ingredient measurements (supports mixed fractions like "1 1/2 oz")
    - AI considers target volume when suggesting substitutions to maintain golden ratios
    - Volume displayed in recipe selector for quick reference
    - **Flexible Volume Balancing**: AI can reduce base ingredients (especially modifiers like syrups, juices, liqueurs) to accommodate additions while staying within ±0.5 oz tolerance
    - Prioritizes maintaining drink's backbone (base spirits) when making volume adjustments
  - **Interactive Editable Flavor Wheel**: Hierarchical 3-tier design with granular control:
    - Inner ring: 8 main flavor categories (Sweet, Fruity, Floral, Herbal, Spicy, Earthy, Sour, Boozy)
    - Middle ring: Subcategories for each flavor dimension
    - Outer ring: Specific flavor notes - each independently modifiable
    - Continuous color intensity (0-10 scale) with opacity mapping (25%-100%)
    - Category and subcategory values derived using weighted aggregation formula (70% max + 30% average)
    - Fine flavor labels positioned INSIDE the outer ring arc for maximum screen utilization on mobile
    - Click outer ring notes to modify individual flavors
    - Click middle ring subcategories to adjust related notes together
    - Click inner ring categories to adjust all child notes together
    - Hover shows precise values for notes, subcategories, and categories
    - HSL interpolation for smooth color transitions
    - Backwards compatibility: Maps legacy Bitter values to Herbal, Smoky values to Earthy
    - **Fully Responsive Design**: Uses ResizeObserver and proportional sizing (% of container width) to maximize screen space on mobile devices while keeping all elements readable and within bounds
  - Visual radar chart comparing Original, Target, and Predicted flavor profiles
  - AI suggests ingredient substitutions to achieve target flavor goals
  - Toggle individual substitutions to preview modified recipe
  - Handles recipes without flavor profiles gracefully with default profiles
  - Clear error messaging when AI analysis fails
  - Indicator for recipes lacking flavor data in recipe selector
  - **Lab Riff Creation System**: Save your modified recipes as new riffs:
    - Full recipe card display with name input, ingredients list, and modifications summary
    - Signature-based deduplication: Normalizes ingredients (strips quantities, sorts, hashes) to detect duplicate riffs
    - Automatic lineage integration: Saved riffs are registered as descendants of parent cocktail
    - Existing riff detection: Shows "Existing Riff Found" badge when duplicate detected
    - Predicted flavor profile preview with visual bars
    - Save button with loading state and success/error feedback
- **Privacy-First Approach**: User email is never stored in the database; only user ID, display name, and profile picture are retained
- **Recipe Duplicate Detection**: Prevents flooding of duplicate recipes through:
  - Exact name matching (case-insensitive)
  - Fuzzy name matching using Levenshtein distance (85% similarity threshold)
  - Ingredient signature hashing to detect same-ingredient recipes with different names
  - Checks both user recipes and global library
  - Force-add option for similar (but not exact) duplicates
  - Proactive check endpoint for frontend validation

### Database Schema
- **users**: User profiles.
- **sessions**: Stores user session data.
- **global_recipes**: Stores classic cocktail recipes, including AI-enriched flavor profiles and nutrition data.
- **master_ingredients**: Comprehensive ingredient database with AI-enriched nutrition, ABV, flavor notes, derived flavor note IDs from global mappings, and intensity scores.
- **user_recipes**: User-created custom cocktail recipes, with automatic AI enrichment.
- **user_ratings**: User-specific cocktail ratings.
- **user_shopping_list**: User's personalized shopping list items.
- **user_settings**: User preferences and application settings.
- **recipe_images**: Stores cocktail images, shared globally or user-specific.
- **cocktail_families**: The 6 root cocktail templates (Old Fashioned, Martini, Daiquiri, Sidecar, Whiskey Highball, Flip).
- **cocktail_lineage**: Stores AI-generated family tree data for each drink (family assignment, relationship, key modifications, evolution narrative).
- **cocktail_relationships**: Stores connections between drinks (ancestors, siblings, descendants, flavor bridges).
- **lab_riffs**: Stores user-created riffs from the Cocktail Laboratory (name, ingredients, signature hash for deduplication, parent recipe, predicted flavor profile).
- **flavor_categories**: 8 primary flavor categories (Sweet, Fruity, Floral, Herbal, Spicy, Earthy, Sour, Boozy) with colors and sort order.
- **flavor_subcategories**: Middle tier of the 3-tier flavor hierarchy linking categories to specific notes.
- **flavor_notes**: 96 specific flavor notes organized by subcategory with keywords for ingredient matching.
- **ingredient_flavor_mappings**: 150+ ingredient-to-flavor mappings with intensity and primary flag for AI interpretation.
- **flavor_data_version**: Version tracking for flavor data updates and cache invalidation.

### Lineage API Endpoints
- `GET /api/cocktail-families` - Lists all 6 root cocktail templates
- `GET /api/lineage/:recipeName` - Retrieves cached lineage data from the database
- `POST /api/lineage` - Saves AI-generated lineage for future retrieval
- `GET /api/lineages` - Lists all stored lineages (for admin/stats)
- `POST /api/cocktail-families/seed` (admin) - Seeds the 6 root family templates

### Lab Riffs API Endpoints
- `POST /api/lab/riffs/detect` - Detects existing riff by signature hash or similar name (auth required)
- `POST /api/lab/riffs` - Creates a new lab riff with lineage integration (auth required)
- `GET /api/lab/riffs` - Lists all riffs (optional ?parent= filter, auth required)
- `GET /api/lab/riffs/:slug` - Retrieves a specific riff by slug (auth required)

### Flavor Data API Endpoints
- `GET /api/flavor-taxonomy` - Returns complete flavor taxonomy (categories, subcategories, notes, ingredient mappings) with version
- `GET /api/flavor-taxonomy/3-tier` - Returns full 3-tier hierarchical taxonomy (categories → subcategories → notes)
- `POST /api/flavor-taxonomy/derive` - Derives flavor notes from ingredient list with intensity scores
- `GET /api/flavor-taxonomy/ai-prompt` - Generates AI context prompt with full flavor mappings
- `POST /api/admin/seed-flavor-data` (admin) - Fresh seed of flavor master data (deletes and recreates all flavor data)
- `POST /api/admin/migrate-to-subcategories` (admin) - In-place migration to add subcategories to existing data (non-destructive)
- `POST /api/admin/update-ingredient-flavors` (admin) - Bulk updates all master ingredients with derived flavor note mappings

### UI/UX Decisions
- Uses custom components and Lucide React for a consistent interface.
- Radar charts (Recharts) visualize flavor profiles.
- Mobile-first approach with optimized navigation for smaller screens.
- "AI Generated" badge for object-stored images.
- DrinkFamilyTree component shows database icon when data is from cache.

## External Dependencies
- **Google Gemini AI**: Used for intelligent recipe recommendations, ingredient analysis, social media URL processing, automatic recipe/ingredient enrichment, and cocktail lineage analysis.
- **PostgreSQL**: Primary database for all persistent data storage including lineage caching.
- **Replit Auth**: Authentication service providing social logins (Google, GitHub, X, Apple) and email/password options.
- **Replit App Storage (Object Storage)**: Used for storing and serving cocktail images.

## Admin Configuration
- **ADMIN_USER_ID**: Environment variable to set the admin user ID (currently: "50346831")
- Admin users can access seeding endpoints for recipes, ingredients, and cocktail families
