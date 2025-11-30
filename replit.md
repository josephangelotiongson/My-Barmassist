# Bar Assistant - AI-Powered Cocktail Companion

## Overview
The Bar Assistant is a full-stack, AI-powered cocktail application designed to be a comprehensive companion for cocktail enthusiasts and bartenders. It leverages Google's Gemini AI for intelligent recipe recommendations, ingredient analysis, flavor profiling, and cocktail creation assistance. The application provides persistent storage for user data, including preferences, custom recipes, and ratings, and supports Replit Auth for user authentication.

The project aims to offer a sophisticated, user-friendly experience for exploring, creating, and managing cocktail recipes, complete with advanced features like AI-driven enrichment of flavor profiles and nutritional data, and robust support for user-generated content.

## User Preferences
None set yet - will be documented as user expresses preferences during development.

## System Architecture

### Tech Stack
- **Frontend**: React (TypeScript), Vite, Lucide React, Recharts, React Query
- **Backend**: Express.js (TypeScript), PostgreSQL, Drizzle ORM, connect-pg-simple
- **AI**: Google Gemini AI
- **Authentication**: Replit Auth
- **Storage**: Replit App Storage (Object Storage)

### Key Features
- **User Management**: Guest mode, secure Replit Auth, personalized experience with persistent user data.
- **AI-Powered Recommendations**: Intelligent suggestions based on ingredients and flavor preferences.
- **Recipe Management**: Create, import (from URLs/screenshots), manage, and share recipes. Includes AI analysis of screenshots to extract recipe details.
- **Advanced Data Enrichment**: AI automatically analyzes and enriches recipes with flavor profiles, nutritional data (calories, carbs, ABV), and manages 8 flavor dimensions (Sweet, Fruity, Floral, Herbal, Spicy, Earthy, Sour, Boozy).
- **Inventory & Shopping List**: Track ingredients, manage inventory, and generate shopping lists.
- **DIY Ingredient System**: Manage homemade ingredients with scalable recipes, expiration tracking, and status indicators.
- **Cocktail Lineage / Family Tree**: AI-powered drink genealogy feature mapping evolutionary relationships of cocktails based on six root templates (Old Fashioned, Martini, Daiquiri, Sidecar, Whiskey Highball, Flip). Provides ancestors, siblings, descendants, flavor bridges, and evolution narratives.
- **Cocktail Laboratory (Flavor Lab)**: AI-powered ingredient experimentation with three modes:
    - **Recipe Mode**: Modify existing cocktails with AI-suggested flavor adjustments
    - **Build Mode**: Create new cocktails from scratch with selected ingredients
    - **De-Proof Mode**: Transform cocktails into zero-proof (0% ABV) or low-proof (under 5% ABV) versions
        - AI analyzes alcoholic ingredients and suggests appropriate substitutions
        - Maintains original flavor profiles as closely as possible
        - Includes feasibility check for drinks that cannot be de-proofed
        - Saves de-proofed recipes to Barmulary under "Mocktails & Low-ABV" category
    - **Target Volume Tracking**: Calculates and manages cocktail volume, with AI adjusting ingredient suggestions to maintain target volume and golden ratios.
    - **Volume Lever UI**: Interactive tool to balance cocktail volume for AI-suggested modifications, with real-time flavor profile impact visualization showing which flavor categories will change as ingredients are reduced.
    - **Interactive Editable Flavor Wheel**: Hierarchical 3-tier design for granular control over flavor notes (categories, subcategories, specific notes) with visual radar chart comparisons.
    - **Precise Flavor Note Matching**: AI understands specific flavor notes for accurate substitutions and provides commentary on obscure requests.
    - **Lab Riff Creation**: Save modified recipes as new riffs with signature-based deduplication and automatic lineage integration.
- **Privacy-First Design**: User email is not stored in the database.
- **Duplicate Detection**: Prevents redundant recipe entries using name matching and ingredient signature hashing.

### Database Schema
- **Core Entities**: `users`, `sessions`, `global_recipes`, `master_ingredients`, `user_recipes`, `user_ratings`, `user_shopping_list`, `user_settings`, `recipe_images`.
- **Flavor & Lineage Data**: `cocktail_families`, `cocktail_lineage`, `cocktail_relationships`, `lab_riffs`, `flavor_categories`, `flavor_subcategories`, `flavor_notes`, `ingredient_flavor_mappings`, `flavor_data_version`.

### UI/UX Decisions
- Mobile-first approach with optimized navigation.
- Custom components, Lucide React icons, and Recharts for data visualization.
- Visual indicators for AI-generated content and data sources.

## External Dependencies
- **Google Gemini AI**: For intelligent recommendations, analysis, and content enrichment.
- **PostgreSQL**: Primary database for all persistent data.
- **Replit Auth**: User authentication service.
- **Replit App Storage (Object Storage)**: For storing cocktail images.