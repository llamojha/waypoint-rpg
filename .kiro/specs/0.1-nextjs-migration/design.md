# Design Document: Next.js Migration

## Overview

This design document describes the architecture and implementation approach for migrating the Waypoint RPG frontend from Vite + React to Next.js 14 with App Router. The migration preserves all existing functionality while establishing the foundation for server-side features, API routes, and Vercel deployment.

## Architecture

### High-Level Structure

```
waypoint-nextjs/
├── app/
│   ├── layout.tsx          # Root layout with HTML, fonts, global styles
│   ├── page.tsx            # Home page (renders main App component)
│   ├── globals.css         # Global styles and CSS variables
│   └── api/
│       ├── character/
│       │   └── route.ts    # Character CRUD endpoints
│       ├── world/
│       │   └── route.ts    # World state endpoints
│       ├── turn/
│       │   └── route.ts    # Turn processing with SSE support
│       └── news/
│           └── route.ts    # World news endpoints
├── components/
│   ├── CenterColumn.tsx
│   ├── CharacterCreation.tsx
│   ├── CodexPage.tsx
│   ├── Header.tsx
│   ├── LandingPage.tsx
│   ├── LeftColumn.tsx
│   ├── MapPage.tsx
│   ├── ProfilePage.tsx
│   ├── RightColumn.tsx
│   └── TurnTrace.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   └── server.ts       # Server-side Supabase client
│   └── utils.ts            # Shared utilities
├── types.ts                # TypeScript type definitions
├── constants.ts            # Game constants and mock data
├── public/                 # Static assets
├── tailwind.config.ts      # Tailwind configuration
├── next.config.js          # Next.js configuration
└── .env.local              # Environment variables (gitignored)
```

### Rendering Strategy

The application uses a hybrid rendering approach:

1. **Server Components (Default)**: Layout and static content
2. **Client Components**: Interactive UI components marked with 'use client'

Since the existing Vite app is entirely client-rendered with React state management, most components will be Client Components to preserve functionality.

```
┌─────────────────────────────────────────────────────────┐
│                    app/layout.tsx                        │
│                  (Server Component)                      │
│  - HTML structure                                        │
│  - Font loading                                          │
│  - Metadata                                              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    app/page.tsx                          │
│                  (Server Component)                      │
│  - Renders <App /> client component                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                             │
│                  (Client Component)                      │
│  - All game state (useState, useEffect)                  │
│  - View routing                                          │
│  - Turn processing                                       │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Client Component Pattern

All interactive components require the 'use client' directive:

```typescript
// components/Header.tsx
"use client";

import React from "react";
import { Character, WorldContext } from "@/types";

interface HeaderProps {
  view: "landing" | "creation" | "game" | "profile" | "map" | "codex";
  setView: (view: any) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onOpenProfile: () => void;
  character?: Character;
  world?: WorldContext;
  onTrace?: () => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
  // Component implementation
};
```

### Supabase Client Interface

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}
```

### API Route Handler Interface

```typescript
// app/api/character/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Character endpoint - GET",
    status: "stub",
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: "Character endpoint - POST",
    status: "stub",
  });
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({
    message: "Character endpoint - PATCH",
    status: "stub",
  });
}
```

## Data Models

The existing data models from `types.ts` are preserved without modification:

- `Character` - Player character state
- `GameState` - Root state container
- `Turn` - Turn data with narration and diffs
- `TurnDiff` - Atomic state changes
- `WorldContext` - Current world state
- `Quest`, `NPC`, `Item`, `Spell` - Game entities

No database schema changes are required for this migration phase.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Client Component Directive Requirement

_For any_ React component that uses React hooks (useState, useEffect, useRef, etc.) or browser APIs (window, document, localStorage), the component file SHALL include the 'use client' directive at the top.

**Validates: Requirements 2.3**

### Property 2: Environment Variable Error Handling

_For any_ Supabase client instantiation where required environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or undefined, the client creation function SHALL throw an Error with a descriptive message indicating which variables are missing.

**Validates: Requirements 5.4**

### Property 3: API Route Success Response

_For any_ defined API route endpoint (/api/character, /api/world, /api/turn, /api/news) when called with a supported HTTP method, the route handler SHALL return a JSON response with HTTP status 200.

**Validates: Requirements 6.2**

### Property 4: API Route Method Not Allowed

_For any_ API route endpoint when called with an HTTP method not explicitly handled by the route, the Next.js framework SHALL return HTTP status 405 Method Not Allowed.

**Validates: Requirements 6.4**

## Error Handling

### Build-Time Errors

- TypeScript compilation errors are caught during `next build`
- ESLint errors are reported but don't block builds by default
- Missing imports cause build failures with clear error messages

### Runtime Errors

- Missing environment variables throw descriptive errors on first use
- React error boundaries can be added for component-level error handling
- API routes return appropriate HTTP status codes for errors

### Development Errors

- Next.js provides detailed error overlays in development mode
- Hot Module Replacement preserves state during code changes
- TypeScript errors are shown inline in the editor

## Testing Strategy

### Dual Testing Approach

Testing combines unit tests for specific examples and property-based tests for universal properties.

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **File Structure Tests**: Verify expected files exist in correct locations
2. **Configuration Tests**: Verify tsconfig.json, tailwind.config.ts contain required settings
3. **Build Tests**: Verify `next build` completes without errors
4. **Component Tests**: Verify components render without crashing

### Property-Based Tests

Property-based tests verify universal properties across generated inputs:

1. **Client Directive Property**: Generate component file paths, verify those with hooks have 'use client'
2. **Env Var Error Property**: Test Supabase client creation with various missing env var combinations
3. **API Response Property**: Test all API routes with supported methods return valid JSON
4. **Method Not Allowed Property**: Test API routes with unsupported methods return 405

### Testing Framework

- **Framework**: Vitest (compatible with existing Vite setup, works with Next.js)
- **Property Testing**: fast-check library for property-based testing
- **Minimum Iterations**: 100 per property test

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
});
```

### Test Annotations

Each property test must be annotated with:

- **Feature: nextjs-migration, Property {number}: {property_text}**
- Reference to the requirement it validates
