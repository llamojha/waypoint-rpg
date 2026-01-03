# Implementation Plan: Authentication

## Overview

This implementation plan follows anremental approach, building authentication from the foundation (middleware and callbacks) up to the UI components. Each task builds on previous work, with property tests validating core behaviors.

## Tasks

- [x] 1. Set up auth callback route and middleware

  - [x] 1.1 Create auth callback route handler
    - Create `app/api/auth/callback/route.ts`
    - Handle OAuth code exchange via Supabase
    - Handle Magic Link token verification
    - Redirect to game or character creation based on character existence
    - Handle error parameters and redirect with error message
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 1.2 Create Next.js middleware for session management
    - Create `middleware.ts` at project root
    - Configure Supabase server client for middleware
    - Refresh session tokens on each request
    - Define protected route patterns
    - Redirect unauthenticated users from protected routes
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 4.4_
  - [ ]\* 1.3 Write property test for protected route access control
    - **Property 4: Protected Route Access Control**
    - Test that protected routes redirect unauthenticated requests
    - Test that protected routes allow authenticated requests
    - **Validates: Requirements 4.1, 4.2**

- [x] 2. Implement auth context and hooks

  - [x] 2.1 Create auth context provider
    - Create `lib/auth/auth-context.tsx`
    - Implement `AuthContextValue` interface
    - Track user state and loading state
    - Subscribe to Supabase auth state changes
    - Provide signInWithEmail, signInWithOAuth, signOut methods
    - _Requirements: 3.1, 3.2, 3.4_
  - [x] 2.2 Create useAuth hook
    - Create `lib/auth/use-auth.ts`
    - Export typed hook for consuming auth context
    - _Requirements: 3.2_
  - [x] 2.3 Create email validation utility
    - Create `lib/auth/validation.ts`
    - Implement email format validation
    - Return error messages for invalid inputs
    - _Requirements: 1.3_
  - [ ]\* 2.4 Write property test for email validation
    - **Property 1: Email Validation**
    - Generate random strings and verify validation behavior
    - Test valid email formats pass, invalid formats fail
    - **Validates: Requirements 1.3**
  - [ ]\* 2.5 Write property test for session restoration
    - **Property 2: Session Restoration**
    - Test that valid session cookies restore user state
    - **Validates: Requirements 3.2**

- [x] 3. Checkpoint - Ensure auth foundation works

  - Ensure middleware and callback routes function correctly
  - Ensure auth context provides user state
  - Ask the user if questions arise

- [x] 4. Implement auth UI components

  - [x] 4.1 Create AuthModal component
    - Create `components/AuthModal.tsx`
    - Implement email input with validation
    - Add Google OAuth button
    - Add Discord OAuth button
    - Show loading state during sign-in
    - Display error messages
    - _Requirements: 6.2, 6.3, 1.1, 1.3, 2.1, 2.2_
  - [x] 4.2 Update Header component with auth state
    - Modify `components/Header.tsx`
    - Show "Sign In" button when unauthenticated
    - Show user menu (email/name, Profile, Sign Out) when authenticated
    - Wire up sign out functionality
    - _Requirements: 6.1, 6.4, 6.5_
  - [ ]\* 4.3 Write property test for authenticated user display
    - **Property 7: Authenticated User Display**
    - Test that authenticated users see their identifier in header
    - **Validates: Requirements 6.4**

- [x] 5. Integrate auth into App component

  - [x] 5.1 Wrap App with AuthProvider
    - Update `app/layout.tsx` to include AuthProvider
    - Ensure auth state is available throughout app
    - _Requirements: 3.2_
  - [x] 5.2 Update App.tsx to use auth state
    - Modify `App.tsx` to check authentication
    - Redirect to landing if not authenticated on protected views
    - Pass user context to child components
    - _Requirements: 4.4, 4.5_
  - [x] 5.3 Update LandingPage with auth modal
    - Add AuthModal to LandingPage
    - Wire "Start Your Saga" button to show auth modal if not authenticated
    - _Requirements: 6.1, 6.2_

- [x] 6. Checkpoint - Ensure UI auth flow works

  - Test sign-in modal appears and functions
  - Test header shows correct auth state
  - Test protected views require authentication
  - Ask the user if questions arise

- [x] 7. Implement Row Level Security policies

  - [x] 7.1 Create RLS policies for user-scoped tables
    - Create SQL migration for waypoint_characters RLS
    - Create SQL migration for waypoint_turns RLS
    - Create SQL migration for waypoint_world_state RLS
    - Create SQL migration for waypoint_character_npcs RLS
    - Create SQL migration for waypoint_character_quests RLS
    - Create SQL migration for waypoint_character_locations RLS
    - Enable RLS on all tables
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 7.2 Create RLS policies for shared tables
    - Create SQL migration for waypoint_npcs RLS (SELECT only)
    - Create SQL migration for waypoint_quests RLS (SELECT only)
    - Create SQL migration for waypoint_codex_entries RLS (SELECT only)
    - Create SQL migration for waypoint_locations RLS (SELECT only)
    - Create SQL migration for waypoint_world_news RLS (SELECT only)
    - _Requirements: 5.5, 5.6_
  - [ ]\* 7.3 Write property test for user-scoped RLS
    - **Property 5: User-Scoped RLS**
    - Test that users can only access their own records
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [ ]\* 7.4 Write property test for shared table access
    - **Property 6: Shared Table Access Control**
    - Test that authenticated users can read shared tables
    - Test that users cannot modify shared tables
    - **Validates: Requirements 5.5, 5.6**

- [x] 8. Implement error handling and security

  - [x] 8.1 Create error message sanitization utility
    - Create `lib/auth/error-utils.ts`
    - Map internal errors to user-friendly messages
    - Ensure no sensitive data in error messages
    - _Requirements: 7.5_
  - [ ]\* 8.2 Write property test for callback error handling
    - **Property 8: Callback Error Handling**
    - Test that error parameters trigger redirect with message
    - **Validates: Requirements 7.3**
  - [ ]\* 8.3 Write property test for error message security
    - **Property 9: Error Message Security**
    - Test that error messages don't contain sensitive data
    - **Validates: Requirements 7.5**

- [x] 9. Final checkpoint - Full auth flow verification
  - Test complete Magic Link flow
  - Test complete OAuth flow (Google, Discord)
  - Test session persistence across page refreshes
  - Test sign out clears session
  - Test RLS policies enforce access control
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- RLS policies are applied via SQL migrations in Supabase dashboard or CLI
