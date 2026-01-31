"use client";

import React, { useState } from "react";
import { Character, Quest, NPC, Item, Equipment } from "@/types";
import {
  User,
  Backpack,
  Map,
  Users,
  Shield,
  Sword,
  Sparkles,
  Plus,
  X,
  ChevronRight,
  Circle,
  Trash2,
  Zap,
  Lock,
  Activity,
  Skull,
  Crown,
  Droplets,
  Gem,
  Minus,
  ChevronDown,
  ChevronUp,
  Scroll,
  Hammer,
  Anchor,
  Sprout,
  Axe,
  Utensils,
  FlaskConical,
  Coins,
  Flag,
  Flame,
} from "lucide-react";
import { SKILL_TREE, SKILL_RULES } from "@/constants";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

interface Props {
  character: Character;
  quests: Quest[];
  npcs: NPC[];
  onCharacterUpdate: (char: Character) => void;
}

export const LeftColumn: React.FC<Props> = ({
  character,
  quests,
  npcs,
  onCharacterUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<
    "char" | "stash" | "skills" | "quests" | "folk" | "magic"
  >("char");

  return (
    <div className="h-full flex flex-col bg-parchment-200 panel-texture select-none relative">
      {/* Ledger Header / Tabs */}
      <div className="flex px-1 pt-3 gap-0.5 border-b-2 border-parchment-800 bg-parchment-300/50 w-full">
        <TabButton
          icon={<User size={14} />}
          active={activeTab === "char"}
          onClick={() => setActiveTab("char")}
          label="Hero"
        />
        <TabButton
          icon={<Backpack size={14} />}
          active={activeTab === "stash"}
          onClick={() => setActiveTab("stash")}
          label="Stash"
        />
        <TabButton
          icon={<Activity size={14} />}
          active={activeTab === "skills"}
          onClick={() => setActiveTab("skills")}
          label="Skills"
        />
        {FEATURE_FLAGS.quests && (
          <TabButton
            icon={<Map size={14} />}
            active={activeTab === "quests"}
            onClick={() => setActiveTab("quests")}
            label="Quest"
          />
        )}
        <TabButton
          icon={<Users size={14} />}
          active={activeTab === "folk"}
          onClick={() => setActiveTab("folk")}
          label="People"
        />

        {/* Magic tab - greyed out and disabled if not unlocked */}
        <TabButton
          icon={
            character.isMagicUnlocked ? (
              <Sparkles size={14} />
            ) : (
              <Lock size={14} />
            )
          }
          active={activeTab === "magic"}
          onClick={() => character.isMagicUnlocked && setActiveTab("magic")}
          label="Magic"
          disabled={!character.isMagicUnlocked}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar relative">
        {/* Inner Border Line for "Page" feel - Moved closer to edge */}
        <div className="absolute left-1 top-0 bottom-0 w-px bg-parchment-400/30 pointer-events-none"></div>
        <div className="absolute right-1 top-0 bottom-0 w-px bg-parchment-400/30 pointer-events-none"></div>

        {activeTab === "char" && <CharacterTab character={character} />}
        {activeTab === "stash" && (
          <InventoryTab character={character} onUpdate={onCharacterUpdate} />
        )}
        {activeTab === "skills" && <SkillsTab character={character} />}
        {activeTab === "magic" && <MagicTab />}
        {FEATURE_FLAGS.quests && activeTab === "quests" && <QuestsTab quests={quests} />}
        {activeTab === "folk" && <SocialTab npcs={npcs} />}
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------------
   Skills Tab (Design: The Constellation Cards)
-------------------------------------------------------------------------------- */
const SkillsTab = ({ character }: { character: Character }) => {
  // Default to Combat expanded for immediate feedback
  const [expandedPillar, setExpandedPillar] = useState<string | null>("Combat");

  const togglePillar = (pillar: string, isLocked: boolean) => {
    if (isLocked) return;
    setExpandedPillar((current) => (current === pillar ? null : pillar));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Minimal Header */}
      <div className="text-center mb-6 pt-2 pb-2 border-b border-parchment-400/30 mx-2">
        <p className="text-xs text-ink-light italic font-serif">
          Mastery is forged in action.
        </p>
      </div>

      {SKILL_TREE.map((pillar) => {
        const isExpanded = expandedPillar === pillar.pillar;
        const isMagicLocked =
          pillar.pillar === "Magic" && !character.isMagicUnlocked;

        // Calculate Pillar Metrics
        let pillarLevel = 0;
        let pillarCurrentXp = 0;
        let pillarMaxXp = 0;

        pillar.skills.forEach((s) => {
          const charSkill = character.skills[s.name];
          if (charSkill) {
            pillarLevel += charSkill.level;
            pillarCurrentXp += charSkill.xp;
            pillarMaxXp += charSkill.nextLevel;
          } else {
            // Assume 0/100 for unlocked skills
            pillarMaxXp += 100;
          }
        });

        const pillarProgress = Math.min(
          100,
          (pillarCurrentXp / pillarMaxXp) * 100
        );

        return (
          <div
            key={pillar.pillar}
            className={`rounded-sm transition-all duration-300 border-2 ${
              isMagicLocked
                ? "bg-parchment-300/50 border-parchment-400/30 opacity-50 mx-1"
                : isExpanded
                ? "bg-parchment-100 border-parchment-800 shadow-md my-4 mx-1"
                : "bg-parchment-200 border-parchment-400/60 hover:border-parchment-600 mx-1"
            }`}
          >
            {/* Pillar Header Card */}
            <button
              onClick={() => togglePillar(pillar.pillar, isMagicLocked)}
              disabled={isMagicLocked}
              className={`w-full relative overflow-hidden group ${
                isMagicLocked ? "cursor-not-allowed" : ""
              }`}
              title={
                isMagicLocked ? "Locked - Discover magic to unlock" : undefined
              }
            >
              {/* Header Background Progress (Subtle) */}
              <div className="absolute inset-0 bg-parchment-300 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-sm flex items-center justify-center border-2 transition-colors shadow-sm ${
                      isMagicLocked
                        ? "bg-parchment-400/50 text-ink-faint border-parchment-400/50"
                        : isExpanded
                        ? "bg-parchment-800 text-gold border-parchment-900"
                        : "bg-parchment-100 text-ink-light border-parchment-400"
                    }`}
                  >
                    {isMagicLocked ? (
                      <Lock size={18} />
                    ) : (
                      getIconForPillar(pillar.pillar)
                    )}
                  </div>
                  <div className="text-left">
                    <span
                      className={`block font-display text-lg tracking-wide ${
                        isMagicLocked
                          ? "text-ink-faint"
                          : isExpanded
                          ? "text-ink"
                          : "text-ink-light"
                      }`}
                    >
                      {pillar.pillar}
                      {isMagicLocked && (
                        <span className="text-xs ml-2 font-serif italic">
                          (Locked)
                        </span>
                      )}
                    </span>
                    {/* Pillar XP Bar (Mini) */}
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-parchment-400/30 rounded-full overflow-hidden border border-parchment-800 dark:border-parchment-400/50">
                        <div
                          className="h-full bg-ink/20"
                          style={{ width: `${pillarProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold font-small-caps uppercase text-ink-faint tracking-widest">
                      Rank
                    </span>
                    <span className="text-xl font-display text-ink leading-none">
                      {pillarLevel}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-ink" />
                  ) : (
                    <ChevronDown size={16} className="text-ink-faint" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Skills Area */}
            {isExpanded && (
              <div className="p-3 bg-parchment-300/30 border-t-2 border-parchment-400 space-y-3">
                {pillar.skills.map((skillDef) => {
                  const charSkill = character.skills[skillDef.name] || {
                    level: 0,
                    xp: 0,
                    nextLevel: 100,
                    verbs: [],
                  };
                  const progress = Math.min(
                    100,
                    (charSkill.xp / charSkill.nextLevel) * 100
                  );
                  const isActive = charSkill.level > 0;

                  // Collect unlocked words based on rules
                  const unlockedWords: string[] = [];
                  if (charSkill.level >= SKILL_RULES.unlockLevels.tier1)
                    unlockedWords.push(...skillDef.tier1);
                  if (charSkill.level >= SKILL_RULES.unlockLevels.tier2)
                    unlockedWords.push(...skillDef.tier2);
                  if (charSkill.level >= SKILL_RULES.unlockLevels.tier3)
                    unlockedWords.push(...skillDef.tier3);

                  return (
                    <div
                      key={skillDef.name}
                      className={`relative p-3 rounded-sm border-2 bg-parchment-100 shadow-sm transition-all ${
                        isActive
                          ? "border-parchment-800 dark:border-parchment-400"
                          : "border-parchment-300 opacity-70"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className={`font-serif font-bold ${
                            isActive ? "text-ink" : "text-ink-light"
                          }`}
                        >
                          {skillDef.name}
                        </span>
                        <span className="text-[10px] font-bold font-small-caps bg-parchment-200 border border-parchment-300 px-1.5 py-0.5 rounded text-ink">
                          Lvl {charSkill.level}
                        </span>
                      </div>

                      {/* Distinct Progress Bar */}
                      <div className="relative h-2 w-full bg-parchment-300 rounded-full overflow-hidden border border-parchment-800 dark:border-parchment-400/60 mb-2">
                        <div
                          className="absolute inset-y-0 left-0 bg-burgundy shadow-[0_0_8px_rgba(112,28,28,0.4)] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[9px] text-ink-faint font-mono mb-2">
                        <span>{charSkill.xp} XP</span>
                        <span>{charSkill.nextLevel} XP</span>
                      </div>

                      {/* Power Words Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-parchment-200/50">
                        {unlockedWords.length > 0 ? (
                          unlockedWords.map((word, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 bg-parchment-200 border border-parchment-300 rounded text-ink font-bold font-small-caps uppercase tracking-wide"
                            >
                              {word}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-ink-faint italic pl-1">
                            Untrained
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const getIconForPillar = (pillar: string) => {
  switch (pillar) {
    case "Combat":
      return <Sword size={18} />;
    case "Defense":
      return <Shield size={18} />;
    case "Athleticism":
      return <Activity size={18} />;
    case "Stealth":
      return <User size={18} />;
    case "Sleight":
      return <Zap size={18} />;
    case "Charisma":
      return <Crown size={18} />;
    case "Wisdom":
      return <Scroll size={18} />;
    case "Lore":
      return <Scroll size={18} />;
    case "Wilderness":
      return <Map size={18} />;
    case "Hunting":
      return <Users size={18} />;
    case "Gathering":
      return <Backpack size={18} />;

    case "Farming":
      return <Sprout size={18} />;
    case "Crafting":
      return <Hammer size={18} />;
    case "Smithing":
      return <Flame size={18} />;
    case "Woodwork":
      return <Axe size={18} />;
    case "Cooking":
      return <Utensils size={18} />;
    case "Alchemy":
      return <FlaskConical size={18} />;
    case "Trade":
      return <Coins size={18} />;
    case "Leadership":
      return <Flag size={18} />;

    case "Magic":
      return <Sparkles size={18} />;
    default:
      return <Circle size={18} />;
  }
};

/* --------------------------------------------------------------------------------
   Inventory Tab
-------------------------------------------------------------------------------- */

const InventoryTab = ({
  character,
  onUpdate,
}: {
  character: Character;
  onUpdate: (c: Character) => void;
}) => {
  // Categorize Items
  const gear = character.inventory.filter(
    (i) => i.type === "weapon" || i.type === "armor"
  );
  const consumables = character.inventory.filter(
    (i) => i.type === "consumable"
  );
  const items = character.inventory.filter(
    (i) => !["weapon", "armor", "consumable"].includes(i.type)
  );

  const handleEquip = (item: Item) => {
    const slot = item.slot || "mainHand";
    const currentEquipped = character.equipment[slot];

    let newInv = character.inventory.filter((i) => i.id !== item.id);
    if (currentEquipped) {
      newInv.push(currentEquipped);
    }
    const newEquip = { ...character.equipment, [slot]: item };
    onUpdate({ ...character, equipment: newEquip, inventory: newInv });
  };

  const handleUnequip = (slot: keyof Equipment) => {
    const item = character.equipment[slot];
    if (!item) return;
    const newEquip = { ...character.equipment, [slot]: null };
    const newInv = [...character.inventory, item];
    onUpdate({ ...character, equipment: newEquip, inventory: newInv });
  };

  const handleUse = (item: Item) => {
    console.log("Using:", item.name);
  };

  const handleDrop = (item: Item) => {
    const newInv = character.inventory.filter((i) => i.id !== item.id);
    onUpdate({ ...character, inventory: newInv });
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Gold"
          value={`${character.gold}g`}
          icon={<Circle size={10} className="text-gold fill-gold" />}
        />
        <StatCard label="Armor Class" value="12" icon={<Shield size={10} />} />
      </div>

      {/* Equipped Section */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold font-small-caps text-ink-light uppercase tracking-widest border-b border-parchment-400 pb-1">
          <User size={12} /> Equipped
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <BigSlot
            label="Head"
            slotKey="head"
            item={character.equipment.head}
            onUnequip={handleUnequip}
          />
          <BigSlot
            label="Cloak"
            slotKey="cloak"
            item={character.equipment.cloak}
            onUnequip={handleUnequip}
          />
          <BigSlot
            label="Main Hand"
            slotKey="mainHand"
            item={character.equipment.mainHand}
            onUnequip={handleUnequip}
          />
          <BigSlot
            label="Off Hand"
            slotKey="offHand"
            item={character.equipment.offHand}
            onUnequip={handleUnequip}
          />
          <BigSlot
            label="Chest"
            slotKey="chest"
            item={character.equipment.chest}
            onUnequip={handleUnequip}
          />
          <BigSlot
            label="Legs"
            slotKey="legs"
            item={character.equipment.legs}
            onUnequip={handleUnequip}
          />
        </div>
      </div>

      {/* Categorized Stash */}
      <div className="space-y-4 pt-2">
        <StashCategory
          title="Gear"
          items={gear}
          icon={<Sword size={12} />}
          onAction={handleEquip}
          actionLabel="Equip"
          onDrop={handleDrop}
        />

        <StashCategory
          title="Supplies"
          items={consumables}
          icon={<Droplets size={12} />}
          onAction={handleUse}
          actionLabel="Use"
          onDrop={handleDrop}
        />

        <StashCategory
          title="Items"
          items={items}
          icon={<Gem size={12} />}
          onAction={() => {}}
          actionLabel=""
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
};

const StashCategory = ({
  title,
  items,
  icon,
  onAction,
  actionLabel,
  onDrop,
}: any) => (
  <div>
    <h4 className="flex items-center gap-2 text-xs font-bold font-small-caps text-ink uppercase tracking-widest mb-2 border-b border-parchment-400 pb-1 opacity-80">
      {icon} {title}{" "}
      <span className="text-[9px] text-ink-faint ml-auto">{items.length}</span>
    </h4>
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-[10px] italic text-ink-faint text-center py-2">
          Empty
        </div>
      )}
      {items.map((item: Item) => (
        <div
          key={item.id}
          className="bg-parchment-100 rounded-sm border border-parchment-400 shadow-sm p-2 flex items-start gap-2 group"
        >
          <div className="flex-1">
            <div className="font-serif font-bold text-sm text-ink">
              {item.name}
            </div>
            <div className="text-[10px] text-ink-light leading-tight mt-0.5">
              {item.description}
            </div>
            <div className="flex gap-1 mt-1">
              {item.stats?.damage && (
                <span className="text-[9px] bg-parchment-300 px-1 rounded-sm border border-parchment-400">
                  {item.stats.damage}
                </span>
              )}
              {item.stats?.ac && (
                <span className="text-[9px] bg-parchment-300 px-1 rounded-sm border border-parchment-400">
                  AC {item.stats.ac}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {actionLabel && (
              <button
                onClick={() => onAction(item)}
                className="text-[9px] font-bold uppercase bg-parchment-800 text-parchment-100 px-2 py-0.5 rounded-sm hover:bg-gold hover:text-ink transition-colors"
              >
                {actionLabel}
              </button>
            )}
            <button
              onClick={() => onDrop(item)}
              className="text-[9px] font-bold uppercase bg-parchment-300 text-burgundy border border-parchment-400 px-2 py-0.5 rounded-sm hover:bg-burgundy hover:text-parchment-100 transition-colors"
            >
              Drop
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const BigSlot = ({
  label,
  slotKey,
  item,
  onUnequip,
}: {
  label: string;
  slotKey: keyof Equipment;
  item: Item | null;
  onUnequip: (slot: keyof Equipment) => void;
}) => (
  <div
    className={`h-16 rounded-sm border-2 relative p-1 flex flex-col items-center justify-center text-center group ${
      item
        ? "bg-parchment-100 border-parchment-800"
        : "bg-parchment-300/50 border-dashed border-parchment-400"
    }`}
  >
    {item ? (
      <>
        <div className="font-serif font-bold text-xs text-ink leading-tight w-full truncate px-1">
          {item.name}
        </div>

        {/* Stats Display */}
        {(item.stats?.damage || item.stats?.ac) && (
          <div className="text-[9px] font-bold text-burgundy font-small-caps mt-0.5 bg-parchment-200/50 px-1 rounded border border-parchment-300/50">
            {item.stats.damage && <span>{item.stats.damage}</span>}
            {item.stats.ac && <span>AC {item.stats.ac}</span>}
          </div>
        )}

        <div className="absolute bottom-0.5 text-[8px] text-ink-light font-small-caps uppercase opacity-70">
          {label}
        </div>
        <button
          onClick={() => onUnequip(slotKey)}
          className="absolute -top-1.5 -right-1.5 bg-burgundy text-parchment-100 rounded-full w-4 h-4 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          title="Unequip"
        >
          <Minus size={10} strokeWidth={4} />
        </button>
      </>
    ) : (
      <span className="text-[9px] font-bold font-small-caps text-parchment-500 uppercase">
        {label}
      </span>
    )}
  </div>
);

const StatCard = ({ label, value, icon }: any) => (
  <div className="bg-parchment-100 border border-parchment-400 rounded-sm p-2 flex flex-col items-center shadow-sm">
    <div className="flex items-center gap-1 text-[10px] font-bold font-small-caps text-ink-light uppercase">
      {icon} {label}
    </div>
    <div className="text-xl font-display text-ink">{value}</div>
  </div>
);

/* --------------------------------------------------------------------------------
   Character Tab
-------------------------------------------------------------------------------- */

const CharacterTab = ({ character }: { character: Character }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 border-b-2 border-parchment-800 pb-4 border-double">
        <div className="w-16 h-16 rounded-sm bg-parchment-800 border-2 border-gold flex items-center justify-center overflow-hidden shadow-md shrink-0">
          {character.portraitUrl ? (
            <img
              src={character.portraitUrl}
              alt="Portrait"
              className="w-full h-full object-cover sepia-[.4]"
            />
          ) : (
            <User className="text-parchment-100" size={32} />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink leading-tight">
            {character.name || "Traveler"}
          </h2>
          {character.gender && (
            <div className="text-xs font-sans text-ink-light italic">
              {character.gender}
            </div>
          )}
        </div>
      </div>

      {/* Vitals */}
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-parchment-100 p-2 rounded-sm border border-parchment-400 shadow-sm">
          <span className="text-xs font-bold font-small-caps uppercase tracking-wide">
            Vitality
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-parchment-300 rounded-full overflow-hidden">
              <div className="h-full bg-burgundy w-full"></div>
            </div>
            <span className="font-bold text-ink text-sm">
              {character.hp}/{character.maxHp}
            </span>
          </div>
        </div>
      </div>

      {/* Conditions & Consequences */}
      <div>
        <h3 className="text-xs font-bold font-small-caps text-ink uppercase tracking-widest border-b border-parchment-400 mb-3 pb-1 flex justify-between">
          <span>Conditions</span>
          <span className="text-ink-faint">Active</span>
        </h3>

        {character.conditions.length > 0 ? (
          <div className="space-y-2">
            {character.conditions.map((cond) => (
              <div
                key={cond.id}
                className="bg-parchment-100 p-2 rounded-sm border-l-4 border-burgundy shadow-sm"
              >
                <div className="font-bold text-ink text-xs">{cond.name}</div>
                <div className="text-[10px] text-ink-light">
                  {cond.description}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 border-2 border-dashed border-parchment-400 rounded-sm opacity-50">
            <span className="text-xs italic">Healthy & Unburdened</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ icon, active, onClick, label, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 min-w-[3rem] py-2 flex items-center justify-center gap-1 text-[10px] font-bold font-small-caps tracking-widest transition-all rounded-t-sm border-t-2 border-l-2 border-r-2 ${
      disabled
        ? "text-ink-faint/40 bg-parchment-400/50 border-transparent cursor-not-allowed opacity-50"
        : active
        ? "text-ink bg-parchment-200 border-parchment-800 border-b-parchment-200 -mb-0.5 pb-2.5 z-10"
        : "text-ink-faint bg-parchment-400 border-transparent hover:bg-parchment-200 hover:text-ink hover:border-parchment-800/50"
    }`}
    title={disabled ? "Locked - Discover magic to unlock" : label}
  >
    {icon}
    <span className="hidden xl:inline">{label}</span>
  </button>
);

const MagicTab = () => (
  <div className="p-4 text-center text-xs italic opacity-50">
    The arcane arts remain locked...
    <br />
    <span className="text-[10px] mt-2 block">
      Discover magical artifacts or train with a mage to unlock.
    </span>
  </div>
);
const QuestsTab = ({ quests }: { quests: Quest[] }) => {
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-in pl-2">
      {quests.map((quest) => (
        <div
          key={quest.id}
          className="bg-parchment-100 p-3 rounded-sm border border-parchment-400 shadow-sm cursor-pointer hover:border-gold transition-colors"
          onClick={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
        >
          <div className="font-bold text-sm text-ink">{quest.title}</div>
          <div className="text-xs text-ink-light mt-1">{quest.description}</div>
          {quest.leads.length > 0 && (
            <div className="mt-2 text-[10px] uppercase font-bold text-burgundy">
              {expandedQuest === quest.id ? "Leads:" : `${quest.leads.length} lead${quest.leads.length > 1 ? "s" : ""}`}
            </div>
          )}
          {expandedQuest === quest.id && quest.leads.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-ink-light list-disc list-inside">
              {quest.leads.map((lead, i) => (
                <li key={i}>{lead}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

const SocialTab = ({ npcs }: { npcs: NPC[] }) => {
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);

  if (npcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <Users size={32} className="text-ink-faint mb-3 opacity-50" />
        <p className="text-sm text-ink-light font-serif italic">No one met yet</p>
        <p className="text-xs text-ink-faint mt-1">Explore and talk to people you encounter</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in pl-2">
      {npcs.map((npc) => {
        // Relationship is -25 to +25, normalize to 0-100% for bar
        const normalizedRelationship = ((npc.relationship + 25) / 50) * 100;
        const relationshipLabel = 
          npc.relationship >= 20 ? "Devoted" :
          npc.relationship >= 10 ? "Friendly" :
          npc.relationship >= 5 ? "Warm" :
          npc.relationship > -5 ? "Neutral" :
          npc.relationship >= -10 ? "Cool" :
          npc.relationship >= -20 ? "Unfriendly" :
          "Hostile";
        
        return (
          <div
            key={npc.id}
            className="bg-parchment-100 p-3 rounded-sm border border-parchment-400 shadow-sm"
          >
            <div className="flex gap-3">
              {npc.portraitUrl && (
                <img
                  src={npc.portraitUrl}
                  alt={npc.name}
                  className="w-10 h-10 rounded-full object-cover border border-parchment-400 shrink-0 cursor-pointer hover:ring-2 hover:ring-gold transition-all"
                  onClick={() => setSelectedNpc(npc)}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-ink">{npc.name}</span>
                  <span className="text-[10px] font-bold text-ink-light">
                    {relationshipLabel} ({npc.relationship > 0 ? "+" : ""}{npc.relationship})
                  </span>
                </div>
                <div className="text-[10px] text-ink-light mb-1">{npc.role}</div>
                {/* Relationship Bar */}
                <div className="relative">
                  <div className="h-1.5 bg-parchment-300 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        npc.relationship >= 2 ? "bg-forest" :
                        npc.relationship >= 0 ? "bg-gold" :
                        "bg-burgundy"
                      }`}
                      style={{ width: `${normalizedRelationship}%` }}
                    />
                  </div>
                  {/* Scale markers */}
                  <div className="flex justify-between mt-0.5 text-[8px] text-ink-faint">
                    <span>-25</span>
                    <span>0</span>
                    <span>+25</span>
                  </div>
                </div>
              </div>
            </div>
            {npc.history.length > 0 && (
              <div className="mt-2 pt-2 border-t border-parchment-300">
                <div className="text-[9px] uppercase font-bold text-ink-light mb-1">
                  Recent Memory
                </div>
                <ul className="text-[10px] text-ink italic list-disc list-inside">
                  {npc.history.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {/* NPC Detail Modal */}
      {selectedNpc && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNpc(null)}
        >
          <div 
            className="bg-parchment-200 rounded-sm border-4 border-parchment-800 shadow-2xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNpc(null)}
              className="absolute top-2 right-2 text-ink-light hover:text-ink text-xl leading-none"
            >
              ×
            </button>
            
            {selectedNpc.portraitUrl && (
              <img
                src={selectedNpc.portraitUrl}
                alt={selectedNpc.name}
                className="w-64 h-64 rounded-full object-cover border-4 border-gold mx-auto mb-4 shadow-lg"
              />
            )}
            
            <h3 className="text-xl font-display text-ink text-center mb-1">
              {selectedNpc.name}
            </h3>
            <p className="text-sm text-ink-light text-center mb-4">
              {selectedNpc.role}
            </p>
            
            {selectedNpc.personality && selectedNpc.personality.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase font-bold text-ink-light mb-1">
                  Personality
                </div>
                <p className="text-xs text-ink">
                  {selectedNpc.personality.join(", ")}
                </p>
              </div>
            )}
            
            {selectedNpc.history && selectedNpc.history.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-ink-light mb-1">
                  What You Know
                </div>
                <ul className="text-xs text-ink space-y-1">
                  {selectedNpc.history.map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-gold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
