"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MOCK_CODEX_ENTRIES, USE_MOCK_DATA } from "@/constants";
import {
  Book,
  Scroll,
  Map,
  Users,
  Search,
} from "lucide-react";
import { CodexEntry, NPC } from "@/types";

interface Props {
  entries?: CodexEntry[];
  npcs?: NPC[];
  initialSearchTerm?: string;
}

export const CodexPage: React.FC<Props> = ({
  entries,
  npcs = [],
  initialSearchTerm = "",
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState(initialSearchTerm);
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);
  const [imageModal, setImageModal] = useState<{ src: string; alt: string } | null>(null);
  const [npcModal, setNpcModal] = useState<{ name: string; role: string; portraitUrl?: string } | null>(null);

  // Use provided entries, or mock data if enabled, or empty array
  const displayEntries = entries ?? (USE_MOCK_DATA ? MOCK_CODEX_ENTRIES : []);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearch(initialSearchTerm);
      // Auto-select first match if available
      const match = displayEntries.find((e) =>
        e.title.toLowerCase().includes(initialSearchTerm.toLowerCase())
      );
      if (match) setSelectedEntry(match);
    }
  }, [initialSearchTerm, displayEntries]);

  const categories = [
    { id: "All", icon: <Book size={16} /> },
    { id: "People", icon: <Users size={16} /> },
    { id: "Regions", icon: <Map size={16} /> },
    { id: "Locations", icon: <Map size={16} /> },
    { id: "Factions", icon: <Users size={16} /> },
    { id: "History", icon: <Scroll size={16} /> },
    { id: "Legends", icon: <Scroll size={16} /> },
  ];

  // Filter NPCs for People tab
  const filteredNpcs = npcs.filter((npc) =>
    npc.name.toLowerCase().includes(search.toLowerCase()) ||
    npc.role.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEntries = displayEntries.filter((e) => {
    const matchCat = activeCategory === "All" || e.category === activeCategory;
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Clear selections when switching categories
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setSelectedEntry(null);
    setSelectedNpc(null);
  };

  return (
    <div className="h-full w-full bg-parchment-300 flex flex-col md:flex-row overflow-hidden relative panel-texture">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-parchment-200 border-r-2 border-parchment-800 flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-parchment-400 bg-parchment-300/50">
          <h2 className="font-display text-2xl text-ink mb-2">The Codex</h2>
          <p className="text-xs font-serif text-ink-light mb-4 italic">
            The known truths of the realm, verified by the Guild of Scribes.
          </p>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lore..."
              className="w-full bg-parchment-100 border border-parchment-400 rounded-sm py-1.5 pl-8 pr-2 text-sm text-ink focus:border-gold focus:outline-none"
            />
            <Search
              size={14}
              className="absolute left-2 top-2 text-ink-faint"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-bold font-small-caps uppercase tracking-wide transition-colors ${
                activeCategory === cat.id
                  ? "bg-parchment-800 text-parchment-100 shadow-md"
                  : "text-ink-light hover:bg-parchment-300 hover:text-ink"
              }`}
            >
              {cat.icon} {cat.id}
            </button>
          ))}
        </div>
      </div>

      {/* List Column */}
      <div className="w-full md:w-80 bg-parchment-100 border-r border-parchment-400 flex flex-col z-0 shrink-0">
        <div className="p-3 border-b border-parchment-400 bg-parchment-200/30 text-xs font-bold font-small-caps text-ink-light uppercase tracking-widest">
          {activeCategory === "People" 
            ? `People (${filteredNpcs.length})`
            : `${activeCategory} Entries (${filteredEntries.length})`
          }
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {activeCategory === "People" ? (
            // NPC List
            filteredNpcs.map((npc) => (
              <button
                key={npc.id}
                onClick={() => setSelectedNpc(npc)}
                className={`w-full text-left p-3 rounded-sm border transition-all group flex items-center gap-3 ${
                  selectedNpc?.id === npc.id
                    ? "bg-parchment-200 border-burgundy shadow-sm"
                    : "bg-parchment-100 border-parchment-300 hover:border-parchment-400"
                }`}
              >
                <div className="w-10 h-10 rounded-full border-2 border-parchment-400 overflow-hidden bg-parchment-300 shrink-0">
                  {npc.portraitUrl ? (
                    <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-faint">
                      <Users size={16} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`font-serif font-bold ${selectedNpc?.id === npc.id ? "text-burgundy" : "text-ink"}`}>
                    {npc.name}
                  </div>
                  <div className="text-[10px] text-ink-faint truncate">{npc.role}</div>
                </div>
              </button>
            ))
          ) : (
            // Codex Entry List
            filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-3 rounded-sm border transition-all group ${
                  selectedEntry?.id === entry.id
                    ? "bg-parchment-200 border-burgundy shadow-sm"
                    : "bg-parchment-100 border-parchment-300 hover:border-parchment-400"
                }`}
              >
                <div
                  className={`font-serif font-bold text-lg ${
                    selectedEntry?.id === entry.id ? "text-burgundy" : "text-ink"
                  }`}
                >
                  {entry.title}
                </div>
                <span className="text-[10px] text-ink-faint">
                  {entry.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 bg-parchment-100 p-8 overflow-y-auto custom-scrollbar relative">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>

        {selectedEntry ? (
          <div className="max-w-2xl mx-auto relative z-10 animate-fade-in space-y-6">
            {/* Entry Image */}
            {selectedEntry.imageUrl && (
              <button
                onClick={() => setImageModal({ src: selectedEntry.imageUrl!, alt: selectedEntry.title })}
                className="w-full h-48 rounded-sm border-2 border-parchment-600 overflow-hidden bg-parchment-300 cursor-pointer hover:border-burgundy transition-colors"
              >
                <img
                  src={selectedEntry.imageUrl}
                  alt={selectedEntry.title}
                  className="w-full h-full object-cover"
                />
              </button>
            )}

            <div className="flex justify-between items-start border-b-2 border-parchment-800 pb-4">
              <div>
                <h1 className="text-4xl font-display text-ink mb-2">
                  {selectedEntry.title}
                </h1>
                <span className="text-xs font-bold font-small-caps uppercase tracking-widest text-burgundy bg-parchment-200 px-2 py-1 rounded-sm border border-parchment-300">
                  {selectedEntry.category}
                </span>
              </div>
            </div>

            <div className="prose prose-p:font-serif prose-p:text-lg prose-p:text-ink prose-headings:font-display">
              <p className="leading-loose first-letter:float-left first-letter:text-5xl first-letter:pr-3 first-letter:font-display first-letter:text-ink">
                {selectedEntry.text}
              </p>
              <p>
                As you discover more about {selectedEntry.title}, this entry
                will expand. The Codex automatically aggregates information from
                all adventurers to maintain the world's consistency.
              </p>
            </div>

            {/* Related NPCs for Factions */}
            {selectedEntry.relatedNpcs && selectedEntry.relatedNpcs.length > 0 && (
              <div className="mt-8 pt-6 border-t border-parchment-400">
                <h4 className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-widest mb-3">
                  Known Members
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedEntry.relatedNpcs.map((npc) => (
                    <button
                      key={npc.name}
                      onClick={() => setNpcModal({ name: npc.name, role: npc.role, portraitUrl: npc.portraitUrl ?? undefined })}
                      className="flex items-center gap-3 p-2 bg-parchment-200 border border-parchment-300 rounded-sm hover:border-burgundy hover:bg-parchment-300 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-parchment-400 overflow-hidden bg-parchment-300 shrink-0">
                        {npc.portraitUrl ? (
                          <img
                            src={npc.portraitUrl}
                            alt={npc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ink-faint">
                            <Users size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif font-bold text-sm text-ink truncate">
                          {npc.name}
                        </div>
                        <div className="text-[10px] text-ink-light truncate">
                          {npc.role}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : selectedNpc ? (
          // NPC Detail View
          <div className="max-w-2xl mx-auto relative z-10 animate-fade-in space-y-6">
            <div className="flex items-start gap-6 border-b-2 border-parchment-800 pb-4">
              <button 
                className="w-24 h-24 rounded-full border-4 border-parchment-600 overflow-hidden bg-parchment-300 shrink-0 cursor-pointer hover:border-burgundy transition-colors"
                onClick={() => selectedNpc.portraitUrl && setImageModal({ src: selectedNpc.portraitUrl, alt: selectedNpc.name })}
                disabled={!selectedNpc.portraitUrl}
              >
                {selectedNpc.portraitUrl ? (
                  <img src={selectedNpc.portraitUrl} alt={selectedNpc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-faint">
                    <Users size={32} />
                  </div>
                )}
              </button>
              <div>
                <h1 className="text-4xl font-display text-ink mb-2">{selectedNpc.name}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-small-caps uppercase tracking-widest text-burgundy bg-parchment-200 px-2 py-1 rounded-sm border border-parchment-300">
                    {selectedNpc.role}
                  </span>
                  <span className="text-xs font-serif italic text-ink-light">
                    {selectedNpc.location}
                  </span>
                </div>
              </div>
            </div>

            {selectedNpc.personality && selectedNpc.personality.length > 0 && (
              <div>
                <h4 className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-widest mb-2">
                  Personality
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedNpc.personality.map((trait) => (
                    <span key={trait} className="text-sm bg-parchment-200 border border-parchment-300 px-3 py-1 rounded-full text-ink font-serif">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="prose prose-p:font-serif prose-p:text-lg prose-p:text-ink">
              <p className="leading-loose">
                {selectedNpc.name} is known as a {selectedNpc.role.toLowerCase()} in {selectedNpc.location}. 
                As you interact with them, more details about their story will be revealed.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
            <Book size={64} className="mb-4 text-ink-light" strokeWidth={1} />
            <h3 className="text-2xl font-display text-ink">Select an Entry</h3>
            <p className="font-serif italic text-ink-light">
              The knowledge of the world awaits.
            </p>
          </div>
        )}
      </div>

      {/* Image Modal - rendered via portal */}
      {imageModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModal(null)}
        >
          <div 
            className="bg-parchment-200 rounded-sm border-4 border-parchment-800 shadow-2xl max-w-2xl w-full p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setImageModal(null)}
              className="absolute top-2 right-2 text-ink-light hover:text-ink text-xl leading-none z-10"
            >
              ×
            </button>
            <img
              src={imageModal.src}
              alt={imageModal.alt}
              className="w-full h-auto max-h-[60vh] object-contain rounded-sm mb-4"
            />
            <h3 className="text-2xl font-display text-ink text-center">
              {imageModal.alt}
            </h3>
          </div>
        </div>,
        document.body
      )}

      {/* NPC Modal - rendered via portal */}
      {npcModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setNpcModal(null)}
        >
          <div 
            className="bg-parchment-200 rounded-sm border-4 border-parchment-800 shadow-2xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setNpcModal(null)}
              className="absolute top-2 right-2 text-ink-light hover:text-ink text-xl leading-none"
            >
              ×
            </button>
            
            {npcModal.portraitUrl && (
              <img
                src={npcModal.portraitUrl}
                alt={npcModal.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-gold mx-auto mb-4 shadow-lg"
              />
            )}
            
            <h3 className="text-xl font-display text-ink text-center mb-1">
              {npcModal.name}
            </h3>
            <p className="text-sm text-ink-light text-center">
              {npcModal.role}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
