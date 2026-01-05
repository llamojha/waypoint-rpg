/**
 * Prompt template for intent detection (Rune Marshal)
 * Used to detect power words and determine if skill checks are needed
 * 
 * Template variables (replaced at runtime):
 * - {{PLAYER_ACTION}} - The player's input text
 * - {{LOCATION}} - Current POI name
 * - {{REGION}} - Current region name  
 * - {{SCENE}} - Scene description
 * - {{CHARACTER_SKILLS}} - Formatted list of character's trained skills
 * - {{SKILL_TREE}} - Full skill tree with power words by tier
 */

export const INTENT_DETECTION_PROMPT = `Analyze this player action to determine if a skill check is needed.

PLAYER ACTION: "{{PLAYER_ACTION}}"

CONTEXT:
- Location: {{LOCATION}} in {{REGION}}
- Scene: {{SCENE}}

CHARACTER SKILLS (current levels):
{{CHARACTER_SKILLS}}

SKILL TREE (for power word detection):
{{SKILL_TREE}}

RULES:
- ONLY set requires_roll=true if the player uses a POWER WORD from the skill tree above
- Power words are specific action verbs like "sneak", "strike", "persuade", "climb", etc.
- Regular dialogue, questions, or conversation = requires_roll=false (no check needed)
- Simple actions (looking, walking, talking) = requires_roll=false
- If no power word is detected, set requires_roll=false
- Power word bonuses: tier1 = +1, tier2 = +2, tier3 = +3 (set bonus field)
- Even if player has no skill levels, they can still attempt actions (bonus = 0)
- DC range: 10 (easy) to 20 (very hard), max 25 (nearly impossible)
- If action is impossible in context, set denial_reason

Call the detect_intent function with your analysis.`;

/**
 * Build the intent detection prompt with actual values
 */
export function buildIntentPrompt(
  playerAction: string,
  location: string,
  region: string,
  scene: string,
  characterSkills: string,
  skillTree: string
): string {
  return INTENT_DETECTION_PROMPT
    .replace("{{PLAYER_ACTION}}", playerAction)
    .replace("{{LOCATION}}", location)
    .replace("{{REGION}}", region)
    .replace("{{SCENE}}", scene)
    .replace("{{CHARACTER_SKILLS}}", characterSkills)
    .replace("{{SKILL_TREE}}", skillTree);
}
