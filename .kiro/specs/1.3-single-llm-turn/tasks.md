# Tasks: Single LLM Turn

## Overview

Implement turn processing with a single Gemini API call, enabling real AI-generated gameplay.

## Tasks

- [x] 1. Set up Gemini client

  - [x] 1.1 Install @google/generative-ai package

    - Run `npm install @google/generative-ai`
    - _Requirements: 2.1_

  - [x] 1.2 Create lib/gemini/client.ts

    - Initialize GoogleGenerativeAI with GEMINI_API_KEY
    - Create generateTurn function that calls gemini-2.0-flash
    - Configure JSON response format
    - Set temperature to 0.7
    - Add error handling with retry (1 retry)
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 1.3 Add GEMINI_API_KEY to .env.local.example
    - Add placeholder for API key
    - _Requirements: 8.2_

- [x] 2. Create prompt templates

  - [x] 2.1 Create lib/gemini/prompts.ts

    - Define SYSTEM_PROMPT constant with DM instructions
    - Define response format instructions
    - Define event type documentation
    - _Requirements: 3.5, 3.6_

  - [x] 2.2 Create buildTurnPrompt function
    - Accept character, world, recentTurns, playerAction
    - Format location context
    - Format character summary (HP, gold, equipment, inventory)
    - Format recent turns (last 3)
    - Include player action
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Create validation logic

  - [x] 3.1 Create lib/turn/validate.ts
    - Define ProposedEvent interface
    - Define ValidatedEvent interface
    - Create validateEvents function
    - Validate HP stays within 0 to maxHp
    - Validate gold doesn't go negative
    - Validate inventory items have name and type
    - Return only valid events
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Create state update logic

  - [x] 4.1 Create lib/turn/apply.ts
    - Create applyEvents function
    - Handle stat_change events
    - Handle inventory_add events
    - Handle inventory_remove events
    - Handle world_update events
    - Handle relationship_change events
    - Return character updates, world updates, and diffs
    - _Requirements: 4.1, 4.2_

- [x] 5. Implement /api/turn endpoint

  - [x] 5.1 Update app/api/turn/route.ts

    - Remove edge runtime (use Node for Supabase)
    - Parse characterId and playerAction from request body
    - Load character from waypoint_characters
    - Load world from waypoint_world_state
    - Load last 3 turns from waypoint_turns
    - _Requirements: 1.1_

  - [x] 5.2 Add Gemini call to turn endpoint

    - Build prompt with buildTurnPrompt
    - Call generateTurn
    - Parse response (handle errors)
    - _Requirements: 1.2, 1.3, 4.3, 4.4_

  - [x] 5.3 Add validation and state updates

    - Validate proposed_events
    - Apply valid events to get updates
    - _Requirements: 1.4_

  - [x] 5.4 Add database persistence

    - Insert turn record to waypoint_turns
    - Update waypoint_characters with changes
    - Update waypoint_world_state if needed
    - _Requirements: 1.5, 1.6, 6.1, 6.2, 6.3_

  - [x] 5.5 Return response
    - Return turn data (id, narration, diffs, suggestedActions)
    - Return updated character fields
    - Return updated world fields
    - _Requirements: 1.7_

- [x] 6. Checkpoint - Test API manually

  - Test POST /api/turn with valid character
  - Verify Gemini returns narration
  - Verify turn is saved to database
  - Verify character state updates
  - _Ensure all tests pass, ask the user if questions arise_

- [x] 7. Integrate with frontend

  - [x] 7.1 Update App.tsx processTurn function

    - Replace mock logic with fetch to /api/turn
    - Send characterId and playerAction
    - Handle response
    - _Requirements: 7.1_

  - [x] 7.2 Update state from response

    - Add returned turn to turns array
    - Merge updatedCharacter into gameState.character
    - Merge updatedWorld into gameState.world
    - Update diffLog with new diffs
    - _Requirements: 7.3_

  - [x] 7.3 Handle loading and errors

    - Keep existing turnStatus states
    - Show error on API failure
    - Enable retry
    - _Requirements: 7.4_

  - [x] 7.4 Remove mock delay and random logic
    - Remove setTimeout simulation
    - Remove random skill check generation
    - Remove hardcoded narration
    - _Requirements: 7.1_

- [x] 8. Add character ID to state

  - [x] 8.1 Update Character type to include id

    - Add id: string to Character interface in types.ts
    - Update transforms to include id
    - _Requirements: 1.1_

  - [x] 8.2 Ensure character ID flows through app
    - CharacterCreation receives ID from API
    - App.tsx stores ID in gameState
    - processTurn sends ID to API
    - _Requirements: 7.1_

- [ ] 9. Final checkpoint

  - Create character → play 5 turns
  - Verify each turn generates unique narration
  - Verify state changes persist (check database)
  - Refresh page → turns and state load correctly
  - Test error handling (disconnect network, retry)
  - _Ensure all tests pass, ask the user if questions arise_

## Notes

- No streaming in this spec — full response returned at once
- No skill checks — LLM decides outcomes narratively
- No safety filtering — added in spec 2.4
- Temperature 0.7 balances creativity and consistency
- Fallback narration if Gemini fails ensures game doesn't break
