# V1 Roadmap

## Overview

This roadmap extends the MVP (Phases 0-6) to deliver a production-ready V1 with enhanced user experience, content richness, and shared world features.

**Target**: Full V1 launch with polished UX, populated world, and community features.

## Current Status

**MVP (Phases 0-6)**: ✅ COMPLETE
**V1 (Phases 7-9)**: 🚧 IN PROGRESS ← YOU ARE HERE

Completed V1 specs:
- 7.1 `mobile-responsive` ✅
- 7.2 `error-recovery` ✅
- 8.1 `content-seeding` ✅
- 8.2 `world-events` ✅

**Phase 7**: ✅ COMPLETE
**Phase 8**: ✅ COMPLETE

## V1 Extensions (Phases 7-9)

### Phase 7: User Experience & Polish ✅ COMPLETE

| ID  | Spec Name                  | Priority | Status     | Details |
| --- | -------------------------- | -------- | ---------- | ------- |
| 7.1 | `mobile-responsive`        | High     | ✅ DONE    | Touch-friendly UI, responsive design |
| 7.2 | `error-recovery`           | High     | ✅ DONE    | Error boundary, turn error UI with support contact |

### Phase 8: Content & World ✅ COMPLETE

| ID  | Spec Name                | Priority | Status     | Details |
| --- | ------------------------ | -------- | ---------- | ------- |
| 8.1 | `content-seeding`        | High     | ✅ DONE    | NPCs, locations, location art, landing page |
| 8.2 | `world-events`           | Medium   | ✅ DONE    | Scheduled atmosphere changes, time progression |

### Phase 9: Features & Production Readiness

Specs ordered by functionality and dependencies:

| ID  | Spec Name              | Priority | Estimate | Details | Dependencies |
| --- | ---------------------- | -------- | -------- | ------- | ------------ |
| 9.1 | `security-review`      | High     | 75-100   | Auth checks, RLS policies, input sanitization | None (do first) |
| 9.2 | `rate-limiting`        | High     | 50-75    | Per-user turn limits, API rate limiting | 9.1 |
| 9.3 | `achievement-system`   | High     | 125-175  | Unlock rewards for milestones, skill achievements | None |
| 9.4 | `interactive-map`      | Medium   | 150-200  | Visual map with POI markers, travel UI | None |
| 9.5 | `social-features`      | Low      | 100-150  | Leaderboards, discovery feed, player profiles | 9.3 (achievements) |
| 9.6 | `posthog-integration`  | Medium   | 50-75    | Event tracking: turns, skills, achievements | 9.3 (achievements) |

**Phase 9 Total**: 550-775 credits

### Phase 10: Accessibility & Polish

| ID   | Spec Name                  | Priority | Estimate | Details |
| ---- | -------------------------- | -------- | -------- | ------- |
| 10.1 | `accessibility-basics`     | Medium   | 100-150  | Screen readers, keyboard navigation, WCAG compliance |
| 10.2 | `character-customization`  | Low      | 100-150  | More portraits, cosmetic equipment, backgrounds |
| 10.3 | `community-goals`          | Medium   | 125-175  | Shared objectives, collective progress, community rewards |
| 10.4 | `performance-optimization` | Low      | 75-100   | Parallel DB queries, LLM streaming, client caching |

**Phase 10 Total**: 400-575 credits

## V1 Total Estimate

**Remaining V1 Work**: 950-1,350 credits

---

## Spec Details

### Phase 7: User Experience & Polish ✅ COMPLETE

#### 7.1 `mobile-responsive` ✅
- Touch-friendly UI controls
- Responsive layout for all screen sizes
- Mobile-optimized input handling
- Swipe gestures for panel navigation

#### 7.2 `error-recovery` ✅
- Graceful handling of failed turns
- Network disconnection recovery
- Retry mechanisms with user feedback
- State recovery after errors

### Phase 8: Content & World ✅ COMPLETE

#### 8.1 `content-seeding` ✅
**NPCs (50-100 characters)**
- Merchants, guards, flavor NPCs across all locations
- Rich personalities with rumors/leads
- Dialogue hints, relationship starting points

**Locations (Complete world)**
- All POIs with descriptions, connections, atmosphere
- Art/images for major locations (Supabase Storage)
- Discovery prerequisites and travel connections

**Codex Entries (Lore foundation)**
- World history, factions, notable events
- Item descriptions and origins
- Location backstories and legends

#### 8.2 `world-events` ✅
- Scheduled weather changes affecting all players
- Personal time progression system
- Event notifications in World News
- Dynamic atmosphere based on world state

### Phase 9: Features & Production Readiness

