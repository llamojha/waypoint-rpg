# Spec: Social Events & World News

## Overview

Record key player milestones and world events as "News" entries that appear in the right column for all players. This creates a living, shared world where player achievements and discoveries are celebrated.

---

## News Types

| Type | Trigger | Example |
|------|---------|---------|
| `achievement` | Player completes significant milestone | "An adventurer slew the Cavern Wyrm" |
| `discovery` | Player discovers new location/NPC | "A mysterious figure was spotted in The Highlands" |
| `quest_complete` | Player completes a quest | "The missing merchant was found safe" |
| `world_event` | Epoch/calendar event | "The Harvest Festival begins in Caledonia" |
| `first` | First player to do something | "First adventurer to reach the Black Fort" |
| `rumor` | LLM-generated world flavor | "Whispers of dark magic in the marshes" |

---

## Milestone Triggers

### Automatic (Code Layer)

These are detected automatically when events are applied:

```typescript
interface MilestoneTrigger {
  type: string;
  condition: (event: ApprovedEvent, context: GameContext) => boolean;
  newsTemplate: (event: ApprovedEvent, character: Character) => NewsEntry;
}

const MILESTONE_TRIGGERS: MilestoneTrigger[] = [
  // Quest completion
  {
    type: "quest_complete",
    condition: (e) => e.type === "quest_progress" && e.data.completed,
    newsTemplate: (e, char) => ({
      title: `Quest Completed: ${e.data.questTitle}`,
      text: `${char.name} completed "${e.data.questTitle}"`,
      news_type: "quest_complete",
    }),
  },
  
  // First visit to dangerous location
  {
    type: "first_visit",
    condition: (e, ctx) => 
      e.type === "location_change" && 
      ctx.location.tags?.includes("dangerous") &&
      ctx.isFirstVisitGlobal,
    newsTemplate: (e, char) => ({
      title: `New Territory Explored`,
      text: `${char.name} was the first to reach ${e.data.location}`,
      news_type: "first",
    }),
  },
  
  // Boss/enemy defeated
  {
    type: "boss_defeated",
    condition: (e) => 
      e.type === "combat_damage" && 
      e.data.enemyDefeated &&
      e.data.enemyTier >= 4,  // Tier 4+ = boss-level
    newsTemplate: (e, char) => ({
      title: `Mighty Foe Vanquished`,
      text: `${char.name} defeated ${e.data.enemyName}`,
      news_type: "achievement",
    }),
  },
  
  // NPC discovered
  {
    type: "npc_discovered",
    condition: (e) => e.type === "npc_discovered",
    newsTemplate: (e, char) => ({
      title: `New Face in ${e.data.location}`,
      text: `A ${e.data.role} known as ${e.data.name} was encountered`,
      news_type: "discovery",
    }),
  },
  
  // Skill mastery (level 50+)
  {
    type: "skill_mastery",
    condition: (e) => 
      e.type === "skill_xp" && 
      e.data.newLevel >= 50 &&
      e.data.previousLevel < 50,
    newsTemplate: (e, char) => ({
      title: `Master ${e.data.skill}`,
      text: `${char.name} has achieved mastery in ${e.data.skill}`,
      news_type: "achievement",
    }),
  },
];
```

### Configurable Thresholds

```typescript
const NEWS_THRESHOLDS = {
  // Only announce boss kills for tier 4+ enemies
  minEnemyTierForNews: 4,
  
  // Only announce skill levels at milestones
  skillMilestones: [25, 50, 75, 99],
  
  // Only announce quest completions for non-trivial quests
  minQuestStepsForNews: 3,
  
  // Cooldown between similar news (prevent spam)
  newsCooldownMs: 60 * 60 * 1000, // 1 hour
};
```

---

## Implementation

### 1. News Generation (in Apply State)

```typescript
// lib/turn/apply.ts

function checkMilestones(
  approvedEvents: ApprovedEvent[],
  character: Character,
  context: GameContext
): NewsEntry[] {
  const newsEntries: NewsEntry[] = [];
  
  for (const event of approvedEvents) {
    for (const trigger of MILESTONE_TRIGGERS) {
      if (trigger.condition(event, context)) {
        const news = trigger.newsTemplate(event, character);
        newsEntries.push(news);
      }
    }
  }
  
  return newsEntries;
}

// Called at end of applyEvents()
const milestoneNews = checkMilestones(approvedEvents, character, context);
for (const news of milestoneNews) {
  await insertWorldNews(news);
}
```

