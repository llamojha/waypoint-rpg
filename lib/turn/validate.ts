import type { Character, Item } from "../../types";

/**
 * Event types that can be proposed by the LLM
 */
export type ProposedEventType =
  | "stat_change"
  | "inventory_add"
  | "inventory_remove"
  | "world_update"
  | "relationship_change"
  | "quest_start"
  | "quest_progress"
  | "location_change"
  | "combat_damage"
  | "combat_end";

/**
 * Base interface for all proposed events
 */
interface BaseProposedEvent {
  type: ProposedEventType;
  reason: string;
}

/**
 * Stat change event (hp, gold, etc.)
 */
export interface StatChangeEvent extends BaseProposedEvent {
  type: "stat_change";
  stat: "hp" | "gold";
  delta: number;
}

/**
 * Item to be added to inventory
 */
export interface ProposedItem {
  name: string;
  type: Item["type"];
  description?: string;
  tags?: string[];
  slot?: keyof Character["equipment"];
  stats?: Item["stats"];
}

/**
 * Inventory add event
 */
export interface InventoryAddEvent extends BaseProposedEvent {
  type: "inventory_add";
  item: ProposedItem;
}

/**
 * Inventory remove event
 */
export interface InventoryRemoveEvent extends BaseProposedEvent {
  type: "inventory_remove";
  itemName: string;
}

/**
 * World update event
 */
export interface WorldUpdateEvent extends BaseProposedEvent {
  type: "world_update";
  field: string;
  value: unknown;
}

/**
 * Relationship change event
 */
export interface RelationshipChangeEvent extends BaseProposedEvent {
  type: "relationship_change";
  npc: string;
  delta: number;
}

/**
 * Quest start event
 */
export interface QuestStartEvent extends BaseProposedEvent {
  type: "quest_start";
  questId: string;
  questTitle: string;
}

/**
 * Quest progress event
 */
export interface QuestProgressEvent extends BaseProposedEvent {
  type: "quest_progress";
  questId: string;
  progress: number;
}

/**
 * Location change event
 */
export interface LocationChangeEvent extends BaseProposedEvent {
  type: "location_change";
  location: string;
  entities?: string[];
}

/**
 * Combat damage event - damage dealt to an enemy
 */
export interface CombatDamageEvent extends BaseProposedEvent {
  type: "combat_damage";
  target: string; // Enemy name
  damage: number;
}

/**
 * Combat end event - enemy defeated or fled
 */
export interface CombatEndEvent extends BaseProposedEvent {
  type: "combat_end";
  target: string;
  outcome: "defeated" | "fled" | "escaped";
  loot?: { gold?: number; items?: string[] };
}

/**
 * Union type for all proposed events from LLM
 */
export type ProposedEvent =
  | StatChangeEvent
  | InventoryAddEvent
  | InventoryRemoveEvent
  | WorldUpdateEvent
  | RelationshipChangeEvent
  | QuestStartEvent
  | QuestProgressEvent
  | LocationChangeEvent
  | CombatDamageEvent
  | CombatEndEvent;

/**
 * Validated event - same structure as ProposedEvent but guaranteed to be valid
 */
export type ValidatedEvent = ProposedEvent;

/**
 * Valid item types that can be added to inventory
 */
const VALID_ITEM_TYPES: Item["type"][] = [
  "weapon",
  "armor",
  "consumable",
  "quest",
  "trinket",
  "misc",
];

/**
 * Validates a stat_change event
 * - HP must stay within 0 to maxHp
 * - Gold must not go negative
 */
function validateStatChange(
  event: StatChangeEvent,
  character: Character
): boolean {
  if (event.stat === "hp") {
    const newHp = character.hp + event.delta;
    return newHp >= 0 && newHp <= character.maxHp;
  }

  if (event.stat === "gold") {
    const newGold = character.gold + event.delta;
    return newGold >= 0;
  }

  // Unknown stat type - reject
  return false;
}

/**
 * Validates an inventory_add event
 * - Item must have a name (non-empty string)
 * - Item must have a valid type
 */
function validateInventoryAdd(event: InventoryAddEvent): boolean {
  if (!event.item) {
    return false;
  }

  // Name must be a non-empty string
  if (typeof event.item.name !== "string" || event.item.name.trim() === "") {
    return false;
  }

  // Type must be a valid item type
  if (!VALID_ITEM_TYPES.includes(event.item.type)) {
    return false;
  }

  return true;
}

/**
 * Validates an inventory_remove event
 * - Item must exist in character's inventory
 */
function validateInventoryRemove(
  event: InventoryRemoveEvent,
  character: Character
): boolean {
  if (typeof event.itemName !== "string" || event.itemName.trim() === "") {
    return false;
  }

  // Check if item exists in inventory (case-insensitive match)
  const itemExists = character.inventory.some(
    (item) => item.name.toLowerCase() === event.itemName.toLowerCase()
  );

  return itemExists;
}

