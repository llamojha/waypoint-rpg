# Requirements Document

## Introduction

This document specifies the requirements for migrating the Waypoint RPG frontend from Vite + React to Next.js 14 with App Router. The migration enables Vercel deployment with API routes, server-side rendering capabilities, and establishes the foundation for the backend infrastructure.

## Glossary

- **App_Router**: Next.js 14's file-system based routing using the `app/` directory structure
- **Vite_App**: The current frontend implementation using Vite bundler with React
- **Next_App**: The target Next.js 14 application after migration
- **Supabase_Client**: The database client library for connecting to Supabase services
- **API_Route**: Next.js server-side endpoint handlers in the `app/api/` directory
- **Client_Component**: React component marked with 'use client' directive for client-side interactivity
- **Server_Component**: React component that renders on the server by default in Next.js App Router
- **Tailwind_Config**: The Tailwind CSS configuration including custom theme tokens
- **Environment_Variables**: Configuration values stored in `.env` files for secrets and settings

## Requirements

### Requirement 1: Next.js Project Initialization

**User Story:** As a developer, I want to initialize a Next.js 14 project with App Router, so that I can deploy the application to Vercel with modern React features.

#### Acceptance Criteria

1. THE Next_App SHALL use Next.js version 14 or higher with App Router enabled
2. THE Next_App SHALL use TypeScript with strict mode configuration matching the current Vite_App
3. THE Next_App SHALL include ESLint configuration for code quality
4. WHEN the project is initialized, THE Next_App SHALL have a valid `package.json` with all required dependencies
5. THE Next_App SHALL preserve the existing path alias `@/*` for imports

### Requirement 2: Component Migration

**User Story:** As a developer, I want all existing React components migrated to the Next.js structure, so that the UI functionality is preserved.

#### Acceptance Criteria

1. WHEN components are migrated, THE Next_App SHALL preserve all existing component functionality
2. THE Next_App SHALL organize components in a `components/` directory accessible via imports
3. WHEN a component uses React hooks or browser APIs, THE Client_Component SHALL include the 'use client' directive
4. THE Next_App SHALL migrate all 10 existing components: CenterColumn, CharacterCreation, CodexPage, Header, LandingPage, LeftColumn, MapPage, ProfilePage, RightColumn, TurnTrace
5. WHEN components import from relative paths, THE Next_App SHALL update imports to use the new directory structure

### Requirement 3: Tailwind CSS Configuration

**User Story:** As a developer, I want the existing Tailwind theme preserved, so that the visual design remains consistent after migration.

#### Acceptance Criteria

1. THE Tailwind_Config SHALL include all custom color tokens: parchment (100-900), ink (DEFAULT, light, faint), gold, burgundy, forest
2. THE Tailwind_Config SHALL include custom font families: sans (Inter), serif (Crimson Text), display (Pirata One)
3. THE Tailwind_Config SHALL support both light and dark themes via data-theme attribute
4. WHEN the application loads, THE Next_App SHALL apply the correct theme CSS variables
5. THE Tailwind_Config SHALL include all custom CSS: drop-cap, scroll animations, panel-texture, mask-gradient utilities

### Requirement 4: Application Layout and Routing

**User Story:** As a developer, I want the application to use Next.js App Router conventions, so that routing is handled by the framework.

#### Acceptance Criteria

1. THE Next_App SHALL have a root layout in `app/layout.tsx` with HTML structure and global styles
2. THE Next_App SHALL have a home page in `app/page.tsx` that renders the main application
3. WHEN the application loads, THE Next_App SHALL display the landing page by default
4. THE Next_App SHALL preserve all existing view states: landing, creation, game, profile, map, codex
5. WHEN navigating between views, THE Next_App SHALL maintain client-side state without full page reloads

### Requirement 5: Supabase Client Configuration

**User Story:** As a developer, I want Supabase client configured for both client and server usage, so that the application can connect to the database.

#### Acceptance Criteria

1. THE Supabase_Client SHALL be configured with environment variables for URL and anon key
2. THE Next_App SHALL provide a client-side Supabase instance for browser usage
3. THE Next_App SHALL provide a server-side Supabase instance for API routes
4. WHEN environment variables are missing, THE Supabase_Client SHALL throw a descriptive error
5. THE Next_App SHALL store Supabase credentials in `.env.local` excluded from version control

### Requirement 6: API Route Skeleton

**User Story:** As a developer, I want API route stubs created, so that backend endpoints are ready for implementation.

#### Acceptance Criteria

1. THE Next_App SHALL create API route stubs at: `/api/character`, `/api/world`, `/api/turn`, `/api/news`
2. WHEN an API route is called, THE API_Route SHALL return a placeholder JSON response with status 200
3. THE API_Route handlers SHALL use Next.js Route Handlers syntax with exported HTTP method functions
4. WHEN an unsupported HTTP method is used, THE API_Route SHALL return status 405 Method Not Allowed
5. THE Next_App SHALL configure API routes to support future SSE streaming for `/api/turn`

### Requirement 7: Static Assets and Fonts

**User Story:** As a developer, I want static assets and fonts properly configured, so that the application renders correctly.

#### Acceptance Criteria

1. THE Next_App SHALL load Google Fonts (Crimson Text, Inter, Pirata One) via next/font or link tags
2. WHEN the application loads, THE Next_App SHALL apply the correct font families to elements
3. THE Next_App SHALL preserve the existing favicon and metadata
4. WHEN static assets are referenced, THE Next_App SHALL serve them from the `public/` directory

### Requirement 8: Build and Deployment Configuration

**User Story:** As a developer, I want the application configured for Vercel deployment, so that it can be deployed to production.

#### Acceptance Criteria

1. THE Next_App SHALL build successfully with `next build` command
2. THE Next_App SHALL have no TypeScript errors during build
3. WHEN deployed to Vercel, THE Next_App SHALL serve the application correctly
4. THE Next_App SHALL include a `vercel.json` configuration if custom settings are needed
5. WHEN environment variables are configured in Vercel, THE Next_App SHALL use them at runtime

### Requirement 9: Development Experience

**User Story:** As a developer, I want a smooth development experience, so that I can iterate quickly on features.

#### Acceptance Criteria

1. THE Next_App SHALL start a development server with `npm run dev` command
2. WHEN source files change, THE Next_App SHALL hot-reload without losing client state
3. THE Next_App SHALL display helpful error messages for TypeScript and runtime errors
4. WHEN running in development, THE Next_App SHALL use environment variables from `.env.local`

### Requirement 10: Type Definitions Preservation

**User Story:** As a developer, I want all existing TypeScript types preserved, so that type safety is maintained.

#### Acceptance Criteria

1. THE Next_App SHALL include all types from the existing `types.ts` file
2. THE Next_App SHALL include all constants from the existing `constants.ts` file
3. WHEN types are imported, THE Next_App SHALL resolve them correctly via path aliases
4. THE Next_App SHALL maintain strict TypeScript configuration for type checking
