# Spec 8.6: Community Goals

## Status: 📋 NOT STARTED

## Overview

Shared objectives with collective progress tracking. All players contribute to the same goals.

## Roadmap Reference

See `docs/v1-roadmap.md` — Phase 8

## Estimate

125-175 credits

## Dependencies

- MVP Complete (Phase 6)
- Individual quests feature-flagged

## Scope Summary

**Shared Objectives**
- Global goals all players contribute to
- Progress tracked server-side, aggregated across all players
- Examples: "Defeat 1000 goblins", "Discover all Northern Wastes locations"

**Progress Tracking**
- Simple counters (no complex state)
- Real-time or near-real-time updates
- Progress bar UI showing community contribution

**Rewards**
- Community-wide rewards when goals complete
- Individual contribution tracking (optional)
- New goals rotate in when completed

**Feature Flags**
- `FEATURE_INDIVIDUAL_QUESTS=false` (hide quest UI)
- `FEATURE_COMMUNITY_GOALS=true` (enable this system)

## Deliverables

- [ ] Community goals table in database
- [ ] Progress aggregation across all players
- [ ] Community goals UI panel
- [ ] Progress bar with real-time updates
- [ ] Reward distribution on completion
- [ ] 5+ community goals at launch
- [ ] Feature flags for quest system toggle

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
- [ ] Update: Reflect changes in steering docs if needed
- [ ] Update: Update roadmap status
