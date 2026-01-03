# Tasks: Wire Character CRUD

## Overview

Connect character and world API routes to Supabase, enabling real data persistence.

## Tasks

- [x] 1. Set up type transformations

  - [x] 1.1 Create lib/supabase/transforms.ts

    - Add dbToCharacter function (database row → Character type)
    - Add characterToDb function (Character → database insert)
    - Add dbToWorld function (database row → WorldContext type)
    - Add worldToDb function (WorldContext → database insert)
    - _Requirements: 1.4, 4.1_

  - [x] 1.2 Add TEST_USER_ID constant
    - Add to constants.ts: `export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001"`
    - _Requirements: 7.2_

- [x] 2. Implement Character API routes

  - [x] 2.1 Implement GET /api/character

    - Import createClient from lib/supabase/server
    - Parse user_id from query params
    - Query waypoint_characters where user_id matches
    - Transform result with dbToCharacter
    - Return { character: Character | null }
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Implement POST /api/character

    - Parse character data from request body
    - Use TEST_USER_ID for user_id
    - Insert into waypoint_characters with defaults
    - Create waypoint_world_state record for character
    - Return { character, world }
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Implement PATCH /api/character
    - Parse character id and updates from body
    - Update waypoint_characters record
    - Set updated_at to now()
    - Return updated character
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Implement World API routes

  - [x] 3.1 Implement GET /api/world

    - Parse character_id from query params
    - Query waypoint_world_state where character_id matches
    - Transform result with dbToWorld
    - Return { world: WorldContext | null }
    - _Requirements: 4.1_

  - [x] 3.2 Implement PATCH /api/world
    - Parse character_id and updates from body
    - Update waypoint_world_state record
    - Return updated world
    - _Requirements: 4.2_

- [x] 4. Checkpoint - Test API routes manually

  - Test GET /api/character returns null for new user
  - Test POST /api/character creates character
  - Test GET /api/character returns created character
  - Test PATCH /api/character updates fields
  - Test GET /api/world returns world state
  - _Ensure all tests pass, ask the user if questions arise_

- [x] 5. Integrate with frontend

  - [x] 5.1 Add loading state to App.tsx

    - Add isLoading state (default true)
    - Add error state
    - Show loading spinner while fetching
    - _Requirements: 5.3_

  - [x] 5.2 Load character on mount

    - Add useEffect to fetch character on mount
    - Call GET /api/character with TEST_USER_ID
    - If character exists: load into gameState, set view to 'game'
    - If no character: set view to 'creation'
    - Handle errors gracefully
    - _Requirements: 5.1, 5.4_

  - [x] 5.3 Update CharacterCreation to call API

    - Modify handleCharacterComplete to POST to /api/character
    - Load returned character and world into gameState
    - Transition to game view
    - _Requirements: 5.2_

  - [x] 5.4 Also load world state
    - After loading character, fetch world state
    - Load into gameState.world
    - _Requirements: 5.1_

- [x] 6. Add error handling

  - [x] 6.1 Add consistent error responses to API routes

    - Return { error: string, code?: string } on errors
    - Use appropriate HTTP status codes (400, 404, 500)
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Add error display to frontend
    - Show error message if character load fails
    - Add retry button
    - _Requirements: 6.3_

- [x] 7. Final checkpoint

  - Create new character through UI → saved to Supabase
  - Refresh page → character loads from database
  - Character data matches what was entered
  - World state loads correctly
  - _Ensure all tests pass, ask the user if questions arise_

## Notes

- Using service role key (SUPABASE_SERVICE_KEY) to bypass RLS for now
- TEST_USER_ID is temporary until auth is implemented in spec 1.2
- Keep mock data in constants.ts as fallback reference
