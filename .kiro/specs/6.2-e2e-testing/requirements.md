# 6.2 E2E Testing - Requirements

## Overview

Implement end-to-end testing with Playwright to validate the complete user journey through Waypoint, covering both the scripted demo experience and unexpected player behavior.

## Problem Statement

Waypoint has complex interactions that are difficult to unit test:
- SSE streaming narration
- Multi-agent LLM pipeline
- Supabase auth + RLS
- Real-time state updates across UI panels

E2E tests provide confidence that the full system works together before MVP launch.

## User Stories

### US-1: Demo Path Validation

As a developer, I want automated tests that follow the demo script, so that I can verify the core experience works after every change.

**Acceptance Criteria:**
- [ ] Test creates a new character (name, portrait generation)
- [ ] Test plays through 10+ turns following demo path
- [ ] Test verifies SSE streaming completes without errors
- [ ] Test validates state changes appear in UI panels (HP, gold, inventory)
- [ ] Test interacts with at least 2 NPCs
- [ ] Test completes at least 1 skill check

### US-2: Exploration/Edge Case Testing

As a developer, I want tests that simulate unexpected player behavior, so that I can ensure the system handles edge cases gracefully.

**Acceptance Criteria:**
- [ ] Test attempts to leave demo area (validates world boundaries or graceful handling)
- [ ] Test submits nonsensical input (validates safety filtering)
- [ ] Test submits very long input (validates input limits)
- [ ] Test rapid-fires multiple turns (validates rate limiting/queuing)
- [ ] Test attempts actions with insufficient resources (0 gold, 0 HP scenarios)

### US-3: CI Integration

As a developer, I want E2E tests to run automatically on PRs, so that regressions are caught before merge.

**Acceptance Criteria:**
- [ ] GitHub Actions workflow runs Playwright tests
- [ ] Tests run against preview deployment or local server
- [ ] Test results reported in PR checks
- [ ] Failed tests block merge

## Functional Requirements

### FR-1: Playwright Setup

- Install `@playwright/test` as dev dependency
- Configure for Next.js (webServer config)
- Target Chromium only for MVP (faster CI)
- Configure test timeout for SSE streaming (30s per turn)

### FR-2: Authentication Fixture

- Create test user in Supabase (or use service role bypass)
- Store auth state for reuse across tests
- Isolate test data per run (unique character names)
- Clean up test data after suite completion

### FR-3: Demo Path Test Suite

Tests follow the demo experience from `3.1-demo-experience`:

```
1. Navigate to landing page
2. Sign in (auth fixture)
3. Create character:
   - Enter name
   - Skip gender (optional)
   - Generate portrait (mock or real)
   - Confirm creation
4. Verify opening narration loads
5. Play demo turns:
   - Talk to Mira (NPC interaction)
   - Examine the Waystone (exploration)
   - Ask about rumors (quest hook)
   - Attempt a skill check action
   - Receive gold or item (state change)
6. Verify UI panels update:
   - Character panel shows correct HP/gold
   - World panel shows location
   - Turn history shows all turns
7. Verify SSE streaming:
   - Narration appears progressively
   - "Complete" event fires with diffs
```

### FR-4: Exploration Test Suite

Tests for unexpected behavior:

```
1. Off-script actions:
   - "I fly to the moon" (impossible action)
   - "I attack Mira" (hostile to friendly NPC)
   - "I leave and go to the forbidden forest" (outside demo area)
   
2. Edge cases:
   - Empty input submission
   - Input with only spaces
   - Very long input (1000+ characters)
   - Special characters / injection attempts
   - Rapid consecutive submissions
   
3. State edge cases:
   - Action requiring gold when at 0
   - Action after taking damage to 1 HP
   - Attempting to equip non-existent item
```

### FR-5: SSE Streaming Validation

- Wait for `event: narration` chunks
- Wait for `event: complete` with diffs
- Timeout after 30 seconds (configurable)
- Capture streaming errors

