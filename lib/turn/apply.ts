import type { Character, WorldContext, TurnDiff, Item } from "../../types";
import type {
  ValidatedEvent,
  StatChangeEvent,
  InventoryAddEvent,
  InventoryRemoveEvent,
  WorldUpdateEvent,
  RelationshipChangeEvent,
  QuestStartEvent,
  QuestProgressEvent,
  LocationChangeEvent,
  CombatDamageEvent,
  CombatEndEvent,
  CombatStartEvent,
} from "./validate";
import { createCombatEnemy } from "@/lib/combat/enemies";

/**
 * Result of applying events to game state
 */
export interface ApplyEventsResult {
  characterUpdates: Partial<Character>;
  worldUpdates: Partial<WorldContext>;
  diffs: TurnDiff[];
  relationshipChanges: Array<{ npc: string; delta: number; reason: string }>;
  questChanges: Array<{
    type: "start" | "progress";
    questId: string;
    questTitle?: string;
    progress?: number;
    reason: string;
  }>;
  combatEvents: Array<{
    type: "damage" | "end";
    target: string;
    damage?: number;
    outcome?: string;
    loot?: { gold?: number; items?: string[] };
    reason: string;
  }>;
  /** Side effects for Chronicler narration (NPC died, quest completed, etc.) */
  consequences: Consequence[];
}

/**
 * Consequence types for Chronicler context
 */
export type Consequence =
  | { type: "npc_died"; npc: string; reason: string }
  | { type: "npc_defeated"; npc: string; reason: string }
  | { type: "enemy_defeated"; enemy: string; reason: string }
  | { type: "combat_started"; enemies: string; reason: string }
  | { type: "quest_completed"; questTitle: string; reason: string }
  | { type: "quest_started"; questTitle: string; reason: string }
  | { type: "location_changed"; from: string; to: string }
  | { type: "character_critical_hp"; hp: number; maxHp: number }
  | { type: "character_died"; reason: string }
  | { type: "item_acquired"; itemName: string; reason: string }
  | { type: "gold_depleted"; reason: string }
  | { type: "respawned"; location: string; reason: string }
  | { type: "time_advanced"; fromPhase: string; toPhase: string; day: number; description: string };

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
  // Safety check - should be caught by validation but defensive
  if (!event.item || !event.item.name) {
    return;
  }

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
  // Safety check
  if (!event.itemName) {
    return;
  }

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
  diffs: TurnDiff[],
  knownNpcNames?: Set<string>
): void {
  // Safety check
  if (!event.npc) {
    return;
  }

  // Cap delta to ±10 per turn (allows meaningful changes but prevents abuse)
  const cappedDelta = Math.max(-10, Math.min(10, event.delta || 0));

  // Skip if no actual change
  if (cappedDelta === 0) {
    return;
  }

  // Check if we already have a relationship change for this NPC (dedupe)
  const existingIdx = relationshipChanges.findIndex(
    rc => rc.npc.toLowerCase() === event.npc.toLowerCase()
  );
  if (existingIdx >= 0) {
    // Combine deltas instead of duplicating
    relationshipChanges[existingIdx].delta += cappedDelta;
    return;
  }

  relationshipChanges.push({
    npc: event.npc,
    delta: cappedDelta,
    reason: event.reason || "",
  });

  // Check if this NPC is already known to the player
  const isAlreadyKnown = knownNpcNames?.has(event.npc.toLowerCase()) ?? false;

  // Check if this is a new NPC discovery based on reason keywords (only if not already known)
  const reasonLower = (event.reason || "").toLowerCase();
  const hasDiscoveryKeyword =
    reasonLower.includes("met") ||
    reasonLower.includes("meet") ||
    reasonLower.includes("encounter") ||
    reasonLower.includes("discover") ||
    reasonLower.includes("introduce") ||
    reasonLower.includes("first") ||
    reasonLower.includes("new acquaintance") ||
    reasonLower.includes("initial");

  const isNewNpcDiscovery = hasDiscoveryKeyword && !isAlreadyKnown;

  if (isNewNpcDiscovery) {
    // For new NPC discoveries, show as "NEW NPC" with a descriptor from the reason
    // Extract a short descriptor if possible, otherwise use the delta as sentiment
    let descriptor = "";
    if (cappedDelta >= 3) descriptor = "Friendly";
    else if (cappedDelta >= 1) descriptor = "Neutral";
    else if (cappedDelta <= -3) descriptor = "Hostile";
    else if (cappedDelta <= -1) descriptor = "Suspicious";
    else descriptor = "Neutral";

    diffs.push({
      type: "npc",
      text: `${event.npc} (${descriptor})`,
    });
  } else {
    // Regular relationship change
    const sign = cappedDelta > 0 ? "+" : "";
    diffs.push({
      type: "relationship",
      text: event.npc,
      value: `${sign}${cappedDelta}`,
    });
  }
}

