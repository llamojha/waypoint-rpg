"use client";

import React from "react";
import { X, Cpu, ShieldCheck, Database, Terminal, Scroll, BookOpen, Swords } from "lucide-react";
import type { Turn, WorldContext, TurnDiff } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  turn?: Turn | null;
  world?: WorldContext | null;
}

export const TurnTrace: React.FC<Props> = ({ isOpen, onClose, turn, world }) => {
  if (!isOpen) return null;

  const mechanics = turn?.mechanics;
  const diffs = turn?.diffs || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 dark:bg-black/90 flex justify-end backdrop-blur-sm">
      <div className="w-full max-w-md bg-parchment-100 dark:bg-parchment-900 border-l-4 border-parchment-300 dark:border-parchment-800 h-full flex flex-col animate-fade-in shadow-[0_0_40px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between p-4 border-b border-parchment-300 dark:border-parchment-800 bg-parchment-200 dark:bg-parchment-900 shadow-lg relative z-10">
          <h2 className="text-sm font-bold text-parchment-800 dark:text-parchment-100 font-mono flex items-center gap-2 uppercase tracking-widest">
            <Terminal size={16} className="text-gold" /> Agent Pipeline
          </h2>
          <button
            onClick={onClose}
            className="text-parchment-500 dark:text-parchment-400 hover:text-parchment-800 dark:hover:text-parchment-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs bg-parchment-50 dark:bg-[#1a120b] text-parchment-700 dark:text-parchment-400 custom-scrollbar">
          {/* State Context */}
          <AgentSection icon={Database} title="State Context" color="text-forest">
            <span className="opacity-50">[WORLD]</span> {world?.poi || "Unknown"} ({world?.region || "Unknown"})
            <br />
            <span className="opacity-50">[TIME]</span> Day {world?.time?.day || 1}, {world?.time?.phase || "Morning"}
            <br />
            <span className="opacity-50">[WEATHER]</span> {world?.weather || "Clear"}
          </AgentSection>

          {/* Rune Marshal */}
          {mechanics && (
            <AgentSection icon={Swords} title="Rune Marshal" color="text-burgundy">
              <span className="opacity-50">[SKILL]</span> {mechanics.skill}
              <br />
              <span className="opacity-50">[DC]</span> {mechanics.dc}
              {mechanics.modifier !== undefined && (
                <>
                  <br />
                  <span className="opacity-50">[MODIFIER]</span> +{mechanics.modifier}
                </>
              )}
            </AgentSection>
          )}

          {/* Orchestrator */}
          <AgentSection icon={Cpu} title="Orchestrator" color="text-gold">
            <span className="opacity-50">[ACTION]</span> {turn?.playerAction || "Awaiting input..."}
            {mechanics?.outcome && (
              <>
                <br />
                <span className="opacity-50">[ROLL]</span> {mechanics.rolled} + {mechanics.modifier} = {mechanics.total}
                <br />
                <span className="opacity-50">[RESULT]</span>{" "}
                <span className={mechanics.outcome === "success" ? "text-forest font-bold" : "text-burgundy font-bold"}>
                  {mechanics.outcome.toUpperCase()}
                </span>
              </>
            )}
          </AgentSection>

          {/* Arbiter */}
          <AgentSection icon={ShieldCheck} title="Arbiter" color="text-gold-light">
            <span className="opacity-50">[VALIDATION]</span>{" "}
            <span className="text-forest font-bold">PASSED</span>
            <br />
            <span className="opacity-50">[PROPOSALS]</span> {diffs.length} approved
          </AgentSection>

          {/* Lorekeeper */}
          <AgentSection icon={BookOpen} title="Lorekeeper" color="text-forest">
            <span className="opacity-50">[LOCATION]</span> {world?.poi || "Unknown"}
            <br />
            <span className="opacity-50">[ENTITIES]</span> {world?.entities?.length || 0} present
          </AgentSection>

          {/* Quest Agent */}
          <AgentSection icon={Scroll} title="Quest Agent" color="text-burgundy">
            <span className="opacity-50">[STATUS]</span> Active
          </AgentSection>

          {/* Chronicler Output */}
          {diffs.length > 0 && (
            <AgentSection icon={Database} title="State Changes" color="text-gold-light">
              {diffs.map((diff, i) => (
                <div key={i}>
                  <span className={getDiffColor(diff.type)}>+ {diff.type.toUpperCase()}:</span> {diff.text}
                </div>
              ))}
            </AgentSection>
          )}
        </div>
      </div>
    </div>
  );
};

function AgentSection({ 
  icon: Icon, 
  title, 
  color, 
  children 
}: { 
  icon: React.ElementType; 
  title: string; 
  color: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 ${color} font-bold uppercase tracking-wide`}>
        <Icon size={12} /> {title}
      </div>
      <div className="p-3 bg-parchment-200 dark:bg-[#251a12] rounded-sm border border-parchment-300 dark:border-parchment-800/50 text-parchment-700 dark:text-parchment-300 shadow-inner">
        {children}
      </div>
    </div>
  );
}

function getDiffColor(type: TurnDiff["type"]): string {
  switch (type) {
    case "stat": return "text-forest";
    case "relationship": return "text-burgundy";
    case "inventory": return "text-gold";
    case "quest": return "text-gold-light";
    case "skill": return "text-forest";
    default: return "text-parchment-500";
  }
}