### FR-6: Test Utilities

- Page Object Model for main game UI
- Helper to submit turn and wait for completion
- Helper to extract current game state from UI
- Helper to verify diff application

## Non-Functional Requirements

### NFR-1: Performance

- Full demo path suite < 3 minutes
- Exploration suite < 2 minutes
- Total CI time < 5 minutes

### NFR-2: Reliability

- Tests must be deterministic (no flaky failures)
- Mock LLM responses for consistency OR use low-temp settings
- Retry failed assertions with reasonable timeout

### NFR-3: Maintainability

- Use data-testid attributes for selectors
- Avoid brittle CSS selectors
- Document test scenarios in comments

## Technical Approach

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000, // 60s per test (SSE can be slow)
  expect: { timeout: 10000 },
  fullyParallel: false, // Sequential for state consistency
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for MVP
  reporter: [['html'], ['github']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Auth Setup

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Option A: Use Supabase test user with magic link bypass
  // Option B: Use service role to create session directly
  
  await page.goto('/');
  // ... auth flow
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

### Page Object Model

```typescript
// e2e/pages/game.page.ts
export class GamePage {
  constructor(private page: Page) {}
  
  // Locators
  get turnInput() { return this.page.getByTestId('turn-input'); }
  get submitButton() { return this.page.getByTestId('submit-turn'); }
  get narrationPanel() { return this.page.getByTestId('narration-panel'); }
  get characterPanel() { return this.page.getByTestId('character-panel'); }
  
  // Actions
  async submitTurn(action: string) {
    await this.turnInput.fill(action);
    await this.submitButton.click();
    // Wait for SSE complete event
    await this.page.waitForSelector('[data-testid="turn-complete"]', { timeout: 30000 });
  }
  
  async getHP(): Promise<number> {
    const text = await this.characterPanel.getByTestId('hp-value').textContent();
    return parseInt(text || '0');
  }
}
```

### SSE Testing Strategy

Two approaches:

**Option A: Real SSE (slower, more realistic)**
```typescript
test('turn completes with streaming', async ({ page }) => {
  const gamePage = new GamePage(page);
  await gamePage.submitTurn('I look around');
  
  // Verify narration appeared
  await expect(gamePage.narrationPanel).toContainText(/crossroads|inn|waystone/i);
});
```

**Option B: Mock SSE (faster, deterministic)**
```typescript
test('turn completes with mocked response', async ({ page }) => {
  await page.route('**/api/turn', async route => {
    // Return mock SSE stream
    const body = `event: narration\ndata: {"chunk": "You look around..."}\n\nevent: complete\ndata: {"diffs": []}\n\n`;
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body,
    });
  });
  
  // ... test continues
});
```

**Recommendation**: Use real SSE for demo path (validates full stack), mock for exploration tests (faster, deterministic).

## File Structure

```
e2e/
├── .auth/
│   └── user.json          # Stored auth state
├── fixtures/
│   └── auth.fixture.ts    # Auth setup fixture
├── pages/
│   ├── game.page.ts       # Game UI page object
│   ├── character.page.ts  # Character creation page object
│   └── landing.page.ts    # Landing page object
├── tests/
│   ├── demo-path.spec.ts  # Demo experience tests
│   └── exploration.spec.ts # Edge case tests
└── utils/
    └── sse.helper.ts      # SSE waiting utilities
```

## CI Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Open Questions

1. **LLM in tests**: Use real Gemini (realistic but slow/costly) or mock responses (fast but less coverage)?
2. **Test database**: Use production Supabase with test user, or separate test project?
3. **Portrait generation**: Skip in tests (mock) or test real generation?

## Dependencies

- 3.1 Demo Experience (defines the happy path to test)
- 2.1 Authentication (auth flow to bypass/test)
- 2.4 Streaming Safety (SSE implementation to validate)