/**
 * Handles quest_start events
 */
function applyQuestStart(
  event: QuestStartEvent,
  questChanges: ApplyEventsResult["questChanges"],
  diffs: TurnDiff[]
): void {
  questChanges.push({
    type: "start",
    questId: event.questId,
    questTitle: event.questTitle,
    reason: event.reason,
  });

  diffs.push({
    type: "quest",
    text: `New Quest: ${event.questTitle}`,
  });
}

/**
 * Handles quest_progress events
 */
function applyQuestProgress(
  event: QuestProgressEvent,
  questChanges: ApplyEventsResult["questChanges"],
  diffs: TurnDiff[]
): void {
  questChanges.push({
    type: "progress",
    questId: event.questId,
    progress: event.progress,
    reason: event.reason,
  });

  diffs.push({
    type: "quest",
    text: `Quest Progress`,
    value: `Step ${event.progress}`,
  });
}

/**
 * Handles location_change events
 * Supports multi-hop travel: if path is provided, records all intermediate locations
 * Note: Full location data (description, imageUrl, entities, nearbyPoi) is looked up
 * from the database in the API route after applyEvents returns.
 */
function applyLocationChange(
  event: LocationChangeEvent,
  world: WorldContext,
  worldUpdates: Partial<WorldContext>,
  diffs: TurnDiff[]
): void {
  // Final destination
  worldUpdates.poi = event.location;

  // If multi-hop path, show the journey
  if (event.path && event.path.length > 2) {
    // path includes start, so intermediate stops are path[1] to path[length-2]
    const intermediateStops = event.path.slice(1, -1);
    const journeyText = intermediateStops.length > 0
      ? `via ${intermediateStops.join(" → ")}`
      : "";
    
    diffs.push({
      type: "world",
      text: "Traveled",
      value: `${event.location}${journeyText ? ` (${journeyText})` : ""}`,
    });
  } else {
    diffs.push({
      type: "world",
      text: "Location",
      value: event.location,
    });
  }
}

/**
 * Handles combat_damage events - decrements enemy HP in activeCombat
 */
function applyCombatDamage(
  event: CombatDamageEvent,
  world: WorldContext,
  worldUpdates: Partial<WorldContext>,
  combatEvents: ApplyEventsResult["combatEvents"],
  diffs: TurnDiff[],
  consequences: Consequence[]
): void {
  combatEvents.push({
    type: "damage",
    target: event.target,
    damage: event.damage,
    reason: event.reason,
  });

  // Update enemy HP in activeCombat (immutable update)
  const activeCombat = worldUpdates.activeCombat ?? world.activeCombat;
  if (activeCombat) {
    const updatedEnemies = activeCombat.enemies.map(e =>
      e.name === event.target
        ? { ...e, hp: Math.max(0, e.hp - event.damage) }
        : e
    );
    worldUpdates.activeCombat = { ...activeCombat, enemies: updatedEnemies };

    // Check if enemy defeated
    const targetEnemy = updatedEnemies.find(e => e.name === event.target);
    if (targetEnemy && targetEnemy.hp <= 0) {
      consequences.push({
        type: "enemy_defeated",
        enemy: targetEnemy.name,
        reason: `${targetEnemy.name} was defeated`,
      });
    }
  }

  diffs.push({
    type: "world",
    text: `${event.target}`,
    value: `-${event.damage} HP`,
  });
}

/**
 * Handles combat_end events
 */
function applyCombatEnd(
  event: CombatEndEvent,
  combatEvents: ApplyEventsResult["combatEvents"],
  diffs: TurnDiff[]
): void {
  combatEvents.push({
    type: "end",
    target: event.target,
    outcome: event.outcome,
    loot: event.loot,
    reason: event.reason,
  });

  diffs.push({
    type: "world",
    text: `${event.target} ${event.outcome}`,
  });
}

