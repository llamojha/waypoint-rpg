# Implementation Plan: Next.js Migration

## Overview

This planrates the Waypoint RPG frontend from Vite + React to Next.js 14 with App Router. Tasks are ordered to build incrementally, with each step producing a working state.

## Tasks

- [-] 1. Initialize Next.js project and configure TypeScript

  - [x] 1.1 Create Next.js 14 project with App Router and TypeScript
    - Run `npx create-next-app@latest` with TypeScript, ESLint, Tailwind CSS, App Router options
    - Configure project in a new directory or migrate in place
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Configure TypeScript with strict mode and path aliases
    - Update tsconfig.json to match existing strict settings
    - Add `@/*` path alias pointing to project root
    - _Requirements: 1.2, 1.5_
  - [x] 1.3 Update package.json with required dependencies
    - Add lucide-react, @supabase/ssr, @supabase/supabase-js
    - Preserve React 19 version
    - _Requirements: 1.4_

- [x] 2. Configure Tailwind CSS with custom theme

  - [x] 2.1 Set up Tailwind configuration with custom colors and fonts
    - Add parchment, ink, gold, burgundy, forest color tokens
    - Configure font families: sans (Inter), serif (Crimson Text), display (Pirata One)
    - _Requirements: 3.1, 3.2_
  - [x] 2.2 Create globals.css with CSS variables and custom utilities
    - Add light/dark theme CSS variables
    - Add custom utilities: drop-cap, scroll animations, panel-texture, mask-gradient
    - Add scrollbar styling and noise overlay
    - _Requirements: 3.3, 3.5_

- [x] 3. Create root layout and home page

  - [x] 3.1 Create app/layout.tsx with HTML structure and fonts
    - Set up HTML with data-theme attribute
    - Configure Google Fonts via next/font or link tags
    - Add metadata (title, description, favicon)
    - _Requirements: 4.1, 7.1, 7.3_
  - [x] 3.2 Create app/page.tsx that renders the main App component
    - Import and render App as a Client Component
    - _Requirements: 4.2_

- [x] 4. Migrate core application component

  - [x] 4.1 Migrate App.tsx as a Client Component
    - Add 'use client' directive
    - Update imports to use @/ path alias
    - Preserve all state management and view routing logic
    - _Requirements: 2.1, 2.3, 4.4, 4.5_
  - [x] 4.2 Migrate types.ts and constants.ts
    - Copy files to project root
    - Verify all exports are accessible
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 5. Migrate UI components

  - [x] 5.1 Migrate Header and LandingPage components
    - Add 'use client' directive to each
    - Update imports to use @/ path alias
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 5.2 Migrate CharacterCreation and ProfilePage components
    - Add 'use client' directive to each
    - Update imports to use @/ path alias
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 5.3 Migrate LeftColumn, CenterColumn, RightColumn components
    - Add 'use client' directive to each
    - Update imports to use @/ path alias
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 5.4 Migrate MapPage, CodexPage, TurnTrace components
    - Add 'use client' directive to each
    - Update imports to use @/ path alias
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

- [x] 6. Checkpoint - Verify UI renders correctly

  - Run `npm run dev` and verify landing page displays
  - Test navigation between views
  - Verify theme toggle works
  - Ensure all tests pass, ask the user if questions arise

- [x] 7. Set up Supabase client utilities

  - [x] 7.1 Create lib/supabase/client.ts for browser usage
    - Implement createClient function with env var validation
    - Throw descriptive error if env vars missing
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 7.2 Create lib/supabase/server.ts for server-side usage
    - Implement createClient function with cookie handling
    - Throw descriptive error if env vars missing
    - _Requirements: 5.1, 5.3, 5.4_
  - [x] 7.3 Create .env.local template and update .gitignore
    - Add .env.local to .gitignore
    - Create .env.local.example with placeholder values
    - _Requirements: 5.5_
  - [ ]\* 7.4 Write property test for environment variable error handling
    - **Property 2: Environment Variable Error Handling**
    - **Validates: Requirements 5.4**

- [x] 8. Create API route stubs

  - [x] 8.1 Create app/api/character/route.ts
    - Implement GET, POST, PATCH handlers returning placeholder JSON
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.2 Create app/api/world/route.ts
    - Implement GET, PATCH handlers returning placeholder JSON
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.3 Create app/api/turn/route.ts with SSE support structure
    - Implement POST handler with streaming response capability
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 8.4 Create app/api/news/route.ts
    - Implement GET handler returning placeholder JSON
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]\* 8.5 Write property test for API route responses
    - **Property 3: API Route Success Response**
    - **Validates: Requirements 6.2**

- [x] 9. Configure build and deployment

  - [x] 9.1 Create next.config.js with required settings
    - Configure any necessary build options
    - _Requirements: 8.4_
  - [x] 9.2 Verify build succeeds with no TypeScript errors
    - Run `npm run build` and fix any errors
    - _Requirements: 8.1, 8.2, 10.4_
  - [x] 9.3 Test development server startup
    - Run `npm run dev` and verify hot reload works
    - _Requirements: 9.1_

- [x] 10. Final checkpoint - Full verification

  - Verify all 10 components render correctly
  - Test all view transitions
  - Verify API routes return expected responses
  - Confirm build completes without errors
  - Ensure all tests pass, ask the user if questions arise

- [x] 11. Clean up old Vite files
  - [x] 11.1 Remove Vite-specific files
    - Remove vite.config.ts, index.html (if not needed)
    - Update package.json scripts to use Next.js commands
    - _Requirements: 9.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
