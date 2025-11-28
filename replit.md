# Bar Assistant - AI-Powered Cocktail Companion

## Overview

This is a sophisticated cocktail/bar assistant application built with React, TypeScript, Express, and PostgreSQL. It leverages Google's Gemini AI to provide intelligent recipe recommendations, ingredient scanning, flavor profiling, and cocktail creation assistance. The application includes user authentication via Replit Auth and persistent storage for user preferences, recipes, and ratings.

**Current State**: Full-stack application running in the Replit environment on port 5000 with Replit Auth integration.

## Recent Changes (November 28, 2025)

- Converted from frontend-only to full-stack architecture
- Added Replit Auth integration for user login/logout functionality
- Set up PostgreSQL database with Drizzle ORM for data persistence
- Created database schema for users, sessions, recipes, ratings, shopping lists, and settings
- Added React Query for API state management
- Updated deployment configuration for full-stack app (autoscale)
- Added login/logout UI to the app header

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Backend Framework**: Express.js with TypeScript
- **Build Tool**: Vite 6.2.0
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (Passport + OpenID Connect)
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
│   ├── replitAuth.ts    # Replit Auth configuration
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
- **users**: User profiles (synced from Replit Auth)
- **sessions**: PostgreSQL-backed session storage
- **recipes**: User-created cocktail recipes
- **ratings**: User ratings for cocktails
- **shopping_list**: User shopping list items
- **user_settings**: User preferences (API keys, bar location, etc.)

### Key Features
- **User Authentication**: Login with Replit account, persistent sessions
- **AI-Powered Recommendations**: Get cocktail suggestions based on available ingredients and flavor preferences
- **Ingredient Scanner**: Scan your bar inventory using AI image recognition
- **Flavor Profiling**: Visualize flavor dimensions (Sweet, Sour, Bitter, Boozy, Herbal, Fruity, Spicy, Smoky)
- **Recipe Management**: Import, create, and manage cocktail recipes (saved to database)
- **Shopping List**: Track ingredients and manage inventory
- **Nutrition Estimation**: Calculate calories, carbs, and ABV for cocktails
- **Bar Order Suggestions**: Get AI recommendations when ordering at a bar

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
- Authentication is handled by Replit Auth - users log in with their Replit accounts
- The backend serves the frontend in production and uses Vite middleware in development