/**
 * Handles combat_start events - spawns enemies into activeCombat
 */
function applyCombatStart(
  event: CombatStartEvent,
  worldUpdates: Partial<WorldContext>,
  diffs: TurnDiff[],
  consequences: Consequence[]
): void {
  const enemies = event.enemies
    .map((name, i) => {
      const enemy = createCombatEnemy(name, `${name.toLowerCase().replace(/\s+/g, "-")}-${i}`);
      if (!enemy) console.warn('[applyCombatStart] Unknown enemy template:', name);
      return enemy;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (enemies.length === 0) return;

  worldUpdates.activeCombat = {
    enemies,
    round: 1,
  };

  const enemyNames = enemies.map(e => e.name).join(", ");
  diffs.push({
    type: "world",
    text: "Combat started",
    value: enemyNames,
  });

  consequences.push({
    type: "combat_started",
    enemies: enemyNames,
    reason: event.reason,
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
  events: ValidatedEvent[],
  knownNpcNames?: Set<string>
): ApplyEventsResult {
  const characterUpdates: Partial<Character> = {};
  const worldUpdates: Partial<WorldContext> = {};
  const diffs: TurnDiff[] = [];
  const relationshipChanges: ApplyEventsResult["relationshipChanges"] = [];
  const questChanges: ApplyEventsResult["questChanges"] = [];
  const combatEvents: ApplyEventsResult["combatEvents"] = [];
  const consequences: Consequence[] = [];

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
        // Add consequence for item acquisition
        if ((event as InventoryAddEvent).item?.name) {
          consequences.push({
            type: "item_acquired",
            itemName: (event as InventoryAddEvent).item.name,
            reason: (event as InventoryAddEvent).reason || "",
          });
        }
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
          diffs,
          knownNpcNames
        );
        break;

      case "quest_start":
        applyQuestStart(event as QuestStartEvent, questChanges, diffs);
        // Add consequence for quest start
        consequences.push({
          type: "quest_started",
          questTitle: (event as QuestStartEvent).questTitle,
          reason: (event as QuestStartEvent).reason,
        });
        break;

      case "quest_progress":
        applyQuestProgress(event as QuestProgressEvent, questChanges, diffs);
        break;

      case "location_change":
        applyLocationChange(
          event as LocationChangeEvent,
          world,
          worldUpdates,
          diffs
        );
        // Add consequence for location change
        consequences.push({
          type: "location_changed",
          from: world.poi,
          to: (event as LocationChangeEvent).location,
        });
        break;

      case "combat_damage":
        applyCombatDamage(
          event as CombatDamageEvent,
          world,
          worldUpdates,
          combatEvents,
          diffs,
          consequences
        );
        break;

      case "combat_end":
        applyCombatEnd(event as CombatEndEvent, combatEvents, diffs);
        // Add consequence for combat end
        const combatEndEvent = event as CombatEndEvent;
        if (combatEndEvent.outcome === "defeated") {
          consequences.push({
            type: "npc_defeated",
            npc: combatEndEvent.target,
            reason: combatEndEvent.reason,
          });
        }
        break;

      case "combat_start":
        applyCombatStart(
          event as CombatStartEvent,
          worldUpdates,
          diffs,
          consequences
        );
        break;
    }
  }

  // Check for critical HP consequence
  const finalHp = characterUpdates.hp ?? character.hp;
  const maxHp = characterUpdates.maxHp ?? character.maxHp;
  if (finalHp <= 0) {
    consequences.push({
      type: "character_died",
      reason: "HP reached 0",
    });
  } else if (finalHp <= maxHp * 0.25) {
    consequences.push({
      type: "character_critical_hp",
      hp: finalHp,
      maxHp: maxHp,
    });
  }

  // Check for gold depleted consequence
  const finalGold = characterUpdates.gold ?? character.gold;
  if (finalGold <= 0 && character.gold > 0) {
    consequences.push({
      type: "gold_depleted",
      reason: "Ran out of gold",
    });
  }

  return {
    characterUpdates,
    worldUpdates,
    diffs,
    relationshipChanges,
    questChanges,
    combatEvents,
    consequences,
  };
}