### 2. Database Insert

```typescript
// lib/db/news.ts

async function insertWorldNews(news: NewsEntry): Promise<void> {
  // Check cooldown for similar news
  const recentSimilar = await supabase
    .from("waypoint_world_news")
    .select("id")
    .eq("news_type", news.news_type)
    .eq("title", news.title)
    .gte("created_at", new Date(Date.now() - NEWS_THRESHOLDS.newsCooldownMs).toISOString())
    .single();
  
  if (recentSimilar.data) {
    return; // Skip duplicate
  }
  
  await supabase.from("waypoint_world_news").insert({
    title: news.title,
    text: news.text,
    news_type: news.news_type,
    status: "canon",
    related_entity_type: news.relatedEntityType,
    related_entity_id: news.relatedEntityId,
  });
}
```

### 3. News Display (Right Column)

Already implemented - news appears in RightColumn with unread items first.

---

## Privacy Considerations

### Anonymization Options

```typescript
const NEWS_PRIVACY = {
  // Use character name vs "An adventurer"
  useCharacterName: true,
  
  // For sensitive achievements, anonymize
  anonymizeTypes: ["death", "failure"],
  
  // Allow players to opt-out of news
  respectOptOut: true,
};

function formatNewsText(template: string, character: Character): string {
  if (!NEWS_PRIVACY.useCharacterName || character.newsOptOut) {
    return template.replace(character.name, "An adventurer");
  }
  return template;
}
```

### Player Settings (Future)

```typescript
// Character settings
{
  newsOptOut: boolean,        // Don't appear in world news
  newsAnonymous: boolean,     // Appear as "An adventurer"
}
```

---

## News Categories for UI

```typescript
const NEWS_CATEGORIES = {
  achievement: { icon: "Trophy", color: "gold" },
  discovery: { icon: "Compass", color: "forest" },
  quest_complete: { icon: "Scroll", color: "forest" },
  world_event: { icon: "Globe", color: "burgundy" },
  first: { icon: "Star", color: "gold" },
  rumor: { icon: "MessageCircle", color: "ink-light" },
};
```

---

## Example News Entries

```json
[
  {
    "title": "The Cavern Wyrm Falls",
    "text": "Aldric the Bold defeated the Cavern Wyrm in the depths of Stormwall",
    "news_type": "achievement",
    "status": "canon"
  },
  {
    "title": "New Path Discovered",
    "text": "A hidden trail to the Black Fort was found through the marshes",
    "news_type": "discovery",
    "status": "canon"
  },
  {
    "title": "First to the Summit",
    "text": "Mira was the first adventurer to reach Needleback Peak",
    "news_type": "first",
    "status": "canon"
  },
  {
    "title": "Harvest Festival Begins",
    "text": "The annual Harvest Festival has begun in Caledonia City",
    "news_type": "world_event",
    "status": "canon"
  },
  {
    "title": "Strange Lights",
    "text": "Travelers report strange lights near the old ruins at night",
    "news_type": "rumor",
    "status": "rumor"
  }
]
```

---

## Tasks

### Phase 1: Core Implementation
- [ ] Create `lib/news/milestones.ts` with trigger definitions
- [ ] Add `checkMilestones()` call in `applyEvents()`
- [ ] Add cooldown/deduplication logic
- [ ] Test with quest completion trigger

### Phase 2: Extended Triggers
- [ ] Boss defeat news
- [ ] First visit news (requires global tracking)
- [ ] Skill mastery news
- [ ] NPC discovery news

### Phase 3: UI Enhancements
- [ ] News type icons in RightColumn
- [ ] Filter by news type
- [ ] "Your achievements" section

### Phase 4: Privacy & Settings
- [ ] Add `newsOptOut` to character settings
- [ ] Anonymization option
- [ ] News preferences UI

---

## Dependencies

- Existing `waypoint_world_news` table ✅
- Existing RightColumn news display ✅
- Apply state pipeline ✅

---

*Spec created: February 2026*
