# Requirements: Wire Character CRUD

## Overview

Connect the existing character API route stubs to Supabase, enabling real character persistence. This is the first step toward a playable game loop.

## User Story

As a player, I want my character to be saved to the database so that my progress persists between sessions.

## Functional Requirements

### 1. Character API - GET

- 1.1 GET /api/character shall fetch character data from waypoint_characters table
- 1.2 GET shall accept a user_id query parameter (temporary until auth)
- 1.3 GET shall return null if no character exists for the user
- 1.4 GET shall return the full character object matching the Character type

### 2. Character API - POST

- 2.1 POST /api/character shall create a new character in waypoint_characters
- 2.2 POST shall accept character data in request body
- 2.3 POST shall use a hardcoded test user_id until auth is implemented
- 2.4 POST shall return the created character with its generated ID
- 2.5 POST shall create a corresponding world_state record for the character

### 3. Character API - PATCH

- 3.1 PATCH /api/character shall update an existing character
- 3.2 PATCH shall accept partial character data in request body
- 3.3 PATCH shall update the updated_at timestamp
- 3.4 PATCH shall return the updated character

### 4. World State API

- 4.1 GET /api/world shall fetch world_state for a character
- 4.2 PATCH /api/world shall update world_state fields

### 5. Frontend Integration

- 5.1 App.tsx shall load character from API on mount (if exists)
- 5.2 CharacterCreation shall POST to API on completion
- 5.3 App.tsx shall show loading state while fetching character
- 5.4 App.tsx shall route to creation if no character exists

### 6. Error Handling

- 6.1 API routes shall return appropriate HTTP status codes
- 6.2 API routes shall return error messages in consistent format
- 6.3 Frontend shall display errors gracefully

## Non-Functional Requirements

- 7.1 Use Supabase server client for API routes
- 7.2 Use hardcoded TEST_USER_ID constant until auth implemented
- 7.3 Follow existing code patterns from lib/supabase/

## Out of Scope

- Authentication (deferred to 1.2)
- Multiple characters per user
- Character deletion
- Inventory/equipment CRUD (handled in turn processing)

## Test User Strategy

Until authentication is implemented:

```typescript
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
```

This allows testing the full flow without auth complexity. The test user must be created in Supabase auth.users table or RLS policies must allow this ID.
