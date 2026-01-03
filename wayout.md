## Waypoint — MVP / Idea summary (≤5000 chars)

### What it is
Waypoint is a browser-based **asynchronous play-by-post RPG sandbox**: you create a character with **(Race/Class/Background)** and play turn-by-turn in a **single persistent world** across multiple adventures, with **streamed DM narration** and mechanics that **cannot contradict the UI state**. This is inspired in MUD and MUD2, the idea of having a game/system with strict rules that are linked to database/scripts and allows the user to live any type of adventure within their world and keep tracking on the server state.

### Core problem
Most AI RPG sites devolve into “just storytelling” and **hallucinate mechanics/state** (items, HP, quest progress). Waypoint’s promise is **mechanics-first consistency**: backend state is authoritative and the AI can only propose changes that are validated before committing.

### Key differentiator (agent-ish / modular mechanics)
Not one chatbot: a **sandbox system** where mechanics are handled deterministically and fed into high-creativity narration. Architecture is modular (World/Adventure/Rules/Memory/Streaming/UI + LLM interface), enabling “AI RPG Sandbox Agents” without letting them directly mutate truth.

### Gameplay loop (MVP)
Player types an action → backend resolves rolls/mechanics → DM narration streams in **SSE segments** → validated **state diffs** apply → UI updates panels (quests, news, relationships, skills, inventory).

### Mechanics included in MVP
- **Skills + checks** (DM triggers; player clicks Roll; server rolls + stores result)
- **Inventory/equipment** (equip slots; server applies truth; narration must match)
- **Rumors → quests** with statuses and leads (sandbox rails)
- **NPC relationships** with persistent score/state updated via diffs

### LLM reliability approach (critical)
Two-pass generation:
- **Pass A:** Narration + `proposed_events`
- **Pass B:** **Validator/extractor emits validated diffs only** (reject impossible changes) to prevent narration/UI mismatch.

### Safety/guardrails (MVP)
Input/output filtering + refusal/rewrite policy so unsafe content doesn’t enter narration, while mechanics remain structured. Keep rating simple: **PG-13 fantasy** (no explicit sexual content, hate, etc.).

### Explicit non-goals (MVP)
No multiplayer, no image gen, no full tactical combat/maps, no community marketplace, no long-term vector memory (post-MVP).

### Skills and Power Words

We have Skills or Attributes Pillars, each of them have a specific skill and in there we have power words.
Power words are verbs or actions that the user use during as part of their round/turn in text. The LLM will analyze the context and see if there is a power words in there, if there is it will give a roll check (if required) with a bonus. The user can level up and unlock power words by doing things.

Here is a list of them:


