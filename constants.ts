import {
  Character,
  Item,
  NPC,
  Quest,
  WorldContext,
  SkillProgression,
  SkillPillar,
  MapLocation,
  CodexEntry,
  Session,
} from "@/types";

// Test user ID for development (only used when USE_MOCK_USER=true)
export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// Feature flag for mock data mode (disabled by default)
// Use NEXT_PUBLIC_ prefix so it's available in client components
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

// Legacy alias for backward compatibility
export const USE_MOCK_USER = USE_MOCK_DATA;

// A shadowy hooded figure SVG
export const UNKNOWN_IMG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAyMDYxNyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiBmaWxsPSIjMGUxNzJhIiBmaWxsLW9wYWNpdHk9IjAuNSIgZmlsdGVyPSJ1cmwoI2JsdXIpIi8+PHBhdGggZD0iTTUwIDIwQzMwIDIwIDIwIDQwIDIwIDYwVjEwMEg4MFY2MEM4MCA0MCA3MCAyMCA1MCAyMFoiIGZpbGw9IiMwZjE3MmEiLz48cGF0aCBkPSJNNDAgNDVDMzUgNDUgMzAgNTAgMzAgNTVDMzAgNjAgMzUgNjUgNDAgNjVDNDUgNjUgNTAgNjAgNTAgNTVDNTAgNTAgNDUgNDUgNDAgNDVaIiBmaWxsPSIjZmJiZjI0IiBmaWxsLW9wYWNpdHk9IjAuMSIvPjxwYXRoIGQ9Ik02MCA0NUM1NSA0NSA1MCA1MCA1MCA1NUM1MCA2MCA1NSA2NSA2MCA2NUM2NSA2NSA3MCA2MCA3MCA1NUM3MCA1MCA2NSA0NSA2MCA0NVoiIGZpbGwPSIjZmJiZjI0IiBmaWxsLW9wYWNpdHk9IjAuMSIvPGRlZnM+PGZpbHRlciBpZD0iYmx1ciI+PGZlR2F1c3NpYW5CbHVyIGluPSJTb3VyY2VHcmFwaGljIiBzdGREZXZpYXRpb249IjUiLz48L2ZpbHRlcj48L2RlZnM+PC9zdmc+`;

export const SKILL_RULES = {
  unlockLevels: { tier1: 1, tier2: 4, tier3: 7 },
  wordBonus: { tier1: 1, tier2: 2, tier3: 3 },
};

/**
 * Item stat bounds by rarity tier
 * Used by Arbiter to validate item proposals
 */
export const ITEM_BOUNDS = {
  common: { maxDamage: 6, maxAC: 1, maxValue: 50 },
  uncommon: { maxDamage: 8, maxAC: 2, maxValue: 200 },
  rare: { maxDamage: 12, maxAC: 3, maxValue: 1000 },
  legendary: { maxDamage: 20, maxAC: 4, maxValue: 5000 },
} as const;

/**
 * Gold gain bounds by source type
 * Used by Arbiter to validate gold proposals and prevent exploits
 */
export const GOLD_BOUNDS = {
  combat_loot: { max: 25 },
  quest_reward: { max: 100 },
  npc_gift: { max: 5 },
  found_loot: { max: 20 },
  hard_cap: { max: 100 },
} as const;

export const SKILL_TREE: SkillPillar[] = [
  {
    pillar: "Combat",
    skills: [
      {
        name: "Melee",
        tier1: ["strike", "slash", "thrust"],
        tier2: ["feint", "cleave", "lunge"],
        tier3: ["disarm", "riposte", "execution"],
        aliases: ["hit", "stab", "swing"],
      },
      {
        name: "Ranged",
        tier1: ["aim", "shoot", "loose"],
        tier2: ["snipe", "volley", "pin"],
        tier3: ["called shot", "suppress", "deadeye"],
        aliases: ["fire", "launch", "fling"],
      },
      {
        name: "Styles",
        tier1: ["stance", "press", "guardbreak"],
        tier2: ["combo", "counter", "overwhelm"],
        tier3: ["perfect form", "mastery", "dominance"],
        aliases: ["style", "technique", "rhythm"],
      },
    ],
  },
  {
    pillar: "Defense",
    skills: [
      {
        name: "Blocking",
        tier1: ["block", "parry", "guard"],
        tier2: ["deflect", "intercept", "brace"],
        tier3: ["shieldwall", "nullify", "turnaside"],
        aliases: ["stop", "ward", "cover"],
      },
      {
        name: "Armor",
        tier1: ["don", "strap", "adjust"],
        tier2: ["reinforce", "fit", "harden"],
        tier3: ["fortify", "seal", "bulwark"],
        aliases: ["wear", "gearup", "protect"],
      },
      {
        name: "Toughness",
        tier1: ["endure", "shrug", "resist"],
        tier2: ["withstand", "grit", "steady"],
        tier3: ["unbreakable", "stoneblood", "ignore pain"],
        aliases: ["tank", "soak", "tough"],
      },
    ],
  },
  {
    pillar: "Athleticism",
    skills: [
      {
        name: "Athletics",
        tier1: ["climb", "swim", "lift"],
        tier2: ["haul", "grapple", "sprint"],
        tier3: ["scale", "powerthrough", "overtake"],
        aliases: ["run", "pull", "push"],
      },
      {
        name: "Acrobatics",
        tier1: ["balance", "jump", "roll"],
        tier2: ["vault", "tumble", "flip"],
        tier3: ["parkour", "aerial"],
        aliases: ["hop", "dodge", "sidestep"],
      },
      {
        name: "Endurance",
        tier1: ["pace", "breathe", "push on"],
        tier2: ["second wind", "rally breath", "longhaul"],
        tier3: ["marathoner", "tireless", "ironlungs"],
        aliases: ["keep going", "persist", "continue"],
      },
    ],
  },
  {
    pillar: "Stealth",
    skills: [
      {
        name: "Sneaking",
        tier1: ["sneak", "creep", "slip"],
        tier2: ["shadow", "stalk", "ghost"],
        tier3: ["vanish", "silent step", "unseen"],
        aliases: ["quietly", "tiptoe", "skulk"],
      },
      {
        name: "Hiding",
        tier1: ["hide", "conceal", "cover"],
        tier2: ["camouflage", "mask", "blend"],
        tier3: ["cloak", "disappear", "perfect cover"],
        aliases: ["duck", "crouch", "lurk"],
      },
      {
        name: "Scouting Unseen",
        tier1: ["scout", "peek", "listen"],
        tier2: ["recon", "survey", "map"],
        tier3: ["infiltrate", "mark routes", "bypass patrol"],
        aliases: ["check", "look ahead", "scope"],
      },
    ],
  },
  {
    pillar: "Sleight",
    skills: [
      {
        name: "Lockpicking",
        tier1: ["pick", "rake", "probe"],
        tier2: ["shim", "bypass", "finesse"],
        tier3: ["crack", "masterkey", "silent open"],
        aliases: ["unlock", "open", "jimmy"],
      },
      {
        name: "Trap Disarm",
        tier1: ["disarm", "disable", "jam"],
        tier2: ["defuse", "unhook", "reroute"],
        tier3: ["neutralize", "render safe", "disassemble"],
        aliases: ["stop trap", "mess with", "break mechanism"],
      },
      {
        name: "Sleight of Hand",
        tier1: ["palm", "pocket", "swipe"],
        tier2: ["lift", "plant", "misdirect"],
        tier3: ["switch", "vanish", "impossible hands"],
        aliases: ["grab", "take", "steal"],
      },
    ],
  },
  {
    pillar: "Charisma",
    skills: [
      {
        name: "Persuasion",
        tier1: ["persuade", "convince", "appeal"],
        tier2: ["negotiate", "reassure", "reason"],
        tier3: ["sway", "compel", "convert"],
        aliases: ["ask", "talk", "plead"],
      },
      {
        name: "Deception",
        tier1: ["lie", "bluff", "mislead"],
        tier2: ["fabricate", "forge story", "doubletalk"],
        tier3: ["gaslight", "frame", "perfect cover story"],
        aliases: ["fake", "pretend", "make up"],
      },
      {
        name: "Intimidation",
        tier1: ["threaten", "glare", "pressure"],
        tier2: ["menace", "break", "dominate"],
        tier3: ["terrorize", "cow", "crush will"],
        aliases: ["scare", "bully", "spook"],
      },
      {
        name: "Performance",
        tier1: ["perform", "sing", "act"],
        tier2: ["captivate", "enthrall", "showmanship"],
        tier3: ["mesmerize", "command stage", "legendary act"],
        aliases: ["entertain", "play music", "put on a show"],
      },
    ],
  },
  {
    pillar: "Wisdom",
    skills: [
      {
        name: "Perception",
        tier1: ["notice", "spot", "listen"],
        tier2: ["scan", "search", "scrutinize"],
        tier3: ["eagle-eye", "pinpoint", "true sight"],
        aliases: ["look", "watch", "check"],
      },
      {
        name: "Insight",
        tier1: ["read", "sense", "gauge"],
        tier2: ["discern", "profile", "detect motive"],
        tier3: ["see through", "psychoanalyze", "soulread"],
        aliases: ["feel out", "guess", "interpret"],
      },
    ],
  },
  {
    pillar: "Lore",
    skills: [
      {
        name: "History",
        tier1: ["recall", "recognize", "cite"],
        tier2: ["cross-reference", "contextualize", "verify"],
        tier3: ["authoritative", "lost chronicle", "definitive proof"],
        aliases: ["remember", "know", "info"],
      },
      {
        name: "Arcana",
        tier1: ["identify", "attune", "analyze"],
        tier2: ["decrypt", "unravel", "harmonize"],
        tier3: ["decode", "sigils", "absolute-theory"],
        aliases: ["magic-check", "examine", "figure out"],
      },
      {
        name: "Investigation",
        tier1: ["inspect", "examine", "search"],
        tier2: ["deduce", "reconstruct", "connect clues"],
        tier3: ["solve", "expose", "final inference"],
        aliases: ["look around", "check scene", "investigate"],
      },
    ],
  },
  {
    pillar: "Wilderness",
    skills: [
      {
        name: "Navigation",
        tier1: ["navigate", "orient", "chart"],
        tier2: ["triangulate", "route-plan", "wayfind"],
        tier3: ["never lost", "perfect bearings", "master path"],
        aliases: ["find way", "head toward", "travel"],
      },
      {
        name: "Camping & Shelter",
        tier1: ["camp", "shelter", "set up"],
        tier2: ["fortify camp", "hide camp", "secure perimeter"],
        tier3: ["survival bivouac", "stormproof", "invisible camp"],
        aliases: ["rest", "make camp", "sleep outdoors"],
      },
      {
        name: "Weather-Sense",
        tier1: ["forecast", "read clouds", "sense wind"],
        tier2: ["barometer sense", "track fronts", "predict storm"],
        tier3: ["stormcaller sense", "perfect forecast", "avert hazard"],
        aliases: ["weather check", "look at sky", "guess weather"],
      },
    ],
  },
  {
    pillar: "Hunting",
    skills: [
      {
        name: "Tracking",
        tier1: ["track", "follow", "trail"],
        tier2: ["read spoor", "backtrack", "pursue"],
        tier3: ["predict route", "reconstruct path", "manhunt"],
        aliases: ["tail", "trace", "hunt"],
      },
      {
        name: "Stalking Prey",
        tier1: ["stalk", "approach", "shadow"],
        tier2: ["ambush", "close distance", "cut off"],
        tier3: ["perfect ambush", "unseen hunter", "instant strike"],
        aliases: ["sneak up", "creep closer", "follow quietly"],
      },
      {
        name: "Trapping",
        tier1: ["snare", "bait", "set trap"],
        tier2: ["camouflage trap", "deadfall", "rig"],
        tier3: ["master trapline", "instant rig", "flawless trigger"],
        aliases: ["trap", "lure", "set up"],
      },
    ],
  },
  {
    pillar: "Gathering",
    skills: [
      {
        name: "Mining",
        tier1: ["mine", "dig", "chip"],
        tier2: ["prospect", "quarry", "vein-find"],
        tier3: ["strike motherlode", "precision cut", "extract"],
        aliases: ["pickaxe", "excavate", "break rock"],
      },
      {
        name: "Logging/Woodcutting",
        tier1: ["chop", "fell", "split"],
        tier2: ["hew", "saw", "timber"],
        tier3: ["select cut", "rapid fell", "perfect yield"],
        aliases: ["cut wood", "harvest trees", "lumber"],
      },
      {
        name: "Fishing",
        tier1: ["fish", "cast", "reel"],
        tier2: ["bait-switch", "net", "line-read"],
        tier3: ["haul", "trophy catch", "perfect hookset"],
        aliases: ["angle", "catch", "take fish"],
      },
      {
        name: "Foraging/Harvesting",
        tier1: ["forage", "gather", "pick"],
        tier2: ["identify edible", "harvest safely", "basket-run"],
        tier3: ["rare finds", "perfect harvest", "seasonal mastery"],
        aliases: ["collect", "search plants", "grab herbs"],
      },
    ],
  },
  {
    pillar: "Farming",
    skills: [
      {
        name: "Cultivation",
        tier1: ["plant", "tend", "water"],
        tier2: ["prune", "fertilize", "rotate crops"],
        tier3: ["green thumb", "perfect yield", "disease-proof"],
        aliases: ["garden", "grow", "farm"],
      },
    ],
  },
  {
    pillar: "Crafting",
    skills: [
      {
        name: "Crafting",
        tier1: ["craft", "make", "assemble"],
        tier2: ["refine", "customize", "improve"],
        tier3: ["masterwork", "prototype", "flawless"],
        aliases: ["build", "create", "put together"],
      },
      {
        name: "Repairs",
        tier1: ["repair", "patch", "tighten"],
        tier2: ["rebuild", "recalibrate", "reinforce"],
        tier3: ["restore", "overengineer", "perfect fix"],
        aliases: ["fix", "mend", "maintain"],
      },
    ],
  },
  {
    pillar: "Smithing",
    skills: [
      {
        name: "Smelting",
        tier1: ["smelt", "melt", "pour"],
        tier2: ["temper", "flux", "alloy"],
        tier3: ["pure ingot", "flawless cast", "master alloy"],
        aliases: ["heat metal", "refine ore", "foundry"],
      },
      {
        name: "Forging",
        tier1: ["forge", "hammer", "shape"],
        tier2: ["quench", "fold", "edge-set"],
        tier3: ["legendary blade", "perfect balance", "rune-ready"],
        aliases: ["make weapon", "craft armor", "blacksmith"],
      },
    ],
  },
  {
    pillar: "Woodwork",
    skills: [
      {
        name: "Fletching",
        tier1: ["fletch", "carve", "string"],
        tier2: ["tillering", "tune", "balanced shot"],
        tier3: ["warbow", "perfect draw", "silent bow"],
        aliases: ["make arrows", "craft bow", "whittle"],
      },
      {
        name: "Carpentry",
        tier1: ["saw", "join", "brace"],
        tier2: ["frame", "dovetail", "reinforce"],
        tier3: ["architect-grade", "stormproof", "perfect fit"],
        aliases: ["build", "woodwork", "construct"],
      },
    ],
  },
  {
    pillar: "Cooking",
    skills: [
      {
        name: "Cooking",
        tier1: ["cook", "roast", "boil"],
        tier2: ["season", "simmer", "sear"],
        tier3: ["chef’s touch", "feast", "perfect dish"],
        aliases: ["make food", "prepare meal", "fry"],
      },
      {
        name: "Preserving",
        tier1: ["dry", "salt", "smoke"],
        tier2: ["pickle", "cure", "can"],
        tier3: ["longkeep", "field ration", "pristine"],
        aliases: ["store food", "keep fresh", "preserve"],
      },
      {
        name: "Firemaking",
        tier1: ["spark", "kindle", "light"],
        tier2: ["bank coals", "quickfire", "smokeless"],
        tier3: ["stormfire", "invisible flame", "inferno"],
        aliases: ["start fire", "ignite", "burn"],
      },
    ],
  },
  {
    pillar: "Alchemy",
    skills: [
      {
        name: "Brewing",
        tier1: ["brew", "mix", "steep"],
        tier2: ["distill", "concentrate", "stabilize"],
        tier3: ["panacea", "perfect potion", "volatile brew"],
        aliases: ["make potion", "concoct", "combine"],
      },
      {
        name: "Poisons",
        tier1: ["poison", "taint", "coat"],
        tier2: ["envenom", "dose", "toxin craft"],
        tier3: ["silent kill", "perfect toxin", "antidote-proof"],
        aliases: ["drug", "contaminate", "lace"],
      },
      {
        name: "Reagents/Herbalism",
        tier1: ["harvest reagents", "identify herbs", "grind"],
        tier2: ["purify", "sort", "extract"],
        tier3: ["rare reagent", "flawless extract", "essence"],
        aliases: ["gather herbs", "collect plants", "reagents"],
      },
    ],
  },
  {
    pillar: "Trade",
    skills: [
      {
        name: "Barter",
        tier1: ["barter", "bargain", "haggle"],
        tier2: ["leverage", "bundle deal", "undercut"],
        tier3: ["market play", "price crush", "perfect deal"],
        aliases: ["negotiate price", "trade", "buy-sell"],
      },
      {
        name: "Appraisal",
        tier1: ["appraise", "estimate", "compare"],
        tier2: ["authenticate", "spot flaws", "price-check"],
        tier3: ["true value", "counterfeit sense", "expert judge"],
        aliases: ["value", "assess", "evaluate"],
      },
      {
        name: "Logistics",
        tier1: ["pack", "organize", "route"],
        tier2: ["optimize", "distribute", "schedule"],
        tier3: ["supply chain", "flawless delivery", "zero waste"],
        aliases: ["carry plan", "transport", "manage supplies"],
      },
    ],
  },
  {
    pillar: "Leadership",
    skills: [
      {
        name: "Rallying",
        tier1: ["rally", "encourage", "bolster"],
        tier2: ["inspire", "steady nerves", "lift morale"],
        tier3: ["unbreakable morale", "heroic surge", "battle hymn"],
        aliases: ["motivate", "pump up", "cheer"],
      },
      {
        name: "Command",
        tier1: ["command", "direct", "order"],
        tier2: ["coordinate", "assign roles", "call shots"],
        tier3: ["perfect command", "instant discipline", "decisive"],
        aliases: ["lead", "tell them", "manage"],
      },
      {
        name: "Tactics",
        tier1: ["flank", "regroup", "focus fire"],
        tier2: ["set formation", "bait", "counter-plan"],
        tier3: ["checkmate", "perfect strat", "battlefield genius"],
        aliases: ["plan", "strategy", "outthink"],
      },
    ],
  },
  {
    pillar: "Magic",
    skills: [
      {
        name: "Spellcasting",
        tier1: ["cast", "channel", "invoke"],
        tier2: ["weave", "shape", "amplify"],
        tier3: ["overcast", "perfect spell", "reality bend"],
        aliases: ["use magic", "spell", "conjure"],
      },
      {
        name: "Rituals",
        tier1: ["ritual", "prepare", "inscribe"],
        tier2: ["consecrate", "bind", "attune circle"],
        tier3: ["grand rite", "permanent seal", "epoch ritual"],
        aliases: ["ceremony", "rite", "magical prep"],
      },
      {
        name: "Wards",
        tier1: ["ward", "shield", "seal"],
        tier2: ["counterspell", "null field", "anchor"],
        tier3: ["absolute barrier", "perfect counter", "sanctum"],
        aliases: ["protect", "guard magic", "block spell"],
      },
      {
        name: "Summoning",
        tier1: ["summon", "call", "shift"],
        tier2: ["pact", "reshape"],
        tier3: ["true form", "perfect bind", "avatar"],
        aliases: ["bring creature", "transform", "change form"],
      },
    ],
  },
];

// Derived skill names for tool calling enums
export const SKILL_NAMES = SKILL_TREE.flatMap((pillar) =>
  pillar.skills.map((skill) => skill.name)
);

// Helper to initialize skills from the tree
const generateInitialSkills = (): Record<string, SkillProgression> => {
  const skills: Record<string, SkillProgression> = {};
  SKILL_TREE.forEach((pillar) => {
    pillar.skills.forEach((skill) => {
      skills[skill.name] = { level: 0, xp: 0, nextLevel: 100, verbs: [] };
    });
  });
  return skills;
};

export const INITIAL_SKILLS = generateInitialSkills();

export const MOCK_ITEMS: Item[] = [
  {
    id: "1",
    name: "Iron Dagger",
    type: "weapon",
    slot: "mainHand",
    tags: ["light", "finesse"],
    description: "A simple but reliable blade.",
    stats: { damage: "1d4+2", value: 5 },
    provenance: "Standard Issue",
  },
  {
    id: "2",
    name: "Leather Tunic",
    type: "armor",
    slot: "chest",
    tags: ["light"],
    description: "Worn leather and sturdy cloth.",
    stats: { ac: 2, value: 10 },
    provenance: "Standard Issue",
  },
  {
    id: "3",
    name: "Healing Potion",
    type: "consumable",
    tags: ["magic"],
    description: "Restores 1d4+2 HP.",
    stats: { value: 50 },
    provenance: "Found in Crate",
  },
  {
    id: "4",
    name: "Rusted Key",
    type: "quest",
    tags: ["ancient"],
    description: "Found in the marsh mud.",
    stats: { value: 0 },
    provenance: "Watchtower Grounds",
    isCanon: true,
  },
  {
    id: "5",
    name: "Wooden Shield",
    type: "armor",
    slot: "offHand",
    tags: ["wood"],
    description: "Splintered but functional.",
    stats: { ac: 1, value: 8 },
  },
  {
    id: "6",
    name: "Iron Helm",
    type: "armor",
    slot: "head",
    tags: ["heavy"],
    description: "Dented from previous battles.",
    stats: { ac: 1, value: 15 },
  },
  {
    id: "7",
    name: "Traveler Boots",
    type: "armor",
    slot: "legs",
    tags: ["leather"],
    description: "Muddy but comfortable.",
    stats: { ac: 0, value: 2 },
    skillBonuses: { "Navigation": 1 },
    passiveEffect: "Reduces travel fatigue",
  },
  {
    id: "8",
    name: "Thieves' Gloves",
    type: "armor",
    slot: "arms",
    tags: ["leather", "dark"],
    description: "Supple black leather with padded fingertips.",
    stats: { ac: 0, value: 25 },
    skillBonuses: { "Lockpicking": 2, "Pickpocket": 1 },
  },
  {
    id: "9",
    name: "Hunter's Cloak",
    type: "armor",
    slot: "cloak",
    tags: ["cloth", "camouflage"],
    description: "Mottled green and brown, blends with forest.",
    stats: { ac: 0, value: 20 },
    skillBonuses: { "Sneaking": 1, "Tracking": 1 },
    passiveEffect: "Advantage on hiding in wilderness",
  },
];

export const INITIAL_QUESTS: Quest[] = [
  {
    id: "q1",
    title: "The Silent Tower",
    description:
      "Investigate the ruins of the Watchtower for signs of the missing patrol.",
    status: "active",
    progress: 1,
    totalProgress: 3,
    leads: ["Search the cellar", "Speak to the Scout"],
  },
];

export const INITIAL_NPCS: NPC[] = [
  {
    id: "n1",
    name: "Captain Irena",
    role: "Guard Captain",
    relationship: 2,
    location: "Ash Coast Outpost",
    notes: ["Worried about the fog", "Trusts you slightly"],
    history: ["Gave you the mission", "Shared rations"],
    portraitUrl: "/npc_elodie.png",
  },
  {
    id: "n2",
    name: "Glimmer",
    role: "Scout",
    relationship: 0,
    location: "Watchtower Ruins",
    notes: ["Hiding in the shadows"],
    history: [],
    portraitUrl: "/npc_finlay.png",
  },
  {
    id: "npc_lucie",
    name: "Lucie",
    role: "Scholar",
    relationship: 1,
    location: "The Waypoint",
    portraitUrl: "/npc_lucie.png",
    notes: ["Studying the runes", "Found you"],
    history: [],
  },
  {
    id: "npc_dave",
    name: "Dave",
    role: "Sheep Farmer",
    relationship: 1,
    location: "The Needleback",
    portraitUrl: "/npc_dave.png",
    notes: ["Has a crook", "Likes sheep"],
    history: [],
  },
  {
    id: "npc_domhnall",
    name: "Domhnall",
    role: "Hunter Leader",
    relationship: 1,
    location: "The Flotsam Hold",
    portraitUrl: "/npc_domhnall.png",
    notes: ["Respected leader", "Sea-worn"],
    history: [],
  },
  {
    id: "npc_morag",
    name: "Morag",
    role: "Tavern Owner",
    relationship: 0,
    location: "The Flotsam Hold",
    portraitUrl: "/npc_morag.png",
    notes: ["Strict", "Protective"],
    history: [],
  },
  {
    id: "npc_ronan",
    name: "Ronan",
    role: "Storyteller",
    relationship: 1,
    location: "Brecan Hills",
    portraitUrl: "/npc_ronan.png",
    notes: ["Theatrical", "Armor is old"],
    history: [],
  },
];

export const MOCK_SESSIONS: Session[] = [
  {
    id: "s-1",
    title: "Arrival at Ash Coast",
    date: "Day 12",
    location: "Ash Coast Outpost",
    summary:
      "Arrived at the outpost. Met Captain Irena and accepted the contract to investigate the Silent Tower. Purchased supplies.",
    status: "completed",
  },
  {
    id: "s-2",
    title: "Into the Fog",
    date: "Day 13",
    location: "Watchtower Path",
    summary:
      "Traveled through the dense fog. Discovered strange tracks. Defended against a small pack of wolves.",
    status: "completed",
  },
  {
    id: "s-3",
    title: "The Ruins",
    date: "Day 14 (Current)",
    location: "Watchtower Ruins",
    summary:
      "Reached the ruins. Currently exploring the perimeter. Heard noises from the southern wall.",
    status: "active",
  },
];

export const INITIAL_WORLD: WorldContext = {
  name: "Test World",
  region: "Mistshrouded Valley",
  poi: "The Waypoint",
  time: { day: 1, phase: "Dawn" },
  weather: "Mist",
  description:
    "An ancient monolith of black stone rises from the heart of a mist-shrouded valley. Faint runes pulse along its surface, and the air hums with forgotten power.",
  imageUrl: "/location_waypoint.png",
  tags: [
    { name: "Ruins", type: "canon" },
    {
      name: "Guarded",
      type: "claim",
      description: "Believed to be bandit territory",
    },
  ],
  nearbyPoi: ["Fisherman's Hut", "The Old Road"],
  entities: ["n2"],
  memory: [
    {
      id: "m1",
      title: "The Missing Patrol",
      text: "Three guards vanished near here two nights ago.",
      type: "canon",
      status: "canonized",
    },
    {
      id: "m2",
      title: "Haunting",
      text: "Locals claim they hear weeping at night.",
      type: "news",
      status: "unverified",
    },
  ],
  activeCombat: null,
};

// For testing, give some starting skills - in production all start at 0
const startingSkills = generateInitialSkills();
// Uncomment below to test with some skills already leveled:
// startingSkills["Melee"] = { level: 2, xp: 150, nextLevel: 300, verbs: ["strike", "slash", "thrust"] };

export const INITIAL_CHARACTER: Character = {
  name: "",
  gender: undefined,
  portraitUrl: UNKNOWN_IMG,
  hp: 20,
  maxHp: 20,
  gold: 10,
  skills: generateInitialSkills(), // All skills start at level 0
  conditions: [],
  isMagicUnlocked: false,
  inventory: [MOCK_ITEMS[2]], // Just a healing potion to start
  equipment: {
    mainHand: MOCK_ITEMS[0], // Iron Dagger
    offHand: null,
    head: null,
    chest: MOCK_ITEMS[1], // Leather Tunic
    arms: null,
    legs: null,
    cloak: null,
    trinket: null,
  },
};

export const MOCK_INITIAL_TURN = {
  id: "t-init",
  timestamp: Date.now(),
  playerAction: "Start Adventure",
  narration:
    "You stand before The Waypoint. The monolithic black stone hums with a vibration that resonates in your chest. The runes glow softly through the thick mist of the valley. Your journey begins here.",
  isStreaming: false,
  suggestedActions: ["Look around", "Call out", "Draw weapon"],
  diffs: [],
};

// MOCK DATA FOR MAP & CODEX
export const MOCK_MAP_LOCATIONS: MapLocation[] = [
  {
    id: "loc1",
    name: "Nomante Outpost",
    type: "city",
    coordinates: { x: 28, y: 47 },
    status: "visited",
    description: "A small fortification on the grey sands.",
    region: "Ash Coast",
    artUrl: "/location_outpost.png",
  },
  {
    id: "loc2",
    name: "The Waypoint",
    type: "ruin",
    coordinates: { x: 48, y: 41 },
    status: "visited",
    description: "An ancient monolith pulsing with forgotten power.",
    region: "The Highlands",
    artUrl: "/location_waypoint.png",
  },
  {
    id: "loc_needleback",
    name: "The Needleback",
    type: "mountain",
    coordinates: { x: 55, y: 30 },
    status: "known",
    description: "A rugged mountain rising from highland prairie.",
    region: "The Highlands",
    artUrl: "/location_needleback.png",
  },
  {
    id: "loc_stormwall",
    name: "Stormwall Wilderness",
    type: "forest",
    coordinates: { x: 20, y: 60 },
    status: "known",
    description: "Harsh coastal terrain with exposed grey rock.",
    region: "Stormwall Coast",
    artUrl: "/location_stormwall_wilderness.png",
  },
  {
    id: "loc_black_fort",
    name: "Black Fort Ruins",
    type: "ruin",
    coordinates: { x: 15, y: 75 },
    status: "unknown",
    description: "Crumbling dark stone walls on a coastal cliff.",
    region: "Stormwall Coast",
    artUrl: "/location_black_fort.png",
  },
  {
    id: "loc_flotsam",
    name: "The Flotsam Hold",
    type: "city",
    coordinates: { x: 25, y: 80 },
    status: "known",
    description: "A sturdy tavern built from salvaged ship timbers.",
    region: "Stormwall Coast",
    artUrl: "/location_flotsam_hold.png",
  },
  {
    id: "loc_caledonia",
    name: "Caledonia City",
    type: "city",
    coordinates: { x: 75, y: 20 },
    status: "locked",
    description: "Bustling port city with ships crowding the harbor.",
    region: "Caledonia",
    artUrl: "/location_caledonia_city.png",
  },
  {
    id: "loc_dunamar",
    name: "Dunamar Wilderness",
    type: "forest",
    coordinates: { x: 80, y: 80 },
    status: "locked",
    description: "Arid terrain with dry bushes and cracked earth.",
    region: "Dunamar",
    artUrl: "/location_dunamar_wilderness.png",
  },
  {
    id: "loc_cueva",
    name: "La Cueva de Aris",
    type: "ruin",
    coordinates: { x: 85, y: 85 },
    status: "locked",
    description: "Deep cave entrance carved into a hillside.",
    region: "Dunamar",
    artUrl: "/location_cueva_aris.png",
  },
];

export const MOCK_CODEX_ENTRIES: CodexEntry[] = [
  {
    id: "c1",
    title: "The Ash Coast",
    category: "Locations",
    text: "A desolate stretch of black sand known for shipwrecks and treacherous tides.",
    status: "canon",
    tags: ["region", "dangerous"],
  },
  {
    id: "c2",
    title: "Highlands Wolves",
    category: "Bestiary",
    text: "Grey wolves that hunt in packs across the highlands. Territorial and cunning.",
    status: "canon",
    tags: ["enemy", "wildlife"],
  },
  {
    id: "c3",
    title: "The Bandit Problem",
    category: "History",
    text: "Outlaws have plagued the trade roads for years, preying on merchants and travelers.",
    status: "canon",
    tags: ["threat", "humanoid"],
  },
  {
    id: "c4",
    title: "Iron Guild",
    category: "Factions",
    text: "Merchants controlling the ore trade from Ironhold to the coast.",
    status: "canon",
    tags: ["trade", "powerful"],
  },
  {
    id: "c5",
    title: "Wild Boars",
    category: "Bestiary",
    text: "Aggressive beasts that charge when threatened. Their tusks can gore a man.",
    status: "canon",
    tags: ["enemy", "wildlife"],
  },
  {
    id: "c6",
    title: "The Watcher's Oath",
    category: "History",
    text: "An ancient pact sworn by the first rangers to guard the coastline from raiders.",
    status: "canon",
    tags: ["treaty", "ancient"],
  },
];


// ============================================
// DEMO EXPERIENCE - The Highlands
// ============================================

// Demo Starting World State
export const DEMO_WORLD: WorldContext = {
  name: "Eldoria",
  region: "The Highlands",
  poi: "The Waystone",
  time: { day: 1, phase: "Morning" },
  weather: "Clear",
  description:
    "An ancient waystone rises from the prairie grass, its weathered surface etched with faded runes. The air around it shimmers faintly, carrying whispers of distant places.",
  imageUrl: "/location_waypoint.png",
  tags: [{ name: "Safe Zone", type: "canon" }],
  nearbyPoi: ["Nomante Outpost", "Highlands Wilderness"],
  entities: ["lucie"],
  memory: [],
  activeCombat: null,
};

// Demo Starting Character (cloth armor only, no gold, empty inventory)
export const DEMO_CHARACTER: Partial<Character> = {
  hp: 20,
  maxHp: 20,
  gold: 0,
  skills: generateInitialSkills(),
  conditions: [],
  isMagicUnlocked: false,
  inventory: [],
  equipment: {
    mainHand: null,
    offHand: null,
    head: null,
    chest: {
      id: "cloth-armor",
      name: "Cloth Tunic",
      type: "armor",
      slot: "chest",
      tags: ["cloth", "basic"],
      description: "Simple cloth garments. Better than nothing.",
      stats: { ac: 0, value: 1 },
    },
    arms: null,
    legs: null,
    cloak: null,
    trinket: null,
  },
};

// Opening narration for new players
export const OPENING_NARRATION = `You open your eyes to golden sunlight and the rustle of prairie grass.

