"use client";

import React from "react";
import { X, Cpu, ShieldCheck, Database, Terminal, Scroll, BookOpen, Swords, Shield, Layers, PenTool, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { Turn, WorldContext, TurnDiff, AgentTrace } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  turn?: Turn | null;
  world?: WorldContext | null;
}

const AGENT_CONFIG: Record<AgentTrace["agent"], { icon: React.ElementType; title: string; color: string }> = {
  sentinel: { icon: Shield, title: "Content Sentinel", color: "text-burgundy" },
  rune_marshal: { icon: Swords, title: "Rune Marshal", color: "text-burgundy" },
  orchestrator: { icon: Cpu, title: "Orchestrator", color: "text-gold" },
  arbiter: { icon: ShieldCheck, title: "Arbiter", color: "text-gold dark:text-gold" },
  lorekeeper: { icon: BookOpen, title: "Lorekeeper", color: "text-forest" },
  quest_agent: { icon: Scroll, title: "Quest Agent", color: "text-burgundy" },
  collector: { icon: Layers, title: "Collector", color: "text-gold" },
  apply_state: { icon: CheckCircle, title: "Apply State", color: "text-forest" },
  chronicler: { icon: PenTool, title: "Chronicler", color: "text-gold dark:text-gold" },
};

export const TurnTrace: React.FC<Props> = ({ isOpen, onClose, turn, world }) => {
  if (!isOpen) return null;

  const mechanics = turn?.mechanics;
  const diffs = turn?.diffs || [];
  const traces = turn?.trace || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div className="w-full max-w-md bg-parchment-100 dark:bg-parchment-900 border-l-4 border-parchment-300 dark:border-parchment-800 h-full flex flex-col animate-fade-in shadow-[0_0_40px_rgba(0,0,0,0.7)] pointer-events-auto">
        <div className="flex items-center justify-between p-4 border-b border-parchment-300 dark:border-parchment-800 bg-parchment-200 dark:bg-parchment-900 shadow-lg relative z-10">
          <h2 className="text-sm font-bold text-ink dark:text-ink font-mono flex items-center gap-2 uppercase tracking-widest">
            <Terminal size={16} className="text-gold" /> Agent Pipeline
          </h2>
          <button
            onClick={onClose}
            className="text-parchment-500 dark:text-parchment-400 hover:text-parchment-800 dark:hover:text-parchment-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs bg-parchment-50 dark:bg-[#1a120b] text-ink dark:text-ink custom-scrollbar">
          {/* State Context (always show) */}
          <AgentSection icon={Database} title="State Context" color="text-forest">
            <span className="opacity-50">[WORLD]</span> <span className="dark:text-ink">{world?.poi || "Unknown"} ({world?.region || "Unknown"})</span>
            <br />
            <span className="opacity-50">[TIME]</span> <span className="dark:text-ink">Day {world?.time?.day || 1}, {world?.time?.phase || "Morning"}</span>
            <br />
            <span className="opacity-50">[WEATHER]</span> <span className="dark:text-ink">{world?.weather || "Clear"}</span>
          </AgentSection>

          {/* Real traces from API */}
          {traces.length > 0 ? (
            traces.map((trace, i) => {
              const config = AGENT_CONFIG[trace.agent];
              const isParallel = trace.agent === "arbiter" || trace.agent === "lorekeeper";
              
              return (
                <AgentSection 
                  key={i} 
                  icon={config.icon} 
                  title={config.title} 
                  color={config.color}
                  badge={isParallel ? "PARALLEL" : undefined}
                  status={trace.status}
                  durationMs={trace.durationMs}
                >
                  {trace.status === "error" && trace.error && (
                    <div className="text-burgundy font-bold mb-1">{trace.error}</div>
                  )}
                  <div className="dark:text-ink font-medium mb-1">{trace.description}</div>
                  {trace.details && trace.details.length > 0 && (
                    <div className="space-y-0.5 text-[10px]">
                      {trace.details.map((detail, j) => (
                        <div key={j} className="opacity-70">{detail}</div>
                      ))}
                    </div>
                  )}
                </AgentSection>
              );
            })
          ) : (
            // Fallback: show mechanics-based info if no traces
            <>
              {mechanics && (
                <AgentSection icon={Swords} title="Rune Marshal" color="text-burgundy">
                  <span className="opacity-50">[SKILL]</span> <span className="dark:text-ink">{mechanics.skill}</span>
                  <br />
                  <span className="opacity-50">[DC]</span> <span className="dark:text-ink">{mechanics.dc}</span>
                  {mechanics.outcome && (
                    <>
                      <br />
                      <span className="opacity-50">[RESULT]</span>{" "}
                      <span className={mechanics.outcome === "success" ? "text-forest font-bold" : "text-burgundy font-bold"}>
                        {mechanics.outcome.toUpperCase()}
                      </span>
                    </>
                  )}
                </AgentSection>
              )}
              <div className="text-center py-4 opacity-50 italic">
                No trace data available for this turn
              </div>
            </>
          )}

          {/* State Changes (always show if diffs exist) */}
          {diffs.length > 0 && (
            <AgentSection icon={Database} title="State Changes" color="text-gold">
              {diffs.map((diff, i) => (
                <div key={i}>
                  <span className={getDiffColor(diff.type)}>+ {diff.type.toUpperCase()}:</span> <span className="dark:text-ink">{diff.text}</span>
                  {diff.value && <span className="opacity-50"> ({diff.value})</span>}
                </div>
              ))}
            </AgentSection>
          )}
        </div>
      </div>
    </div>
  );
};

function formatValue(value: unknown): string {
  if (typeof value === "string") return value.length > 80 ? value.slice(0, 80) + "..." : value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "none";
  if (value === null || value === undefined) return "none";
  return JSON.stringify(value);
}

function AgentSection({ 
  icon: Icon, 
  title, 
  color,
  badge,
  status,
  durationMs,
  children 
}: { 
  icon: React.ElementType; 
  title: string; 
  color: string;
  badge?: string;
  status?: AgentTrace["status"];
  durationMs?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 ${color} font-bold uppercase tracking-wide`}>
        <Icon size={12} /> {title}
        {badge && (
          <span className="text-[9px] px-1.5 py-0.5 bg-parchment-300 dark:bg-parchment-800 text-ink-light dark:text-parchment-400 rounded-sm">
            {badge}
          </span>
        )}
        {status && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold ${
            status === "success" 
              ? "bg-forest/30 text-forest dark:bg-forest/20 dark:text-forest" 
              : status === "error" 
              ? "bg-burgundy/30 text-burgundy dark:bg-burgundy/20 dark:text-burgundy" 
              : "bg-parchment-300 text-ink-light dark:bg-parchment-700 dark:text-parchment-400"
          }`}>
            {status.toUpperCase()}
          </span>
        )}
        {durationMs !== undefined && (
          <span className="text-[9px] text-ink-faint dark:text-parchment-500 flex items-center gap-0.5 ml-auto">
            <Clock size={9} /> {durationMs}ms
          </span>
        )}
      </div>
      <div className="p-3 bg-parchment-200 dark:bg-[#251a12] rounded-sm border border-parchment-300 dark:border-parchment-700 text-ink dark:text-ink shadow-inner">
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
    case "quest": return "text-gold";
    case "skill": return "text-forest";
    case "world": return "text-forest";
    case "npc": return "text-burgundy";
    default: return "text-ink-faint dark:text-parchment-400";
  }
}
