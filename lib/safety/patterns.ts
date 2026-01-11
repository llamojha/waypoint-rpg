/**
 * Content safety blocklist patterns
 * Only blocks: explicit sexual, hate speech, real-world violence instructions
 * Fantasy violence/gore is ALLOWED
 */

export const BLOCK_PATTERNS: Record<string, RegExp[]> = {
  explicit_sexual: [
    // Explicit sexual acts and solicitation
    /\b(porn|pornograph|hentai|xxx)\b/gi,
    /\b(rape|molest|pedophil)\w*/gi,
    /\bsex(ual)?\s+(slave|traffic)/gi,
    // Sexual assault / groping - requires explicit sexual body parts
    /\b(grab|grope|fondle|squeeze)\s+(her|his|their)?\s*(breast|tit|crotch|groin|genital|privates?)\b/gi,
    /\b(grab|grope|touch|fondle)\s+.{0,20}\b(sexually|inappropriately)\b/gi,
    /\bsexual(ly)?\s+(assault|harass|abuse|force)/gi,
    /\bforc(e|ing)\s+.{0,30}\b(sex|kiss|touch|strip|undress)/gi,
    // Underwear / clothing theft with sexual intent
    /\b(steal|take|rip|tear|remove)\s+.{0,20}\b(underwear|panties?|bra)\b/gi,
    /\b(underwear|panties?|bra)\b.{0,20}\b(steal|take|rip|grab)\b/gi,
    // Body parts in sexual context - only explicit sexual parts
    /\b(her|his)\s+(breast|tit|crotch|groin|privates?)\b/gi,
  ],

  sexual_coercion: [
    // Forcing / coercing NPCs (but NOT "force myself")
    /\bforc(e|ing)\s+(her|him|them|the\s+\w+)\b/gi,
    /\b(while|as)\s+(i('m)?|i\s+am)\s+forc(e|ing)\s+(her|him|them)/gi,
    /\bmug\s+.{0,20}\b(underwear|panties?|bra)\b/gi,
  ],

  hate_speech: [
    // Racial slurs - abbreviated patterns to avoid reproducing slurs
    /\bn[i1]gg[ae3]r?\b/gi,
    /\bk[i1]ke\b/gi,
    /\bsp[i1]c\b/gi,
    /\bch[i1]nk\b/gi,
    /\bwetback\b/gi,
    /\btowelhead\b/gi,
    /\bgoat\s*f[u\*]cker/gi,
    // Targeted harassment patterns
    /\b(kill|murder|hang|lynch)\s+(all\s+)?(jews|muslims|blacks|whites|gays|trans)/gi,
    /\bdeath\s+to\s+(jews|muslims|blacks|whites|gays|trans)/gi,
  ],

  real_world_violence: [
    // Terrorism and real-world harm
    /\b(make|build|create)\s+(a\s+)?(bomb|explosive|ied)\b/gi,
    /\bhow\s+to\s+(make|build)\s+(a\s+)?(bomb|poison|weapon)/gi,
    /\b(school|mass)\s+shoot/gi,
    /\bterrorist\s+(attack|plot)/gi,
    // Real people/places as targets
    /\b(assassinate|kill|murder)\s+(the\s+)?(president|pope|queen|king)\b/gi,
  ],
};

/**
 * Friendly redirect messages per category
 */
export const REDIRECT_MESSAGES: Record<string, string> = {
  explicit_sexual: "Let's keep the adventure appropriate for all travelers. That action isn't something your character would do.",
  sexual_coercion: "Your character wouldn't do that. Let's focus on the adventure.",
  hate_speech: "Let's keep our words worthy of a true hero.",
  real_world_violence: "Let's focus on the fantasy realm, adventurer.",
  default: "Let's keep the adventure in the fantasy realm.",
};

/**
 * Soft redirect narrations - immersive in-world responses for unsafe content
 * These maintain narrative flow while steering away from inappropriate actions
 */
export const SOFT_REDIRECTS: Record<string, string> = {
  explicit_sexual: "Your character hesitates, a strange unease washing over them. Something about this path feels wrong, as if the very air resists the thought. Perhaps there's a better way forward.",
  sexual_coercion: "You reach out, but your hand stops mid-motion. A voice in the back of your mind whispers caution—this isn't who you are. The moment passes, and you find yourself reconsidering.",
  hate_speech: "The words form on your lips, but they taste like ash. The world around you seems to dim for a moment, as if rejecting the very thought. You shake your head, clearing the fog.",
  real_world_violence: "Your thoughts drift somewhere dark, but the mists of this realm seem to push back against them. This world has its own rules, its own conflicts. Best to focus on what's before you.",
  default: "Your character pauses, sensing this path leads somewhere they shouldn't go. The moment passes, and clearer thoughts return.",
};
