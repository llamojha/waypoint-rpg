# Design Document: Authentication

## Overview

This design implements authentication for Waypoint RPG using Supabase Auth with Magic Link (email) and OAuth providers (Google, Discord). The system follows Next.js App Router patterns with server-side session management, middleware-based route protection, and Row Level Security (RLS) policies for database access control.

## Architecture

```mermaid
flowchart TB
    subgraph Client
        LP[Landing Page]
        AM[Auth Modal]
        GV[Game Views]
    end

    subgraph Middleware
        MW[Next.js Middleware]
    end

    subgraph API
        CB[/api/auth/callback]
        PR[Protected API Routes]
    end

    subgraph Supabase
        SA[Supabase Auth]
        DB[(Database + RLS)]
    end

    LP --> AM
    AM -->|Magic Link| SA
    AM -->|OAuth| SA
    SA -->|Redirect| CB
    CB -->|Set Cookies| MW
    MW -->|Validate Session| SA
    MW -->|Allow/Redirect| GV
    GV --> PR
    PR -->|With User Context| DB
```

## Components and Interfaces

### 1. Auth Context Provider

A React context that provides authentication state throughout the application.

```typescript
// lib/auth/auth-context.tsx
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: "google" | "discord") => Promise<void>;
  signOut: () => Promise<void>;
}
```

### 2. Auth Modal Component

A modal component for sign-in that supports both Magic Link and OAuth.

```typescript
// components/AuthModal.tsx
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}
```

### 3. Middleware

Next.js middleware that validates sessions and protects routes.

```typescript
// middleware.ts
// Runs on every request to protected routes
// Refreshes session tokens automatically
// Redirects unauthenticated users to sign-in
```

### 4. Auth Callback Route

Handles OAuth redirects and Magic Link confirmations.

```typescript
// app/api/auth/callback/route.ts
// Exchanges auth code for session
// Sets secure cookies
// Redirects to appropriate page
```

### 5. Supabase Client Utilities

Server and client-side Supabase client factories (already exist in lib/supabase/).

## Data Models

### User Session (from Supabase)

```typescript
interface User {
  id: string; // UUID from Supabase Auth
  email?: string;
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
    provider?: string;
  };
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}
```

### Auth State

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Email Validation

_For any_ string input to the email sign-in form, if the string does not match a valid email format (containing @ and a domain), the sign-in request SHALL be rejected and an error message displayed.

**Validates: Requirements 1.3**

### Property 2: Session Restoration

_For any_ page load where valid session cookies exist, the Auth_System SHALL restore the user session and provide the authenticated user context to the application.

**Validates: Requirements 3.2**

### Property 3: Sign Out Clears Session

_For any_ authenticated user who triggers sign out, the resulting state SHALL have no user session, no auth cookies, and the user SHALL be redirected to the landing page.

**Validates: Requirements 3.4**

### Property 4: Protected Route Access Control

_For any_ protected route and any request, access SHALL be granted if and only if the request contains a valid authenticated session. Unauthenticated requests SHALL be redirected to the sign-in page.

**Validates: Requirements 4.1, 4.2**

### Property 5: User-Scoped RLS

_For any_ authenticated user and any database operation (SELECT, INSERT, UPDATE) on user-scoped tables (waypoint_characters, waypoint_turns, waypoint_world_state, waypoint_character_npcs, waypoint_character_quests, waypoint_character_locations), the operation SHALL succeed only when the record's user_id or character's user_id matches the authenticated user's auth.uid().

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: Shared Table Access Control

_For any_ authenticated user, SELECT operations on shared tables (waypoint_npcs, waypoint_quests, waypoint_codex_entries, waypoint_locations, waypoint_world_news) SHALL succeed, while INSERT, UPDATE, and DELETE operations SHALL be denied.

**Validates: Requirements 5.5, 5.6**

### Property 7: Authenticated User Display

_For any_ authenticated user viewing the application header, the header SHALL display the user's email or display name, not the "Sign In" button.

**Validates: Requirements 6.4**

### Property 8: Callback Error Handling

_For any_ auth callback request containing an error parameter, the Auth_System SHALL redirect to the landing page with an error message displayed to the user.

**Validates: Requirements 7.3**

### Property 9: Error Message Security

_For any_ error displayed to users during authentication, the error message SHALL NOT contain sensitive information such as internal error codes, stack traces, or user data from other accounts.

**Validates: Requirements 7.5**

## Error Handling

### Authentication Errors

| Error Type           | User Message                                       | Action              |
| -------------------- | -------------------------------------------------- | ------------------- |
| Invalid email format | "Please enter a valid email address"               | Prevent submission  |
| Magic Link expired   | "This link has expired. Please request a new one." | Show sign-in form   |
| OAuth denied         | "Sign-in was cancelled. Please try again."         | Show sign-in form   |
| Network error        | "Unable to connect. Please check your connection." | Show retry button   |
| Session expired      | "Your session has expired. Please sign in again."  | Redirect to sign-in |

### RLS Errors

| Error Type          | Handling                                            |
| ------------------- | --------------------------------------------------- |
| Unauthorized SELECT | Return empty result set                             |
| Unauthorized INSERT | Return PostgreSQL error, display "Unable to save"   |
| Unauthorized UPDATE | Return PostgreSQL error, display "Unable to update" |

## Testing Strategy

### Unit Tests

- Email validation function with valid/invalid inputs
- Auth context state transitions
- Protected route list configuration
- Error message sanitization

### Property-Based Tests

Property-based tests will use a testing library (e.g., fast-check for TypeScript) to verify universal properties:

1. **Email Validation Property**: Generate random strings and verify only valid email formats pass validation
2. **Session State Property**: Generate auth state transitions and verify consistency
3. **Protected Route Property**: Generate route/auth combinations and verify access control
4. **RLS Policy Property**: Generate user/record combinations and verify access patterns

Each property test will run minimum 100 iterations.

### Integration Tests

- Magic Link flow (mocked email)
- OAuth flow (mocked provider)
- Session persistence across page loads
- Middleware redirect behavior
- RLS policy enforcement via Supabase client

### Test Configuration

```typescript
// Property test annotation format
// Feature: authentication, Property 1: Email validation
// Validates: Requirements 1.3
```
