# 6.2 E2E Testing with Playwright

## Overview

End-to-end testing suite using Playwright to validate critical user flows and ensure regression protection before MVP launch.

## Scope

Two test suites:
1. **Demo Path Tests** — Follow the scripted demo experience (happy path)
2. **Exploration Tests** — Test unexpected player behavior and edge cases

## Estimate

6-10 hours

## Dependencies

- Phase 3 complete (demo experience working)
- Supabase auth configured
- SSE streaming functional

## Key Deliverables

- Playwright configuration for Next.js
- Auth bypass fixture for test isolation
- Demo path test suite (character creation → 10+ turns)
- Exploration test suite (off-script behavior)
- CI integration (GitHub Actions)

## Success Criteria

- [ ] Demo path tests pass consistently
- [ ] Exploration tests validate graceful handling of unexpected inputs
- [ ] Tests run in CI on every PR
- [ ] Test execution < 5 minutes
