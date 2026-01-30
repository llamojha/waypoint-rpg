# V1 Roadmap

## Overview

This roadmap extends the MVP (Phases 0-6) to deliver a production-ready V1 with enhanced user experience, content richness, and shared world features.

**Target**: Full V1 launch with polished UX, populated world, and community features.

## Current Status

**MVP (Phases 0-6)**: ✅ Complete through Phase 4, Phase 5-6 in progress
- Core gameplay mechanics ✅
- Agent architecture ✅  
- Skill system ✅
- Combat system (5.3) 📋
- World systems (5.4) 📋
- DM chat (5.5) 📋
- Security & polish (Phase 6) 📋

## V1 Extensions (Phases 7-9)

### Phase 7: User Experience & Polish

| ID  | Spec Name                  | Priority | Estimate   | Details |
| --- | -------------------------- | -------- | ---------- | ------- |
| 7.1 | `mobile-responsive`        | High     | 150-200    | Touch-friendly UI, responsive design |
| 7.2 | `error-recovery`           | High     | 75-125     | Failed turn handling, network issues |
| 7.3 | `accessibility-basics`     | Medium   | 100-150    | Screen readers, keyboard navigation |
| 7.4 | `performance-optimization` | Medium   | 75-100     | Caching, query optimization |

**Phase 7 Total**: 400-575 credits

### Phase 8: Content & World

| ID  | Spec Name                | Priority | Estimate   | Details |
| --- | ------------------------ | -------- | ---------- | ------- |
| 8.1 | `interactive-map`        | High     | 150-200    | Visual map with POI markers, travel UI |
| 8.2 | `achievement-system`     | High     | 125-175    | Unlock rewards for milestones, skill achievements |
| 8.3 | `character-customization`| Medium   | 100-150    | More portraits, cosmetic equipment, backgrounds |
| 8.4 | `world-events`           | Medium   | 125-175    | Scheduled atmosphere changes, NPC schedules, dynamic state |
| 8.5 | `content-seeding`        | High     | 175-250    | NPCs, locations, location art, codex entries |
| 8.6 | `community-goals`        | High     | 125-175    | Shared objectives, collective progress, community rewards |
| 8.7 | `social-features`        | Low      | 100-150    | Leaderboards, discovery feed, player profiles |

**Phase 8 Total**: 900-1,275 credits

### Phase 9: Production Readiness

| ID  | Spec Name              | Priority | Estimate | Details |
| --- | ---------------------- | -------- | -------- | ------- |
| 9.1 | `posthog-integration`  | High     | 50-75    | Event tracking: turns, skills, achievements |
| 9.2 | `rate-limiting`        | High     | 50-75    | Per-user turn limits, API rate limiting |

**Phase 9 Total**: 100-150 credits

## V1 Total Estimate

**V1 Extensions**: 1,400-2,000 credits

---

## Spec Details

### Phase 7: User Experience & Polish

#### 7.1 `mobile-responsive`
- Touch-friendly UI controls
- Responsive layout for all screen sizes
- Mobile-optimized input handling
- Swipe gestures for panel navigation

#### 7.2 `error-recovery`
- Graceful handling of failed turns
- Network disconnection recovery
- Retry mechanisms with user feedback
- State recovery after errors

#### 7.3 `accessibility-basics`
- Screen reader support (ARIA labels)
- Keyboard navigation for all interactions
- Focus management
- Color contrast compliance

#### 7.4 `performance-optimization`
- Query optimization for turn processing
- Client-side caching strategies
- Lazy loading for panels/components
- Bundle size optimization

### Phase 8: Content & World

#### 8.1 `interactive-map`
- Visual map showing full world/region artwork
- POI markers appear once discovered in adventure
- Click discovered POI to see details, travel option
- Current location indicator
- Undiscovered POIs hidden (terrain still visible)
- Region boundaries and labels
- Travel time display between locations

#### 8.2 `achievement-system`
- Skill-based achievements (reach level X in skill)
- Exploration achievements (discover locations)
- Combat achievements (defeat enemy types)
- Social achievements (NPC relationships)
- Achievement notifications and rewards
- Achievement display in character panel

#### 8.3 `character-customization`
- Expanded portrait selection
- Cosmetic equipment slots (no stat impact)
- Character background selection (flavor text)
- Title system from achievements

#### 8.4 `world-events`
- Scheduled weather changes affecting all players
- NPC schedule system (NPCs move between locations)
- Time-based world state changes
- Event notifications in World News
- Dynamic atmosphere based on world state

#### 8.5 `content-seeding`
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

#### 8.6 `community-goals`
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
- Hide individual quest UI (`FEATURE_INDIVIDUAL_QUESTS=false`)
- Enable community goals (`FEATURE_COMMUNITY_GOALS=true`)

#### 8.7 `social-features`
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

### Phase 9: Production Readiness

#### 9.1 `posthog-integration`
- Turn event tracking
- Skill usage analytics
- Achievement completion tracking
- Session duration metrics
- Funnel analysis (onboarding → first quest)

#### 9.2 `rate-limiting`
- Per-user turn limits (daily/hourly)
- API rate limiting on all endpoints
- Graceful degradation messaging
- Admin override capabilities

---

## Quest System Evolution

**MVP**: Individual quest tracking (keep as-is, feature-flagged in V1)

**V1 Addition**: Community Goals
- Shared objectives with collective progress tracking
- All players contribute to the same goals
- Simple counters with community rewards
- Examples: "Defeat 1000 goblins", "Discover all Northern Wastes locations"

**Feature Flag Strategy**:
- `FEATURE_INDIVIDUAL_QUESTS` - hide/show personal quest UI (default: hidden in V1)
- `FEATURE_COMMUNITY_GOALS` - enable community goals system (default: enabled in V1)
- Allows A/B testing and gradual rollout
- Can re-enable individual quests if community goals don't resonate

---

## Implementation Strategy

### Parallel Development
- Phase 7 (UX) can run parallel with Phase 8 (Content)
- Phase 9 (Production) depends on both 7 & 8
- Content seeding (8.5) can start early and run throughout

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
- Community quests (shared objectives with collective progress)
- Faction system
- Advanced social features (guilds, messaging)
- Seasonal events and limited-time content
- Mobile native apps
- Voice input/output capabilities
