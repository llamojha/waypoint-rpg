# Future: Lore Index Optimization

## Current Implementation (MVP)

The Lorekeeper uses an in-memory cache for codex entries:
- Loaded on first request
- Stays in memory until server restarts
- Simple keyword matching for searches

## When to Migrate

When lore data expands significantly (100+ entries), migrate to:

### Option 1: Key-Map Index System
- Pre-computed keyword → entry mappings
- Load only relevant entries based on location/context
- Stored as JSON or in a dedicated index table

### Option 2: Postgres Full-Text Search
- Add `search_vector tsvector` column to `waypoint_codex_entries`
- GIN index for fast searches
- Use `to_tsquery()` for relevance ranking

### Option 3: External Cache (Redis)
- Shared cache across serverless instances
- TTL-based invalidation
- Better for high-traffic scenarios

## Trigger Conditions

Consider migration when:
- Codex entries exceed 100 items
- Memory usage becomes a concern
- Search relevance needs improvement
- Multiple serverless instances need shared state
