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
  explicit_sexual: "Let's keep the adventure appropriate for all travelers.",
  hate_speech: "Let's keep our words worthy of a true hero.",
  real_world_violence: "Let's focus on the fantasy realm, adventurer.",
  default: "Let's keep the adventure in the fantasy realm.",
};
