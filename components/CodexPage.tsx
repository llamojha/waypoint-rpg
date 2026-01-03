"use client";

import React, { useState, useEffect } from "react";
import { MOCK_CODEX_ENTRIES, USE_MOCK_DATA } from "@/constants";
import {
  Book,
  Shield,
  Scroll,
  Map,
  Users,
  Sparkles,
  Search,
  Bookmark,
} from "lucide-react";
import { CodexEntry } from "@/types";

interface Props {
  entries?: CodexEntry[];
  initialSearchTerm?: string;
}

export const CodexPage: React.FC<Props> = ({
  entries,
  initialSearchTerm = "",
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState(initialSearchTerm);
  const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);

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
    { id: "Bestiary", icon: <Shield size={16} /> },
    { id: "Locations", icon: <Map size={16} /> },
    { id: "Factions", icon: <Users size={16} /> },
    { id: "History", icon: <Scroll size={16} /> },
    { id: "Magic", icon: <Sparkles size={16} /> },
  ];

  const filteredEntries = displayEntries.filter((e) => {
    const matchCat = activeCategory === "All" || e.category === activeCategory;
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
              onClick={() => setActiveCategory(cat.id)}
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
          {activeCategory} Entries ({filteredEntries.length})
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {filteredEntries.map((entry) => (
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
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[9px] px-1.5 rounded-sm border uppercase font-bold ${
                    entry.status === "canon"
                      ? "bg-parchment-300 text-ink-light border-parchment-400"
                      : "bg-parchment-100 text-ink-faint border-dashed border-parchment-300"
                  }`}
                >
                  {entry.status}
                </span>
                <span className="text-[10px] text-ink-faint truncate">
                  {entry.category}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 bg-parchment-100 p-8 overflow-y-auto custom-scrollbar relative">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>

        {selectedEntry ? (
          <div className="max-w-2xl mx-auto relative z-10 animate-fade-in space-y-6">
            <div className="flex justify-between items-start border-b-2 border-parchment-800 pb-4">
              <div>
                <h1 className="text-4xl font-display text-ink mb-2">
                  {selectedEntry.title}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-small-caps uppercase tracking-widest text-burgundy bg-parchment-200 px-2 py-1 rounded-sm border border-parchment-300">
                    {selectedEntry.category}
                  </span>
                  <span className="text-xs font-serif italic text-ink-light">
                    Last verified: Day 14
                  </span>
                </div>
              </div>
              {selectedEntry.status === "canon" && (
                <Bookmark className="text-gold fill-gold" size={24} />
              )}
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

            <div className="mt-8 pt-6 border-t border-parchment-400">
              <h4 className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-widest mb-3">
                Related Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-parchment-200 border border-parchment-300 px-2 py-1 rounded-full text-ink-light font-bold hover:bg-parchment-300 cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
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
    </div>
  );
};
