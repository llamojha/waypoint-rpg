# Image Generation

## Overview

Images are generated for characters, NPCs, and locations. Generated images are stored in Supabase Storage and cached for reuse across players.

## When Images Are Generated

| Entity             | Trigger                       | Storage                |
| ------------------ | ----------------------------- | ---------------------- |
| Character Portrait | Character creation complete   | Per-character, private |
| NPC Portrait       | First discovery by any player | Global, shared         |
| Location Art       | First visit by any player     | Global, shared         |

## Image Reuse Pattern

NPCs and locations are shared across players:

1. Player discovers NPC/location
2. Check if image exists in global storage
3. If not: generate and store
4. If yes: return cached URL
5. All future players see same image

## Generation Prompts

### Character Portrait

```
Fantasy portrait of a [gender] human adventurer.
[Physical description from creation].
Style: painterly fantasy art, warm lighting, neutral background.
Aspect: 1:1 square, head and shoulders.
```

### NPC Portrait

```
Fantasy portrait of [name], a [role].
[Personality traits]: [trait1], [trait2].
Location context: [location].
Style: painterly fantasy art, expressive face.
Aspect: 1:1 square.
```

### Location Art

```
Fantasy landscape of [location name].
[Description from codex/discovery].
Time of day: [current time phase].
Weather: [current weather].
Style: painterly fantasy environment, wide shot.
Aspect: 16:9 landscape.
```

## Provider Options

**MVP (cost-conscious):**

- Stable Diffusion via Replicate API
- ~$0.01-0.02 per image
- Good enough for demo

**Future:**

- DALL-E 3 for higher quality
- Midjourney API when available
- Fine-tuned model for consistent style

## Storage Schema (Supabase)

```sql
-- Bucket: waypoint-images

-- Character portraits (private per user)
characters/{user_id}/{character_id}/portrait.webp

-- NPC portraits (global, shared)
npcs/{npc_id}/portrait.webp

-- Location art (global, shared)
locations/{location_id}/art.webp
```

## Database References

```typescript
// Character
interface Character {
  portraitUrl?: string; // Supabase Storage URL
}

// NPC
interface NPC {
  portraitUrl?: string; // Generated on first discovery
}

// Location (new field needed)
interface MapLocation {
  artUrl?: string; // Generated on first visit
}
```

## Generation Flow

### Character (at creation)

1. User completes character form (name, optional gender, description)
2. Build prompt from gender + physical description
3. Call image API (Gemini image generation)
4. Upload to `characters/{user_id}/{char_id}/portrait.webp`
5. Update character record with URL
6. Show in UI

### NPC (on discovery)

1. World Arbiter approves `npc_discovered` event
2. Check if NPC has `portraitUrl`
3. If null: queue image generation job
4. Generate from NPC schema (name, role, personality)
5. Upload to `npcs/{npc_id}/portrait.webp`
6. Update NPC record
7. Next render shows image

### Location (on first visit)

1. Player travels to location
2. Check if location has `artUrl`
3. If null: queue image generation
4. Generate from location description + current weather/time
5. Upload to `locations/{location_id}/art.webp`
6. Update location record

## Async Generation

Images don't block gameplay:

- Show placeholder while generating
- Update UI when ready
- Cache aggressively

```typescript
// Placeholder SVG (already exists as UNKNOWN_IMG)
const PLACEHOLDER = "data:image/svg+xml;base64,...";

// Component pattern
<img src={npc.portraitUrl || PLACEHOLDER} />;
```

## Cost Management

- Generate only on first discovery (not every view)
- Compress to WebP format
- Limit resolution (512x512 for portraits, 1024x576 for locations)
- Rate limit: max 10 generations per user per hour
- Queue system for batch processing

## Safety

- All prompts filtered through Content Sentinel patterns
- No NSFW content in prompts
- Reject/regenerate if output flagged
- Human review queue for edge cases