#### 9.1 `security-review` (DO FIRST)
- Add auth checks to all API endpoints (turn, character, world, etc.)
- Verify user owns character before allowing mutations
- Review RLS policies on all Supabase tables
- Audit `createAdminClient` usage (should be minimal)
- Input sanitization review

#### 9.2 `rate-limiting` (depends on 9.1)
- Per-user turn limits (daily/hourly)
- API rate limiting on all endpoints
- Graceful degradation messaging
- Admin override capabilities

#### 9.3 `achievement-system`
- Skill-based achievements (reach level X in skill)
- Exploration achievements (discover locations)
- Combat achievements (defeat enemy types)
- Social achievements (NPC relationships)
- Achievement notifications and rewards
- Achievement display in character panel

#### 9.4 `interactive-map`
- **Component**: Use `react-svg-map` for custom fantasy map support
- Visual SVG map showing full world/region artwork
- POI markers appear once discovered in adventure
- Click discovered POI to see details, travel option
- Current location indicator with pulse animation
- Undiscovered POIs hidden (terrain still visible)
- Region boundaries and labels
- Travel time display between locations
- **Implementation**: Custom SVG map file + react-svg-map wrapper
- **Fallback**: Current list view if SVG assets fail to load

#### 9.5 `social-features` (depends on 9.3)
**Leaderboards**
- Top players by individual skills
- Overall level rankings
- Achievement counts

**Discovery Feed**
- "Player [Name] discovered the Hidden Grove"
- "Player [Name] reached level 10 in Melee"
- Recent community activity

**Player Profiles**
- Character name + portrait
- Overall level and top 3 skills
- Notable achievements
- Privacy controls (opt-in sharing)

#### 9.6 `posthog-integration` (depends on 9.3)
- Turn event tracking
- Skill usage analytics
- Achievement completion tracking
- Session duration metrics
- Funnel analysis (onboarding → first quest)

### Phase 10: Accessibility & Polish

#### 10.1 `accessibility-basics`
- Screen reader support (ARIA labels)
- Keyboard navigation for all interactions
- Focus management
- Color contrast compliance (WCAG 2.1 AA)
- Semantic HTML structure
- Focus trapping in modals
- Skip links for main content

#### 10.2 `character-customization`
- Expanded portrait selection (gallery + AI generation)
- Cosmetic equipment slots (no stat impact)
- Character background selection (flavor text)
- Title system from achievements

#### 10.3 `community-goals`
**Shared Objectives**
- Global goals all players contribute to
- Progress tracked server-side, aggregated across all players
- Examples: "Defeat 1000 bandits", "Discover all Northern Wastes locations"

**Progress Tracking**
- Simple counters (no complex state)
- Real-time or near-real-time updates
- Progress bar UI showing community contribution

**Rewards**
- Community-wide rewards when goals complete
- Individual contribution tracking (optional)
- New goals rotate in when completed

**Feature Flags**
- Hide individual quest UI (`FEATURE_INDIVIDUAL_QUESTS=false`)
- Enable community goals (`FEATURE_COMMUNITY_GOALS=true`)

#### 10.4 `performance-optimization`
**Analysis completed** - current state is acceptable, optimizations deferred.

**Findings:**
- Bundle size: ~1.1 MB (lean, no bloat)
- Caching: Region cache, rules cache, lorekeeper cache already implemented
- Arbiter + Lorekeeper already run in parallel

**Potential optimizations (if needed):**
- Parallelize initial DB queries (character, world, turns, NPCs) - Medium impact
- Stream Chronicler LLM response - Medium impact (perceived speed)
- Client-side state caching with invalidation - Low impact

**Current bottleneck:** LLM calls (Rune Marshal → Orchestrator → Chronicler) dominate latency. DB queries are fast.

---

## Phase 9 Dependency Graph

```
9.1 security-review (DO FIRST)
    │
    ▼
9.2 rate-limiting
    
9.3 achievement-system ─────┬─────┐
                            │     │
                            ▼     ▼
                    9.5 social  9.6 posthog

9.4 interactive-map (independent)
```

**Recommended order**: 9.1 → 9.2 → 9.3 → 9.4 (parallel with 9.5/9.6) → 9.5 → 9.6

---

## Implementation Strategy

### Quality Gates
- Each phase includes integration testing
- Manual testing scenarios for user experience
- Performance validation before V1 launch

---

## Success Metrics for V1

### Engagement
- Average session length > 20 minutes
- Return rate > 40% after 7 days

### Technical
- Turn response time < 3 seconds
- Error rate < 1%
- Mobile usability score > 85%

### Content
- All major locations have NPCs
- Rich discovery feed with regular updates

---

## Post-V1 Considerations

Features to explore after V1 stability:
- Faction system
- Advanced social features (guilds, messaging)
- Seasonal events and limited-time content
- Mobile native apps
- Voice input/output capabilities