export const SKILL_TREE: SkillPillar[] = [
  {
    pillar: 'Combat',
    skills: [
      { name: 'Melee', tier1: ['strike', 'slash', 'thrust'], tier2: ['feint', 'cleave', 'lunge'], tier3: ['disarm', 'riposte', 'execution'], aliases: ['hit', 'stab', 'swing'] },
      { name: 'Ranged', tier1: ['aim', 'shoot', 'loose'], tier2: ['snipe', 'volley', 'pin'], tier3: ['called shot', 'suppress', 'deadeye'], aliases: ['fire', 'launch', 'fling'] },
      { name: 'Styles', tier1: ['stance', 'press', 'guardbreak'], tier2: ['combo', 'counter', 'overwhelm'], tier3: ['perfect form', 'mastery', 'dominance'], aliases: ['style', 'technique', 'rhythm'] }
    ]
  },
  {
    pillar: 'Defense',
    skills: [
      { name: 'Blocking', tier1: ['block', 'parry', 'guard'], tier2: ['deflect', 'intercept', 'brace'], tier3: ['shieldwall', 'nullify', 'turnaside'], aliases: ['stop', 'ward', 'cover'] },
      { name: 'Armor', tier1: ['don', 'strap', 'adjust'], tier2: ['reinforce', 'fit', 'harden'], tier3: ['fortify', 'seal', 'bulwark'], aliases: ['wear', 'gearup', 'protect'] },
      { name: 'Toughness', tier1: ['endure', 'shrug', 'resist'], tier2: ['withstand', 'grit', 'steady'], tier3: ['unbreakable', 'stoneblood', 'ignore pain'], aliases: ['tank', 'soak', 'tough'] }
    ]
  },
  {
    pillar: 'Athleticism',
    skills: [
      { name: 'Athletics', tier1: ['climb', 'swim', 'lift'], tier2: ['haul', 'grapple', 'sprint'], tier3: ['scale', 'powerthrough', 'overtake'], aliases: ['run', 'pull', 'push'] },
      { name: 'Acrobatics', tier1: ['balance', 'jump', 'roll'], tier2: ['vault', 'tumble', 'flip'], tier3: ['parkour', 'aerial'], aliases: ['hop', 'dodge', 'sidestep'] },
      { name: 'Endurance', tier1: ['pace', 'breathe', 'push on'], tier2: ['second wind', 'rally breath', 'longhaul'], tier3: ['marathoner', 'tireless', 'ironlungs'], aliases: ['keep going', 'persist', 'continue'] }
    ]
  },
  {
    pillar: 'Stealth',
    skills: [
      { name: 'Sneaking', tier1: ['sneak', 'creep', 'slip'], tier2: ['shadow', 'stalk', 'ghost'], tier3: ['vanish', 'silent step', 'unseen'], aliases: ['quietly', 'tiptoe', 'skulk'] },
      { name: 'Hiding', tier1: ['hide', 'conceal', 'cover'], tier2: ['camouflage', 'mask', 'blend'], tier3: ['cloak', 'disappear', 'perfect cover'], aliases: ['duck', 'crouch', 'lurk'] },
      { name: 'Scouting Unseen', tier1: ['scout', 'peek', 'listen'], tier2: ['recon', 'survey', 'map'], tier3: ['infiltrate', 'mark routes', 'bypass patrol'], aliases: ['check', 'look ahead', 'scope'] }
    ]
  },
  {
    pillar: 'Sleight',
    skills: [
      { name: 'Lockpicking', tier1: ['pick', 'rake', 'probe'], tier2: ['shim', 'bypass', 'finesse'], tier3: ['crack', 'masterkey', 'silent open'], aliases: ['unlock', 'open', 'jimmy'] },
      { name: 'Trap Disarm', tier1: ['disarm', 'disable', 'jam'], tier2: ['defuse', 'unhook', 'reroute'], tier3: ['neutralize', 'render safe', 'disassemble'], aliases: ['stop trap', 'mess with', 'break mechanism'] },
      { name: 'Sleight of Hand', tier1: ['palm', 'pocket', 'swipe'], tier2: ['lift', 'plant', 'misdirect'], tier3: ['switch', 'vanish', 'impossible hands'], aliases: ['grab', 'take', 'steal'] }
    ]
  },
  {
    pillar: 'Charisma',
    skills: [
      { name: 'Persuasion', tier1: ['persuade', 'convince', 'appeal'], tier2: ['negotiate', 'reassure', 'reason'], tier3: ['sway', 'compel', 'convert'], aliases: ['ask', 'talk', 'plead'] },
      { name: 'Deception', tier1: ['lie', 'bluff', 'mislead'], tier2: ['fabricate', 'forge story', 'doubletalk'], tier3: ['gaslight', 'frame', 'perfect cover story'], aliases: ['fake', 'pretend', 'make up'] },
      { name: 'Intimidation', tier1: ['threaten', 'glare', 'pressure'], tier2: ['menace', 'break', 'dominate'], tier3: ['terrorize', 'cow', 'crush will'], aliases: ['scare', 'bully', 'spook'] },
      { name: 'Performance', tier1: ['perform', 'sing', 'act'], tier2: ['captivate', 'enthrall', 'showmanship'], tier3: ['mesmerize', 'command stage', 'legendary act'], aliases: ['entertain', 'play music', 'put on a show'] }
    ]
  },
  {
    pillar: 'Wisdom',
    skills: [
      { name: 'Perception', tier1: ['notice', 'spot', 'listen'], tier2: ['scan', 'search', 'scrutinize'], tier3: ['eagle-eye', 'pinpoint', 'true sight'], aliases: ['look', 'watch', 'check'] },
      { name: 'Insight', tier1: ['read', 'sense', 'gauge'], tier2: ['discern', 'profile', 'detect motive'], tier3: ['see through', 'psychoanalyze', 'soulread'], aliases: ['feel out', 'guess', 'interpret'] }
    ]
  },
  {
    pillar: 'Lore',
    skills: [
      { name: 'History', tier1: ['recall', 'recognize', 'cite'], tier2: ['cross-reference', 'contextualize', 'verify'], tier3: ['authoritative', 'lost chronicle', 'definitive proof'], aliases: ['remember', 'know', 'info'] },
      { name: 'Arcana', tier1: ['identify', 'attune', 'analyze'], tier2: ['decrypt', 'unravel', 'harmonize'], tier3: ['decode', 'sigils', 'absolute-theory'], aliases: ['magic-check', 'examine', 'figure out'] },
      { name: 'Investigation', tier1: ['inspect', 'examine', 'search'], tier2: ['deduce', 'reconstruct', 'connect clues'], tier3: ['solve', 'expose', 'final inference'], aliases: ['look around', 'check scene', 'investigate'] }
    ]
  },
  {
    pillar: 'Wilderness',
    skills: [
      { name: 'Navigation', tier1: ['navigate', 'orient', 'chart'], tier2: ['triangulate', 'route-plan', 'wayfind'], tier3: ['never lost', 'perfect bearings', 'master path'], aliases: ['find way', 'head toward', 'travel'] },
      { name: 'Camping & Shelter', tier1: ['camp', 'shelter', 'set up'], tier2: ['fortify camp', 'hide camp', 'secure perimeter'], tier3: ['survival bivouac', 'stormproof', 'invisible camp'], aliases: ['rest', 'make camp', 'sleep outdoors'] },
      { name: 'Weather-Sense', tier1: ['forecast', 'read clouds', 'sense wind'], tier2: ['barometer sense', 'track fronts', 'predict storm'], tier3: ['stormcaller sense', 'perfect forecast', 'avert hazard'], aliases: ['weather check', 'look at sky', 'guess weather'] }
    ]
  },
  {
    pillar: 'Hunting',
    skills: [
      { name: 'Tracking', tier1: ['track', 'follow', 'trail'], tier2: ['read spoor', 'backtrack', 'pursue'], tier3: ['predict route', 'reconstruct path', 'manhunt'], aliases: ['tail', 'trace', 'hunt'] },
      { name: 'Stalking Prey', tier1: ['stalk', 'approach', 'shadow'], tier2: ['ambush', 'close distance', 'cut off'], tier3: ['perfect ambush', 'unseen hunter', 'instant strike'], aliases: ['sneak up', 'creep closer', 'follow quietly'] },
      { name: 'Trapping', tier1: ['snare', 'bait', 'set trap'], tier2: ['camouflage trap', 'deadfall', 'rig'], tier3: ['master trapline', 'instant rig', 'flawless trigger'], aliases: ['trap', 'lure', 'set up'] }
    ]
  },
  {
    pillar: 'Gathering',
    skills: [
      { name: 'Mining', tier1: ['mine', 'dig', 'chip'], tier2: ['prospect', 'quarry', 'vein-find'], tier3: ['strike motherlode', 'precision cut', 'extract'], aliases: ['pickaxe', 'excavate', 'break rock'] },
      { name: 'Logging/Woodcutting', tier1: ['chop', 'fell', 'split'], tier2: ['hew', 'saw', 'timber'], tier3: ['select cut', 'rapid fell', 'perfect yield'], aliases: ['cut wood', 'harvest trees', 'lumber'] },
      { name: 'Fishing', tier1: ['fish', 'cast', 'reel'], tier2: ['bait-switch', 'net', 'line-read'], tier3: ['haul', 'trophy catch', 'perfect hookset'], aliases: ['angle', 'catch', 'take fish'] },
      { name: 'Foraging/Harvesting', tier1: ['forage', 'gather', 'pick'], tier2: ['identify edible', 'harvest safely', 'basket-run'], tier3: ['rare finds', 'perfect harvest', 'seasonal mastery'], aliases: ['collect', 'search plants', 'grab herbs'] }
    ]
  },
  {
    pillar: 'Farming',
    skills: [
      { name: 'Cultivation', tier1: ['plant', 'tend', 'water'], tier2: ['prune', 'fertilize', 'rotate crops'], tier3: ['green thumb', 'perfect yield', 'disease-proof'], aliases: ['garden', 'grow', 'farm'] }
    ]
  },
  {
    pillar: 'Crafting',
    skills: [
      { name: 'Crafting', tier1: ['craft', 'make', 'assemble'], tier2: ['refine', 'customize', 'improve'], tier3: ['masterwork', 'prototype', 'flawless'], aliases: ['build', 'create', 'put together'] },
      { name: 'Repairs', tier1: ['repair', 'patch', 'tighten'], tier2: ['rebuild', 'recalibrate', 'reinforce'], tier3: ['restore', 'overengineer', 'perfect fix'], aliases: ['fix', 'mend', 'maintain'] }
    ]
  },
  {
    pillar: 'Smithing',
    skills: [
      { name: 'Smelting', tier1: ['smelt', 'melt', 'pour'], tier2: ['temper', 'flux', 'alloy'], tier3: ['pure ingot', 'flawless cast', 'master alloy'], aliases: ['heat metal', 'refine ore', 'foundry'] },
      { name: 'Forging', tier1: ['forge', 'hammer', 'shape'], tier2: ['quench', 'fold', 'edge-set'], tier3: ['legendary blade', 'perfect balance', 'rune-ready'], aliases: ['make weapon', 'craft armor', 'blacksmith'] }
    ]
  },
  {
    pillar: 'Woodwork',
    skills: [
      { name: 'Fletching', tier1: ['fletch', 'carve', 'string'], tier2: ['tillering', 'tune', 'balanced shot'], tier3: ['warbow', 'perfect draw', 'silent bow'], aliases: ['make arrows', 'craft bow', 'whittle'] },
      { name: 'Carpentry', tier1: ['saw', 'join', 'brace'], tier2: ['frame', 'dovetail', 'reinforce'], tier3: ['architect-grade', 'stormproof', 'perfect fit'], aliases: ['build', 'woodwork', 'construct'] }
    ]
  },
  {
    pillar: 'Cooking',
    skills: [
      { name: 'Cooking', tier1: ['cook', 'roast', 'boil'], tier2: ['season', 'simmer', 'sear'], tier3: ['chef’s touch', 'feast', 'perfect dish'], aliases: ['make food', 'prepare meal', 'fry'] },
      { name: 'Preserving', tier1: ['dry', 'salt', 'smoke'], tier2: ['pickle', 'cure', 'can'], tier3: ['longkeep', 'field ration', 'pristine'], aliases: ['store food', 'keep fresh', 'preserve'] },
      { name: 'Firemaking', tier1: ['spark', 'kindle', 'light'], tier2: ['bank coals', 'quickfire', 'smokeless'], tier3: ['stormfire', 'invisible flame', 'inferno'], aliases: ['start fire', 'ignite', 'burn'] }
    ]
  },
  {
    pillar: 'Alchemy',
    skills: [
      { name: 'Brewing', tier1: ['brew', 'mix', 'steep'], tier2: ['distill', 'concentrate', 'stabilize'], tier3: ['panacea', 'perfect potion', 'volatile brew'], aliases: ['make potion', 'concoct', 'combine'] },
      { name: 'Poisons', tier1: ['poison', 'taint', 'coat'], tier2: ['envenom', 'dose', 'toxin craft'], tier3: ['silent kill', 'perfect toxin', 'antidote-proof'], aliases: ['drug', 'contaminate', 'lace'] },
      { name: 'Reagents/Herbalism', tier1: ['harvest reagents', 'identify herbs', 'grind'], tier2: ['purify', 'sort', 'extract'], tier3: ['rare reagent', 'flawless extract', 'essence'], aliases: ['gather herbs', 'collect plants', 'reagents'] }
    ]
  },
  {
    pillar: 'Trade',
    skills: [
      { name: 'Barter', tier1: ['barter', 'bargain', 'haggle'], tier2: ['leverage', 'bundle deal', 'undercut'], tier3: ['market play', 'price crush', 'perfect deal'], aliases: ['negotiate price', 'trade', 'buy-sell'] },
      { name: 'Appraisal', tier1: ['appraise', 'estimate', 'compare'], tier2: ['authenticate', 'spot flaws', 'price-check'], tier3: ['true value', 'counterfeit sense', 'expert judge'], aliases: ['value', 'assess', 'evaluate'] },
      { name: 'Logistics', tier1: ['pack', 'organize', 'route'], tier2: ['optimize', 'distribute', 'schedule'], tier3: ['supply chain', 'flawless delivery', 'zero waste'], aliases: ['carry plan', 'transport', 'manage supplies'] }
    ]
  },
  {
    pillar: 'Leadership',
    skills: [
      { name: 'Rallying', tier1: ['rally', 'encourage', 'bolster'], tier2: ['inspire', 'steady nerves', 'lift morale'], tier3: ['unbreakable morale', 'heroic surge', 'battle hymn'], aliases: ['motivate', 'pump up', 'cheer'] },
      { name: 'Command', tier1: ['command', 'direct', 'order'], tier2: ['coordinate', 'assign roles', 'call shots'], tier3: ['perfect command', 'instant discipline', 'decisive'], aliases: ['lead', 'tell them', 'manage'] },
      { name: 'Tactics', tier1: ['flank', 'regroup', 'focus fire'], tier2: ['set formation', 'bait', 'counter-plan'], tier3: ['checkmate', 'perfect strat', 'battlefield genius'], aliases: ['plan', 'strategy', 'outthink'] }
    ]
  },
  {
    pillar: 'Magic',
    skills: [
      { name: 'Spellcasting', tier1: ['cast', 'channel', 'invoke'], tier2: ['weave', 'shape', 'amplify'], tier3: ['overcast', 'perfect spell', 'reality bend'], aliases: ['use magic', 'spell', 'conjure'] },
      { name: 'Rituals', tier1: ['ritual', 'prepare', 'inscribe'], tier2: ['consecrate', 'bind', 'attune circle'], tier3: ['grand rite', 'permanent seal', 'epoch ritual'], aliases: ['ceremony', 'rite', 'magical prep'] },
      { name: 'Wards', tier1: ['ward', 'shield', 'seal'], tier2: ['counterspell', 'null field', 'anchor'], tier3: ['absolute barrier', 'perfect counter', 'sanctum'], aliases: ['protect', 'guard magic', 'block spell'] },
      { name: 'Summoning', tier1: ['summon', 'call', 'shift'], tier2: ['pact', 'reshape'], tier3: ['true form', 'perfect bind', 'avatar'], aliases: ['bring creature', 'transform', 'change form'] }
    ]
  }
];

