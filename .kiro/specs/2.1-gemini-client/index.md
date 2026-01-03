# Spec: Gemini Client

## Status: 📋 TODO

## Overview

Refactor and enhance the Gemini client created in 1.6 for better reusability, retry logic, and configuration.

## Estimate

3-4 hours

## Dependencies

- 1.6 single-llm-turn

## Outputs

- Reusable Gemini client with retry logic
- Token counting utilities
- Prompt template system
- Temperature configuration per call type

## Key Files

- `lib/gemini/client.ts` (enhanced)
- `lib/gemini/prompts.ts` (enhanced)
- `lib/gemini/tokens.ts` (new)

## Acceptance Criteria

- [ ] Retry logic handles transient failures
- [ ] Token counting available for context management
- [ ] Different temperatures configurable per use case
