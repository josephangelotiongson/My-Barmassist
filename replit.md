# Bar Assistant - AI-Powered Cocktail Companion

## Overview

This is a sophisticated cocktail/bar assistant application built with React, TypeScript, Express, and PostgreSQL. It leverages Google's Gemini AI to provide intelligent recipe recommendations, ingredient scanning, flavor profiling, and cocktail creation assistance. The application includes custom email/password authentication and persistent storage for user preferences, recipes, and ratings.

**Current State**: Full-stack application running in the Replit environment on port 5000 with email/password authentication.

## Recent Changes (November 29, 2025)

- Implemented guest/authenticated user dual-mode system
- Guests can use the app with all preloaded recipes (no login required)
- Authenticated users get their personal data (ratings, custom recipes) merged with preloaded recipes
- User data (ratings, recipes, settings) is loaded from database when logged in
- User data resets to defaults when logged out
- Fixed race condition in data loading by coordinating recipe and rating fetches with Promise.all
- Added two reset options in Settings:
  - **Full Reset**: Clears all user data (ratings, custom recipes, shopping list) back to defaults
  - **Reset Ratings/Palate Only**: Clears only ratings while preserving custom recipes

## Recent Changes (November 28, 2025)

- Converted from frontend-only to full-stack architecture
- Added custom email/password authentication (signup and login with any email)
- Set up PostgreSQL database with Drizzle ORM for data persistence
- Created database schema for users, sessions, recipes, ratings, shopping lists, and settings
- Added React Query for API state management
- Updated deployment configuration for full-stack app (autoscale)
- Added login/logout UI with modal-based authentication forms

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Backend Framework**: Express.js with TypeScript
- **Build Tool**: Vite 6.2.0
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom email/password auth with bcrypt
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
│   ├── auth.ts          # Email/password auth configuration
│   ├── storage.ts       # Database storage methods
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
- **recipes**: User-created cocktail recipes
- **ratings**: User ratings for cocktails
- **shopping_list**: User shopping list items
- **user_settings**: User preferences (API keys, bar location, etc.)

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
