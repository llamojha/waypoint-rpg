# Spec 1.2: Authentication

## Status: 📋 NOT STARTED

## Overview

Implement auth flow with Supabase Auth (Magic Link + OAuth).

## Roadmap Reference

See #[[file:.kiro/steering/mvp-roadmap.md]] — Phase 1

## Estimate

4-6 hours

## Dependencies

- 0.1 nextjs-migration (complete)
- 1.1 supabase-setup (can parallel)

## Scope Summary

- Configure Magic Link + OAuth providers in Supabase
- Implement sign in/out flow in Next.js
- Set up RLS policies for all tables
- Handle session management
- Create protected route middleware

## Deliverables

- [ ] Magic Link auth working
- [ ] OAuth providers configured
- [ ] RLS policies applied
- [ ] Session persists across refreshes
- [ ] Protected routes redirect to login

---

## Spec Documents

> Created when spec is started

- [ ] requirements.md
- [ ] design.md
- [ ] tasks.md

---

## Post-Implementation Review

> Completed after spec is done

- [ ] Review: Did implementation match design?
- [ ] Review: Any pivots or changes made?
- [ ] Update: Reflect changes in steering docs (especially backend-infrastructure.md)
- [ ] Update: Update roadmap status