/**
 * Validates a world_update event
 * - Field must be a non-empty string
 */
function validateWorldUpdate(event: WorldUpdateEvent): boolean {
  return typeof event.field === "string" && event.field.trim() !== "";
}

/**
 * Validates a relationship_change event
 * - NPC name must be a non-empty string
 * - Delta must be a number
 */
function validateRelationshipChange(event: RelationshipChangeEvent): boolean {
  if (typeof event.npc !== "string" || event.npc.trim() === "") {
    return false;
  }

  if (typeof event.delta !== "number" || isNaN(event.delta)) {
    return false;
  }

  return true;
}

/**
 * Validates a quest_start event
 */
function validateQuestStart(event: QuestStartEvent): boolean {
  if (typeof event.questId !== "string" || event.questId.trim() === "") {
    return false;
  }
  if (typeof event.questTitle !== "string" || event.questTitle.trim() === "") {
    return false;
  }
  return true;
}

/**
 * Validates a quest_progress event
 */
function validateQuestProgress(event: QuestProgressEvent): boolean {
  if (typeof event.questId !== "string" || event.questId.trim() === "") {
    return false;
  }
  if (typeof event.progress !== "number" || event.progress < 0) {
    return false;
  }
  return true;
}

/**
 * Validates a location_change event
 * - Location must be in the list of valid locations (if provided)
 */
function validateLocationChange(
  event: LocationChangeEvent,
  validLocations?: string[]
): boolean {
  if (typeof event.location !== "string" || event.location.trim() === "") {
    return false;
  }
  
  // If valid locations provided, enforce the constraint
  if (validLocations && validLocations.length > 0) {
    const locationLower = event.location.toLowerCase();
    const isValid = validLocations.some(
      (loc) => loc.toLowerCase() === locationLower
    );
    if (!isValid) {
      console.warn(
        `[Validator] Rejected location_change to "${event.location}" - not in valid locations: ${validLocations.join(", ")}`
      );
      return false;
    }
  }
  
  return true;
}

/**
 * Validates a combat_damage event
 */
function validateCombatDamage(event: CombatDamageEvent): boolean {
  if (typeof event.target !== "string" || event.target.trim() === "") {
    return false;
  }
  if (typeof event.damage !== "number" || event.damage < 0) {
    return false;
  }
  return true;
}

/**
 * Validates a combat_end event
 */
function validateCombatEnd(event: CombatEndEvent): boolean {
  if (typeof event.target !== "string" || event.target.trim() === "") {
    return false;
  }
  if (!["defeated", "fled", "escaped"].includes(event.outcome)) {
    return false;
  }
  return true;
}

/**
 * Validation context - additional data needed for validation
 */
export interface ValidationContext {
  validLocations?: string[]; // Valid POI names for location_change
}

/**
 * Validates a single proposed event
 */
function validateEvent(
  event: ProposedEvent,
  character: Character,
  context?: ValidationContext
): boolean {
  // All events must have a type
  if (!event || typeof event.type !== "string") {
    return false;
  }

  switch (event.type) {
    case "stat_change":
      return validateStatChange(event as StatChangeEvent, character);

    case "inventory_add":
      return validateInventoryAdd(event as InventoryAddEvent);

    case "inventory_remove":
      return validateInventoryRemove(event as InventoryRemoveEvent, character);

    case "world_update":
      return validateWorldUpdate(event as WorldUpdateEvent);

    case "relationship_change":
      return validateRelationshipChange(event as RelationshipChangeEvent);

    case "quest_start":
      return validateQuestStart(event as QuestStartEvent);

    case "quest_progress":
      return validateQuestProgress(event as QuestProgressEvent);

    case "location_change":
      return validateLocationChange(
        event as LocationChangeEvent,
        context?.validLocations
      );

    case "combat_damage":
      return validateCombatDamage(event as CombatDamageEvent);

    case "combat_end":
      return validateCombatEnd(event as CombatEndEvent);

    default:
      // Unknown event type - allow it through (future-proofing)
      return true;
  }
}

/**
 * Validates an array of proposed events and returns only the valid ones.
 * Invalid events are silently rejected (not applied).
 *
 * Requirements validated:
 * - 5.1: HP changes stay within 0 to maxHp
 * - 5.2: Gold changes don't go negative
 * - 5.3: Inventory items have required fields (name and type)
 * - 5.4: Invalid state changes are rejected silently
 * - Location changes must be to valid locations (if context provided)
 */
export function validateEvents(
  events: ProposedEvent[],
  character: Character,
  context?: ValidationContext
): ValidatedEvent[] {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.filter((event) => validateEvent(event, character, context));
}