### The game will have the following LLM Agents:

#### Lorekeeper (Keeps the Codex and Lore of the game)

Input: current scene + query

Output: canon_snippets[] with source_id, plus “known facts” summary

No decisions. No state changes.

#### Orchestrator (Director)

Input: user action + current state + canon snippets + recent event log

Output: proposed_events[] (structured)

No prose. No committing.

#### Rune Marshal (Power Word / Intent & Checks)

Input: user action + state (skills, unlocked words, conditions)

Output: requires_roll + roll_type + difficulty + modifiers + allowed/denied

Does not narrate outcomes—just determines mechanics.

#### World Arbiter (Reality Guardrail)

Input: user action + proposed events + canon/state

Output: approved_events or rejected_with_reason (+ suggested corrections)

This is where “no inventing/overriding” is enforced.

#### Content Sentinel (Safety)

Input: user text + final narration draft

Output: allow/block/transform

Run it as a final gate before display.

#### Chronicler (Storyteller)

Input: validated events + updated state + canon snippets (optional)

Output: final prose + optional UI-friendly “what changed” summary

Cannot introduce new facts.

### Acceptance criteria (demo-ready)
- Create character; start adventure in persistent world
- Play **20 turns** with SSE streaming
- **≥3** skill checks end-to-end
- Inventory equip/unequip reflected correctly in narration
- **≥2** rumors, convert **1** to quest, quest advances/completes
- **≥2** NPCs with at least one relationship change that persists

### Why it wins a hackathon demo
It proves “AI + real game state” with visible diffs, deterministic mechanics, and streamed narration—clearly not just a chat log.
