"use client";

import React, { useState } from "react";
import {
  User,
  Sword,
  Dna,
  Play,
  Book,
  Map,
  Users,
  BookmarkCheck,
  Calendar,
  Backpack,
  Castle,
  Trees,
  Mountain,
  HelpCircle,
  MapPin,
  LayoutDashboard,
  Crown,
  Footprints,
  MessageSquare,
} from "lucide-react";
import {
  Character,
  Quest,
  NPC,
  Session,
  Item,
  Equipment,
  MapLocation,
  WorldContext,
} from "@/types";

interface Props {
  onBack: () => void;
  onResume: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  character: Character;
  quests: Quest[];
  npcs: NPC[];
  sessions: Session[];
  locations: MapLocation[];
  world: WorldContext;
}

export const ProfilePage: React.FC<Props> = ({
  onResume,
  character,
  quests,
  npcs,
  sessions,
  locations,
  world,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "chronicle" | "character" | "quests" | "folk" | "locations"
  >("overview");

  const knownLocations = locations.filter(
    (l) => l.status === "visited" || l.status === "known"
  );

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "city":
        return <Castle size={18} />;
      case "ruin":
        return <HelpCircle size={18} />;
      case "forest":
        return <Trees size={18} />;
      case "mountain":
        return <Mountain size={18} />;
      default:
        return <MapPin size={18} />;
    }
  };

  return (
    <div className="h-full w-full bg-parchment-300 flex justify-center p-4 lg:p-8 overflow-y-auto">
      <div className="w-full max-w-6xl bg-parchment-300 min-h-[500px] h-full rounded-sm border-[6px] border-parchment-800 shadow-2xl flex flex-col md:flex-row overflow-hidden relative panel-texture">
        {/* Sidebar / Member Card (Persistent Profile) */}
        <div className="w-full md:w-80 bg-parchment-200 border-b-2 md:border-b-0 md:border-r-2 border-parchment-800 p-6 flex flex-col items-center text-center relative z-10 shrink-0 md:h-full md:overflow-y-auto md:custom-scrollbar">
          <div className="w-32 h-32 rounded-full border-4 border-gold shadow-lg overflow-hidden mb-4 bg-parchment-800 relative group cursor-pointer shrink-0">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt="User"
                className="w-full h-full object-cover sepia-[0.3]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-parchment-800 text-parchment-100">
                <User size={48} />
              </div>
            )}
          </div>

          <h2 className="text-3xl font-display text-ink mb-1">
            {character.name || "Traveler"}
          </h2>
          {character.gender && (
            <p className="text-xs font-serif italic text-ink-light mb-6">
              {character.gender}
            </p>
          )}
          {!character.gender && <div className="mb-6" />}

          <div className="w-full space-y-2">
            <NavButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<LayoutDashboard size={16} />}
              label="Overview"
            />
            <NavButton
              active={activeTab === "chronicle"}
              onClick={() => setActiveTab("chronicle")}
              icon={<Book size={16} />}
              label="Chronicle"
            />
            <NavButton
              active={activeTab === "character"}
              onClick={() => setActiveTab("character")}
              icon={<User size={16} />}
              label="Character Sheet"
            />
            <NavButton
              active={activeTab === "quests"}
              onClick={() => setActiveTab("quests")}
              icon={<Map size={16} />}
              label="Quest Log"
            />
            <NavButton
              active={activeTab === "locations"}
              onClick={() => setActiveTab("locations")}
              icon={<MapPin size={16} />}
              label="Known Locations"
            />
            <NavButton
              active={activeTab === "folk"}
              onClick={() => setActiveTab("folk")}
              icon={<Users size={16} />}
              label="Relationships"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-parchment-100 relative">
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>

          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in relative z-10">
              {/* Tier Card */}
              <div className="bg-gradient-to-r from-parchment-900 to-parchment-800 text-parchment-100 p-6 rounded-sm shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                  <div className="text-xs font-bold uppercase tracking-widest text-gold mb-1">
                    Current Subscription
                  </div>
                  <h2 className="text-3xl font-display text-white">
                    Wanderer Tier
                  </h2>
                  <p className="text-white/70 text-sm font-serif italic mt-1">
                    Free-to-play access. Daily energy replenishes at dawn.
                  </p>
                </div>
                <button className="px-6 py-2 bg-gold text-parchment-900 font-bold font-small-caps uppercase rounded-sm hover:bg-white transition-colors shadow-md">
                  Upgrade to Legend
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox
                  label="Quests Completed"
                  value={quests.filter((q) => q.status === "completed").length}
                  icon={<BookmarkCheck size={20} />}
                />
                <StatBox
                  label="Locations Found"
                  value={knownLocations.length}
                  icon={<MapPin size={20} />}
                />
                <StatBox
                  label="Sessions Played"
                  value={sessions.length}
                  icon={<Calendar size={20} />}
                />
                <StatBox
                  label="World Truths"
                  value={
                    world.memory.filter((m) => m.status === "canonized").length
                  }
                  icon={<Book size={20} />}
                />
              </div>

              {/* Achievements */}
              <div>
                <h3 className="text-xl font-serif font-bold text-ink border-b border-parchment-400 pb-2 mb-4">
                  Achievements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AchievementCard
                    title="First Steps"
                    description="Complete your first session."
                    icon={<Footprints size={18} />}
                    unlocked={sessions.length > 0}
                  />
                  <AchievementCard
                    title="Cartographer"
                    description="Discover 3 locations."
                    icon={<Map size={18} />}
                    unlocked={knownLocations.length >= 3}
                  />
                  <AchievementCard
                    title="Local Hero"
                    description="Complete a quest."
                    icon={<Crown size={18} />}
                    unlocked={quests.some((q) => q.status === "completed")}
                  />
                </div>
              </div>

              {/* World News Summary */}
              <div>
                <h3 className="text-xl font-serif font-bold text-ink border-b border-parchment-400 pb-2 mb-4">
                  Latest World News: {world.region}
                </h3>
                <div className="bg-parchment-200 border border-parchment-400 rounded-sm p-4 space-y-3">
                  {world.memory.slice(0, 3).map((mem) => (
                    <div
                      key={mem.id}
                      className="flex gap-3 items-start border-b border-parchment-300 pb-2 last:border-0 last:pb-0"
                    >
                      <div
                        className={`mt-1 p-1 rounded-full shrink-0 ${
                          mem.type === "canon"
                            ? "bg-gold text-ink"
                            : "bg-parchment-400 text-ink-light"
                        }`}
                      >
                        {mem.type === "canon" ? (
                          <Book size={12} />
                        ) : (
                          <MessageSquare size={12} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-ink">
                          {mem.title}
                        </div>
                        <div className="text-xs text-ink-light italic">
                          {mem.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {world.memory.length === 0 && (
                    <div className="text-xs italic text-ink-faint">
                      No news at the moment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chronicle" && (
            <div className="space-y-6 relative z-10 animate-fade-in">
              {/* Resume Header */}
              <div className="bg-parchment-800 text-parchment-100 p-6 rounded-sm border-2 border-double border-gold shadow-lg flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-10"></div>
                <div className="relative z-10">
                  <div className="text-xs font-bold uppercase tracking-widest text-gold mb-1">
                    Latest Chapter
                  </div>
                  <h4 className="text-2xl font-display">
                    {sessions[sessions.length - 1]?.title || "New Adventure"}
                  </h4>
                  <p className="text-sm opacity-80 font-serif italic mt-1">
                    {sessions[sessions.length - 1]?.location}
                  </p>
                </div>
                <button
                  onClick={onResume}
                  className="relative z-10 px-8 py-3 bg-gold text-parchment-900 font-bold font-small-caps uppercase tracking-wider rounded-sm hover:bg-white transition-colors shadow-md flex items-center gap-2 group"
                >
                  <Play
                    size={16}
                    className="fill-current group-hover:scale-110 transition-transform"
                  />{" "}
                  Resume
                </button>
              </div>

              <h3 className="text-2xl font-serif font-bold text-ink border-b-2 border-parchment-400 pb-2 mb-4 mt-8">
                Past Sessions
              </h3>
              <div className="space-y-4">
                {[...sessions].reverse().map((session, i) => (
                  <div
                    key={session.id}
                    className="bg-parchment-200 p-5 rounded-sm border border-parchment-400 shadow-sm relative group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-parchment-300 border border-parchment-400 flex items-center justify-center rounded-sm">
                          <BookmarkCheck
                            size={20}
                            className={
                              session.status === "active"
                                ? "text-burgundy"
                                : "text-ink-light"
                            }
                          />
                        </div>
                        <div>
                          <h4 className="font-bold font-serif text-xl text-ink leading-none">
                            {session.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-ink-light font-small-caps uppercase tracking-wide mt-1">
                            <Calendar size={12} /> {session.date} •{" "}
                            {session.location}
                          </div>
                        </div>
                      </div>
                      {session.status === "active" && (
                        <span className="text-[10px] font-bold uppercase bg-burgundy text-parchment-100 px-2 py-0.5 rounded-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="pl-14">
                      <p className="font-serif text-ink opacity-90 leading-relaxed italic border-l-2 border-parchment-400 pl-4 py-1">
                        "{session.summary}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "character" && (
            <div className="space-y-8 relative z-10 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gear */}
                <div>
                  <h3 className="text-xl font-serif font-bold text-ink border-b border-parchment-400 pb-2 mb-4 flex items-center gap-2">
                    <Sword size={18} /> Equipped Gear
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <EquipSlot label="Head" item={character.equipment.head} />
                    <EquipSlot label="Cloak" item={character.equipment.cloak} />
                    <EquipSlot
                      label="Main Hand"
                      item={character.equipment.mainHand}
                    />
                    <EquipSlot
                      label="Off Hand"
                      item={character.equipment.offHand}
                    />
                    <EquipSlot label="Chest" item={character.equipment.chest} />
                    <EquipSlot label="Legs" item={character.equipment.legs} />
                  </div>

                  <h3 className="text-xl font-serif font-bold text-ink border-b border-parchment-400 pb-2 mb-4 flex items-center gap-2 mt-8">
                    <Backpack size={18} /> Backpack Summary
                  </h3>
                  <div className="space-y-2">
                    {character.inventory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm bg-parchment-200/50 p-2 rounded-sm border border-parchment-300"
                      >
                        <span className="font-serif text-ink">{item.name}</span>
                        <span className="text-[10px] font-bold font-small-caps uppercase text-ink-light">
                          {item.type}
                        </span>
                      </div>
                    ))}
                    {character.inventory.length === 0 && (
                      <span className="text-xs italic text-ink-faint">
                        Empty
                      </span>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-xl font-serif font-bold text-ink border-b border-parchment-400 pb-2 mb-4 flex items-center gap-2">
                    <Dna size={18} /> Active Skills
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(character.skills)
                      .filter(([_, s]) => s.level > 0)
                      .sort((a, b) => b[1].level - a[1].level)
                      .map(([name, skill]) => (
                        <div
                          key={name}
                          className="bg-parchment-200 p-3 rounded-sm border border-parchment-400 shadow-sm"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-ink">{name}</span>
                            <span className="text-xs bg-parchment-300 px-2 py-0.5 rounded-full font-mono text-ink-light border border-parchment-400">
                              Lvl {skill.level}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-parchment-300 rounded-full overflow-hidden border border-parchment-400/50">
                            <div
                              className="h-full bg-burgundy"
                              style={{
                                width: `${(skill.xp / skill.nextLevel) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {skill.verbs.slice(0, 3).map((v, i) => (
                              <span
                                key={i}
                                className="text-[9px] font-bold font-small-caps uppercase px-1.5 py-0.5 bg-parchment-100 border border-parchment-300 rounded-sm text-ink-light"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    {Object.values(character.skills).every(
                      (s) => s.level === 0
                    ) && (
                      <p className="text-xs italic text-ink-faint text-center py-4 border-2 border-dashed border-parchment-400 rounded-sm">
                        No skills developed yet. Go adventuring!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "quests" && (
            <div className="space-y-6 relative z-10 animate-fade-in">
              <h3 className="text-2xl font-serif font-bold text-ink border-b-2 border-parchment-400 pb-2 mb-4">
                Quest Log
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quests.map((quest) => (
                  <div
                    key={quest.id}
                    className="bg-parchment-200 p-5 rounded-sm border border-parchment-400 shadow-sm flex flex-col justify-between h-full"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold font-serif text-lg text-ink">
                          {quest.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                            quest.status === "active"
                              ? "bg-forest text-parchment-100 border-forest-dim"
                              : "bg-parchment-400 text-ink-light"
                          }`}
                        >
                          {quest.status}
                        </span>
                      </div>
                      <p className="text-sm text-ink-light font-serif mb-4">
                        {quest.description}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-parchment-300">
                      <div className="text-[10px] font-bold uppercase text-ink-faint tracking-wider mb-1">
                        Current Leads
                      </div>
                      <ul className="text-xs text-ink list-disc list-inside space-y-1">
                        {quest.leads.map((lead, i) => (
                          <li key={i}>{lead}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "locations" && (
            <div className="space-y-6 relative z-10 animate-fade-in">
              <h3 className="text-2xl font-serif font-bold text-ink border-b-2 border-parchment-400 pb-2 mb-4">
                Known Locations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knownLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="bg-parchment-200 p-4 rounded-sm border border-parchment-400 shadow-sm flex items-start gap-4 hover:border-gold transition-colors"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0 ${
                        loc.status === "visited"
                          ? "bg-burgundy text-parchment-100 border-parchment-800"
                          : "bg-parchment-100 text-ink border-parchment-400"
                      }`}
                    >
                      {getLocationIcon(loc.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold font-serif text-lg text-ink leading-none">
                          {loc.name}
                        </h4>
                        <span className="text-[9px] font-bold uppercase bg-parchment-300 text-ink-light px-1.5 py-0.5 rounded border border-parchment-400">
                          {loc.status}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold uppercase text-ink-light tracking-wide mb-2">
                        {loc.region} • {loc.type}
                      </div>
                      <p className="text-xs text-ink font-serif leading-relaxed">
                        {loc.description}
                      </p>
                    </div>
                  </div>
                ))}
                {knownLocations.length === 0 && (
                  <p className="text-sm italic text-ink-faint text-center col-span-2 py-8 border-2 border-dashed border-parchment-400 rounded-sm">
                    Your map is currently blank. Explore the world to reveal
                    locations.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "folk" && (
            <div className="space-y-6 relative z-10 animate-fade-in">
              <h3 className="text-2xl font-serif font-bold text-ink border-b-2 border-parchment-400 pb-2 mb-4">
                Known Folk
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {npcs.map((npc) => (
                  <div
                    key={npc.id}
                    className="bg-parchment-200 p-4 rounded-sm border border-parchment-400 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-lg text-ink font-serif">
                        {npc.name}
                      </span>
                      <div
                        className={`text-xs font-bold px-2 py-1 rounded-full border ${
                          npc.relationship > 0
                            ? "bg-forest/20 text-forest border-forest/30"
                            : npc.relationship < 0
                            ? "bg-burgundy/20 text-burgundy border-burgundy/30"
                            : "bg-parchment-400/20 text-ink-light border-parchment-400"
                        }`}
                      >
                        Relation: {npc.relationship > 0 ? "+" : ""}
                        {npc.relationship}
                      </div>
                    </div>
                    <div className="text-xs text-ink-light font-small-caps uppercase tracking-wide mb-3">
                      {npc.role} • {npc.location}
                    </div>
                    <div className="text-xs text-ink space-y-1">
                      {npc.notes.map((note, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-gold mt-1">•</span>
                          <span className="italic">{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-all border-l-4 ${
      active
        ? "bg-parchment-100 border-burgundy text-ink shadow-sm font-bold"
        : "border-transparent text-ink-light hover:bg-parchment-300 hover:text-ink hover:border-parchment-400"
    }`}
  >
    {icon}
    <span className="font-small-caps uppercase tracking-wide text-sm">
      {label}
    </span>
  </button>
);

const StatBox = ({ label, value, icon }: any) => (
  <div className="bg-parchment-200 border border-parchment-400 rounded-sm p-4 flex flex-col items-center justify-center text-center shadow-sm">
    <div className="text-burgundy mb-2 opacity-80">{icon}</div>
    <div className="text-2xl font-display text-ink leading-none mb-1">
      {value}
    </div>
    <div className="text-[10px] font-bold font-small-caps uppercase text-ink-light tracking-wide">
      {label}
    </div>
  </div>
);

const AchievementCard = ({ title, description, icon, unlocked }: any) => (
  <div
    className={`flex items-start gap-3 p-3 rounded-sm border ${
      unlocked
        ? "bg-parchment-100 border-gold shadow-sm"
        : "bg-parchment-300/50 border-parchment-400 opacity-60 grayscale"
    }`}
  >
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 ${
        unlocked
          ? "bg-parchment-800 text-gold border-gold"
          : "bg-parchment-400 text-ink-faint border-parchment-500"
      }`}
    >
      {icon}
    </div>
    <div>
      <div className="font-bold font-serif text-sm text-ink">{title}</div>
      <div className="text-xs text-ink-light leading-tight mt-0.5">
        {description}
      </div>
      {unlocked && (
        <div className="text-[9px] font-bold uppercase text-gold-dim mt-1">
          Unlocked
        </div>
      )}
    </div>
  </div>
);

const EquipSlot = ({ label, item }: { label: string; item: Item | null }) => (
  <div
    className={`h-16 rounded-sm border-2 relative p-1 flex flex-col items-center justify-center text-center group ${
      item
        ? "bg-parchment-200 border-parchment-800"
        : "bg-parchment-300/50 border-dashed border-parchment-400"
    }`}
  >
    {item ? (
      <>
        <div className="font-serif font-bold text-xs text-ink leading-tight w-full truncate px-1">
          {item.name}
        </div>
        {(item.stats?.damage || item.stats?.ac) && (
          <div className="text-[9px] font-bold text-burgundy font-small-caps mt-0.5 bg-parchment-100/50 px-1 rounded border border-parchment-300/50">
            {item.stats.damage && <span>{item.stats.damage}</span>}
            {item.stats.ac && <span>AC {item.stats.ac}</span>}
          </div>
        )}
        <div className="absolute bottom-0.5 text-[8px] text-ink-light font-small-caps uppercase opacity-70">
          {label}
        </div>
      </>
    ) : (
      <span className="text-[9px] font-bold font-small-caps text-ink-faint uppercase">
        {label}
      </span>
    )}
  </div>
);