The last thing you remember is... nothing. A void where memory should be. You're lying at the base of an ancient stone monolith, its surface covered in faded runes that seem to shimmer in the morning light.

A young woman in scholar's robes notices you stirring. She gasps, nearly dropping her notebook, then hurries over with wide eyes.

"You're awake! I— I can't believe it actually worked. Well, not worked exactly, I didn't do anything, but— oh!" She catches herself, cheeks flushing. "I'm Lucie. I've been studying this waystone for months and you just... appeared. In a flash of light. Are you alright?"

She gestures toward a distant cluster of buildings visible across the prairie. "There's an outpost not far from here. Nomante Outpost. Captain Aran can help you get equipped if you're... new to these lands."`;

export const OPENING_SUGGESTED_ACTIONS = [
  "Talk to Lucie",
  "Examine the waystone",
  "Look around",
  "Check yourself",
];

// Demo Items
export const DEMO_ITEMS: Record<string, Item> = {
  simpleSword: {
    id: "simple-sword",
    name: "Simple Sword",
    type: "weapon",
    slot: "mainHand",
    tags: ["iron", "standard"],
    description: "A well-maintained iron sword. Nothing fancy, but reliable.",
    stats: { damage: "1d6", value: 15 },
    provenance: "Nomante Outpost",
  },
  usedLeatherArmor: {
    id: "used-leather-armor",
    name: "Used Leather Armor",
    type: "armor",
    slot: "chest",
    tags: ["leather", "used"],
    description: "Worn but serviceable leather armor. Shows signs of previous owners.",
    stats: { ac: 2, value: 20 },
    provenance: "Nomante Outpost",
  },
  rations: {
    id: "rations",
    name: "Rations",
    type: "consumable",
    tags: ["food"],
    description: "Dried meat and hardtack. Enough for a few days.",
    stats: { value: 5 },
    provenance: "Nomante Outpost",
  },
  huntingBow: {
    id: "hunting-bow",
    name: "Hunting Bow",
    type: "weapon",
    slot: "mainHand",
    tags: ["wood", "ranged"],
    description: "A simple but effective hunting bow.",
    stats: { damage: "1d6", value: 25 },
    provenance: "Adrian's spare",
  },
  rawMeat: {
    id: "raw-meat",
    name: "Raw Boar Meat",
    type: "misc",
    tags: ["food", "raw"],
    description: "Fresh meat from a wild boar. Should be cooked.",
    stats: { value: 10 },
  },
  blueberries: {
    id: "blueberries",
    name: "Blueberries",
    type: "misc",
    tags: ["food", "berries"],
    description: "A handful of ripe blueberries. Helga's favorite.",
    stats: { value: 5 },
  },
  blueberryPie: {
    id: "blueberry-pie",
    name: "Blueberry Pie",
    type: "consumable",
    tags: ["food", "healing"],
    description: "Helga's famous blueberry pie. Restores 2d4 HP.",
    stats: { value: 15, healing: "2d4" },
    provenance: "Helga's recipe",
  },
  luciesToken: {
    id: "lucies-token",
    name: "Lucie's Token",
    type: "trinket",
    slot: "trinket",
    tags: ["handmade", "mysterious"],
    description: "A small handmade charm given by Lucie. It has a strange warmth to it, and something about it feels... significant.",
    stats: { value: 0 },
    provenance: "Gift from Lucie",
  },
};

// Wild Boar enemy template
export const WILD_BOAR = {
  name: "Wild Boar",
  tier: "easy",
  hp: 8,
  maxHp: 8,
  defense: 10,
  damage: "1d4",
  xp: 15,
  behavior: "Aggressive when threatened, charges at attackers",
  loot: { gold: "0", items: ["Raw Boar Meat"] },
};

// Wanderer encounter chance (15%)
export const WANDERER_ENCOUNTER_CHANCE = 0.15;

export const RESPAWN_LOCATION = 'The Waystone';
