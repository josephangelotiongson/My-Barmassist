# Bar Assistant - AI-Powered Cocktail Companion

## Overview

This is a sophisticated cocktail/bar assistant application built with React, TypeScript, and Vite. It leverages Google's Gemini AI to provide intelligent recipe recommendations, ingredient scanning, flavor profiling, and cocktail creation assistance.

**Current State**: Fully configured and running in the Replit environment on port 5000.

## Recent Changes (November 28, 2025)

- Initial import and setup for Replit environment
- Added missing script tag to index.html for Vite entry point (project was exported from AI Studio with CDN-based loading)
- Configured Vite to run on port 5000 with proxy support (`allowedHosts: true`)
- Set up GEMINI_API_KEY as a secret for AI functionality
- Configured deployment as static site with build step
- Verified all dependencies are installed and application runs successfully

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **UI Components**: Custom components with Lucide React icons
- **Charts**: Recharts for flavor profile visualization
- **AI Integration**: Google Gemini AI (@google/genai v1.30.0)

### Project Structure
```
.
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
├── services/           # API services
│   └── geminiService.ts  # Gemini AI integration
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── types.ts           # TypeScript type definitions
├── initialData.ts     # Initial recipes and master data
└── vite.config.ts     # Vite configuration
```

### Key Features
- **AI-Powered Recommendations**: Get cocktail suggestions based on available ingredients and flavor preferences
- **Ingredient Scanner**: Scan your bar inventory using AI image recognition
- **Flavor Profiling**: Visualize flavor dimensions (Sweet, Sour, Bitter, Boozy, Herbal, Fruity, Spicy, Smoky)
- **Recipe Management**: Import, create, and manage cocktail recipes
- **Shopping List**: Track ingredients and manage inventory
- **Nutrition Estimation**: Calculate calories, carbs, and ABV for cocktails
- **Bar Order Suggestions**: Get AI recommendations when ordering at a bar

## Configuration

### Environment Variables
- **GEMINI_API_KEY** (Secret): Required for AI features - set in Replit Secrets

### Vite Configuration
- **Port**: 5000 (required for Replit webview)
- **Host**: 0.0.0.0 (required for external access)
- **allowedHosts**: true (required for Replit proxy)

### Deployment
- **Type**: Static site deployment
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`

**IMPORTANT SECURITY NOTE**: This application embeds the GEMINI_API_KEY directly in the client bundle for simplicity. This is acceptable for personal use or development, but NOT recommended for public production deployment as it exposes your API key to all users. For production use with public access, consider:
1. Implementing a backend proxy server to handle Gemini API calls
2. Using API key restrictions in Google Cloud Console
3. Monitoring API usage and setting quotas

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

### Preview Production Build
```bash
npm run preview
```

## User Preferences

None set yet - will be documented as user expresses preferences during development.

## Notes

- The application uses Tailwind CSS via CDN (development warning is expected)
- All AI features require the GEMINI_API_KEY to be set
- The app is frontend-only with no backend server component
- State management is handled via React hooks and local storage
