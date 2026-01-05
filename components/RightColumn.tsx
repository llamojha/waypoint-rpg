"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { WorldContext, TurnDiff, NPC } from "@/types";
import {
  Compass,
  Users,
  Clock,
  FileDiff,
  Map as MapIcon,
  BookOpen,
  AlertCircle,
  Eye,
  Tag,
  Scroll,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

interface Props {
  world: WorldContext;
  diffs: TurnDiff[];
  npcs: NPC[];
}

export const RightColumn: React.FC<Props> = ({ world, diffs, npcs }) => {
  const [activeTab, setActiveTab] = useState<"updates" | "news">("updates");
  const [showLocationModal, setShowLocationModal] = useState(false);

  const locationImage = world.imageUrl || (world.poi === "The Waypoint" ? "/location_waypoint.png" : null);

  return (
    <div className="h-full flex flex-col bg-parchment-200/50 panel-texture relative select-none">
      <div className="absolute top-0 bottom-0 left-6 w-px bg-parchment-400/50 -z-10"></div>

      {/* Fixed Header: Location Plate */}
      <div className="p-5 pb-2">
        <div className="relative group bg-parchment-100 rounded-sm border border-parchment-400 shadow-sm p-1">
          <div 
            className="h-24 w-full rounded-sm overflow-hidden relative cursor-pointer"
            onClick={() => locationImage && setShowLocationModal(true)}
          >
            <div className="absolute inset-0 bg-parchment-900">
              {locationImage ? (
                <img
                  src={locationImage}
                  alt={world.poi}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-parchment-900"></div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-lg font-display text-white leading-none tracking-wide">
                {world.poi}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-white/70 font-bold font-small-caps uppercase mt-1">
                <MapIcon size={10} /> {world.region}
              </div>
            </div>
          </div>

          {/* Local Tags */}
          <div className="p-2 flex flex-wrap gap-1">
            {world.tags.map((tag, i) => (
              <span
                key={i}
                className={`text-[9px] px-1.5 py-0.5 rounded-sm border font-sans font-bold uppercase tracking-wide flex items-center gap-1 ${
                  tag.type === "canon"
                    ? "bg-parchment-300 border-parchment-400 text-ink"
                    : "bg-parchment-100 border-dashed border-ink-faint text-ink-light"
                }`}
                title={tag.description}
              >
                {tag.type === "canon" ? (
                  <Tag size={8} className="fill-ink" />
                ) : (
                  <AlertCircle size={8} />
                )}{" "}
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Location Modal - rendered via portal to escape overflow:hidden */}
      {showLocationModal && locationImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLocationModal(false)}
        >
          <div 
            className="bg-parchment-200 rounded-sm border-4 border-parchment-800 shadow-2xl max-w-2xl w-full p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLocationModal(false)}
              className="absolute top-2 right-2 text-ink-light hover:text-ink text-xl leading-none z-10"
            >
              ×
            </button>
            
            <img
              src={locationImage}
              alt={world.poi}
              className="w-full h-auto max-h-[60vh] object-contain rounded-sm mb-4"
            />
            
            <h3 className="text-2xl font-display text-ink text-center mb-1">
              {world.poi}
            </h3>
            <p className="text-sm text-ink-light text-center mb-3">
              {world.region}
            </p>
            
            {world.description && (
              <p className="text-sm text-ink text-center leading-relaxed">
                {world.description}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Tabs */}
      <div className="flex px-5 border-b border-parchment-400 gap-4">
        <button
          onClick={() => setActiveTab("updates")}
          className={`pb-2 text-xs font-bold font-small-caps uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
            activeTab === "updates"
              ? "text-ink border-b-2 border-burgundy"
              : "text-ink-light hover:text-gold"
          }`}
        >
          <Scroll size={12} /> Recent Updates
        </button>
        <button
          onClick={() => setActiveTab("news")}
          className={`pb-2 text-xs font-bold font-small-caps uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
            activeTab === "news"
              ? "text-ink border-b-2 border-burgundy"
              : "text-ink-light hover:text-gold"
          }`}
        >
          <MessageCircle size={12} /> World News
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
        {activeTab === "updates" && (
          <div className="space-y-3 animate-fade-in">
            {diffs
              .slice()
              .reverse()
              .map((diff, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start p-2 rounded-sm bg-parchment-100 border border-parchment-300 shadow-sm"
                >
                  <div
                    className={`mt-0.5 rounded-full p-0.5 ${
                      diff.type === "relationship"
                        ? diff.value && String(diff.value).startsWith("-")
                          ? "bg-burgundy text-parchment-100"
                          : "bg-forest text-parchment-100"
                        : diff.type === "inventory"
                        ? "bg-gold text-ink"
                        : "bg-parchment-400 text-ink"
                    }`}
                  >
                    <FileDiff size={10} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] font-bold font-small-caps uppercase tracking-wide text-ink-light">
                        {diff.type}
                      </span>
                      {diff.value && (
                        <span className="text-[9px] font-bold text-ink px-1.5 rounded-sm bg-parchment-300 border border-parchment-400">
                          {diff.value}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-serif text-ink leading-tight mt-0.5">
                      {diff.text}
                    </div>
                  </div>
                </div>
              ))}

            {diffs.length === 0 && (
              <div className="text-center py-6 text-xs text-ink-faint italic opacity-60">
                The ink is dry. No changes yet.
              </div>
            )}
          </div>
        )}

        {activeTab === "news" && (
          <div className="space-y-3 animate-fade-in">
            {world.memory.map((mem) => (
              <LoreEntry key={mem.id} mem={mem} />
            ))}
            {world.memory.length === 0 && (
              <div className="text-[10px] italic text-ink-faint text-center">
                No active rumors nearby.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LoreEntry = ({ mem }: any) => (
  <div className="text-xs group relative pl-3 border-l-2 border-parchment-300 hover:border-gold transition-colors bg-parchment-100/50 p-2 rounded-r-sm">
    <div className="flex items-center justify-between mb-1">
      <div className="font-bold font-serif text-ink">{mem.title}</div>
      <span
        className={`text-[8px] uppercase px-1 rounded-sm border ${
          mem.status === "canonized"
            ? "bg-parchment-300 border-parchment-400 text-ink"
            : "bg-parchment-100 border-dashed border-ink-faint text-ink-faint"
        }`}
      >
        {mem.type}
      </span>
    </div>
    <p className="text-ink-light leading-relaxed line-clamp-3">{mem.text}</p>
    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
      <button className="text-[9px] font-bold text-burgundy uppercase hover:underline flex items-center gap-0.5 bg-parchment-200 px-2 py-0.5 rounded-sm border border-parchment-300">
        Read More <ArrowRight size={8} />
      </button>
    </div>
  </div>
);
