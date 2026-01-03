import type { Character, WorldContext, TurnDiff, Item } from "../../types";
import type {
  ValidatedEvent,
  StatChangeEvent,
  InventoryAddEvent,
  InventoryRemoveEvent,
  WorldUpdateEvent,
  RelationshipChangeEvent,
} from "./validate";

/**
 * Result of applying events to game state
 */
export interface ApplyEventsResult {
  characterUpdates: Partial<Character>;
  worldUpdates: Partial<WorldContext>;
  diffs: TurnDiff[];
  relationshipChanges: Array<{ npc: string; delta: number; reason: string }>;
}

/**
 * Handles stat_change events (hp, gold)
 */
function applyStatChange(
  event: StatChangeEvent,
  character: Character,
  charUpdates: Partial<Character>,
  diffs: TurnDiff[]
): void {
  const currentValue =
    charUpdates[event.stat] !== undefined
      ? (charUpdates[event.stat] as number)
      : character[event.stat];

  let newValue = currentValue + event.delta;

  // Clamp HP to valid range
  if (event.stat === "hp") {
    const maxHp = charUpdates.maxHp ?? character.maxHp;
    newValue = Math.max(0, Math.min(newValue, maxHp));
  }

  // Clamp gold to non-negative
  if (event.stat === "gold") {
    newValue = Math.max(0, newValue);
  }

  charUpdates[event.stat] = newValue;

  const sign = event.delta > 0 ? "+" : "";
  diffs.push({
    type: "stat",
    text: event.stat.toUpperCase(),
    value: `${sign}${event.delta}`,
  });
}

/**
 * Handles inventory_add events
 */
function applyInventoryAdd(
  event: InventoryAddEvent,
  character: Character,
  charUpdates: Partial<Character>,
  diffs: TurnDiff[]
): void {
  const currentInventory = charUpdates.inventory ?? [...character.inventory];

  const newItem: Item = {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: event.item.name,
    type: event.item.type,
    description: event.item.description ?? "",
    tags: event.item.tags ?? [],
    slot: event.item.slot,
    stats: event.item.stats,
  };

  charUpdates.inventory = [...currentInventory, newItem];

  diffs.push({
    type: "inventory",
    text: `Gained: ${event.item.name}`,
  });
}

/**
 * Handles inventory_remove events
 */
function applyInventoryRemove(
  event: InventoryRemoveEvent,
  character: Character,
  charUpdates: Partial<Character>,
  diffs: TurnDiff[]
): void {
  const currentInventory = charUpdates.inventory ?? [...character.inventory];

  // Find and remove the first matching item (case-insensitive)
  const itemIndex = currentInventory.findIndex(
    (item) => item.name.toLowerCase() === event.itemName.toLowerCase()
  );

  if (itemIndex !== -1) {
    const removedItem = currentInventory[itemIndex];
    charUpdates.inventory = [
      ...currentInventory.slice(0, itemIndex),
      ...currentInventory.slice(itemIndex + 1),
    ];

    diffs.push({
      type: "inventory",
      text: `Lost: ${removedItem.name}`,
    });
  }
}

/**
 * Handles world_update events
 */
function applyWorldUpdate(
  event: WorldUpdateEvent,
  world: WorldContext,
  worldUpdates: Partial<WorldContext>,
  diffs: TurnDiff[]
): void {
  const field = event.field as keyof WorldContext;

  // Only allow updating specific safe fields
  const allowedFields: (keyof WorldContext)[] = [
    "region",
    "poi",
    "weather",
    "description",
  ];

  if (allowedFields.includes(field)) {
    (worldUpdates as Record<string, unknown>)[field] = event.value;

    diffs.push({
      type: "world",
      text: `${field}: ${String(event.value)}`,
    });
  }

  // Handle nested time updates
  if (event.field === "time.day" && typeof event.value === "number") {
    const currentTime = worldUpdates.time ?? { ...world.time };
    worldUpdates.time = { ...currentTime, day: event.value };

    diffs.push({
      type: "world",
      text: `Day ${event.value}`,
    });
  }

  if (event.field === "time.phase" && typeof event.value === "string") {
    const currentTime = worldUpdates.time ?? { ...world.time };
    worldUpdates.time = { ...currentTime, phase: event.value };

    diffs.push({
      type: "world",
      text: event.value,
    });
  }
}

/**
 * Handles relationship_change events
 * Note: Actual NPC relationship updates happen in the database layer,
 * this function collects the changes for later processing
 */
function applyRelationshipChange(
  event: RelationshipChangeEvent,
  relationshipChanges: ApplyEventsResult["relationshipChanges"],
  diffs: TurnDiff[]
): void {
  // Cap delta to ±2 per turn as per game rules
  const cappedDelta = Math.max(-2, Math.min(2, event.delta));

  relationshipChanges.push({
    npc: event.npc,
    delta: cappedDelta,
    reason: event.reason,
  });

  const sign = cappedDelta > 0 ? "+" : "";
  diffs.push({
    type: "relationship",
    text: event.npc,
    value: `${sign}${cappedDelta}`,
  });
}

/**
 * Applies validated events to character and world state.
 * Returns the updates to be applied and diffs for the UI.
 *
 * Requirements:
 * - 4.1: Extract narration text from response (handled elsewhere)
 * - 4.2: Extract proposed_events array from response (handled elsewhere)
 *
 * This function handles the state mutation logic for:
 * - stat_change: HP and gold modifications
 * - inventory_add: Adding items to inventory
 * - inventory_remove: Removing items from inventory
 * - world_update: Updating world context fields
 * - relationship_change: NPC relationship modifications
 */
export function applyEvents(
  character: Character,
  world: WorldContext,
  events: ValidatedEvent[]
): ApplyEventsResult {
  const characterUpdates: Partial<Character> = {};
  const worldUpdates: Partial<WorldContext> = {};
  const diffs: TurnDiff[] = [];
  const relationshipChanges: ApplyEventsResult["relationshipChanges"] = [];

  for (const event of events) {
    switch (event.type) {
      case "stat_change":
        applyStatChange(
          event as StatChangeEvent,
          character,
          characterUpdates,
          diffs
        );
        break;

      case "inventory_add":
        applyInventoryAdd(
          event as InventoryAddEvent,
          character,
          characterUpdates,
          diffs
        );
        break;

      case "inventory_remove":
        applyInventoryRemove(
          event as InventoryRemoveEvent,
          character,
          characterUpdates,
          diffs
        );
        break;

      case "world_update":
        applyWorldUpdate(event as WorldUpdateEvent, world, worldUpdates, diffs);
        break;

      case "relationship_change":
        applyRelationshipChange(
          event as RelationshipChangeEvent,
          relationshipChanges,
          diffs
        );
        break;
    }
  }

  return {
    characterUpdates,
    worldUpdates,
    diffs,
    relationshipChanges,
  };
}
