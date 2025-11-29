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
- **Flavor Profiling**: Visual representation of flavor dimensions (Sweet, Sour, Bitter, Boozy, Herbal, Fruity, Spicy, Smoky).
- **Recipe Management**: Create, import (including from social media URLs), and manage custom recipes.
- **Shopping List**: Track ingredients and manage inventory.
- **Nutrition Estimation**: Calculates calories, carbs, and ABV for cocktails.
- **Automatic Recipe Enrichment**: New and global recipes are automatically analyzed by AI for flavor profiles and nutritional data.
- **Shared Image Storage**: Efficient image management using Replit Object Storage, with shared global images and user-specific variations.
- **Mobile Optimization**: Enhanced bottom navigation for improved mobile usability.
- **Data Reset Options**: Users can reset all data or just ratings/palate.

### Database Schema
- **users**: User profiles.
- **sessions**: Stores user session data.
- **global_recipes**: Stores classic cocktail recipes, including AI-enriched flavor profiles and nutrition data.
- **master_ingredients**: Comprehensive ingredient database with AI-enriched nutrition, ABV, flavor notes, and other details.
- **user_recipes**: User-created custom cocktail recipes, with automatic AI enrichment.
- **user_ratings**: User-specific cocktail ratings.
- **user_shopping_list**: User's personalized shopping list items.
- **user_settings**: User preferences and application settings.
- **recipe_images**: Stores cocktail images, shared globally or user-specific.

### UI/UX Decisions
- Uses custom components and Lucide React for a consistent interface.
- Radar charts (Recharts) visualize flavor profiles.
- Mobile-first approach with optimized navigation for smaller screens.
- "AI Generated" badge for object-stored images.

## External Dependencies
- **Google Gemini AI**: Used for intelligent recipe recommendations, ingredient analysis, social media URL processing, and automatic recipe/ingredient enrichment.
- **PostgreSQL**: Primary database for all persistent data storage.
- **Replit Auth**: Authentication service providing social logins (Google, GitHub, X, Apple) and email/password options.
- **Replit App Storage (Object Storage)**: Used for storing and serving cocktail images.