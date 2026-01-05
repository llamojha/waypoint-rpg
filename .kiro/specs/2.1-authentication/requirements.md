# Requirements Document

##tion

This document defines the requirements for implementing authentication in Waypoint RPG using Supabase Auth. The authentication system will enable users to sign in via Magic Link (email) or OAuth providers (Google, Discord), manage sessions, and protect game routes so only authenticated users can access their characters and game data.

## Glossary

- **Auth_System**: The Supabase Auth service that handles user authentication, session management, and token refresh
- **Magic_Link**: A passwordless authentication method where users receive a sign-in link via email
- **OAuth_Provider**: Third-party authentication services (Google, Discord) that allow users to sign in with existing accounts
- **Session**: A JWT-based authentication state that persists user identity across requests
- **RLS_Policy**: Row Level Security policy in Supabase that restricts database access based on authenticated user identity
- **Protected_Route**: A page or API endpoint that requires authentication to access
- **Auth_Callback**: The endpoint that handles OAuth redirects and Magic Link confirmations
- **User**: An authenticated individual with a unique Supabase user ID

## Requirements

### Requirement 1: Magic Link Authentication

**User Story:** As a new user, I want to sign in with my email address without creating a password, so that I can quickly start playing without remembering credentials.

#### Acceptance Criteria

1. WHEN a user enters a valid email address and clicks "Sign In", THE Auth_System SHALL send a Magic Link to that email address
2. WHEN a user clicks the Magic Link in their email, THE Auth_System SHALL authenticate the user and redirect them to the application
3. IF the email address format is invalid, THEN THE Auth_System SHALL display an error message and prevent the sign-in attempt
4. IF the Magic Link has expired (after 1 hour), THEN THE Auth_System SHALL display an error message and prompt the user to request a new link
5. WHEN a Magic Link is successfully used, THE Auth_System SHALL invalidate that link to prevent reuse

### Requirement 2: OAuth Provider Authentication

**User Story:** As a user, I want to sign in with my Google or Discord account, so that I can use my existing credentials without managing another login.

#### Acceptance Criteria

1. WHEN a user clicks "Sign in with Google", THE Auth_System SHALL redirect to Google's OAuth consent screen
2. WHEN a user clicks "Sign in with Discord", THE Auth_System SHALL redirect to Discord's OAuth consent screen
3. WHEN the OAuth provider returns a successful authorization, THE Auth_System SHALL create or link the user account and establish a session
4. IF the OAuth authorization is denied or fails, THEN THE Auth_System SHALL redirect to the sign-in page with an error message
5. WHEN a user signs in via OAuth for the first time, THE Auth_System SHALL create a new user record in Supabase

### Requirement 3: Session Management

**User Story:** As an authenticated user, I want my session to persist across page refreshes and browser restarts, so that I don't have to sign in repeatedly.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE Auth_System SHALL store the session token in secure HTTP-only cookies
2. WHEN a page loads, THE Auth_System SHALL automatically restore the session from stored cookies
3. WHEN a session token is near expiration, THE Auth_System SHALL automatically refresh the token without user intervention
4. WHEN a user clicks "Sign Out", THE Auth_System SHALL clear all session data and redirect to the landing page
5. IF a session token is invalid or expired and cannot be refreshed, THEN THE Auth_System SHALL redirect the user to the sign-in page

### Requirement 4: Protected Routes

**User Story:** As a game developer, I want to protect game routes from unauthenticated access, so that only signed-in users can access their characters and game data.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access a protected route, THE Auth_System SHALL redirect them to the sign-in page
2. WHEN an authenticated user accesses a protected route, THE Auth_System SHALL allow access and provide the user context
3. THE Auth_System SHALL protect all API routes under /api/character, /api/turn, /api/world, and /api/quests
4. THE Auth_System SHALL protect the game view, profile view, map view, and codex view
5. WHEN a user is redirected to sign-in from a protected route, THE Auth_System SHALL return them to the original route after successful authentication

### Requirement 5: Row Level Security Policies

**User Story:** As a game developer, I want database access restricted by user identity, so that users can only read and modify their own character data.

#### Acceptance Criteria

1. THE RLS_Policy SHALL allow users to SELECT only their own records from waypoint_characters
2. THE RLS_Policy SHALL allow users to INSERT records into waypoint_characters only with their own user_id
3. THE RLS_Policy SHALL allow users to UPDATE only their own records in waypoint_characters
4. THE RLS_Policy SHALL allow users to SELECT only their own records from waypoint_turns, waypoint_world_state, waypoint_character_npcs, waypoint_character_quests, and waypoint_character_locations
5. THE RLS_Policy SHALL allow all authenticated users to SELECT from shared tables: waypoint_npcs, waypoint_quests, waypoint_codex_entries, waypoint_locations, and waypoint_world_news
6. THE RLS_Policy SHALL prevent users from modifying shared/global tables directly

### Requirement 6: Authentication UI Components

**User Story:** As a user, I want a clear and intuitive sign-in interface, so that I can easily authenticate and start playing.

#### Acceptance Criteria

1. WHEN the landing page loads, THE Auth_System SHALL display a "Sign In" button in the header
2. WHEN a user clicks "Sign In", THE Auth_System SHALL display a modal or page with email input and OAuth provider buttons
3. WHILE a sign-in request is processing, THE Auth_System SHALL display a loading indicator
4. WHEN authentication succeeds, THE Auth_System SHALL display the user's email or name in the header
5. WHEN a user is authenticated, THE Auth_System SHALL replace the "Sign In" button with a user menu containing "Profile" and "Sign Out" options

### Requirement 7: Auth Callback Handling

**User Story:** As a user completing OAuth or Magic Link authentication, I want to be seamlessly redirected back to the application, so that my sign-in experience is smooth.

#### Acceptance Criteria

1. WHEN the OAuth callback is received at /api/auth/callback, THE Auth_System SHALL exchange the authorization code for a session
2. WHEN the Magic Link callback is received, THE Auth_System SHALL verify the token and establish a session
3. IF the callback contains an error parameter, THEN THE Auth_System SHALL redirect to the sign-in page with the error displayed
4. WHEN the callback succeeds, THE Auth_System SHALL redirect to the appropriate page (game if character exists, creation if not)
5. THE Auth_System SHALL handle callback errors gracefully without exposing sensitive information
