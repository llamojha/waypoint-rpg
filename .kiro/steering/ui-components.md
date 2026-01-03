---
inclusion: fileMatch
fileMatchPattern: "components/**/*.tsx"
---

# UI Component Guidelines

## Component Structure

```
components/
├── LeftColumn.tsx      # Hero's Ledger (character sheet, quests, NPCs)
├── CenterColumn.tsx    # Story/narration, input, turn history
├── RightColumn.tsx     # World Memory (diffs, news, context)
├── Header.tsx          # Navigation, theme toggle, world info
├── CharacterCreation.tsx
├── LandingPage.tsx
├── ProfilePage.tsx
├── MapPage.tsx
├── CodexPage.tsx
└── TurnTrace.tsx       # Debug/trace modal
```

## State Flow

- All game state lives in `App.tsx` as `GameState`
- Components receive state via props
- Updates flow through handlers: `onCharacterUpdate`, `onSendTurn`, etc.
- Never mutate props directly

## Turn Lifecycle in UI

```typescript
type TurnStatus = "idle" | "processing" | "error";
```

1. **idle**: Input enabled, waiting for player
2. **processing**: Input disabled, showing loading state
3. **error**: Show retry button, allow cancel

## Key Props Patterns

### CenterColumn

```typescript
interface Props {
  world: WorldContext;
  turns: Turn[];
  onSendTurn: (input: string) => void;
  turnStatus: TurnStatus;
  onRoll: (turnId: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}
```

### LeftColumn

```typescript
interface Props {
  character: Character;
  quests: Quest[];
  npcs: NPC[];
  onCharacterUpdate: (char: Character) => void;
}
```

## Styling Conventions

- Tailwind CSS with custom theme tokens
- Theme: `data-theme="light"` or `data-theme="dark"` on root
- Color tokens: `parchment-*`, `ink`, `ink-faint`, `burgundy`
- Font: `font-small-caps` for labels

## Mobile Responsiveness

- 3-column layout on desktop (`md:grid-cols-[320px_1fr_320px]`)
- Tab-based navigation on mobile
- `mobileTab`: 'sheet' | 'play' | 'map' | 'codex'

## Accessibility

- Use semantic HTML elements
- Keyboard navigation for all interactive elements
- ARIA labels on icon-only buttons
- Focus management in modals

## Component Rules

1. Display only validated state from props
2. Never show LLM output that hasn't been validated
3. Skill checks show Roll button until resolved
4. Diffs appear in RightColumn after validation
5. Suggested actions come from validated turn data
