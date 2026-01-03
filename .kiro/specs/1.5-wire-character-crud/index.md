# Spec: Wire Character CRUD

## Status: 📋 TODO

## Overview

Connect the existing character API route stubs to Supabase, enabling real character persistence. First step toward a playable game loop.

## Estimate

3-4 hours

## Dependencies

- 1.1 supabase-setup ✅

## Outputs

- Character CRUD API connected to Supabase
- World state API connected to Supabase
- Frontend loads/saves real data
- Test user strategy for pre-auth development

## Key Files

- `app/api/character/route.ts`
- `app/api/world/route.ts`
- `lib/supabase/transforms.ts`
- `App.tsx`
- `constants.ts`

## Acceptance Criteria

- [ ] Create character through UI → saved to Supabase
- [ ] Refresh page → character loads from database
- [ ] Character data matches what was entered
- [ ] World state loads correctly
