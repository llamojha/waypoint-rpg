/**
 * Location Rules
 * Handles travel graph validation and location requirements
 */

import type { TravelValidationResult, RuleConstraints } from "./types";
import { getLocationConnectionRules } from "./cache";

interface CharacterForTravel {
  inventory: Array<{ name: string }>;
  questsCompleted?: string[];
}

/**
 * Check if travel from one location to another is valid
 */
export async function canTravelTo(
  from: string,
  to: string,
  character: CharacterForTravel,
  npcRelationships?: Record<string, number>
): Promise<TravelValidationResult> {
  const connections = await getLocationConnectionRules();

  // Find connection (case-insensitive)
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();
  const connection = connections.find(
    (c) =>
      c.fromLocation.toLowerCase() === fromLower &&
      c.toLocation.toLowerCase() === toLower
  );

  if (!connection) {
    return {
      valid: false,
      reason: `No path from "${from}" to "${to}"`,
      unmetRequirements: [],
    };
  }

  const unmetRequirements: string[] = [];

  // Check quest requirement
  if (connection.requirements?.quest) {
    if (!character.questsCompleted?.includes(connection.requirements.quest)) {
      unmetRequirements.push(`Complete quest: ${connection.requirements.quest}`);
    }
  }

  // Check item requirement
  if (connection.requirements?.item) {
    const hasItem = character.inventory.some(
      (item) => item.name.toLowerCase() === connection.requirements!.item!.toLowerCase()
    );
    if (!hasItem) {
      unmetRequirements.push(`Need item: ${connection.requirements.item}`);
    }
  }

  // Check reputation requirement
  if (connection.requirements?.reputation) {
    const { npc, min } = connection.requirements.reputation;
    const currentRep = npcRelationships?.[npc] ?? 0;
    if (currentRep < min) {
      unmetRequirements.push(`Need ${min}+ reputation with ${npc}`);
    }
  }

  return {
    valid: unmetRequirements.length === 0,
    reason: unmetRequirements.length > 0 ? "Requirements not met" : undefined,
    unmetRequirements,
    travelTime: connection.travelTime,
  };
}

/**
 * Get all valid destinations from a location
 */
export async function getValidDestinations(
  from: string,
  character: CharacterForTravel,
  npcRelationships?: Record<string, number>
): Promise<string[]> {
  const connections = await getLocationConnectionRules();
  const fromLower = from.toLowerCase();

  const destinations: string[] = [];

  for (const connection of connections) {
    if (connection.fromLocation.toLowerCase() === fromLower) {
      const result = await canTravelTo(
        from,
        connection.toLocation,
        character,
        npcRelationships
      );
      if (result.valid) {
        destinations.push(connection.toLocation);
      }
    }
  }

  return destinations;
}

/**
 * Get location constraints for prompt injection
 */
export async function getLocationConstraints(
  from: string,
  character: CharacterForTravel,
  npcRelationships?: Record<string, number>
): Promise<RuleConstraints> {
  const validDestinations = await getValidDestinations(from, character, npcRelationships);

  return {
    validOptions: validDestinations,
    context:
      validDestinations.length > 0
        ? `Can travel to: ${validDestinations.join(", ")}`
        : "No valid travel destinations",
  };
}
